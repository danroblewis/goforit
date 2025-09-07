import pytest
from ..c_to_asm_runner import run_c_to_asm
from ..utils import detect_system_arch

def test_hello_world(run_async):
    code = '''
    #include <stdio.h>
    int main() {
        printf("Hello, World!\\n");
        return 0;
    }
    '''
    result = run_async(run_c_to_asm(code))
    assert result.stdout == "Hello, World!\n"
    assert result.stderr == ""
    assert result.return_code == 0
    assert len(result.code_outputs) == 1
    assert result.code_outputs[0].language == "asm-intel"
    assert "main" in result.code_outputs[0].content

def test_compiler_flags(run_async):
    code = '''// -O3
    #include <stdio.h>
    int main() {
        printf("Hello, World!\\n");
        return 0;
    }
    '''
    result = run_async(run_c_to_asm(code))
    assert result.stdout == "Hello, World!\n"
    assert result.stderr == ""
    assert result.return_code == 0
    assert len(result.code_outputs) == 1
    assert result.code_outputs[0].language == "asm-intel"

def test_compilation_error(run_async):
    code = '''
    int main() {
        printf("Hello, World!\\n");  // Missing include
        return 0;
    }
    '''
    result = run_async(run_c_to_asm(code))
    assert "implicit declaration of function 'printf'" in result.stderr
    assert result.return_code != 0

def test_architecture_header(run_async):
    code = '''
    int main() {
        return 42;
    }
    '''
    result = run_async(run_c_to_asm(code))
    arch = detect_system_arch()
    assert result.code_outputs[0].content.startswith(f"// arch: {arch} syntax: intel")
