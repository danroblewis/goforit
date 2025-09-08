import { formatHexdump } from './hexdumpHighlighter.js';
import { highlightAssembly } from './assemblyHighlighter.js';
import { renderD3Graph } from './d3GraphRenderer.js';

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Store collapsed state by section title
let collapsedSections = new Map();

export function clearCollapsedState() {
    collapsedSections.clear();
}

function toggleCollapse(sectionId, title) {
    const section = document.getElementById(sectionId);
    const isExpanded = section.classList.toggle('expanded');
    collapsedSections.set(title, !isExpanded);
}

function createCollapsibleSection(title, content, language) {
    const sectionId = `section-${Math.random().toString(36).substr(2, 9)}`;
    const wasCollapsed = collapsedSections.get(title) ?? true; // Default to collapsed

    const section = document.createElement('div');
    section.id = sectionId;
    section.className = 'code-output-block';
    if (!wasCollapsed) {
        section.classList.add('expanded');
    }

    const header = document.createElement('div');
    header.className = 'collapsible-header';
    header.innerHTML = `<span class="collapsible-title">${title}</span>`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'collapsible-content';
    
    if (language && language.startsWith('asm-')) {
        contentDiv.innerHTML = highlightAssembly(content);
    } else if (language === 'hexdump-binary') {
        contentDiv.innerHTML = formatHexdump(content);
    } else if (language === 'graphviz') {
        // Use D3 force-directed graph renderer
        renderD3Graph(content).then(element => {
            contentDiv.innerHTML = '';
            if (typeof element === 'string') {
                contentDiv.innerHTML = element;
            } else {
                contentDiv.appendChild(element);
            }
        }).catch(error => {
            contentDiv.innerHTML = `<pre class="error">Failed to render graph:\n${error.message}</pre>`;
        });
    } else {
        contentDiv.innerHTML = `<pre>${escapeHtml(content)}</pre>`;
    }

    section.appendChild(header);
    section.appendChild(contentDiv);

    header.addEventListener('click', () => toggleCollapse(sectionId, title));
    collapsedSections.set(title, wasCollapsed);

    return section;
}

export function renderOutput(outputDiv, result) {
    const domStart = performance.now();

    // Create a document fragment to build the DOM off-screen
    const fragment = document.createDocumentFragment();

    // Display code outputs first (assembly, objdump, hexdump)
    if (result.code_outputs && result.code_outputs.length > 0) {
        const container = document.createElement('div');
        container.className = 'code-outputs-container';
        
        result.code_outputs.forEach(output => {
            let title;
            if (output.language === 'asm-intel') {
                title = 'Assembly Output (gcc -S)';
            } else if (output.language && output.language.startsWith('asm-')) {
                title = `Disassembly (${output.language.replace('asm-', '')})`;
            } else if (output.language === 'hexdump-binary') {
                title = 'Binary Hexdump';
            } else if (output.language === 'graphviz') {
                title = 'Graph Visualization';
            } else {
                title = 'Additional Output';
            }

            const section = createCollapsibleSection(title, output.content, output.language);
            container.appendChild(section);
        });
        
        fragment.appendChild(container);
    }

    // Then display stdout/stderr as regular sections
    if (result.stdout || result.stderr) {
        if (result.stdout) {
            const stdoutDiv = document.createElement('div');
            stdoutDiv.className = 'program-output';
            stdoutDiv.innerHTML = `<div class="output-label">Program Output</div><pre>${escapeHtml(result.stdout)}</pre>`;
            fragment.appendChild(stdoutDiv);
        }

        if (result.stderr) {
            const stderrDiv = document.createElement('div');
            stderrDiv.className = 'program-output';
            stderrDiv.innerHTML = `<div class="error-label">Program Errors</div><pre>${escapeHtml(result.stderr)}</pre>`;
            fragment.appendChild(stderrDiv);
        }
    }

    const domTime = performance.now() - domStart;
    console.log(`DOM creation time: ${domTime.toFixed(1)}ms`);

    // Clear the output div and add the new content
    // Use requestAnimationFrame to measure actual render time
    requestAnimationFrame(() => {
        const renderStart = performance.now();
        outputDiv.innerHTML = '';
        outputDiv.appendChild(fragment);
        requestAnimationFrame(() => {
            const renderTime = performance.now() - renderStart;
            console.log(`Actual render time: ${renderTime.toFixed(1)}ms`);
        });
    });
}

export function updateBackgroundColor(result) {
    document.body.style.backgroundColor = result.return_code === 0 && (result.stdout || result.code_outputs?.length > 0)
        ? '#1a331a'  // Dark grayish green for success
        : result.return_code !== 0
            ? '#331a1a'  // Dark grayish red for errors
            : '#1a1a1a'; // Dark gray for no output
}

export class CodeEvaluator {
    constructor() {
        this.currentEvaluation = null;
        this.evaluationCount = 0;
        this.timerInterval = null;
        this.currentCode = null;
        this.currentLanguage = null;

        // Create and add timer select
        this.timerSelect = document.createElement('select');
        this.timerSelect.className = 'timer-select';
        this.timerSelect.innerHTML = `
            <option value="">No Auto-Run</option>
            <option value="1000">1s</option>
            <option value="5000">5s</option>
            <option value="10000" selected>10s</option>
            <option value="15000">15s</option>
            <option value="30000">30s</option>
            <option value="60000">1m</option>
            <option value="120000">2m</option>
            <option value="180000">3m</option>
            <option value="300000">5m</option>
        `;
        this.timerSelect.addEventListener('change', () => this.updateTimer());
        document.body.appendChild(this.timerSelect);
        
        // Start with 10s timer, but wait until we have code to run
        this.loadLastCode().then(lastCode => {
            if (lastCode) {
                this.currentCode = lastCode.code;
                this.currentLanguage = lastCode.language;
                this.updateTimer();
            }
        });
    }

    updateTimer() {
        // Clear existing timer
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        // Get selected interval
        const interval = parseInt(this.timerSelect.value);
        if (!interval) return;

        // Set new timer if we have code to run
        if (this.currentCode !== null && this.currentLanguage !== null) {
            this.timerInterval = setInterval(() => {
                this.queueEvaluation(this.currentCode, this.currentLanguage);
            }, interval);
        }
    }

    async queueEvaluation(code, language) {
        // Store current code and language
        this.currentCode = code;
        this.currentLanguage = language;

        // Increment evaluation count
        const thisEvaluation = ++this.evaluationCount;

        try {
            const response = await fetch('/api/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, language })
            });

            const result = await response.json();
            result.isLatest = (thisEvaluation === this.evaluationCount);
            return result;
        } catch (error) {
            console.error('Evaluation failed:', error);
            return null;
        }
    }

    async loadLastCode() {
        try {
            const response = await fetch('/api/last-code');
            return await response.json();
        } catch (error) {
            console.error('Failed to load last code:', error);
            return null;
        }
    }
}