import pytest
from goforit.runners.java_runner import run_java

def test_hello_world(run_async):
    code = '''
    public class HelloWorld {
        public static void main(String[] args) {
            System.out.println("Hello, World!");
        }
    }
    '''
    result = run_async(run_java(code))
    assert result.stdout == "Hello, World!\n"
    assert result.stderr == ""
    assert result.return_code == 0
    assert len(result.code_outputs) == 2
    assert result.code_outputs[0].language == "java-bytecode"
    assert result.code_outputs[1].language == "hexdump"
    # Check for common bytecode elements
    assert "public static void main(java.lang.String[])" in result.code_outputs[0].content
    assert "getstatic" in result.code_outputs[0].content
    assert "invokevirtual" in result.code_outputs[0].content

def test_compilation_error(run_async):
    code = '''
    public class BadCode {
        public static void main(String[] args) {
            System.out.println("Hello, World!"    // Missing semicolon
        }
    }
    '''
    result = run_async(run_java(code))
    assert "expected" in result.stderr  # Error should mention expected token
    assert result.return_code != 0

def test_runtime_error(run_async):
    code = '''
    public class RuntimeError {
        public static void main(String[] args) {
            Object obj = null;
            obj.toString();  // NullPointerException
        }
    }
    '''
    result = run_async(run_java(code))
    assert "NullPointerException" in result.stderr
    assert result.return_code != 0

def test_no_public_class(run_async):
    code = '''
    class NotPublic {
        public static void main(String[] args) {
            System.out.println("Hello!");
        }
    }
    '''
    result = run_async(run_java(code))
    assert "No public class found" in result.stderr
    assert result.return_code != 0

def test_bytecode_output(run_async):
    code = '''
    public class Simple {
        private int value;
        public void setValue(int v) {
            this.value = v;
        }
        public int getValue() {
            return this.value;
        }
        public static void main(String[] args) {}  // Need main method to run
    }
    '''
    result = run_async(run_java(code))
    assert result.return_code == 0
    assert len(result.code_outputs) == 2
    
    # Check bytecode output
    bytecode = result.code_outputs[0].content
    assert "public void setValue(int)" in bytecode
    assert "public int getValue()" in bytecode
    assert "aload_0" in bytecode  # Common bytecode for loading 'this'
    assert "iload_1" in bytecode  # Common bytecode for loading first int parameter
    
    # Check hexdump output
    hexdump = result.code_outputs[1].content
    assert "|" in hexdump  # Should contain ASCII section separator
    assert "ca fe ba be" in hexdump  # Java class files start with CAFEBABE magic number