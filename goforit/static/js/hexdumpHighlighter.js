function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export function highlightHexdump(text) {
    const lines = text.split('\n');
    return lines.map(line => {
        if (!line.trim()) return '';

        // Match hexdump format:
        // 00000000  7f 45 4c 46 02 01 01 00  00 00 00 00 00 00 00 00  |.ELF............|
        const match = line.match(/^([0-9a-fA-F]+)(\s+)([0-9a-fA-F ]+)(\s+\|)([^|]+)(\|)$/);
        if (match) {
            const [_, addr, space1, hex, sep1, ascii, sep2] = match;
            return `<span class="hexdump-addr">${addr}</span>${space1}` +
                   `<span class="hexdump-hex">${hex}</span>` +
                   `<span class="hexdump-sep">${sep1}</span>` +
                   `<span class="hexdump-ascii">${escapeHtml(ascii)}</span>` +
                   `<span class="hexdump-sep">${sep2}</span>`;
        }

        // Match section headers from objdump
        if (line.startsWith('Contents of section')) {
            return `<span class="hexdump-sep">${escapeHtml(line)}</span>`;
        }

        return escapeHtml(line);
    }).join('\n');
}
