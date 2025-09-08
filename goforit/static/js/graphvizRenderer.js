import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { Graphviz } from "./node_modules/@hpcc-js/wasm/dist/index.js";

let graphvizInstance = null;

async function initGraphviz() {
    if (!graphvizInstance) {
        graphvizInstance = await Graphviz.load();
    }
    return graphvizInstance;
}

function createModal() {
    const modal = document.createElement('div');
    modal.className = 'graph-modal';
    
    const content = document.createElement('div');
    content.className = 'graph-modal-content';
    
    const closeBtn = document.createElement('div');
    closeBtn.className = 'graph-modal-close';
    closeBtn.textContent = '×';
    closeBtn.onclick = (e) => {
        modal.classList.remove('visible');
        e.stopPropagation();
    };
    
    // Close modal when clicking the background or pressing Escape
    modal.onclick = () => modal.classList.remove('visible');
    
    // Add event listener for Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('visible')) {
            modal.classList.remove('visible');
        }
    });
    
    // Prevent clicks inside content from closing the modal
    content.onclick = (e) => e.stopPropagation();
    
    content.appendChild(closeBtn);
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    return { modal, content };
}

function setupZoomPan(svg, container) {
    const zoom = d3.zoom()
        .scaleExtent([0.1, 10])
        .on('zoom', (event) => {
            d3.select(svg)
                .attr('transform', event.transform);
        });

    d3.select(container)
        .call(zoom)
        .call(zoom.transform, d3.zoomIdentity.scale(0.7));  // Initial 70% zoom
}

export async function renderGraphviz(dotSource) {
    try {
        const graphviz = await initGraphviz();
        // Add Graphviz options to remove background and set light colors
        // Insert style attributes at the start of the graph block
        const dotWithStyle = dotSource.replace(/{/, `{
            bgcolor="transparent";
            node [shape=none, fontcolor="#e0e0e0"];
            edge [color="#e0e0e0", fontcolor="#e0e0e0"];
        `);
        // Get SVG with explicit size
        const svg = await graphviz.dot(dotWithStyle);
        
        // Parse SVG string to modify attributes
        const parser = new DOMParser();
        const doc = parser.parseFromString(svg, 'image/svg+xml');
        const parsedSvg = doc.documentElement;
        
        // Add preserveAspectRatio to maintain proportions
        parsedSvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        parsedSvg.setAttribute('width', parsedSvg.getAttribute('width') || '300');
        parsedSvg.setAttribute('height', parsedSvg.getAttribute('height') || '200');
        
        // Simplify the paths to straight lines
        const paths = parsedSvg.querySelectorAll('path');
        paths.forEach(path => {
            const d = path.getAttribute('d');
            if (d) {
                // Extract start and end points from the path
                const points = d.match(/-?\d+\.?\d*/g);
                if (points && points.length >= 4) {
                    const start = `${points[0]},${points[1]}`;
                    const end = `${points[points.length-2]},${points[points.length-1]}`;
                    path.setAttribute('d', `M${start} L${end}`);
                }
            }
        });
        
        // Convert back to string
        const modifiedSvg = parsedSvg.outerHTML;
        
        // Create container for the graph
        const container = document.createElement('div');
        container.className = 'graph-container';
        container.innerHTML = modifiedSvg;
        
        // Get the actual SVG element
        const svgElement = container.querySelector('svg');
        
        // Create modal for large view
        const { modal, content } = createModal();
        
        // Handle click to open modal
        container.onclick = (e) => {
            console.log('Graph clicked');
            const modalSvg = svgElement.cloneNode(true);
            content.innerHTML = '';
            content.appendChild(modalSvg);
            modal.classList.add('visible');
            setupZoomPan(modalSvg, content);
            e.stopPropagation();  // Prevent event from bubbling up
        };
        
        return container;
    } catch (error) {
        console.error('Graphviz rendering failed:', error);
        return `<pre class="error">Failed to render graph:\n${error.message}</pre>`;
    }
}