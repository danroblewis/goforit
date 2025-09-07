import pytest
from backend.language_runners import run_c_to_asm

def test_basic_function(run_async):
    code = '''
int main() {
    return 42;
}'''
    result = run_async(run_c_to_asm(code))
    assert result.return_code == 42  # Program return value
    assert len(result.code_outputs) == 1
    assert result.code_outputs[0].language.startswith('asm-')
    # Check for any of the possible function names depending on platform and optimization
    assert any(name in result.code_outputs[0].content for name in ['main', '_main', 'ltmp0'])

def test_with_compiler_flags(run_async):
    code = '''// -O3
int main() {
    return 42;
}'''
    result = run_async(run_c_to_asm(code))
    assert result.return_code == 42  # Program return value
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
    assert result.return_code == 42  # Program return value
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
    assert result.return_code == 120  # factorial(5) = 120
    assert len(result.code_outputs) == 1
    # Check for either factorial or _factorial depending on platform
    assert any(name in result.code_outputs[0].content for name in ['factorial', '_factorial', 'ltmp0'])

def test_multiple_compiler_flags(run_async):
    code = '''// -O3 -march=native -fomit-frame-pointer
int main() {
    return 42;
}'''
    result = run_async(run_c_to_asm(code))
    assert result.return_code == 42  # Program return value
    assert len(result.code_outputs) == 1