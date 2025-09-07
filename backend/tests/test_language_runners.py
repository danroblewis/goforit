import unittest
import asyncio
from ..language_runners import (
    run_python, run_javascript, run_java, run_cpp, run_c, run_c_to_asm,
    CodeResult, CodeOutput
)

class TestLanguageRunners(unittest.TestCase):
    def setUp(self):
        # Create event loop for async tests
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)

    def tearDown(self):
        self.loop.close()

    def run_async(self, coro):
        return self.loop.run_until_complete(coro)

    def test_python_hello_world(self):
        code = 'print("Hello, World!")'
        result = self.run_async(run_python(code))
        self.assertEqual(result.stdout.strip(), "Hello, World!")
        self.assertEqual(result.stderr, "")
        self.assertEqual(result.return_code, 0)

    def test_python_syntax_error(self):
        code = 'print("Hello, World!'  # Missing closing quote
        result = self.run_async(run_python(code))
        self.assertNotEqual(result.return_code, 0)
        self.assertNotEqual(result.stderr, "")

    def test_python_timeout(self):
        code = 'while True: pass'
        result = self.run_async(run_python(code))
        self.assertEqual(result.return_code, 124)
        self.assertEqual(result.stderr, "Execution timed out")

    def test_javascript_hello_world(self):
        code = 'console.log("Hello, World!")'
        result = self.run_async(run_javascript(code))
        self.assertEqual(result.stdout.strip(), "Hello, World!")
        self.assertEqual(result.stderr, "")
        self.assertEqual(result.return_code, 0)

    def test_javascript_syntax_error(self):
        code = 'console.log("Hello, World!'  # Missing closing quote
        result = self.run_async(run_javascript(code))
        self.assertNotEqual(result.return_code, 0)
        self.assertNotEqual(result.stderr, "")

    def test_java_hello_world(self):
        code = '''
public class Test {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}'''
        result = self.run_async(run_java(code))
        self.assertEqual(result.stdout.strip(), "Hello, World!")
        self.assertEqual(result.stderr, "")
        self.assertEqual(result.return_code, 0)

    def test_java_compilation_error(self):
        code = '''
public class Test {
    public static void main(String[] args) {
        System.out.println("Hello, World!")  // Missing semicolon
    }
}'''
        result = self.run_async(run_java(code))
        self.assertNotEqual(result.return_code, 0)
        self.assertNotEqual(result.stderr, "")

    def test_cpp_hello_world(self):
        code = '''
#include <iostream>
int main() {
    std::cout << "Hello, World!" << std::endl;
    return 0;
}'''
        result = self.run_async(run_cpp(code))
        self.assertEqual(result.stdout.strip(), "Hello, World!")
        self.assertEqual(result.stderr, "")
        self.assertEqual(result.return_code, 0)

    def test_cpp_compilation_error(self):
        code = '''
#include <iostream>
int main() {
    std::cout << "Hello, World!" << std::endl   // Missing semicolon
    return 0;
}'''
        result = self.run_async(run_cpp(code))
        self.assertNotEqual(result.return_code, 0)
        self.assertNotEqual(result.stderr, "")

    def test_c_hello_world(self):
        code = '''
#include <stdio.h>
int main() {
    printf("Hello, World!\\n");
    return 0;
}'''
        result = self.run_async(run_c(code))
        self.assertEqual(result.stdout.strip(), "Hello, World!")
        self.assertEqual(result.stderr, "")
        self.assertEqual(result.return_code, 0)

    def test_c_compilation_error(self):
        code = '''
#include <stdio.h>
int main() {
    printf("Hello, World!\\n")   // Missing semicolon
    return 0;
}'''
        result = self.run_async(run_c(code))
        self.assertNotEqual(result.return_code, 0)
        self.assertNotEqual(result.stderr, "")

    def test_c_to_asm_basic(self):
        code = '''
int main() {
    return 42;
}'''
        result = self.run_async(run_c_to_asm(code))
        self.assertEqual(result.return_code, 0)
        self.assertEqual(len(result.code_outputs), 1)
        self.assertTrue(result.code_outputs[0].language.startswith('asm-'))
        self.assertIn('main', result.code_outputs[0].content)

    def test_c_to_asm_with_flags(self):
        code = '''// -O3
int main() {
    return 42;
}'''
        result = self.run_async(run_c_to_asm(code))
        self.assertEqual(result.return_code, 0)
        self.assertEqual(len(result.code_outputs), 1)
        self.assertTrue(result.code_outputs[0].language.startswith('asm-'))

    def test_c_to_asm_compilation_error(self):
        code = '''
int main() {
    return 42   // Missing semicolon
}'''
        result = self.run_async(run_c_to_asm(code))
        self.assertNotEqual(result.return_code, 0)
        self.assertNotEqual(result.stderr, "")

    def test_c_to_asm_temp_path_cleanup(self):
        code = '''
int main() {
    return 42;
}'''
        result = self.run_async(run_c_to_asm(code))
        self.assertEqual(result.return_code, 0)
        # Check that temp directory paths are not in the output
        self.assertNotIn('/var/folders', result.code_outputs[0].content)
        self.assertNotIn('/tmp', result.code_outputs[0].content)

if __name__ == '__main__':
    unittest.main()
