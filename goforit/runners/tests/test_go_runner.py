import pytest
from goforit.runners.go_runner import run_go

def test_hello_world(run_async):
    code = '''
    package main

    import "fmt"

    func main() {
        fmt.Println("Hello, World!")
    }
    '''
    result = run_async(run_go(code))
    assert result.stdout == "Hello, World!\n"
    assert result.stderr == ""
    assert result.return_code == 0
    assert len(result.code_outputs) == 2
    assert result.code_outputs[0].language.startswith("asm-")
    assert result.code_outputs[1].language == "hexdump"
    # Check for common function names in objdump
    assert "main" in result.code_outputs[0].content

def test_auto_package_main(run_async):
    code = '''
    import "fmt"

    func main() {
        fmt.Println("Hello, World!")
    }
    '''
    result = run_async(run_go(code))
    assert result.stdout == "Hello, World!\n"
    assert result.stderr == ""
    assert result.return_code == 0

def test_compilation_error(run_async):
    code = '''
    package main

    func main() {
        fmt.Println("Hello, World!")  // Missing import
    }
    '''
    result = run_async(run_go(code))
    assert "undefined: fmt" in result.stderr
    assert result.return_code != 0

def test_runtime_error(run_async):
    code = '''
    package main

    func main() {
        var x []int
        _ = x[1]  // Index out of range
    }
    '''
    result = run_async(run_go(code))
    assert "index out of range" in result.stderr
    assert result.return_code != 0

def test_binary_output(run_async):
    code = '''
    package main

    func add(a, b int) int {
        return a + b
    }

    func main() {
        _ = add(2, 3)
    }
    '''
    result = run_async(run_go(code))
    assert result.return_code == 0
    assert len(result.code_outputs) == 2
    
    # Check objdump output
    objdump = result.code_outputs[0].content
    assert result.code_outputs[0].language.startswith("asm-")
    assert "add" in objdump  # Should find the add function
    
    # Check hexdump output
    hexdump = result.code_outputs[1].content
    assert result.code_outputs[1].language == "hexdump"
    assert "|" in hexdump  # Should contain ASCII section separator
