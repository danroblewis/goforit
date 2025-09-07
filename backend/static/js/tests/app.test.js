import { App } from '../app.js';

// Mock Monaco
global.require = {
    config: jest.fn(),
};

describe('App', () => {
    let app;

    beforeEach(() => {
        app = new App();
        // Mock DOM elements
        document.body.innerHTML = `
            <div id="editor"></div>
            <select id="language">
                <option value="python">Python</option>
            </select>
            <div id="output"></div>
        `;
    });

    test('initializes with default state', () => {
        expect(app.editor).toBeNull();
        expect(app.monaco).toBeNull();
        expect(app.evaluator).toBeDefined();
    });

    test('handles language change', () => {
        app.monaco = {
            editor: {
                setModelLanguage: jest.fn()
            }
        };
        app.editor = {
            getModel: jest.fn(),
            getValue: jest.fn()
        };
        
        const event = { target: { value: 'c_to_asm' } };
        app.handleLanguageChange(event);
        
        expect(app.monaco.editor.setModelLanguage).toHaveBeenCalled();
    });

    test('updates UI with evaluation result', () => {
        const result = {
            stdout: 'test output',
            stderr: '',
            return_code: 0,
            code_outputs: []
        };
        
        app.updateUI(result);
        
        const output = document.getElementById('output');
        expect(output.innerHTML).toContain('test output');
    });
});
