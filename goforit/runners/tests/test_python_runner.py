import pytest
from goforit.runners.python_runner import run_python

def test_hello_world(run_async):
    result = run_async(run_python('print("Hello, World!")'))
    assert result.stdout == "Hello, World!\n"
    assert result.stderr == ""
    assert result.return_code == 0

def test_syntax_error(run_async):
    result = run_async(run_python('print("Hello, World!"'))
    assert result.stderr.startswith("  File")
    assert "SyntaxError" in result.stderr
    assert result.return_code != 0

def test_runtime_error(run_async):
    result = run_async(run_python('1/0'))
    assert "ZeroDivisionError" in result.stderr
    assert result.return_code != 0