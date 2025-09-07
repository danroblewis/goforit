import { escapeHtml, highlightAssembly } from '../assemblyHighlighter.js';

describe('escapeHtml', () => {
    test('escapes HTML special characters', () => {
        const input = '<div class="test">Hello & World</div>';
        const expected = '&lt;div class=&quot;test&quot;&gt;Hello &amp; World&lt;/div&gt;';
        expect(escapeHtml(input)).toBe(expected);
    });
});

describe('highlightAssembly', () => {
    test('highlights function header', () => {
        const input = '0000000000000000 <main>:';
        const result = highlightAssembly(input);
        expect(result).toContain('class="asm-addr"');
        expect(result).toContain('class="asm-label"');
        expect(result).toContain('main');
    });

    test('highlights instruction line', () => {
        const input = '      0: d10043ff     sub sp, sp, #0x10';
        const result = highlightAssembly(input);
        expect(result).toContain('class="asm-addr"');
        expect(result).toContain('class="asm-bytes"');
        expect(result).toContain('class="asm-mnemonic"');
        expect(result).toContain('class="asm-reg"');
    });

    test('highlights comments', () => {
        const input = '      8: 52800540     mov w0, #0x2a               ; =42';
        const result = highlightAssembly(input);
        expect(result).toContain('class="asm-comment"');
        expect(result).toContain('=42');
    });
});
