function escapeHtml(unsafe) {
    return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function highlightInstruction(instrPart) {
    // Highlight the mnemonic (first word, including conditional suffixes)
    const mnemonicMatch = instrPart.match(/^\s*(\w+\.?\w*)/);
    if (mnemonicMatch) {
        const mnemonic = mnemonicMatch[1].toLowerCase().replace('.', '_');
        instrPart = instrPart.replace(mnemonicMatch[1], `<span class="asm-mnemonic arm-${mnemonic} asm-tooltip">${mnemonicMatch[1]}</span>`);
    }
    
    // Highlight registers with specific classes
    instrPart = instrPart.replace(/\b(x[0-9]|x1[0-9]|x2[0-9]|x30|w[0-9]|w1[0-9]|w2[0-9]|w30|sp|pc|xzr|wzr)\b/g, 
        (match) => `<span class="asm-register reg-${match} asm-tooltip">${match}</span>`);
    
    // Highlight immediate values and addresses
    instrPart = instrPart.replace(/(#-?0x[0-9a-f]+|#-?\d+|\[.*?\])/gi, 
        '<span class="asm-number">$1</span>');
    
    return instrPart;
}

export function highlightAssembly(text) {
    const lines = text.split('\n');
    return lines.map(line => {
        line = escapeHtml(line);

        // Skip empty lines
        if (!line.trim()) {
            return line;
        }

        // Handle objdump style disassembly
        if (line.match(/^[0-9a-f]+:/i)) {  // Lines starting with hex address
            return highlightObjdump(line);
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
            return `${highlightInstruction(code)}<span class="asm-comment">#${comment}</span>`;
        }

        // Sections and directives
        if (line.trim().startsWith('.')) {
            return `<span class="asm-directive">${line}</span>`;
        }

        // Labels (including function names)
        if (line.match(/^[a-zA-Z0-9_$.]+:/)) {
            return `<span class="asm-label">${line}</span>`;
        }

        // For regular instruction lines
        return highlightInstruction(line);
    }).join('\n');
}

function highlightObjdump(line) {
    // Match the components of an objdump line:
    // 1. Address
    // 2. Machine code
    // 3. Instruction and operands
    const match = line.match(/^([0-9a-f]+):\s+([0-9a-f]+)\s+(.+)$/i);
    if (match) {
        const [, address, machineCode, instruction] = match;
        
        // Start with the address in a different color
        let result = `<span class="asm-number">${address}:</span> `;
        
        // Add the machine code in a muted color
        result += `<span class="asm-comment">${machineCode}</span>\t`;
        
        // Process the instruction part using the common highlighter
        result += highlightInstruction(instruction);
        return result;
    }
    
    // If it's a function label or other special line, highlight appropriately
    if (line.match(/^[0-9a-f]+ <.*>:$/i)) {
        return `<span class="asm-label">${line}</span>`;
    }
    
    // For section headers or other informational lines
    if (line.startsWith('Disassembly of section') || line.includes('file format')) {
        return `<span class="asm-directive">${line}</span>`;
    }
    
    return line;
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