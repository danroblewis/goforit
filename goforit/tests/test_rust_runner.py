import pytest
from goforit.language_runners import run_rust

def test_hello_world(run_async):
    code = '''
fn main() {
    println!("Hello, World!");
}'''
    result = run_async(run_rust(code))
    assert result.stdout.strip() == "Hello, World!"
    assert result.stderr == ""
    assert result.return_code == 0

def test_compilation_error(run_async):
    code = '''
fn main() {
    println!("Hello, World!")    // Missing semicolon
}'''
    result = run_async(run_rust(code))
    assert result.return_code != 0
    assert result.stderr != ""

def test_function_call(run_async):
    code = '''
fn add(a: i32, b: i32) -> i32 {
    a + b
}

fn main() {
    println!("{}", add(2, 3));
}'''
    result = run_async(run_rust(code))
    assert result.stdout.strip() == "5"
    assert result.stderr == ""
    assert result.return_code == 0

def test_runtime_error(run_async):
    code = '''
fn main() {
    panic!("This is a runtime error");
}'''
    result = run_async(run_rust(code))
    assert result.return_code != 0
    assert "runtime error" in result.stderr.lower()
