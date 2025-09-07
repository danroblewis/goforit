import unittest
import asyncio
from ..language_runners import run_c

class TestCRunner(unittest.TestCase):
    def setUp(self):
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)

    def tearDown(self):
        self.loop.close()

    def run_async(self, coro):
        return self.loop.run_until_complete(coro)

    def test_hello_world(self):
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

    def test_compilation_error(self):
        code = '''
#include <stdio.h>
int main() {
    printf("Hello, World!\\n")   // Missing semicolon
    return 0;
}'''
        result = self.run_async(run_c(code))
        self.assertNotEqual(result.return_code, 0)
        self.assertNotEqual(result.stderr, "")

    def test_function_call(self):
        code = '''
#include <stdio.h>
int add(int a, int b) {
    return a + b;
}

int main() {
    printf("%d\\n", add(2, 3));
    return 0;
}'''
        result = self.run_async(run_c(code))
        self.assertEqual(result.stdout.strip(), "5")
        self.assertEqual(result.stderr, "")
        self.assertEqual(result.return_code, 0)

    def test_runtime_error(self):
        code = '''
#include <stdio.h>
int main() {
    int* ptr = 0;
    *ptr = 42;  // Null pointer dereference
    return 0;
}'''
        result = self.run_async(run_c(code))
        self.assertNotEqual(result.return_code, 0)
