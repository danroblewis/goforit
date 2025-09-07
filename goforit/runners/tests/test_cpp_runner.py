import pytest
from goforit.runners.cpp_runner import run_cpp

def test_hello_world(run_async):
    code = '''
    #include <iostream>
    int main() {
        std::cout << "Hello, World!" << std::endl;
        return 0;
    }
    '''
    result = run_async(run_cpp(code))
    assert result.stdout == "Hello, World!\n"
    assert result.stderr == ""
    assert result.return_code == 0
    assert len(result.code_outputs) == 3
    assert result.code_outputs[0].language == "asm-intel"
    assert result.code_outputs[1].language.startswith("asm-")
    assert result.code_outputs[2].language == "hexdump"
    # Check for common function names across gcc/clang
    assert any(name in result.code_outputs[0].content for name in ['main', '_main'])

def test_compiler_flags(run_async):
    code = '''// -O3
    #include <iostream>
    int main() {
        std::cout << "Hello, World!" << std::endl;
        return 0;
    }
    '''
    result = run_async(run_cpp(code))
    assert result.stdout == "Hello, World!\n"
    assert result.stderr == ""
    assert result.return_code == 0
    assert len(result.code_outputs) == 3
    assert result.code_outputs[0].language == "asm-intel"
    assert result.code_outputs[1].language.startswith("asm-")
    assert result.code_outputs[2].language == "hexdump"

def test_compilation_error(run_async):
    code = '''
    int main() {
        std::cout << "Hello, World!" << std::endl;  // Missing include
        return 0;
    }
    '''
    result = run_async(run_cpp(code))
    # Check for various compiler error messages
    assert any(msg in result.stderr for msg in [
        "error: 'std::cout' has not been declared",  # gcc
        "error: use of undeclared identifier 'std'",  # clang
    ])
    assert result.return_code != 0

def test_runtime_error(run_async):
    code = '''
    #include <iostream>
    int main() {
        int* p = nullptr;
        *p = 42;  // Segmentation fault
        return 0;
    }
    '''
    result = run_async(run_cpp(code))
    assert result.return_code != 0