import { highlightAssembly } from './assemblyHighlighter.js';
import { highlightHexdump } from './hexdumpHighlighter.js';

function escapeHtml(unsafe) {
    return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
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
    } else if (language === 'hexdump') {
        contentDiv.innerHTML = highlightHexdump(content);
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
    outputDiv.innerHTML = '';

    // Display code outputs first (assembly, objdump, hexdump)
    if (result.code_outputs && result.code_outputs.length > 0) {
        result.code_outputs.forEach(output => {
            let title;
            if (output.language === 'asm-intel') {
                title = 'Assembly Output (gcc -S)';
            } else if (output.language && output.language.startsWith('asm-')) {
                title = `Disassembly (${output.language.replace('asm-', '')})`;
            } else if (output.language === 'hexdump') {
                title = 'Binary Hexdump';
            } else {
                title = 'Additional Output';
            }

            const section = createCollapsibleSection(title, output.content, output.language);
            outputDiv.appendChild(section);
        });
    }

    // Then display stdout/stderr as regular sections
    if (result.stdout || result.stderr) {
        if (result.stdout) {
            const stdoutDiv = document.createElement('div');
            stdoutDiv.className = 'program-output';
            stdoutDiv.innerHTML = `<div class="output-label">Program Output</div><pre>${escapeHtml(result.stdout)}</pre>`;
            outputDiv.appendChild(stdoutDiv);
        }

        if (result.stderr) {
            const stderrDiv = document.createElement('div');
            stderrDiv.className = 'program-output';
            stderrDiv.innerHTML = `<div class="error-label">Program Errors</div><pre>${escapeHtml(result.stderr)}</pre>`;
            outputDiv.appendChild(stderrDiv);
        }
    }
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
        this.isEvaluating = false;
        this.pendingEvaluation = null;
        this.currentController = null;
        this.retryTimeout = null;
    }

    async queueEvaluation(code, language) {
        // If there's a pending evaluation, update its code
        if (this.isEvaluating) {
            this.pendingEvaluation = { code, language };
            if (this.currentController) {
                this.currentController.abort();
            }
            return null;
        }

        // Clear any existing retry timeout
        if (this.retryTimeout) {
            clearTimeout(this.retryTimeout);
            this.retryTimeout = null;
        }

        return await this._evaluate(code, language);
    }

    async _evaluate(code, language) {
        this.isEvaluating = true;
        this.currentController = new AbortController();

        try {
            const response = await fetch('/api/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, language }),
                signal: this.currentController.signal
            });

            const result = await response.json();

            // Check if there's a pending evaluation
            if (this.pendingEvaluation) {
                const { code, language } = this.pendingEvaluation;
                this.pendingEvaluation = null;
                this.isEvaluating = false;
                return await this._evaluate(code, language);
            }

            return result;
        } catch (error) {
            if (error.name === 'AbortError') {
                // If we have a pending evaluation, schedule a retry
                if (this.pendingEvaluation) {
                    const { code, language } = this.pendingEvaluation;
                    this.pendingEvaluation = null;
                    this.isEvaluating = false;
                    
                    // Schedule a retry after a short delay
                    return new Promise(resolve => {
                        this.retryTimeout = setTimeout(() => {
                            resolve(this._evaluate(code, language));
                        }, 50); // 50ms delay before retry
                    });
                }
                return null;
            }
            throw error;
        } finally {
            if (!this.pendingEvaluation && !this.retryTimeout) {
                this.isEvaluating = false;
                this.currentController = null;
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