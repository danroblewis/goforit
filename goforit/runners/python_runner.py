from .base import run_process

async def run_python(code: str):
    """Run Python code using the python interpreter."""
    return await run_process(['python', '-c', code])
