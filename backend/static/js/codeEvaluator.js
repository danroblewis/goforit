import { highlightAssembly } from './assemblyHighlighter.js';

export class CodeEvaluator {
    constructor() {
        this.isEvaluating = false;
        this.pendingEvaluation = null;
    }

    async evaluateCode(code, language) {
        this.isEvaluating = true;

        try {
            const response = await fetch('/api/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, language })
            });

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Evaluation error:', error);
            return {
                stdout: '',
                stderr: error.message,
                return_code: 1,
                code_outputs: []
            };
        } finally {
            this.isEvaluating = false;
        }
    }

    async loadLastCode() {
        try {
            const response = await fetch('/api/last-code');
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Failed to load last code:', error);
            return null;
        }
    }

    queueEvaluation(code, language) {
        if (!this.isEvaluating) {
            return this.evaluateCode(code, language);
        } else {
            this.pendingEvaluation = { code, language };
            return null;
        }
    }

    async processPendingEvaluation() {
        if (this.pendingEvaluation) {
            const { code, language } = this.pendingEvaluation;
            this.pendingEvaluation = null;
            return await this.evaluateCode(code, language);
        }
        return null;
    }
}

export function updateBackgroundColor(result) {
    const hasError = result.return_code !== 0 || result.stderr.trim() !== '';
    document.body.style.backgroundColor = hasError ? '#2a1a1a' : // darker grayish red
                                        (result.stdout.trim() !== '' ? '#1a2a1a' : '#2a2a2a'); // darker grayish green : dark gray
}

export function renderOutput(outputDiv, result) {
    outputDiv.innerHTML = '';

    // Display code outputs first (assembly)
    if (result.code_outputs && result.code_outputs.length > 0) {
        const codeOutputsDiv = document.createElement('div');
        codeOutputsDiv.className = 'code-output-block';
        
        result.code_outputs.forEach(output => {
            if (output.language && output.language.startsWith('asm-')) {
                codeOutputsDiv.innerHTML += highlightAssembly(output.content) + '\n';
            } else {
                codeOutputsDiv.textContent += output.content + '\n';
            }
        });

        // Add separator
        codeOutputsDiv.innerHTML += '='.repeat(80) + '\n\n';
        outputDiv.appendChild(codeOutputsDiv);
    }

    // Then display stdout/stderr
    if (result.stdout) {
        outputDiv.innerHTML += `<div class="output-label">Output:</div>${result.stdout}\n`;
    }
    if (result.stderr) {
        outputDiv.innerHTML += `<div class="error-label">Errors:</div>${result.stderr}`;
    }
}
