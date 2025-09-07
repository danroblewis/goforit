import pytest
from backend.language_runners import run_javascript

def test_hello_world(run_async):
    code = 'console.log("Hello, World!")'
    result = run_async(run_javascript(code))
    assert result.stdout.strip() == "Hello, World!"
    assert result.stderr == ""
    assert result.return_code == 0

def test_syntax_error(run_async):
    code = 'console.log("Hello, World!'  # Missing closing quote
    result = run_async(run_javascript(code))
    assert result.return_code != 0
    assert result.stderr != ""

def test_timeout(run_async):
    code = 'while(true) {}'
    result = run_async(run_javascript(code))
    assert result.return_code == 124
    assert result.stderr == "Execution timed out"

def test_multiple_lines(run_async):
    code = '''
function add(a, b) {
    return a + b;
}
console.log(add(2, 3));
'''
    result = run_async(run_javascript(code))
    assert result.stdout.strip() == "5"
    assert result.stderr == ""
    assert result.return_code == 0