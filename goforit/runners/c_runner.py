import tempfile
import os
import asyncio
from .base import CodeResult, CodeOutput, run_process
from .utils import detect_system_arch, format_binary_for_hexdump

async def run_c(code: str) -> CodeResult:
    with tempfile.TemporaryDirectory() as tmpdir:
        # Write the code to a file
        source_file = os.path.join(tmpdir, 'main.c')
        with open(source_file, 'w') as f:
            f.write(code)

        # Get system architecture for objdump output
        arch = detect_system_arch()

        # Compile to assembly first
        asm_file = os.path.join(tmpdir, 'main.s')
        asm_result = await run_process(['gcc', '-S', '-o', asm_file, source_file])
        if asm_result.return_code != 0:
            return asm_result

        # Read assembly output
        try:
            with open(asm_file, 'r') as f:
                asm_output = f.read()
        except Exception as e:
            print(f"Error reading assembly: {e}")
            asm_output = ""

        # Compile to executable
        executable = os.path.join(tmpdir, 'main')
        compile_result = await run_process(['gcc', '-o', executable, source_file])
        if compile_result.return_code != 0:
            return compile_result

        # Read binary for hexdump
        try:
            with open(executable, 'rb') as f:
                binary_data = f.read()
        except Exception as e:
            print(f"Error reading binary: {e}")
            binary_data = b''

        # Format binary data as base64
        hexdump_data = format_binary_for_hexdump(binary_data)

        # Run objdump and program in parallel
        tasks = [
            run_process(['objdump', '-d', executable]),  # objdump
            run_process([executable])                    # program execution
        ]

        try:
            objdump_result, run_result = await asyncio.gather(*tasks)
        except Exception as e:
            print(f"Error in parallel execution: {e}")
            return CodeResult(stdout="", stderr=str(e), return_code=1)

        if run_result.return_code != 0:
            return run_result

        # Add all outputs
        run_result.code_outputs = [
            CodeOutput(content=asm_output, language="asm-intel"),
            CodeOutput(content=objdump_result.stdout, language=f"asm-{arch}"),
            CodeOutput(content=hexdump_data, language="hexdump-binary")
        ]

        return run_result