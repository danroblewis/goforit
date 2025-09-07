import unittest
import asyncio
from ..language_runners import run_javascript

class TestJavaScriptRunner(unittest.TestCase):
    def setUp(self):
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)

    def tearDown(self):
        self.loop.close()

    def run_async(self, coro):
        return self.loop.run_until_complete(coro)

    def test_hello_world(self):
        code = 'console.log("Hello, World!")'
        result = self.run_async(run_javascript(code))
        self.assertEqual(result.stdout.strip(), "Hello, World!")
        self.assertEqual(result.stderr, "")
        self.assertEqual(result.return_code, 0)

    def test_syntax_error(self):
        code = 'console.log("Hello, World!'  # Missing closing quote
        result = self.run_async(run_javascript(code))
        self.assertNotEqual(result.return_code, 0)
        self.assertNotEqual(result.stderr, "")

    def test_timeout(self):
        code = 'while(true) {}'
        result = self.run_async(run_javascript(code))
        self.assertEqual(result.return_code, 124)
        self.assertEqual(result.stderr, "Execution timed out")

    def test_multiple_lines(self):
        code = '''
function add(a, b) {
    return a + b;
}
console.log(add(2, 3));
'''
        result = self.run_async(run_javascript(code))
        self.assertEqual(result.stdout.strip(), "5")
        self.assertEqual(result.stderr, "")
        self.assertEqual(result.return_code, 0)
