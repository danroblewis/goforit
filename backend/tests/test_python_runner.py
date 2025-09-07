import pytest
from backend.language_runners import run_python

def test_hello_world(run_async):
    code = 'print("Hello, World!")'
    result = run_async(run_python(code))
    assert result.stdout.strip() == "Hello, World!"
    assert result.stderr == ""
    assert result.return_code == 0

def test_syntax_error(run_async):
    code = 'print("Hello, World!'  # Missing closing quote
    result = run_async(run_python(code))
    assert result.return_code != 0
    assert result.stderr != ""

def test_timeout(run_async):
    code = 'while True: pass'
    result = run_async(run_python(code))
    assert result.return_code == 124
    assert result.stderr == "Execution timed out"

def test_multiple_lines(run_async):
    code = '''
def add(a, b):
    return a + b
print(add(2, 3))
'''
    result = run_async(run_python(code))
    assert result.stdout.strip() == "5"
    assert result.stderr == ""
    assert result.return_code == 0