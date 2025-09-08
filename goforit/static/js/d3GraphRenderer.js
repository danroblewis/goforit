import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { Graphviz } from "./node_modules/@hpcc-js/wasm/dist/index.js";

let graphviz = null;

// Store graph state globally
const nodePositions = new Map();
const viewState = {
    transform: null  // Will store d3.zoomIdentity transform
};

async function parseDot(dotSource) {
    if (!graphviz) {
        graphviz = await Graphviz.load();
    }

    const jsonStr = await graphviz.layout(dotSource, "json0");
    const data = JSON.parse(jsonStr);

    // Extract nodes with their positions and styles
    const nodes = data.objects.map(obj => {
        const [x, y] = obj.pos.split(',').map(Number);
        const savedPos = nodePositions.get(obj.name);

        // Extract fillcolor if it exists, default to white
        let fillcolor = '#fff';
        if (obj.fillcolor) {
            fillcolor = obj.fillcolor;
        }

        // Use explicit label if provided, otherwise use name
        const label = obj.label === '\\N' ? obj.name : (obj.label || obj.name);

        return {
            id: obj.name,
            // Use saved position if available, otherwise use Graphviz position
            x: savedPos ? savedPos.x : x,
            y: savedPos ? savedPos.y : y,
            fillcolor: fillcolor,
            label: label
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

function zoomToFit(svg, g, zoom, padding = 50) {
    // Get the bounds of the graph content
    const bounds = g.node().getBBox();
    
    // Get the dimensions of the SVG container
    const width = parseInt(svg.style('width'));
    const height = parseInt(svg.style('height'));
    
    // Calculate scale and translate to fit the graph
    const scale = Math.min(
        width / (bounds.width + padding * 2),
        height / (bounds.height + padding * 2)
    );
    
    const translate = [
        (width - bounds.width * scale) / 2 - bounds.x * scale,
        (height - bounds.height * scale) / 2 - bounds.y * scale
    ];
    
    // Create and save the new transform
    const transform = d3.zoomIdentity
        .translate(translate[0], translate[1])
        .scale(scale);
    
    // Update the global view state
    viewState.transform = transform;
    
    // Apply the transform with animation
    svg.transition()
        .duration(750)
        .call(zoom.transform, transform);
}

function createGraph(container, data, width, height) {
    // Clear any existing content
    container.innerHTML = '';

    // Create SVG with container dimensions
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    // Create a group for zoom/pan
    const g = svg.append('g');

    // Add zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([0.1, 10])
        .on('zoom', (event) => {
            g.attr('transform', event.transform);
            // Save the current transform
            viewState.transform = event.transform;
        });

    svg.call(zoom);

    // If we have a saved transform, apply it immediately
    if (viewState.transform) {
        g.attr('transform', viewState.transform);
    }

    // Add edges
    const edges = g.append('g')
        .selectAll('line')
        .data(data.edges)
        .join('line')
        .style('stroke', '#888')
        .style('stroke-width', 1)
        .style('stroke-opacity', 0.6);

    // Add nodes
    const nodes = g.append('g')
        .selectAll('g')
        .data(data.nodes)
        .join('g');

    // Add circles to nodes
    nodes.append('circle')
        .attr('r', 5)
        .style('fill', d => {
            return d.fillcolor
        });

    // Add labels
    nodes.append('text')
        .attr('x', 8)
        .attr('y', 4)
        .style('fill', '#fff')
        .style('font-family', 'monospace')
        .style('font-size', '12px')
        .text(d => d.label);

    // Create the simulation
    const simulation = d3.forceSimulation(data.nodes)
        .force('link', d3.forceLink(data.edges)
            .id(d => d.id)
            .distance(50))
        .force('charge', d3.forceManyBody()
            .strength(-200))
        // Stronger centering forces
        .force('center', d3.forceCenter(width / 4, height / 2).strength(1))
        .force('x', d3.forceX(width / 4).strength(0.3))
        .force('y', d3.forceY(height / 4).strength(0.3));

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

    // Update positions on each tick and save them
    simulation.on('tick', () => {
        edges
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);

        nodes.attr('transform', d => `translate(${d.x},${d.y})`);

        // Save current positions
        data.nodes.forEach(node => {
            nodePositions.set(node.id, { x: node.x, y: node.y });
        });
    });

    // When simulation ends, zoom to fit only if we don't have a saved transform
    simulation.on('end', () => {
        if (!viewState.transform) {
            // Wait a tick to ensure all elements are properly positioned
            setTimeout(() => {
                zoomToFit(svg, g, zoom);
            }, 0);
        }
    });

    // Start with a very low alpha since we might be using saved positions
    simulation.alpha(0.1).restart();

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

        // Create a temporary div to measure available space
        const measureDiv = document.createElement('div');
        measureDiv.style.width = '100%';
        measureDiv.style.height = '400px';
        measureDiv.style.position = 'absolute';
        measureDiv.style.visibility = 'hidden';
        document.body.appendChild(measureDiv);

        // Get dimensions
        const width = measureDiv.clientWidth;
        const height = measureDiv.clientHeight;

        // Clean up
        document.body.removeChild(measureDiv);

        // Create the graph with measured dimensions
        const simulation = createGraph(container, data, width, height);

        // Store simulation for cleanup
        container._simulation = simulation;

        return container;
    } catch (error) {
        console.error('Failed to render graph:', error);
        return `<pre class="error">Failed to render graph: ${error.message}</pre>`;
    }
}