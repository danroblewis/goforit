import unittest
import asyncio
from ..language_runners import run_java

class TestJavaRunner(unittest.TestCase):
    def setUp(self):
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)

    def tearDown(self):
        self.loop.close()

    def run_async(self, coro):
        return self.loop.run_until_complete(coro)

    def test_hello_world(self):
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

    def test_compilation_error(self):
        code = '''
public class Test {
    public static void main(String[] args) {
        System.out.println("Hello, World!")  // Missing semicolon
    }
}'''
        result = self.run_async(run_java(code))
        self.assertNotEqual(result.return_code, 0)
        self.assertNotEqual(result.stderr, "")

    def test_missing_class(self):
        code = '''
public class WrongName {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}'''
        result = self.run_async(run_java(code))
        self.assertNotEqual(result.return_code, 0)

    def test_function_call(self):
        code = '''
public class Test {
    public static int add(int a, int b) {
        return a + b;
    }
    
    public static void main(String[] args) {
        System.out.println(add(2, 3));
    }
}'''
        result = self.run_async(run_java(code))
        self.assertEqual(result.stdout.strip(), "5")
        self.assertEqual(result.stderr, "")
        self.assertEqual(result.return_code, 0)
