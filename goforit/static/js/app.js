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
                        // Data movement
                        'mov', 'push', 'pop', 'lea', 'xchg', 'cmov[a-z]+',
                        // Stack
                        'pushf[d|q]?', 'popf[d|q]?', 'enter', 'leave',
                        // Arithmetic
                        'add', 'sub', 'mul', 'div', 'imul', 'idiv', 'inc', 'dec',
                        'neg', 'adc', 'sbb', 'cmp',
                        // Logical
                        'and', 'or', 'xor', 'not', 'test',
                        // Shifts and rotates
                        'sh[lr][d|q|w|b]?', 'sa[lr][d|q|w|b]?', 'ro[lr][d|q|w|b]?', 'rc[lr][d|q|w|b]?',
                        // Bit manipulation
                        'bt[s|r|c]?', 'bs[f|r]',
                        // Control flow
                        'jmp', 'j[a-z]+', 'call', 'ret', 'loop[a-z]*',
                        // System
                        'syscall', 'sysenter', 'sysexit', 'sysret', 'int',
                        'cli', 'sti', 'hlt', 'nop', 'ud2',
                        // x87 FPU
                        'f[a-z]+',
                        // SSE/AVX
                        '[v]?(add|sub|mul|div|min|max)[ps][ds]',
                        '[v]?mov[au]?ps',
                        '[v]?unpck[hl]ps',
                        // ARM64 memory
                        'ldr[b|h|w|x]?', 'str[b|h|w|x]?', 'stp', 'ldp',
                        // ARM64 address calculation
                        'adr', 'adrp',
                        // ARM64 arithmetic
                        'add', 'sub', 'mul', 'udiv', 'sdiv', 'madd', 'msub',
                        'mneg', 'smulh', 'umulh', 'sdiv', 'udiv',
                        // ARM64 logical
                        'and', 'orr', 'eor', 'ands', 'bic', 'bics', 'eon',
                        // ARM64 comparison
                        'cmp', 'tst', 'ccmp', 'ccmn',
                        // ARM64 branches
                        'b', 'b\\.[a-z]+', 'bl', 'ret', 'br', 'blr', 'cbz', 'cbnz',
                        'tbz', 'tbnz',
                        // ARM64 system
                        'svc', 'msr', 'mrs', 'sys', 'sysl', 'ic', 'dc', 'isb',
                        'dmb', 'dsb',
                        // ARM64 data movement
                        'mov[k|n|z]?', 'mvn',
                        // ARM64 shifts
                        'lsl', 'lsr', 'asr', 'ror', 'asrv', 'lslv', 'lsrv', 'rorv',
                        // ARM64 bit manipulation
                        'cls', 'clz', 'rbit', 'rev', 'rev16', 'rev32', 'rev64'
                    ];

                    const registers = [
                        // x86_64 general purpose
                        '[re]?[abcd]x', '[re]?[sb]p', '[re]?[sd]i', 'r[0-9]+[dwb]?',
                        // x86_64 segments
                        '[c-g]s', 'fs', 'ss',
                        // x86_64 control
                        'cr[0-4]', 'dr[0-7]',
                        // x86_64 MMX
                        'mm[0-7]',
                        // x86_64 SSE/AVX
                        'xmm[0-9]+', 'ymm[0-9]+', 'zmm[0-9]+',
                        // ARM64 general purpose
                        '[xw][0-9]+',
                        // ARM64 special
                        'sp', 'pc', 'xzr', 'wzr', 'lr',
                        // ARM64 SIMD/FP
                        '[vq][0-9]+', '[bhsdq][0-9]+',
                        // ARM64 system
                        'fpsr', 'fpcr', 'cpsr', 'spsr', 'nzcv', 'daif',
                        // ARM64 barriers
                        'sy', 'oshld', 'oshst', 'osh', 'nshld', 'nshst',
                        'nsh', 'ishld', 'ishst', 'ish', 'ld', 'st'
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
                            // Sections and scope
                            'section', 'segment', 'global', 'extern', 'local',
                            'align', 'default', 'rel', 'abs',
                            // Data definition
                            'db', 'dw', 'dd', 'dq', 'dt', 'do', 'dy',
                            'resb', 'resw', 'resd', 'resq', 'rest', 'reso', 'resy',
                            'times', 'equ', 'byte', 'word', 'dword', 'qword',
                            // Macros and conditionals
                            'macro', 'endm', 'istruc', 'at', 'iend',
                            'if', 'else', 'endif', 'ifdef', 'ifndef',
                            // ARM64 directives
                            '.text', '.data', '.bss', '.rodata',
                            '.global', '.local', '.comm', '.ascii', '.asciz',
                            '.byte', '.short', '.long', '.quad', '.float', '.double',
                            '.align', '.balign', '.p2align',
                            // ARM64 operators
                            'lsl', 'lsr', 'asr', 'ror',
                            // ARM64 addressing
                            '@PAGE', '@PAGEOFF'
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
                                [/\/\*/, 'comment', '@comment'],

                                // Numbers
                                [/\b\d*\.\d+([eE][-+]?\d+)?\b/, 'number.float'],
                                [/\b0x[0-9a-fA-F]+\b/, 'number.hex'],
                                [/\b[0-9]+\b/, 'number'],
                                [/\b0b[01]+\b/, 'number.binary'],
                                [/#-?\d+/, 'number'],  // ARM64 immediate values

                                // String literals
                                [/'([^'\\]|\\.)*$/, 'string.invalid'],
                                [/'/, 'string', '@string'],
                                [/"([^"\\]|\\.)*$/, 'string.invalid'],
                                [/"/, 'string', '@string_double'],

                                // Keywords
                                [/\.[a-zA-Z]\w*\b/, 'keyword'],
                                [/\b(section|segment|global|extern|align|default|rel|abs)\b/, 'keyword'],
                                [/\b(db|dw|dd|dq|dt|do|dy|resb|resw|resd|resq|rest|reso|resy|times|equ)\b/, 'keyword'],
                                [/\b(byte|word|dword|qword|ptr)\b/, 'keyword'],

                                // Instructions (using regex patterns)
                                [new RegExp(`\\b(${instructions.join('|')})\\b`, 'i'), 'keyword.instruction'],

                                // Registers (using regex patterns)
                                [new RegExp(`\\b(${registers.join('|')})\\b`, 'i'), 'variable.predefined'],

                                // Operators
                                [/[+\-*/=<>|&^~!]+/, 'operator'],
                                [/@(PAGE|PAGEOFF)/, 'operator'],  // ARM64 relocation operators

                                // Identifiers
                                [/[a-zA-Z_$][\w$]*/, {
                                    cases: {
                                        '@keywords': 'keyword',
                                        '@instructions': 'keyword.instruction',
                                        '@registers': 'variable.predefined',
                                        '@default': 'identifier'
                                    }
                                }]
                            ],

                            comment: [
                                [/[^/*]+/, 'comment'],
                                [/\/\*/, 'comment', '@push'],
                                [/\*\//, 'comment', '@pop'],
                                [/[/*]/, 'comment']
                            ],

                            string: [
                                [/[^\\']+/, 'string'],
                                [/\\./, 'string.escape'],
                                [/'/, 'string', '@pop']
                            ],

                            string_double: [
                                [/[^\\"]+/, 'string'],
                                [/\\./, 'string.escape'],
                                [/"/, 'string', '@pop']
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