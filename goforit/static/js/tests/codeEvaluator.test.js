import { CodeEvaluator, updateBackgroundColor, renderOutput } from '../codeEvaluator.js';

// Mock fetch
global.fetch = jest.fn(() => 
    Promise.resolve({
        json: () => Promise.resolve({ stdout: '', stderr: '', return_code: 0 })
    })
);

describe('CodeEvaluator', () => {
    let evaluator;

    beforeEach(() => {
        evaluator = new CodeEvaluator();
        fetch.mockClear();
    });

    test('evaluateCode sends correct request', async () => {
        const code = 'print("test")';
        const language = 'python';
        
        fetch.mockImplementationOnce(() => 
            Promise.resolve({
                json: () => Promise.resolve({ stdout: 'test', stderr: '', return_code: 0 })
            })
        );

        await evaluator.evaluateCode(code, language);

        expect(fetch).toHaveBeenCalledWith('/api/evaluate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, language })
        });
    });

    test('queueEvaluation handles concurrent requests', async () => {
        const firstCode = 'first';
        const secondCode = 'second';
        
        // Start first evaluation
        const firstPromise = evaluator.queueEvaluation(firstCode, 'python');
        expect(evaluator.isEvaluating).toBe(true);
        
        // Queue second evaluation
        evaluator.queueEvaluation(secondCode, 'python');
        expect(evaluator.pendingEvaluation).toEqual({
            code: secondCode,
            language: 'python'
        });
    });
});

describe('updateBackgroundColor', () => {
    beforeEach(() => {
        document.body.style.backgroundColor = '';
    });

    test('sets error color on error', () => {
        updateBackgroundColor({ return_code: 1, stderr: 'error', stdout: '' });
        expect(document.body.style.backgroundColor).toBe('rgb(42, 26, 26)');
    });

    test('sets success color on output', () => {
        updateBackgroundColor({ return_code: 0, stderr: '', stdout: 'output' });
        expect(document.body.style.backgroundColor).toBe('rgb(26, 42, 26)');
    });
});

describe('renderOutput', () => {
    let outputDiv;

    beforeEach(() => {
        outputDiv = document.createElement('div');
    });

    test('renders stdout', () => {
        renderOutput(outputDiv, {
            stdout: 'test output',
            stderr: '',
            return_code: 0,
            code_outputs: []
        });
        expect(outputDiv.innerHTML).toContain('test output');
        expect(outputDiv.innerHTML).toContain('class="output-label"');
    });

    test('renders stderr', () => {
        renderOutput(outputDiv, {
            stdout: '',
            stderr: 'test error',
            return_code: 1,
            code_outputs: []
        });
        expect(outputDiv.innerHTML).toContain('test error');
        expect(outputDiv.innerHTML).toContain('class="error-label"');
    });

    test('renders assembly output', () => {
        renderOutput(outputDiv, {
            stdout: '',
            stderr: '',
            return_code: 0,
            code_outputs: [{
                language: 'asm-arm64',
                content: '0000000000000000 <main>:'
            }]
        });
        expect(outputDiv.innerHTML).toContain('class="code-output-block"');
        expect(outputDiv.innerHTML).toContain('<span class="asm-label">');
    });
});