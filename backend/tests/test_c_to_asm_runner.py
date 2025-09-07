import unittest
import asyncio
from ..language_runners import run_c_to_asm

class TestCToAsmRunner(unittest.TestCase):
    def setUp(self):
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)

    def tearDown(self):
        self.loop.close()

    def run_async(self, coro):
        return self.loop.run_until_complete(coro)

    def test_basic_function(self):
        code = '''
int main() {
    return 42;
}'''
        result = self.run_async(run_c_to_asm(code))
        self.assertEqual(result.return_code, 0)
        self.assertEqual(len(result.code_outputs), 1)
        self.assertTrue(result.code_outputs[0].language.startswith('asm-'))
        self.assertIn('main', result.code_outputs[0].content)

    def test_with_compiler_flags(self):
        code = '''// -O3
int main() {
    return 42;
}'''
        result = self.run_async(run_c_to_asm(code))
        self.assertEqual(result.return_code, 0)
        self.assertEqual(len(result.code_outputs), 1)
        self.assertTrue(result.code_outputs[0].language.startswith('asm-'))

    def test_compilation_error(self):
        code = '''
int main() {
    return 42   // Missing semicolon
}'''
        result = self.run_async(run_c_to_asm(code))
        self.assertNotEqual(result.return_code, 0)
        self.assertNotEqual(result.stderr, "")

    def test_temp_path_cleanup(self):
        code = '''
int main() {
    return 42;
}'''
        result = self.run_async(run_c_to_asm(code))
        self.assertEqual(result.return_code, 0)
        # Check that temp directory paths are not in the output
        self.assertNotIn('/var/folders', result.code_outputs[0].content)
        self.assertNotIn('/tmp', result.code_outputs[0].content)

    def test_function_with_loop(self):
        code = '''
int factorial(int n) {
    int result = 1;
    for(int i = 1; i <= n; i++) {
        result *= i;
    }
    return result;
}

int main() {
    return factorial(5);
}'''
        result = self.run_async(run_c_to_asm(code))
        self.assertEqual(result.return_code, 0)
        self.assertEqual(len(result.code_outputs), 1)
        self.assertIn('factorial', result.code_outputs[0].content)

    def test_multiple_compiler_flags(self):
        code = '''// -O3 -march=native -fomit-frame-pointer
int main() {
    return 42;
}'''
        result = self.run_async(run_c_to_asm(code))
        self.assertEqual(result.return_code, 0)
        self.assertEqual(len(result.code_outputs), 1)
