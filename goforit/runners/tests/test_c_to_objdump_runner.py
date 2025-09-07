import pytest
from goforit.runners.c_to_objdump_runner import run_c_to_objdump

def test_hello_world(run_async):
    code = '''
    #include <stdio.h>
    int main() {
        printf("Hello, World!\\n");
        return 0;
    }
    '''
    result = run_async(run_c_to_objdump(code))
    assert result.stdout == "Hello, World!\n"
    assert result.stderr == ""
    assert result.return_code == 0
    assert len(result.code_outputs) == 2
    assert result.code_outputs[0].language.startswith("asm-")
    assert result.code_outputs[1].language == "hexdump"
    # Check for common function names across gcc/clang
    assert any(name in result.code_outputs[0].content for name in ['main', '_main', 'ltmp0'])

def test_compiler_flags(run_async):
    code = '''// -O3
    #include <stdio.h>
    int main() {
        printf("Hello, World!\\n");
        return 0;
    }
    '''
    result = run_async(run_c_to_objdump(code))
    assert result.stdout == "Hello, World!\n"
    assert result.stderr == ""
    assert result.return_code == 0
    assert len(result.code_outputs) == 2
    assert result.code_outputs[0].language.startswith("asm-")
    assert result.code_outputs[1].language == "hexdump"

def test_compilation_error(run_async):
    code = '''
    int main() {
        printf("Hello, World!\\n");  // Missing include
        return 0;
    }
    '''
    result = run_async(run_c_to_objdump(code))
    # Check for either gcc or clang error message
    assert any(msg in result.stderr for msg in [
        "implicit declaration of function 'printf'",  # gcc
        "call to undeclared library function 'printf'"  # clang
    ])
    assert result.return_code != 0

def test_hexdump_format(run_async):
    code = '''
    int main() {
        return 42;
    }
    '''
    result = run_async(run_c_to_objdump(code))
    hexdump = result.code_outputs[1].content
    # Check for either objdump format or our custom format
    assert ('Contents of section' in hexdump or
           any(line.strip() and '|' in line for line in hexdump.split('\n')))