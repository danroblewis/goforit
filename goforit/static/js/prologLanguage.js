export function registerPrologLanguage(monaco) {
    monaco.languages.register({ id: 'prolog' });
    monaco.languages.setMonarchTokensProvider('prolog', {
        tokenizer: {
            root: [
                // Comments
                [/%.*$/, 'comment'],

                // Built-in predicates
                [/\b(write|nl|halt|fail|true|false|not|call|catch|throw|repeat|cut|assert|retract|consult|use_module)\b/, 'keyword'],

                // Operators
                [/:-|!|,|;|\+|-|\*|\/|=|<|>|=<|>=|==|=:=|=\\=|\\=|\\==|\\.|\bis\b/, 'operator'],

                // Variables (start with uppercase or underscore)
                [/\b[A-Z_]\w*\b/, 'variable'],

                // Atoms (start with lowercase)
                [/\b[a-z]\w*\b/, 'identifier'],

                // Numbers
                [/\b\d+(\.\d+)?\b/, 'number'],

                // Strings
                [/"([^"\\]|\\.)*$/, 'string.invalid'],  // non-terminated string
                [/"/, { token: 'string.quote', bracket: '@open', next: '@string' }],

                // Lists
                [/[\[\]]/, 'delimiter.square'],

                // Parentheses
                [/[()]/, 'delimiter.parenthesis'],
            ],

            string: [
                [/[^\\"]+/, 'string'],
                [/\\./, 'string.escape'],
                [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }]
            ],
        }
    });
}
