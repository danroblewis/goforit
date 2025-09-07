import { registerAssemblyLanguage } from '../assemblyLanguage.js';

describe('Assembly Language Configuration', () => {
    let mockMonaco;

    beforeEach(() => {
        // Mock Monaco editor API
        mockMonaco = {
            languages: {
                register: jest.fn(),
                setMonarchTokensProvider: jest.fn()
            }
        };
    });

    test('registers assembly language with Monaco', () => {
        registerAssemblyLanguage(mockMonaco);
        expect(mockMonaco.languages.register).toHaveBeenCalledWith({ id: 'asm' });
        expect(mockMonaco.languages.setMonarchTokensProvider).toHaveBeenCalledWith('asm', expect.any(Object));
    });

    test('tokenizer handles x86_64 instructions', () => {
        registerAssemblyLanguage(mockMonaco);
        const provider = mockMonaco.languages.setMonarchTokensProvider.mock.calls[0][1];
        const tokenizer = provider.tokenizer.root;

        // Test instruction pattern
        const instructionPattern = tokenizer.find(rule => rule[1] === 'keyword.instruction')[0];
        expect(instructionPattern.test('mov')).toBe(true);
        expect(instructionPattern.test('push')).toBe(true);
        expect(instructionPattern.test('pop')).toBe(true);
        expect(instructionPattern.test('syscall')).toBe(true);
    });

    test('tokenizer handles ARM64 instructions', () => {
        registerAssemblyLanguage(mockMonaco);
        const provider = mockMonaco.languages.setMonarchTokensProvider.mock.calls[0][1];
        const tokenizer = provider.tokenizer.root;

        // Test instruction pattern
        const instructionPattern = tokenizer.find(rule => rule[1] === 'keyword.instruction')[0];
        expect(instructionPattern.test('adrp')).toBe(true);
        expect(instructionPattern.test('ldr')).toBe(true);
        expect(instructionPattern.test('str')).toBe(true);
        expect(instructionPattern.test('svc')).toBe(true);
    });

    test('tokenizer handles registers', () => {
        registerAssemblyLanguage(mockMonaco);
        const provider = mockMonaco.languages.setMonarchTokensProvider.mock.calls[0][1];
        const tokenizer = provider.tokenizer.root;

        // Test register pattern
        const registerPattern = tokenizer.find(rule => rule[1] === 'variable.predefined')[0];
        expect(registerPattern.test('rax')).toBe(true);
        expect(registerPattern.test('eax')).toBe(true);
        expect(registerPattern.test('x0')).toBe(true);
        expect(registerPattern.test('w0')).toBe(true);
        expect(registerPattern.test('sp')).toBe(true);
    });

    test('tokenizer handles comments', () => {
        registerAssemblyLanguage(mockMonaco);
        const provider = mockMonaco.languages.setMonarchTokensProvider.mock.calls[0][1];
        const tokenizer = provider.tokenizer.root;

        // Test comment patterns
        const singleLineComment = tokenizer.find(rule => rule[1] === 'comment' && rule[0].source === ';.*$');
        expect(singleLineComment[0].test('; This is a comment')).toBe(true);

        const cStyleComment = tokenizer.find(rule => rule[1] === 'comment' && rule[0].source === '\\/\\/.*$');
        expect(cStyleComment[0].test('// This is a comment')).toBe(true);
    });

    test('tokenizer handles numbers', () => {
        registerAssemblyLanguage(mockMonaco);
        const provider = mockMonaco.languages.setMonarchTokensProvider.mock.calls[0][1];
        const tokenizer = provider.tokenizer.root;

        // Test number patterns
        const hexPattern = tokenizer.find(rule => rule[1] === 'number.hex')[0];
        expect(hexPattern.test('0x1234')).toBe(true);

        const decimalPattern = tokenizer.find(rule => rule[1] === 'number')[0];
        expect(decimalPattern.test('1234')).toBe(true);

        const binaryPattern = tokenizer.find(rule => rule[1] === 'number.binary')[0];
        expect(binaryPattern.test('0b1010')).toBe(true);

        const immediatePattern = tokenizer.find(rule => rule[1] === 'number' && rule[0].source === '#-?\\d+')[0];
        expect(immediatePattern.test('#42')).toBe(true);
        expect(immediatePattern.test('#-42')).toBe(true);
    });

    test('tokenizer handles labels', () => {
        registerAssemblyLanguage(mockMonaco);
        const provider = mockMonaco.languages.setMonarchTokensProvider.mock.calls[0][1];
        const tokenizer = provider.tokenizer.root;

        // Test label pattern
        const labelPattern = tokenizer.find(rule => rule[1] === 'type.identifier')[0];
        expect(labelPattern.test('main:')).toBe(true);
        expect(labelPattern.test('_start:')).toBe(true);
        expect(labelPattern.test('.L1:')).toBe(true);
    });

    test('tokenizer handles ARM64 relocation operators', () => {
        registerAssemblyLanguage(mockMonaco);
        const provider = mockMonaco.languages.setMonarchTokensProvider.mock.calls[0][1];
        const tokenizer = provider.tokenizer.root;

        // Test relocation operator pattern
        const operatorPattern = tokenizer.find(rule => rule[1] === 'operator' && rule[0].source === '@(PAGE|PAGEOFF)')[0];
        expect(operatorPattern.test('@PAGE')).toBe(true);
        expect(operatorPattern.test('@PAGEOFF')).toBe(true);
    });
});
