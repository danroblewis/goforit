import unittest
import asyncio
from ..language_runners import run_cpp

class TestCppRunner(unittest.TestCase):
    def setUp(self):
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)

    def tearDown(self):
        self.loop.close()

    def run_async(self, coro):
        return self.loop.run_until_complete(coro)

    def test_hello_world(self):
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

    def test_compilation_error(self):
        code = '''
#include <iostream>
int main() {
    std::cout << "Hello, World!" << std::endl   // Missing semicolon
    return 0;
}'''
        result = self.run_async(run_cpp(code))
        self.assertNotEqual(result.return_code, 0)
        self.assertNotEqual(result.stderr, "")

    def test_function_call(self):
        code = '''
#include <iostream>
int add(int a, int b) {
    return a + b;
}

int main() {
    std::cout << add(2, 3) << std::endl;
    return 0;
}'''
        result = self.run_async(run_cpp(code))
        self.assertEqual(result.stdout.strip(), "5")
        self.assertEqual(result.stderr, "")
        self.assertEqual(result.return_code, 0)

    def test_runtime_error(self):
        code = '''
#include <iostream>
int main() {
    int* ptr = nullptr;
    *ptr = 42;  // Null pointer dereference
    return 0;
}'''
        result = self.run_async(run_cpp(code))
        self.assertNotEqual(result.return_code, 0)
