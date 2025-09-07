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
                    
                    // Register assembly language
                    monaco.languages.register({ id: 'asm' });

                    // Common instructions and registers
                    const instructions = [
                        'mov', 'push', 'pop', 'lea', 'call', 'ret',
                        'add', 'sub', 'mul', 'div', 'inc', 'dec',
                        'and', 'or', 'xor', 'not', 'neg', 'shl', 'shr',
                        'jmp', 'je', 'jne', 'jg', 'jge', 'jl', 'jle',
                        'cmp', 'test',
                        'syscall', 'int'
                    ];

                    const registers = [
                        // x86_64
                        'rax', 'rbx', 'rcx', 'rdx', 'rsi', 'rdi', 'rbp', 'rsp',
                        'r8', 'r9', 'r10', 'r11', 'r12', 'r13', 'r14', 'r15',
                        // x86
                        'eax', 'ebx', 'ecx', 'edx', 'esi', 'edi', 'ebp', 'esp',
                        // ARM64
                        'x0', 'x1', 'x2', 'x3', 'x4', 'x5', 'x6', 'x7',
                        'x8', 'x9', 'x10', 'x11', 'x12', 'x13', 'x14', 'x15',
                        'x16', 'x17', 'x18', 'x19', 'x20', 'x21', 'x22', 'x23',
                        'x24', 'x25', 'x26', 'x27', 'x28', 'x29', 'x30',
                        'sp', 'pc', 'xzr'
                    ];

                    monaco.languages.setMonarchTokensProvider('asm', {
                        defaultToken: '',
                        tokenPostfix: '.asm',

                        // Brackets and operators
                        brackets: [
                            { token: 'delimiter.curly', open: '{', close: '}' },
                            { token: 'delimiter.square', open: '[', close: ']' },
                            { token: 'delimiter.parenthesis', open: '(', close: ')' },
                            { token: 'delimiter.angle', open: '<', close: '>' }
                        ],

                        // Assembly keywords
                        keywords: [
                            'section', 'global', 'extern', 'align',
                            'db', 'dw', 'dd', 'dq', 'times', 'equ',
                            'byte', 'word', 'dword', 'qword'
                        ],

                        instructions,
                        registers,

                        // Tokenizer
                        tokenizer: {
                            root: [
                                // Labels
                                [/^[.a-zA-Z_]\w*:/, 'type.identifier'],

                                // Comments
                                [/;.*$/, 'comment'],
                                [/\/\/.*$/, 'comment'],

                                // Numbers
                                [/\b\d*\.\d+([eE][-+]?\d+)?\b/, 'number.float'],
                                [/\b0x[0-9a-fA-F]+\b/, 'number.hex'],
                                [/\b\d+\b/, 'number'],

                                // String literals
                                [/'([^'\\]|\\.)*$/, 'string.invalid'],
                                [/'/, 'string', '@string'],

                                // Keywords
                                [/\b(section|global|extern|align)\b/, 'keyword'],
                                [/\b(db|dw|dd|dq|times|equ)\b/, 'keyword'],
                                [/\b(byte|word|dword|qword)\b/, 'keyword'],

                                // Instructions
                                [new RegExp(`\\b(${instructions.join('|')})\\b`), 'keyword.instruction'],

                                // Registers
                                [new RegExp(`\\b(${registers.join('|')})\\b`), 'variable.predefined'],

                                // Operators
                                [/[+\-*/=<>|&^~!]+/, 'operator'],

                                // Identifiers
                                [/[a-zA-Z_]\w*/, {
                                    cases: {
                                        '@keywords': 'keyword',
                                        '@instructions': 'keyword.instruction',
                                        '@registers': 'variable.predefined',
                                        '@default': 'identifier'
                                    }
                                }]
                            ],

                            string: [
                                [/[^\\']+/, 'string'],
                                [/\\./, 'string.escape.invalid'],
                                [/'/, 'string', '@pop']
                            ]
                        }
                    });

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
            case 'assembly':
                return 'asm';  // Use our custom assembly language mode
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