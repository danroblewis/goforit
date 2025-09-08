import tempfile
import os
import re
import asyncio
from typing import Optional, Tuple
from .base import CodeResult, CodeOutput, run_process
from .utils import format_binary_for_hexdump

def parse_arch_and_syntax(code: str) -> Tuple[Optional[str], Optional[str]]:
    """Extract architecture and syntax from code comments."""
    arch_match = re.search(r'//\s*arch:\s*(\w+)', code)
    syntax_match = re.search(r'//\s*syntax:\s*(\w+)', code)
    return (
        arch_match.group(1) if arch_match else None,
        syntax_match.group(1) if syntax_match else None
    )

async def run_assembly(code: str) -> CodeResult:
    with tempfile.TemporaryDirectory() as tmpdir:
        # Parse architecture and syntax from comments
        arch, syntax = parse_arch_and_syntax(code)
        if not arch:
            return CodeResult(
                stdout="",
                stderr="Error: Architecture not specified. Add a comment like: // arch: x86_64",
                return_code=1
            )

        # Write the code to a file
        source_file = os.path.join(tmpdir, 'code.asm')
        with open(source_file, 'w') as f:
            f.write(code)

        # Choose assembler and flags based on architecture
        if arch == 'x86' or arch == 'x86_64':
            # NASM for x86/x86_64
            obj_file = os.path.join(tmpdir, 'code.o')
            format_flag = 'elf64' if arch == 'x86_64' else 'elf32'
            syntax_flag = ['-msyntax=intel'] if syntax == 'intel' else []
            
            assemble_result = await run_process(
                ['nasm', '-f', format_flag] + syntax_flag + ['-o', obj_file, source_file]
            )
            if assemble_result.return_code != 0:
                return assemble_result

            # Link with default entry point
            link_result = await run_process(['ld', '-o', os.path.join(tmpdir, 'code'), obj_file])

        elif arch == 'arm64':
            # GNU as for ARM64
            obj_file = os.path.join(tmpdir, 'code.o')
            assemble_result = await run_process(['as', '-o', obj_file, source_file])
            if assemble_result.return_code != 0:
                return assemble_result

            # Link with proper alignment and entry point for ARM64 on macOS
            link_result = await run_process([
                'ld',
                '-o', os.path.join(tmpdir, 'code'),
                '-e', '_start',  # Set entry point
                '-arch', 'arm64',
                '-platform_version', 'macos', '11.0', '11.0',  # Set min version
                '-lSystem',  # Link with system libraries
                '-syslibroot', '/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk',
                obj_file
            ])

        else:
            return CodeResult(
                stdout="",
                stderr=f"Error: Unsupported architecture: {arch}",
                return_code=1
            )

        if link_result.return_code != 0:
            return link_result

        executable = os.path.join(tmpdir, 'code')

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

        # Add objdump and hexdump outputs
        run_result.code_outputs = [
            CodeOutput(content=objdump_result.stdout, language=f"asm-{arch}"),
            CodeOutput(content=hexdump_data, language="hexdump-binary")
        ]

        return run_result