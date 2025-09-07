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
    assert "main" in result.code_outputs[0].content

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
    assert "implicit declaration of function 'printf'" in result.stderr
    assert result.return_code != 0

def test_hexdump_format(run_async):
    code = '''
    int main() {
        return 42;
    }
    '''
    result = run_async(run_c_to_objdump(code))
    hexdump = result.code_outputs[1].content
    # Check hexdump format: address | hex values | ASCII
    assert any(line.strip() and '|' in line for line in hexdump.split('\n'))