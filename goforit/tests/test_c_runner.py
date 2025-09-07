import pytest
from backend.language_runners import run_c

def test_hello_world(run_async):
    code = '''
#include <stdio.h>
int main() {
    printf("Hello, World!\\n");
    return 0;
}'''
    result = run_async(run_c(code))
    assert result.stdout.strip() == "Hello, World!"
    assert result.stderr == ""
    assert result.return_code == 0

def test_compilation_error(run_async):
    code = '''
#include <stdio.h>
int main() {
    printf("Hello, World!\\n")   // Missing semicolon
    return 0;
}'''
    result = run_async(run_c(code))
    assert result.return_code != 0
    assert result.stderr != ""

def test_function_call(run_async):
    code = '''
#include <stdio.h>
int add(int a, int b) {
    return a + b;
}

int main() {
    printf("%d\\n", add(2, 3));
    return 0;
}'''
    result = run_async(run_c(code))
    assert result.stdout.strip() == "5"
    assert result.stderr == ""
    assert result.return_code == 0

def test_runtime_error(run_async):
    code = '''
#include <stdio.h>
int main() {
    int* ptr = 0;
    *ptr = 42;  // Null pointer dereference
    return 0;
}'''
    result = run_async(run_c(code))
    assert result.return_code != 0