export function formatHexdump(base64Data) {
    if (!base64Data) return '';
    
    // Decode base64 to binary data
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
    }

    const width = 16; // bytes per line
    const lines = [];
    let lastLineWasZeros = false;

    for (let offset = 0; offset < bytes.length; offset += width) {
        const chunk = bytes.slice(offset, offset + width);
        
        // Check if line is all zeros
        if (chunk.every(byte => byte === 0)) {
            if (!lastLineWasZeros) {
                lines.push('<span class="hexdump-zero">*</span>');
                lastLineWasZeros = true;
            }
            continue;
        }
        lastLineWasZeros = false;

        // Format address
        const addr = offset.toString(16).padStart(8, '0');
        let line = `<span class="hexdump-addr">${addr}</span>: `;

        // Format hex values
        const hexValues = [];
        const asciiChars = [];

        for (let i = 0; i < width; i++) {
            if (i < chunk.length) {
                const byte = chunk[i];
                const hex = byte.toString(16).padStart(2, '0');
                const colorClass = byte === 0 ? 'hexdump-zero' : 'hexdump-hex';
                hexValues.push(`<span class="${colorClass}">${hex}</span>`);

                // ASCII representation
                const isPrintable = byte >= 32 && byte <= 126;
                const char = isPrintable ? String.fromCharCode(byte) : '.';
                const charClass = isPrintable ? 'hexdump-ascii' : 'hexdump-dot';
                asciiChars.push(`<span class="${charClass}">${escapeHtml(char)}</span>`);
            } else {
                hexValues.push('  ');
                asciiChars.push(' ');
            }

            // Add extra space after 8 bytes
            if (i === 7) {
                hexValues.push('');
            }
        }

        line += hexValues.join(' ') + '  ' + asciiChars.join('');
        lines.push(line);
    }

    return lines.join('\n');
}

function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}