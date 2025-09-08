import { formatHexdump } from './hexdumpHighlighter.js';
import { highlightAssembly } from './assemblyHighlighter.js';

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

function toggleCollapse(contentId, title) {
    const content = document.getElementById(contentId);
    const isCollapsed = content.classList.toggle('collapsed');
    collapsedSections.set(title, isCollapsed);
}

function createCollapsibleSection(title, content, language) {
    const sectionId = `section-${Math.random().toString(36).substr(2, 9)}`;
    const contentId = `content-${sectionId}`;
    const wasCollapsed = collapsedSections.get(title) ?? true; // Default to collapsed

    const section = document.createElement('div');
    section.className = 'code-output-block';

    const header = document.createElement('div');
    header.className = 'collapsible-header';
    header.innerHTML = `<span class="collapsible-title">${title}</span>`;

    const contentDiv = document.createElement('div');
    contentDiv.id = contentId;
    contentDiv.className = 'collapsible-content';
    if (wasCollapsed) {
        contentDiv.classList.add('collapsed');
    }
    
    if (language && language.startsWith('asm-')) {
        contentDiv.innerHTML = highlightAssembly(content);
    } else if (language === 'hexdump-binary') {
        contentDiv.innerHTML = formatHexdump(content);
    } else {
        contentDiv.innerHTML = `<pre>${escapeHtml(content)}</pre>`;
    }

    section.appendChild(header);
    section.appendChild(contentDiv);

    header.addEventListener('click', () => toggleCollapse(contentId, title));
    collapsedSections.set(title, wasCollapsed);

    return section;
}

export function renderOutput(outputDiv, result) {
    const domStart = performance.now();

    // Create a document fragment to build the DOM off-screen
    const fragment = document.createDocumentFragment();

    // Display code outputs first (assembly, objdump, hexdump)
    if (result.code_outputs && result.code_outputs.length > 0) {
        result.code_outputs.forEach(output => {
            let title;
            if (output.language === 'asm-intel') {
                title = 'Assembly Output (gcc -S)';
            } else if (output.language && output.language.startsWith('asm-')) {
                title = `Disassembly (${output.language.replace('asm-', '')})`;
            } else if (output.language === 'hexdump-binary') {
                title = 'Binary Hexdump';
            } else {
                title = 'Additional Output';
            }

            const section = createCollapsibleSection(title, output.content, output.language);
            fragment.appendChild(section);
        });
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
        this.nextEvaluation = null;
    }

    async queueEvaluation(code, language) {
        // Store this as the next evaluation to run
        this.nextEvaluation = { code, language };

        // If we're already evaluating, let that finish
        if (this.currentEvaluation) {
            return null;
        }

        // Start processing the queue
        return this._processQueue();
    }

    async _processQueue() {
        while (this.nextEvaluation) {
            // Take the next evaluation
            const { code, language } = this.nextEvaluation;
            this.nextEvaluation = null;

            // Create a new AbortController for this request
            const controller = new AbortController();
            
            try {
                const start = performance.now();
                this.currentEvaluation = fetch('/api/evaluate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code, language }),
                    signal: controller.signal
                });

                // Wait for the response
                const response = await this.currentEvaluation;
                const result = await response.json();
                console.log(`API request time: ${(performance.now() - start).toFixed(1)}ms`);

                // If there's no next evaluation, return the result
                if (!this.nextEvaluation) {
                    return result;
                }

                // Otherwise, continue the loop to process the next evaluation
            } catch (error) {
                if (error.name === 'AbortError') {
                    // Ignore abort errors, just continue with the next evaluation
                    continue;
                }
                throw error;
            } finally {
                this.currentEvaluation = null;
            }
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