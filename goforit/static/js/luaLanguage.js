export function registerLuaLanguage(monaco) {
    monaco.languages.register({ id: 'lua' });
    monaco.languages.setMonarchTokensProvider('lua', {
        tokenizer: {
            root: [
                // Comments
                [/--\[\[.*?\]\]/, 'comment'],  // Multiline comment
                [/--.*$/, 'comment'],          // Single line comment

                // Keywords
                [/\b(and|break|do|else|elseif|end|false|for|function|goto|if|in|local|nil|not|or|repeat|return|then|true|until|while)\b/, 'keyword'],

                // Built-in functions and variables
                [/\b(assert|collectgarbage|dofile|error|getmetatable|ipairs|load|loadfile|next|pairs|pcall|print|rawequal|rawget|rawlen|rawset|require|select|setmetatable|tonumber|tostring|type|xpcall|_G|_VERSION)\b/, 'keyword'],

                // String library
                [/\b(string)\.(byte|char|dump|find|format|gmatch|gsub|len|lower|match|pack|packsize|rep|reverse|sub|unpack|upper)\b/, 'keyword'],

                // Table library
                [/\b(table)\.(concat|insert|move|pack|remove|sort|unpack)\b/, 'keyword'],

                // Math library
                [/\b(math)\.(abs|acos|asin|atan|ceil|cos|deg|exp|floor|fmod|huge|log|max|maxinteger|min|mininteger|modf|pi|rad|random|randomseed|sin|sqrt|tan|tointeger|type|ult)\b/, 'keyword'],

                // Numbers
                [/\b\d+(\.\d+)?(e[+-]?\d+)?\b/i, 'number'],
                [/\b0x[0-9a-f]+\b/i, 'number'],

                // Strings
                [/"([^"\\]|\\.)*$/, 'string.invalid'],  // non-terminated string
                [/'([^'\\]|\\.)*$/, 'string.invalid'],  // non-terminated string
                [/"/, { token: 'string.quote', bracket: '@open', next: '@string_double' }],
                [/'/, { token: 'string.quote', bracket: '@open', next: '@string_single' }],
                [/\[(=*)\[/, { token: 'string.quote', bracket: '@open', next: '@string_multiline.$1' }],

                // Operators
                [/[=<>~]=|[+\-*/%^#<>]|\.\.|\.\.\./, 'operator'],

                // Delimiters
                [/[{}()\[\]]/, '@brackets'],
                [/[;,]/, 'delimiter'],

                // Identifiers
                [/[a-zA-Z_]\w*/, 'identifier'],
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

            string_multiline: [
                [/[^\]]+/, 'string'],
                [/\](=*)\]/, {
                    cases: {
                        '$1==$S2': { token: 'string.quote', bracket: '@close', next: '@pop' },
                        '@default': 'string'
                    }
                }]
            ],
        }
    });
}
