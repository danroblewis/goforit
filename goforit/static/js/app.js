import { CodeEvaluator, updateBackgroundColor, renderOutput } from './codeEvaluator.js';

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
                    resolve();
                });
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    getEditorLanguage(language) {
        // Map special language modes to their base language for the editor
        switch (language) {
            case 'c_to_asm':
            case 'c_to_objdump':
                return 'c';
            default:
                return language;
        }
    }

    async initEditor() {
        await this.loadMonaco();

        // Load last code first to get the correct initial language
        const data = await this.evaluator.loadLastCode();
        const initialLanguage = data?.language || 'python';
        const editorLang = this.getEditorLanguage(initialLanguage);

        // Create editor with correct initial language
        this.editor = this.monaco.editor.create(document.getElementById('editor'), {
            value: '',
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

        // Set the language dropdown and code after editor is created
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
        this.handleEditorChange();
    }

    updateUI(result) {
        const outputDiv = document.getElementById('output');
        renderOutput(outputDiv, result);
        updateBackgroundColor(result);
    }
}