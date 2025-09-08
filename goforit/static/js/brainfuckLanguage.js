export function registerBrainfuckLanguage(monaco) {
    monaco.languages.register({ id: 'brainfuck' });
    monaco.languages.setMonarchTokensProvider('brainfuck', {
        tokenizer: {
            root: [
                // Data pointer operations
                [/[><]/, 'operator'],

                // Memory operations
                [/[+-]/, 'number'],

                // I/O operations
                [/[.,]/, 'string'],

                // Loop operations
                [/[\[\]]/, 'delimiter.bracket'],

                // Comments (anything else)
                [/[^><+\-.,\[\]]/, 'comment'],
            ],
        }
    });
}
