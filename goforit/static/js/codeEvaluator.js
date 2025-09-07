import { highlightAssembly } from './assemblyHighlighter.js';
import { highlightHexdump } from './hexdumpHighlighter.js';

function escapeHtml(unsafe) {
    return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// Store collapsed state
let collapsedSections = new Map();

export function clearCollapsedState() {
    collapsedSections.clear();
}

function toggleCollapse(contentId) {
    const content = document.getElementById(contentId);
    const button = document.querySelector(`[data-target="${contentId}"]`);
    const isCollapsed = content.classList.toggle('collapsed');
    button.textContent = isCollapsed ? '▼' : '▲';
    collapsedSections.set(contentId, isCollapsed);
}

function createCollapsibleSection(title, content, language) {
    const sectionId = `section-${Math.random().toString(36).substr(2, 9)}`;
    const contentId = `content-${sectionId}`;
    const wasCollapsed = collapsedSections.get(contentId) ?? true; // Default to collapsed

    const section = document.createElement('div');
    section.className = 'code-output-block';
    section.style.padding = '0';

    const header = document.createElement('div');
    header.className = 'collapsible-header';
    header.innerHTML = `
        <span class="collapsible-title">${title}</span>
        <button class="collapsible-button" data-target="${contentId}">
            ${wasCollapsed ? '▼' : '▲'}
        </button>
    `;

    const contentDiv = document.createElement('div');
    contentDiv.id = contentId;
    contentDiv.className = 'collapsible-content';
    if (wasCollapsed) {
        contentDiv.classList.add('collapsed');
    }

    // Add padding to content area
    const contentWrapper = document.createElement('div');
    contentWrapper.style.padding = '10px';
    
    if (language && language.startsWith('asm-')) {
        contentWrapper.innerHTML = highlightAssembly(content);
    } else if (language === 'hexdump') {
        contentWrapper.innerHTML = highlightHexdump(content);
    } else {
        contentWrapper.innerHTML = `<pre>${escapeHtml(content)}</pre>`;
    }

    contentDiv.appendChild(contentWrapper);
    section.appendChild(header);
    section.appendChild(contentDiv);

    header.addEventListener('click', () => toggleCollapse(contentId));
    collapsedSections.set(contentId, wasCollapsed);

    return section;
}

export function renderOutput(outputDiv, result) {
    outputDiv.innerHTML = '';

    // Display code outputs first (assembly, objdump, hexdump)
    if (result.code_outputs && result.code_outputs.length > 0) {
        result.code_outputs.forEach((output, index) => {
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

            if (index < result.code_outputs.length - 1) {
                outputDiv.appendChild(document.createElement('hr'));
            }
        });
    }

    // Then display stdout/stderr
    if (result.stdout || result.stderr) {
        if (result.code_outputs && result.code_outputs.length > 0) {
            outputDiv.appendChild(document.createElement('hr'));
        }

        if (result.stdout) {
            const section = createCollapsibleSection(
                'Program Output',
                result.stdout,
                null
            );
            outputDiv.appendChild(section);
        }

        if (result.stderr) {
            if (result.stdout) {
                outputDiv.appendChild(document.createElement('hr'));
            }
            const section = createCollapsibleSection(
                'Program Errors',
                result.stderr,
                null
            );
            outputDiv.appendChild(section);
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
                return null;
            }
            throw error;
        } finally {
            if (!this.pendingEvaluation) {
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