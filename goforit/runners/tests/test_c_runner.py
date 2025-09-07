import pytest
from goforit.runners.c_runner import run_c

def test_hello_world(run_async):
    code = '''
    #include <stdio.h>
    int main() {
        printf("Hello, World!\\n");
        return 0;
    }
    '''
    result = run_async(run_c(code))
    assert result.stdout == "Hello, World!\n"
    assert result.stderr == ""
    assert result.return_code == 0

def test_compilation_error(run_async):
    code = '''
    int main() {
        printf("Hello, World!\\n");  // Missing include
        return 0;
    }
    '''
    result = run_async(run_c(code))
    # Check for either gcc or clang error message
    assert any(msg in result.stderr for msg in [
        "implicit declaration of function 'printf'",  # gcc
        "call to undeclared library function 'printf'"  # clang
    ])
    assert result.return_code != 0

def test_runtime_error(run_async):
    code = '''
    #include <stdio.h>
    int main() {
        int *p = NULL;
        *p = 42;  // Segmentation fault
        return 0;
    }
    '''
    result = run_async(run_c(code))
    assert result.return_code != 0