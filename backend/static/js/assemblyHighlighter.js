export function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export function highlightAssembly(text) {
    const lines = text.split('\n');
    return lines.map(line => {
        // Function header line
        if (line.match(/^[0-9a-f]+ <.*>:$/)) {
            const parts = line.match(/^([0-9a-f]+) <(.*)>:$/);
            if (parts) {
                const [_, addr, label] = parts;
                return `<span class="asm-addr">${escapeHtml(addr)}</span> &lt;<span class="asm-label">${escapeHtml(label)}</span>&gt;:`;
            }
        }

        // Instruction line
        const instrMatch = line.match(/^\s*([0-9a-f]+): ([0-9a-f]+)\s+([a-z0-9.]+)\s+(.*)$/);
        if (instrMatch) {
            let [_, addr, bytes, mnemonic, rest] = instrMatch;
            
            let highlighted = `      <span class="asm-addr">${escapeHtml(addr)}</span>: <span class="asm-bytes">${escapeHtml(bytes)}</span>     <span class="asm-mnemonic">${escapeHtml(mnemonic)}</span>     `;
            
            // Process operands and comments
            const commentParts = rest.split(';');
            let operands = commentParts[0];
            let comment = commentParts[1];
            
            // Highlight registers
            operands = escapeHtml(operands).replace(/\b([wx][0-9]+|sp|x29|x30)\b/g, '<span class="asm-reg">$1</span>');
            
            // Highlight numbers in operands
            operands = operands.replace(/#(0x[0-9a-f]+|[0-9]+)/g, '#<span class="asm-number">$1</span>');
            
            highlighted += operands;
            
            if (comment) {
                highlighted += ' ; <span class="asm-comment">' + escapeHtml(comment.trim()) + '</span>';
            }
            
            return highlighted;
        }

        return escapeHtml(line);
    }).join('\n');
}