import tempfile
import os
import asyncio
from .base import CodeResult, CodeOutput, run_process

async def run_haskell(code: str) -> CodeResult:
    with tempfile.TemporaryDirectory() as tmpdir:
        # Write the code to a file
        source_file = os.path.join(tmpdir, 'Main.hs')
        with open(source_file, 'w') as f:
            f.write(code)

        # Compile to Core (GHC's intermediate representation)
        core_result = await run_process(['ghc', '-ddump-simpl', '-dsuppress-all', source_file])
        core_output = core_result.stderr  # GHC dumps Core to stderr

        # Compile and run
        executable = os.path.join(tmpdir, 'Main')
        compile_cmd = [
            'ghc',
            '-O2',                  # Aggressive optimization
            '-no-keep-hi-files',   # Don't keep interface files
            '-no-keep-o-files',    # Don't keep object files
            '-o', executable,
            source_file
        ]
        compile_result = await run_process(compile_cmd)
        if compile_result.return_code != 0:
            return compile_result

        # Run the program
        run_result = await run_process([executable])
        if run_result.return_code != 0:
            return run_result

        # Add Core output
        run_result.code_outputs = [
            CodeOutput(content=core_output, language="haskell-core"),
        ]

        return run_result