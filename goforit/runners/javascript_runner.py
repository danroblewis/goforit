from .base import run_process

async def run_javascript(code: str):
    """Run JavaScript code using Node.js."""
    return await run_process(['node', '-e', code])
