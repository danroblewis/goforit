import tempfile
import os
from .base import CodeResult, CodeOutput, run_process
from .utils import detect_system_arch, format_hexdump

async def run_go(code: str) -> CodeResult:
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create a Go module
        module_result = await run_process(['go', 'mod', 'init', 'example'], cwd=tmpdir)
        if module_result.return_code != 0:
            return module_result

        # Write the code
        main_go = os.path.join(tmpdir, 'main.go')
        with open(main_go, 'w') as f:
            if not code.strip().startswith('package main'):
                code = 'package main\n\n' + code
            f.write(code)

        # Build the program
        executable = os.path.join(tmpdir, 'main')
        build_result = await run_process(['go', 'build', '-o', executable, main_go], cwd=tmpdir)
        if build_result.return_code != 0:
            return build_result

        # Get objdump output
        arch = detect_system_arch()
        objdump_result = await run_process(['objdump', '-d', executable])
        if objdump_result.return_code != 0:
            return objdump_result

        # Get hexdump
        try:
            with open(executable, 'rb') as f:
                binary_data = f.read()
            hexdump = format_hexdump(binary_data)
        except Exception as e:
            hexdump = f"Failed to read binary: {str(e)}"

        # Run the program
        run_result = await run_process(['go', 'run', main_go], cwd=tmpdir)
        
        # Add objdump and hexdump outputs
        run_result.code_outputs = [
            CodeOutput(content=objdump_result.stdout, language=f"asm-{arch}"),
            CodeOutput(content=hexdump, language="hexdump")
        ]
        return run_result