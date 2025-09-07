import tempfile
import os
import re
import asyncio
from .base import CodeResult, CodeOutput, run_process
from .utils import format_hexdump

async def run_java(code: str) -> CodeResult:
    with tempfile.TemporaryDirectory() as tmpdir:
        # Extract class name from code
        class_match = re.search(r'class\s+(\w+)', code)
        if not class_match:
            return CodeResult(
                stdout="",
                stderr="Error: Could not find class name in code",
                return_code=1
            )
        class_name = class_match.group(1)

        # Write the code to a file
        source_file = os.path.join(tmpdir, f'{class_name}.java')
        with open(source_file, 'w') as f:
            f.write(code)

        # Compile the code
        compile_result = await run_process(['javac', source_file])
        if compile_result.return_code != 0:
            return compile_result

        # Read class file for hexdump
        class_file = os.path.join(tmpdir, f'{class_name}.class')
        try:
            with open(class_file, 'rb') as f:
                binary_data = f.read()
        except Exception as e:
            print(f"Error reading class file: {e}")
            binary_data = b''

        # Run javap, hexdump, and program in parallel
        tasks = [
            run_process(['javap', '-c', '-v', class_file]),  # bytecode
            format_hexdump(binary_data),                     # hexdump
            run_process(['java', '-cp', tmpdir, class_name]) # program execution
        ]

        try:
            javap_result, hexdump_output, run_result = await asyncio.gather(*tasks)
        except Exception as e:
            print(f"Error in parallel execution: {e}")
            return CodeResult(stdout="", stderr=str(e), return_code=1)

        if run_result.return_code != 0:
            return run_result

        # Add bytecode and hexdump outputs
        run_result.code_outputs = [
            CodeOutput(content=javap_result.stdout, language="java-bytecode"),
            CodeOutput(content=hexdump_output, language="hexdump")
        ]

        return run_result