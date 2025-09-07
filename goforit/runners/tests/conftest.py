import pytest
import asyncio

@pytest.fixture
def event_loop():
    """Create an instance of the default event loop for each test case."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
def run_async():
    """Helper to run async functions in tests."""
    def _run_async(coro):
        return asyncio.get_event_loop().run_until_complete(coro)
    return _run_async
