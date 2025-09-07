import pytest
from ..language_runners import run_cpp

def test_hello_world(run_async):
    code = '''
#include <iostream>
int main() {
    std::cout << "Hello, World!" << std::endl;
    return 0;
}'''
    result = run_async(run_cpp(code))
    assert result.stdout.strip() == "Hello, World!"
    assert result.stderr == ""
    assert result.return_code == 0

def test_compilation_error(run_async):
    code = '''
#include <iostream>
int main() {
    std::cout << "Hello, World!" << std::endl   // Missing semicolon
    return 0;
}'''
    result = run_async(run_cpp(code))
    assert result.return_code != 0
    assert result.stderr != ""

def test_function_call(run_async):
    code = '''
#include <iostream>
int add(int a, int b) {
    return a + b;
}

int main() {
    std::cout << add(2, 3) << std::endl;
    return 0;
}'''
    result = run_async(run_cpp(code))
    assert result.stdout.strip() == "5"
    assert result.stderr == ""
    assert result.return_code == 0

def test_runtime_error(run_async):
    code = '''
#include <iostream>
int main() {
    int* ptr = nullptr;
    *ptr = 42;  // Null pointer dereference
    return 0;
}'''
    result = run_async(run_cpp(code))
    assert result.return_code != 0