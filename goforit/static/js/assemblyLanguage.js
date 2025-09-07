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

const keywords = [
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
];

export function registerAssemblyLanguage(monaco) {
    // Register assembly language
    monaco.languages.register({ id: 'asm' });

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

        keywords,
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
}
