import tempfile
import os
import asyncio
from .base import CodeResult, CodeOutput, run_process

async def run_prolog(code: str) -> CodeResult:
    with tempfile.TemporaryDirectory() as tmpdir:
        # Write the code to a file
        source_file = os.path.join(tmpdir, 'main.pl')
        with open(source_file, 'w') as f:
            f.write(code)

        # Run the program with SWI-Prolog
        # -q for quiet mode (no banner)
        # -s to load the source file
        # -t halt to terminate after running
        # -O to optimize
        run_result = await run_process(['swipl', '-q', '-O', '-s', source_file])

        # Add the trace output if there was a compilation error
        if run_result.return_code != 0:
            # Run again with trace enabled to get more info
            trace_result = await run_process(['swipl', '-q', '-O', '-s', source_file, '-t', 'trace'])
            run_result.code_outputs = [
                CodeOutput(content=trace_result.stderr, language="prolog-trace")
            ]

        return run_result
