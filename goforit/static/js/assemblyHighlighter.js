function escapeHtml(unsafe) {
    return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

export function highlightAssembly(text) {
    const lines = text.split('\n');
    return lines.map(line => {
        line = escapeHtml(line);

        // Skip empty lines
        if (!line.trim()) {
            return line;
        }

        // Handle Java bytecode output
        if (line.match(/^\s*[0-9]+:/)) {  // Lines starting with instruction offsets
            return highlightJavaBytecode(line);
        }

        // Comments (both ; and //)
        if (line.trim().startsWith(';') || line.trim().startsWith('//')) {
            return `<span class="asm-comment">${line}</span>`;
        }

        // Handle gcc -S style comments (after instruction)
        const commentMatch = line.match(/(.*?)#(.*)/);
        if (commentMatch) {
            const [, code, comment] = commentMatch;
            line = `${code}<span class="asm-comment">#${comment}</span>`;
        }

        // Sections and directives
        if (line.trim().startsWith('.')) {
            return `<span class="asm-directive">${line}</span>`;
        }

        // Labels (including function names)
        if (line.match(/^[a-zA-Z0-9_$.]+:/)) {
            return `<span class="asm-label">${line}</span>`;
        }

        // Instruction patterns
        const patterns = [
            // Common x86/x86_64 instructions
            { pattern: /\b(mov|push|pop|call|ret|lea|jmp|je|jne|jg|jge|jl|jle|add|sub|mul|div|and|or|xor|not|shl|shr|test|cmp)\b/g, class: 'asm-mnemonic' },
            // Additional x86/x86_64 instructions
            { pattern: /\b(adc|sbb|inc|dec|neg|imul|idiv|bswap|bt|bts|btr|btc|rol|ror|rcl|rcr|sal|sar|setcc|cmove|cmovne|cmova|cmovae|cmovb|cmovbe|cmovg|cmovge|cmovl|cmovle)\b/g, class: 'asm-mnemonic' },
            // SIMD instructions
            { pattern: /\b(movups|movaps|movdqu|movdqa|paddb|paddw|paddd|paddq|psubb|psubw|psubd|psubq|pmullw|pmulld|pand|por|pxor|psllw|pslld|psllq|psrlw|psrld|psrlq|pcmpeqb|pcmpeqw|pcmpeqd)\b/g, class: 'asm-mnemonic' },
            // ARM64 instructions
            { pattern: /\b(ldr|str|mov|add|sub|mul|udiv|sdiv|and|orr|eor|mvn|lsl|lsr|asr|cmp|tst|b|bl|ret|stp|ldp|adrp|adr)\b/g, class: 'asm-mnemonic' },
            // x86/x86_64 registers
            { pattern: /\b(rax|rbx|rcx|rdx|rsi|rdi|rbp|rsp|r8|r9|r10|r11|r12|r13|r14|r15|eax|ebx|ecx|edx|esi|edi|ebp|esp|ax|bx|cx|dx|si|di|bp|sp|al|bl|cl|dl)\b/g, class: 'asm-register' },
            // ARM64 registers
            { pattern: /\b(x[0-9]|x1[0-9]|x2[0-9]|x30|w[0-9]|w1[0-9]|w2[0-9]|w30|sp|pc|xzr|wzr)\b/g, class: 'asm-register' },
            // SIMD registers
            { pattern: /\b(xmm[0-9]|xmm1[0-5]|ymm[0-9]|ymm1[0-5]|zmm[0-9]|zmm1[0-5])\b/g, class: 'asm-register' },
            // Numbers (hex, decimal, octal)
            { pattern: /(^|\s|,|\[)([\-+]?(0x[0-9a-fA-F]+|\d+))\b/g, class: 'asm-number', group: 2 },
            // Sections
            { pattern: /\.(text|data|bss|rodata|section)\b/g, class: 'asm-section' },
            // Directives
            { pattern: /\.(global|globl|extern|align|byte|word|long|quad|ascii|asciz|string|size|type)\b/g, class: 'asm-directive' }
        ];

        // Apply all patterns
        patterns.forEach(({ pattern, class: className, group = 0 }) => {
            line = line.replace(pattern, (match, ...args) => {
                const target = group === 0 ? match : args[group - 1];
                return `<span class="${className}">${target}</span>${group === 0 ? '' : match.slice(target.length)}`;
            });
        });

        return line;
    }).join('\n');
}

function highlightJavaBytecode(line) {
    // Highlight instruction offset
    line = line.replace(/^(\s*\d+:)/, '<span class="asm-number">$1</span>');

    // Java bytecode instructions
    const instructions = [
        // Stack operations
        'aload', 'iload', 'lload', 'fload', 'dload', 'astore', 'istore', 'lstore', 'fstore', 'dstore',
        'dup', 'dup_x1', 'dup_x2', 'dup2', 'dup2_x1', 'dup2_x2', 'pop', 'pop2', 'swap',
        // Arithmetic operations
        'iadd', 'ladd', 'fadd', 'dadd', 'isub', 'lsub', 'fsub', 'dsub',
        'imul', 'lmul', 'fmul', 'dmul', 'idiv', 'ldiv', 'fdiv', 'ddiv',
        'irem', 'lrem', 'frem', 'drem', 'ineg', 'lneg', 'fneg', 'dneg',
        // Control flow
        'ifeq', 'ifne', 'iflt', 'ifge', 'ifgt', 'ifle', 'if_icmpeq', 'if_icmpne',
        'if_icmplt', 'if_icmpge', 'if_icmpgt', 'if_icmple', 'if_acmpeq', 'if_acmpne',
        'goto', 'jsr', 'ret', 'tableswitch', 'lookupswitch', 'ireturn', 'lreturn',
        'freturn', 'dreturn', 'areturn', 'return',
        // Object operations
        'getstatic', 'putstatic', 'getfield', 'putfield', 'invokevirtual', 'invokespecial',
        'invokestatic', 'invokeinterface', 'invokedynamic', 'new', 'newarray', 'anewarray',
        'arraylength', 'athrow', 'checkcast', 'instanceof', 'monitorenter', 'monitorexit',
        // Constants
        'nop', 'aconst_null', 'iconst_m1', 'iconst_0', 'iconst_1', 'iconst_2', 'iconst_3',
        'iconst_4', 'iconst_5', 'lconst_0', 'lconst_1', 'fconst_0', 'fconst_1', 'fconst_2',
        'dconst_0', 'dconst_1', 'bipush', 'sipush', 'ldc'
    ];

    // Create a single regex pattern for all instructions
    const instructionPattern = new RegExp(`\\b(${instructions.join('|')})\\b`, 'g');
    line = line.replace(instructionPattern, '<span class="asm-mnemonic">$1</span>');

    // Highlight references to the constant pool (#123)
    line = line.replace(/#(\d+)/g, '<span class="asm-number">#$1</span>');

    // Highlight type descriptors (e.g., Ljava/lang/String;)
    line = line.replace(/([LB-Z][\w\/$]+;?)/g, '<span class="asm-directive">$1</span>');

    return line;
}