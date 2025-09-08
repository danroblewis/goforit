import tempfile
import os
import asyncio
from .base import CodeResult, CodeOutput, run_process

async def run_ruby(code: str) -> CodeResult:
    with tempfile.TemporaryDirectory() as tmpdir:
        # Write the code to a file
        source_file = os.path.join(tmpdir, 'main.rb')
        with open(source_file, 'w') as f:
            f.write(code)

        # Run Ruby with warnings enabled and syntax check first
        check_result = await run_process(['ruby', '-wc', source_file])
        if check_result.return_code != 0:
            return check_result

        # Run the program with warnings and debug info
        run_result = await run_process(['ruby', '-w', source_file])

        # If there was an error, get the backtrace with debug info
        if run_result.return_code != 0:
            debug_result = await run_process(['ruby', '-w', '-d', source_file])
            run_result.code_outputs = [
                CodeOutput(content=debug_result.stderr, language="ruby-debug")
            ]

        return run_result
