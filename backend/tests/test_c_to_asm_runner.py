import pytest
from ..language_runners import run_c_to_asm

def test_basic_function(run_async):
    code = '''
int main() {
    return 42;
}'''
    result = run_async(run_c_to_asm(code))
    assert result.return_code == 0
    assert len(result.code_outputs) == 1
    assert result.code_outputs[0].language.startswith('asm-')
    assert 'main' in result.code_outputs[0].content

def test_with_compiler_flags(run_async):
    code = '''// -O3
int main() {
    return 42;
}'''
    result = run_async(run_c_to_asm(code))
    assert result.return_code == 0
    assert len(result.code_outputs) == 1
    assert result.code_outputs[0].language.startswith('asm-')

def test_compilation_error(run_async):
    code = '''
int main() {
    return 42   // Missing semicolon
}'''
    result = run_async(run_c_to_asm(code))
    assert result.return_code != 0
    assert result.stderr != ""

def test_temp_path_cleanup(run_async):
    code = '''
int main() {
    return 42;
}'''
    result = run_async(run_c_to_asm(code))
    assert result.return_code == 0
    # Check that temp directory paths are not in the output
    assert '/var/folders' not in result.code_outputs[0].content
    assert '/tmp' not in result.code_outputs[0].content

def test_function_with_loop(run_async):
    code = '''
int factorial(int n) {
    int result = 1;
    for(int i = 1; i <= n; i++) {
        result *= i;
    }
    return result;
}

int main() {
    return factorial(5);
}'''
    result = run_async(run_c_to_asm(code))
    assert result.return_code == 0
    assert len(result.code_outputs) == 1
    assert 'factorial' in result.code_outputs[0].content

def test_multiple_compiler_flags(run_async):
    code = '''// -O3 -march=native -fomit-frame-pointer
int main() {
    return 42;
}'''
    result = run_async(run_c_to_asm(code))
    assert result.return_code == 0
    assert len(result.code_outputs) == 1