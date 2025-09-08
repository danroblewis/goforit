export function registerHaskellLanguage(monaco) {
    monaco.languages.register({ id: 'haskell' });
    monaco.languages.setMonarchTokensProvider('haskell', {
        tokenizer: {
            root: [
                // Module names
                [/^module\s+([A-Z][A-Za-z0-9._']*)/, 'keyword'],

                // Keywords
                [/\b(module|where|import|data|type|newtype|deriving|do|if|then|else|case|of|let|in|class|instance|default|infix|infixl|infixr|foreign|export|hiding|qualified|as)\b/, 'keyword'],

                // Type constructors and classes (both start with capital letter)
                [/\b[A-Z][A-Za-z0-9_']*\b/, 'type'],

                // Function names and variables
                [/\b[a-z][A-Za-z0-9_']*\b/, 'identifier'],

                // Numbers
                [/\b\d+(\.\d+)?(e[+-]?\d+)?\b/, 'number'],

                // Strings
                [/"([^"\\]|\\.)*$/, 'string.invalid'],  // non-terminated string
                [/"/, { token: 'string.quote', bracket: '@open', next: '@string' }],

                // Characters
                [/'[^\\']'/, 'string'],
                [/'/, 'string.invalid'],

                // Comments
                [/--.*$/, 'comment'],
                [/{-/, 'comment', '@comment'],

                // Operators
                [/[=><:!#$%&*+.\\\/\-?@\\^|~]+/, 'operator'],

                // Delimiters
                [/[{}()\[\]]/, '@brackets'],
                [/[,;]/, 'delimiter'],
            ],

            comment: [
                [/[^{-]/, 'comment'],
                [/{-/, 'comment', '@push'],
                [/-}/, 'comment', '@pop'],
                [/./, 'comment']
            ],

            string: [
                [/[^\\"]+/, 'string'],
                [/\\./, 'string.escape'],
                [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }]
            ],
        }
    });
}
