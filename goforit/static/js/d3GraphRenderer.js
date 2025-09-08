import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { Graphviz } from "./node_modules/@hpcc-js/wasm/dist/index.js";

let graphviz = null;

async function parseDot(dotSource) {
    if (!graphviz) {
        graphviz = await Graphviz.load();
    }

    const jsonStr = await graphviz.layout(dotSource, "json0");
    const data = JSON.parse(jsonStr);

    // Extract nodes with their positions
    const nodes = data.objects.map(obj => {
        const [x, y] = obj.pos.split(',').map(Number);
        return {
            id: obj.name,
            x: x,
            y: y,
            // Fix the position that Graphviz calculated
            fx: x,
            fy: y
        };
    });

    // Create a map of node name to index for edge lookup
    const nodeMap = new Map(data.objects.map((obj, i) => [obj._gvid, i]));

    // Extract edges using the node indices
    const edges = data.edges.map(edge => ({
        source: nodes[nodeMap.get(edge.tail)],
        target: nodes[nodeMap.get(edge.head)]
    }));

    return { nodes, edges };
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

    // Add edges
    const edges = svg.append('g')
        .selectAll('line')
        .data(data.edges)
        .join('line')
        .style('stroke', '#888')
        .style('stroke-width', 1)
        .style('stroke-opacity', 0.6)
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

    // Add nodes
    const nodes = svg.append('g')
        .selectAll('g')
        .data(data.nodes)
        .join('g')
        .attr('transform', d => `translate(${d.x},${d.y})`);

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

    return svg;
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
        createGraph(container, data);

        return container;
    } catch (error) {
        console.error('Failed to render graph:', error);
        return `<pre class="error">Failed to render graph: ${error.message}</pre>`;
    }
}