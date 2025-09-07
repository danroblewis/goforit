import pytest
from goforit.language_runners import run_go

def test_hello_world(run_async):
    code = '''
package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}'''
    result = run_async(run_go(code))
    assert result.stdout.strip() == "Hello, World!"
    assert result.stderr == ""
    assert result.return_code == 0

def test_compilation_error(run_async):
    code = '''
package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")    // Missing semicolon
    x := 42    // Unused variable
}'''
    result = run_async(run_go(code))
    assert result.return_code != 0
    assert result.stderr != ""

def test_function_call(run_async):
    code = '''
package main

import "fmt"

func add(a, b int) int {
    return a + b
}

func main() {
    fmt.Println(add(2, 3))
}'''
    result = run_async(run_go(code))
    assert result.stdout.strip() == "5"
    assert result.stderr == ""
    assert result.return_code == 0

def test_runtime_error(run_async):
    code = '''
package main

func main() {
    var x []int
    x[0] = 42  // Index out of bounds
}'''
    result = run_async(run_go(code))
    assert result.return_code != 0
    assert "panic" in result.stderr.lower()

def test_implicit_package_main(run_async):
    code = '''
import "fmt"

func main() {
    fmt.Println("Hello from implicit package main")
}'''
    result = run_async(run_go(code))
    assert result.stdout.strip() == "Hello from implicit package main"
    assert result.stderr == ""
    assert result.return_code == 0
