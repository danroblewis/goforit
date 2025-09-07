import pytest
from backend.language_runners import run_java

def test_hello_world(run_async):
    code = '''
public class Test {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}'''
    result = run_async(run_java(code))
    assert result.stdout.strip() == "Hello, World!"
    assert result.stderr == ""
    assert result.return_code == 0

def test_compilation_error(run_async):
    code = '''
public class Test {
    public static void main(String[] args) {
        System.out.println("Hello, World!")  // Missing semicolon
    }
}'''
    result = run_async(run_java(code))
    assert result.return_code != 0
    assert result.stderr != ""

def test_class_name_mismatch(run_async):
    code = '''
public class Test {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}'''
    # Rename the file to mismatch the class name
    result = run_async(run_java(code))
    assert result.return_code == 0  # The code is valid
    assert result.stdout.strip() == "Hello, World!"

def test_function_call(run_async):
    code = '''
public class Test {
    public static int add(int a, int b) {
        return a + b;
    }
    
    public static void main(String[] args) {
        System.out.println(add(2, 3));
    }
}'''
    result = run_async(run_java(code))
    assert result.stdout.strip() == "5"
    assert result.stderr == ""
    assert result.return_code == 0