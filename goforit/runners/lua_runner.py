import tempfile
import os
import asyncio
from .base import CodeResult, CodeOutput, run_process

async def run_lua(code: str) -> CodeResult:
    with tempfile.TemporaryDirectory() as tmpdir:
        # Write the code to a file
        source_file = os.path.join(tmpdir, 'main.lua')
        with open(source_file, 'w') as f:
            f.write(code)

        # Check syntax first with -p (parse only)
        check_result = await run_process(['lua', source_file])
        if check_result.return_code != 0:
            return check_result

        # Run with debug info (-l) and warnings (-W)
        run_result = await run_process(['lua', '-W', source_file])

        # If there was an error, get the debug traceback
        if run_result.return_code != 0:
            # Run again with debug.traceback as error handler
            debug_code = f"""
                local ok, err = xpcall(function()
                    {code}
                end, debug.traceback)
                if not ok then
                    io.stderr:write(err)
                    os.exit(1)
                end
            """
            with open(source_file, 'w') as f:
                f.write(debug_code)
            debug_result = await run_process(['lua', source_file])
            run_result.code_outputs = [
                CodeOutput(content=debug_result.stderr, language="lua-debug")
            ]

        return run_result
