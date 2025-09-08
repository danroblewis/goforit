import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { Graphviz } from "./node_modules/@hpcc-js/wasm/dist/index.js";

class D3GraphRenderer {
    constructor(container) {
        this.container = container;
        this.width = container.clientWidth;
        this.height = container.clientHeight || 400;

        // Create SVG
        this.svg = d3.select(container)
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", [0, 0, this.width, this.height]);

        // Add zoom behavior
        this.svg.call(d3.zoom()
            .extent([[0, 0], [this.width, this.height]])
            .scaleExtent([0.1, 8])
            .on("zoom", ({transform}) => {
                this.g.attr("transform", transform);
            }));

        // Create main group for zoom/pan
        this.g = this.svg.append("g");

        // Create groups for links and nodes
        this.links = this.g.append("g").attr("class", "links");
        this.nodes = this.g.append("g").attr("class", "nodes");

        // Initialize simulation
        this.simulation = d3.forceSimulation()
            .force("charge", d3.forceManyBody().strength(-800))
            .force("center", d3.forceCenter(this.width / 2, this.height / 2))
            .force("x", d3.forceX(this.width / 2).strength(0.1))
            .force("y", d3.forceY(this.height / 2).strength(0.1))
            .force("link", d3.forceLink().distance(150).strength(1));
    }

    async render(dotSource) {
        try {
            // Initialize Graphviz if needed
            if (!this.graphviz) {
                this.graphviz = await Graphviz.load();
            }

            // Parse DOT to JSON
            const jsonStr = await this.graphviz.layout(dotSource, "json0");
            const graphData = JSON.parse(jsonStr);

            // Extract nodes and edges
            const nodeSet = new Set();
            const links = [];

            // Collect nodes from edges first
            if (graphData.edges) {
                graphData.edges.forEach(edge => {
                    if (edge.tail && edge.head) {
                        nodeSet.add(edge.tail);
                        nodeSet.add(edge.head);
                        links.push({
                            source: edge.tail,
                            target: edge.head
                        });
                    }
                });
            }

            // Add any standalone nodes
            if (graphData.objects) {
                graphData.objects.forEach(obj => {
                    if (obj.name) {
                        nodeSet.add(obj.name);
                    }
                });
            }

            const nodes = Array.from(nodeSet).map(id => ({id}));

            // Update links
            const linkElements = this.links
                .selectAll("line")
                .data(links)
                .join("line")
                .attr("stroke", "#e0e0e0")
                .attr("stroke-width", 1)
                .attr("stroke-opacity", 0.6);

            // Update nodes
            const nodeElements = this.nodes
                .selectAll("g")
                .data(nodes, d => d.id)
                .join("g")
                .call(this.drag());

            // Clear old elements
            nodeElements.selectAll("*").remove();

            // Add circles to nodes
            nodeElements.append("circle")
                .attr("r", 6)
                .attr("fill", "#e0e0e0");

            // Add labels to nodes
            nodeElements.append("text")
                .attr("x", 10)
                .attr("y", 3)
                .text(d => d.id)
                .attr("fill", "#e0e0e0")
                .style("font-family", "monospace")
                .style("font-size", "12px");

            // Update simulation
            this.simulation
                .nodes(nodes)
                .force("link")
                .links(links);

            // Update positions on tick
            this.simulation.on("tick", () => {
                linkElements
                    .attr("x1", d => d.source.x)
                    .attr("y1", d => d.source.y)
                    .attr("x2", d => d.target.x)
                    .attr("y2", d => d.target.y);

                nodeElements
                    .attr("transform", d => `translate(${d.x},${d.y})`);
            });

            // Restart simulation
            this.simulation.alpha(1).restart();

        } catch (error) {
            console.error("Failed to render graph:", error);
        }
    }

    drag() {
        return d3.drag()
            .on("start", (event, d) => {
                if (!event.active) this.simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            })
            .on("drag", (event, d) => {
                d.fx = event.x;
                d.fy = event.y;
            })
            .on("end", (event, d) => {
                if (!event.active) this.simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            });
    }

    destroy() {
        if (this.simulation) {
            this.simulation.stop();
        }
        if (this.svg) {
            this.svg.remove();
        }
    }
}

export async function renderD3Graph(dotSource) {
    try {
        const container = document.createElement('div');
        container.className = 'graph-container';
        container.style.width = '100%';
        container.style.height = '400px';

        const renderer = new D3GraphRenderer(container);
        await renderer.render(dotSource);

        // Store renderer instance for cleanup
        container._renderer = renderer;

        // Add click handler for modal view
        container.addEventListener('click', async (e) => {
            const modalContainer = document.createElement('div');
            modalContainer.className = 'graph-modal';
            modalContainer.innerHTML = `
                <div class="graph-modal-content">
                    <div class="graph-modal-close">×</div>
                    <div class="graph-modal-graph"></div>
                </div>
            `;

            // Set up modal close handlers
            const closeModal = () => {
                if (modalRenderer) modalRenderer.destroy();
                modalContainer.remove();
            };

            modalContainer.querySelector('.graph-modal-close').onclick = (e) => {
                closeModal();
                e.stopPropagation();
            };

            modalContainer.onclick = (e) => {
                if (e.target === modalContainer) closeModal();
            };

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') closeModal();
            }, { once: true });

            // Create new renderer for modal
            document.body.appendChild(modalContainer);
            const modalGraph = modalContainer.querySelector('.graph-modal-graph');
            modalGraph.style.width = '100%';
            modalGraph.style.height = '100%';
            
            const modalRenderer = new D3GraphRenderer(modalGraph);
            await modalRenderer.render(dotSource);

            modalContainer.classList.add('visible');
            e.stopPropagation();
        });

        return container;
    } catch (error) {
        console.error('D3 graph rendering failed:', error);
        return `<pre class="error">Failed to render graph:\n${error.message}</pre>`;
    }
}