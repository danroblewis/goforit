import pytest
import asyncio

@pytest.fixture
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
def run_async(event_loop):
    def _run_async(coro):
        return event_loop.run_until_complete(coro)
    return _run_async
