import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { Graphviz } from "./node_modules/@hpcc-js/wasm/dist/index.js";

let graphviz = null;

async function parseDot(dotSource) {
    if (!graphviz) {
        graphviz = await Graphviz.load();
    }

    const jsonStr = await graphviz.layout(dotSource, "json0");
    const data = JSON.parse(jsonStr);

    const nodes = new Set();
    const edges = [];

    // Get nodes from edges first
    if (data.edges) {
        data.edges.forEach(edge => {
            if (edge.tail && edge.head) {
                nodes.add(edge.tail);
                nodes.add(edge.head);
                edges.push({ source: edge.tail, target: edge.head });
            }
        });
    }

    // Add any standalone nodes
    if (data.objects) {
        data.objects.forEach(obj => {
            if (obj.name) {
                nodes.add(obj.name);
            }
        });
    }

    return {
        nodes: Array.from(nodes).map(id => ({ id })),
        edges
    };
}

function createGraph(container, data) {
    // Clear any existing content
    container.innerHTML = '';

    const width = container.clientWidth;
    const height = container.clientHeight || 400;

    // Create SVG
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    // Create the simulation
    const simulation = d3.forceSimulation(data.nodes)
        .force('link', d3.forceLink(data.edges)
            .id(d => d.id)
            .distance(100))
        .force('charge', d3.forceManyBody().strength(-400))
        .force('center', d3.forceCenter(width / 2, height / 2));

    // Add edges
    const edges = svg.append('g')
        .selectAll('line')
        .data(data.edges)
        .join('line')
        .style('stroke', '#888')
        .style('stroke-width', 1)
        .style('stroke-opacity', 0.6);

    // Add nodes
    const nodes = svg.append('g')
        .selectAll('g')
        .data(data.nodes)
        .join('g');

    // Add circles to nodes
    nodes.append('circle')
        .attr('r', 5)
        .style('fill', '#fff');

    // Add labels
    nodes.append('text')
        .attr('x', 8)
        .attr('y', 4)
        .style('fill', '#fff')
        .style('font-family', 'monospace')
        .style('font-size', '12px')
        .text(d => d.id);

    // Add drag behavior
    nodes.call(d3.drag()
        .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        })
        .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
        })
        .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }));

    // Update positions on each tick
    simulation.on('tick', () => {
        edges
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);

        nodes.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    return simulation;
}

export async function renderD3Graph(dotSource) {
    try {
        // Create container
        const container = document.createElement('div');
        container.style.width = '100%';
        container.style.height = '400px';
        container.className = 'graph-container';

        // Parse the DOT source
        const data = await parseDot(dotSource);

        // Create the graph
        const simulation = createGraph(container, data);

        // Store simulation for cleanup
        container._simulation = simulation;

        return container;
    } catch (error) {
        console.error('Failed to render graph:', error);
        return `<pre class="error">Failed to render graph: ${error.message}</pre>`;
    }
}
