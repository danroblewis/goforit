import { CodeEvaluator, updateBackgroundColor, renderOutput, clearCollapsedState } from './codeEvaluator.js';
import { registerAssemblyLanguage } from './assemblyLanguage.js';

export class App {
    constructor() {
        this.editor = null;
        this.monaco = null;
        this.evaluator = new CodeEvaluator();
    }

    async loadMonaco() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs/loader.js';
            script.onload = () => {
                require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' } });
                require(['vs/editor/editor.main'], (monaco) => {
                    this.monaco = monaco;
                    registerAssemblyLanguage(monaco);
                    resolve();
                });
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    getEditorLanguage(selectedLanguage) {
        switch (selectedLanguage) {
            case 'c':
                return 'c';
            case 'assembly':
                return 'asm';
            default:
                return selectedLanguage;
        }
    }

    async initEditor() {
        await this.loadMonaco();
        const data = await this.evaluator.loadLastCode();
        const initialCode = data?.code || '';
        const initialLanguage = data?.language || 'python';
        const editorLang = this.getEditorLanguage(initialLanguage);

        this.editor = this.monaco.editor.create(document.getElementById('editor'), {
            value: initialCode,
            language: editorLang,
            theme: 'vs-dark',
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: 'on',
            backgroundColor: 'transparent',
            automaticLayout: true
        });

        this.monaco.editor.defineTheme('custom-vs-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [],
            colors: {
                'editor.background': '#00000000'
            }
        });
        this.monaco.editor.setTheme('custom-vs-dark');

        this.setupEventListeners();

        if (data?.code) {
            document.getElementById('language').value = data.language;
            this.editor.setValue(data.code);
        }
    }

    setupEventListeners() {
        this.editor.onDidChangeModelContent(() => {
            this.handleEditorChange();
        });

        document.getElementById('language').addEventListener('change', (e) => {
            this.handleLanguageChange(e);
        });
    }

    async handleEditorChange() {
        const code = this.editor.getValue();
        const language = document.getElementById('language').value;
        const result = await this.evaluator.queueEvaluation(code, language);
        
        if (result) {
            this.updateUI(result);
        }
    }

    handleLanguageChange(e) {
        const newLanguage = e.target.value;
        const editorLang = this.getEditorLanguage(newLanguage);
        this.monaco.editor.setModelLanguage(this.editor.getModel(), editorLang);
        clearCollapsedState(); // Reset collapsed state when changing languages
        this.handleEditorChange();
    }

    updateUI(result) {
        const outputDiv = document.getElementById('output');
        renderOutput(outputDiv, result);
        updateBackgroundColor(result);
    }
}