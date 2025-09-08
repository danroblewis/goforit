import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { Graphviz } from "./node_modules/@hpcc-js/wasm/dist/index.js";

class D3GraphRenderer {
    constructor(container) {
        this.container = container;
        this.width = container.clientWidth;
        this.height = container.clientHeight;
        this.nodePositions = new Map(); // Store positions between updates
        this.simulation = null;
        this.svg = null;
        this.zoom = null;
        this.nodes = [];
        this.links = [];
        
        this.initializeSVG();
        this.setupZoom();
    }

    initializeSVG() {
        // Create SVG element with zoom/pan group
        this.svg = d3.select(this.container)
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .style("background", "transparent");

        // Add a group for zoom/pan transforms
        this.g = this.svg.append("g");
        
        // Add groups for edges and nodes
        this.linksGroup = this.g.append("g").attr("class", "links");
        this.nodesGroup = this.g.append("g").attr("class", "nodes");
    }

    setupZoom() {
        this.zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on("zoom", (event) => {
                this.g.attr("transform", event.transform);
            });

        this.svg.call(this.zoom);
    }

    async parseDot(dotSource) {
        try {
            // Initialize Graphviz if not already done
            if (!this.graphviz) {
                this.graphviz = await Graphviz.load();
            }

            // Parse the DOT source into JSON
            const jsonStr = await this.graphviz.layout(dotSource, "json0");
            const graphData = JSON.parse(jsonStr);

            // Extract nodes and edges from the JSON
            const nodes = new Set();
            const links = [];

            // Process nodes
            if (graphData.objects) {
                graphData.objects.forEach(obj => {
                    if (obj.name) {
                        nodes.add(obj.name);
                    }
                });
            }

            // Create node objects first
            const nodeObjects = Array.from(nodes).map(id => ({ id }));
            const nodeMap = new Map(nodeObjects.map(node => [node.id, node]));

            // Process edges using node objects
            if (graphData.edges) {
                graphData.edges.forEach(edge => {
                    if (edge.tail && edge.head) {
                        const source = nodeMap.get(edge.tail);
                        const target = nodeMap.get(edge.head);
                        if (source && target) {
                            links.push({ source, target });
                        }
                    }
                });
            }

            return {
                nodes: nodeObjects,
                links
            };
        } catch (error) {
            console.error('Failed to parse DOT:', error);
            return { nodes: [], links: [] };
        }
    }

    async updateGraph(dotSource) {
        const { nodes, links } = await this.parseDot(dotSource);
        
        // Store old positions
        this.nodes.forEach(node => {
            if (node.x && node.y) {
                this.nodePositions.set(node.id, { x: node.x, y: node.y });
            }
        });

        // Update data
        this.nodes = nodes;
        this.links = links;

        // Restore positions for existing nodes
        this.nodes.forEach(node => {
            const pos = this.nodePositions.get(node.id);
            if (pos) {
                node.x = pos.x;
                node.y = pos.y;
            }
        });

        this.renderGraph();
    }

    renderGraph() {
        // Update links
        const links = this.linksGroup
            .selectAll("line")
            .data(this.links, d => `${d.source.id || d.source}-${d.target.id || d.target}`);

        links.exit().remove();

        const linksEnter = links.enter()
            .append("line")
            .style("stroke", "#e0e0e0")
            .style("stroke-width", 1);

        // Update nodes
        const nodes = this.nodesGroup
            .selectAll("g")
            .data(this.nodes, d => d.id);

        nodes.exit().remove();

        const nodesEnter = nodes.enter()
            .append("g")
            .call(d3.drag()
                .on("start", this.dragstarted.bind(this))
                .on("drag", this.dragged.bind(this))
                .on("end", this.dragended.bind(this)));

        nodesEnter.append("circle")
            .attr("r", 5)
            .style("fill", "#e0e0e0");

        nodesEnter.append("text")
            .attr("dx", 12)
            .attr("dy", ".35em")
            .style("fill", "#e0e0e0")
            .text(d => d.id);

        // Set up or update force simulation
        if (!this.simulation) {
            this.simulation = d3.forceSimulation()
                .force("link", d3.forceLink().id(d => d.id).distance(100))
                .force("charge", d3.forceManyBody().strength(-100))
                .force("center", d3.forceCenter(this.width / 2, this.height / 2))
                .on("tick", () => {
                    this.linksGroup.selectAll("line")
                        .attr("x1", d => d.source.x)
                        .attr("y1", d => d.source.y)
                        .attr("x2", d => d.target.x)
                        .attr("y2", d => d.target.y);

                    this.nodesGroup.selectAll("g")
                        .attr("transform", d => `translate(${d.x},${d.y})`);
                });
        }

        // Update simulation with new data
        this.simulation.nodes(this.nodes);
        this.simulation.force("link").links(this.links);
        this.simulation.alpha(1).restart();
    }

    dragstarted(event) {
        if (!event.active) this.simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
    }

    dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
    }

    dragended(event) {
        if (!event.active) this.simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
    }

    // Clean up resources
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
        container.style.height = '400px'; // Fixed height for the graph

        const renderer = new D3GraphRenderer(container);
        renderer.updateGraph(dotSource);

        // Store renderer instance on the container for cleanup
        container._renderer = renderer;

        // Add click handler for modal view
        container.addEventListener('click', (e) => {
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
            modalRenderer.updateGraph(dotSource);
            
            // Copy current node positions to modal view
            renderer.nodes.forEach(node => {
                const modalNode = modalRenderer.nodes.find(n => n.id === node.id);
                if (modalNode && node.x && node.y) {
                    modalNode.x = node.x;
                    modalNode.y = node.y;
                }
            });

            modalContainer.classList.add('visible');
            e.stopPropagation();
        });

        return container;
    } catch (error) {
        console.error('D3 graph rendering failed:', error);
        return `<pre class="error">Failed to render graph:\n${error.message}</pre>`;
    }
}
