import unittest
import asyncio

class AsyncTestCase(unittest.TestCase):
    """Base class for async tests with event loop setup/teardown"""
    
    def setUp(self):
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)

    def tearDown(self):
        self.loop.close()

    def run_async(self, coro):
        return self.loop.run_until_complete(coro)
