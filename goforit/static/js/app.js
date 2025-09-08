import { CodeEvaluator, updateBackgroundColor, renderOutput, clearCollapsedState } from './codeEvaluator.js';
import { registerAssemblyLanguage } from './assemblyLanguage.js';
import { registerHaskellLanguage } from './haskellLanguage.js';
import { registerPrologLanguage } from './prologLanguage.js';

export class App {
    constructor() {
        this.editor = null;
        this.monaco = null;
        this.evaluator = new CodeEvaluator();
        this.examples = {
            'python': '/static/examples/Python.py',
            'javascript': '/static/examples/JavaScript.js',
            'typescript': '/static/examples/TypeScript.ts',
            'java': '/static/examples/Example.java',
            'cpp': '/static/examples/CPP.cpp',
            'c': '/static/examples/C.c',
            'assembly_x86': '/static/examples/assembly_x86.asm',
            'assembly_x86_64': '/static/examples/assembly_x86_64.asm',
            'assembly_arm64': '/static/examples/assembly_arm64.asm',
            'rust': '/static/examples/Rust.rs',
            'go': '/static/examples/Go.go',
            'haskell': '/static/examples/Haskell.hs',
            'prolog': '/static/examples/Prolog.pl'
        };
    }

    async loadMonaco() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs/loader.js';
            script.onload = () => {
                require.config({ 
                    paths: { 
                        vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs',
                    }
                });
                require(['vs/editor/editor.main'], (monaco) => {
                    this.monaco = monaco;
                    registerAssemblyLanguage(monaco);
                    registerHaskellLanguage(monaco);
                    registerPrologLanguage(monaco);
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
            case 'assembly_x86':
            case 'assembly_x86_64':
            case 'assembly_arm64':
                return 'asm';
            case 'haskell':
                return 'haskell';
            case 'prolog':
                return 'prolog';
            default:
                return selectedLanguage;
        }
    }

    async loadExample(language) {
        const url = this.examples[language];
        if (!url) return;

        try {
            const response = await fetch(url);
            const code = await response.text();
            this.editor.setValue(code);
            // For assembly examples, always set the language selector to 'assembly'
            const displayLanguage = language.startsWith('assembly_') ? 'assembly' : language;
            document.getElementById('language').value = displayLanguage;
            this.monaco.editor.setModelLanguage(this.editor.getModel(), this.getEditorLanguage(language));
            this.handleEditorChange();
        } catch (error) {
            console.error('Failed to load example:', error);
        }
    }

    setupExamplesMenu() {
        const button = document.getElementById('examples-button');
        const menu = document.getElementById('examples-menu');

        // Create menu items
        Object.entries(this.examples).forEach(([language, _]) => {
            const item = document.createElement('div');
            item.className = 'example-item';
            // Format the display name
            let displayName = language
                .split('_')
                .map(part => part.charAt(0).toUpperCase() + part.slice(1))
                .join(' ');
            // Special case for assembly examples
            if (language.startsWith('assembly_')) {
                displayName = `Assembly (${language.split('_')[1].toUpperCase()})`;
            }
            item.textContent = displayName;
            item.addEventListener('click', () => {
                this.loadExample(language);
                menu.classList.remove('visible');
            });
            menu.appendChild(item);
        });

        // Toggle menu
        button.addEventListener('click', () => {
            menu.classList.toggle('visible');
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!button.contains(e.target) && !menu.contains(e.target)) {
                menu.classList.remove('visible');
            }
        });
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
        this.setupExamplesMenu();

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
        clearCollapsedState();
        this.handleEditorChange();
    }

    updateUI(result) {
        const outputDiv = document.getElementById('output');
        renderOutput(outputDiv, result);
        updateBackgroundColor(result);
    }
}