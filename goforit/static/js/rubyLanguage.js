export function registerRubyLanguage(monaco) {
    monaco.languages.register({ id: 'ruby' });
    monaco.languages.setMonarchTokensProvider('ruby', {
        tokenizer: {
            root: [
                // Comments
                [/#.*$/, 'comment'],
                [/^=begin\s*$/, { token: 'comment', next: '@multilineComment' }],

                // Keywords
                [/\b(BEGIN|END|alias|and|begin|break|case|class|def|defined\?|do|else|elsif|end|ensure|false|for|if|in|module|next|nil|not|or|redo|rescue|retry|return|self|super|then|true|undef|unless|until|when|while|yield)\b/, 'keyword'],

                // Built-in functions
                [/\b(puts|print|require|require_relative|include|extend|attr_reader|attr_writer|attr_accessor|raise|fail|catch|throw|private|protected|public)\b/, 'keyword'],

                // Instance variables
                [/@[a-zA-Z_]\w*/, 'variable'],

                // Class variables
                [/@@[a-zA-Z_]\w*/, 'variable'],

                // Global variables
                [/\$[a-zA-Z_]\w*/, 'variable'],

                // Constants and class names
                [/\b[A-Z]\w*\b/, 'type'],

                // Symbols
                [/:[a-zA-Z_]\w*/, 'string'],

                // Numbers
                [/\b\d+(\.\d+)?(e[+-]?\d+)?\b/i, 'number'],

                // Strings
                [/"/, { token: 'string.quote', bracket: '@open', next: '@string_double' }],
                [/'/, { token: 'string.quote', bracket: '@open', next: '@string_single' }],
                [/%[qQrwWx]?[^\w\s{([]/, { token: '@rematch', next: '@qstring' }],

                // Regular expressions
                [/\/(?![\/\s])(?:[^\/\\\n]|\\.)*\/[gim]*/, 'regexp'],

                // Operators
                [/[=!<>+\-*/%&|^~]+/, 'operator'],

                // Method calls
                [/\b[a-z_]\w*[!?]?(?=\s*[({])/, 'function'],

                // Delimiters
                [/[{}()\[\]]/, '@brackets'],
                [/[;,]/, 'delimiter'],
            ],

            multilineComment: [
                [/^=end\s*$/, { token: 'comment', next: '@pop' }],
                [/.+/, 'comment'],
            ],

            string_double: [
                [/[^\\"]+/, 'string'],
                [/\\./, 'string.escape'],
                [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }]
            ],

            string_single: [
                [/[^\\']+/, 'string'],
                [/\\./, 'string.escape'],
                [/'/, { token: 'string.quote', bracket: '@close', next: '@pop' }]
            ],

            qstring: [
                [/[^\\"]+/, 'string'],
                [/\\./, 'string.escape'],
                [/./, { token: '@rematch', next: '@pop' }]
            ],
        }
    });
}
