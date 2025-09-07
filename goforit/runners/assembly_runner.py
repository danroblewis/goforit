import os
import re
import platform
import tempfile
from .base import run_process, CodeResult, CodeOutput
from .utils import format_hexdump

async def run_assembly(code: str) -> CodeResult:
    """Run assembly code by assembling and executing."""
    # Extract architecture and syntax from first line comment
    # Format: // arch: x86_64|x86|arm64 syntax: intel|att
    lines = code.split('\n')
    if not lines or not lines[0].startswith('//'):
        return CodeResult(
            stdout="",
            stderr="First line must be a comment specifying architecture and syntax.\nExample: // arch: x86_64 syntax: intel",
            return_code=1
        )

    # Parse architecture and syntax
    arch_match = re.search(r'arch:\s*(\w+)', lines[0])
    syntax_match = re.search(r'syntax:\s*(\w+)', lines[0])
    
    if not arch_match:
        return CodeResult(
            stdout="",
            stderr="Architecture not specified. Use '// arch: x86_64|x86|arm64'",
            return_code=1
        )
    
    arch = arch_match.group(1).lower()
    syntax = syntax_match.group(1).lower() if syntax_match else 'intel'

    # Validate architecture
    valid_archs = ['x86_64', 'x86', 'arm64']
    if arch not in valid_archs:
        return CodeResult(
            stdout="",
            stderr=f"Invalid architecture. Must be one of: {', '.join(valid_archs)}",
            return_code=1
        )

    # Validate syntax
    valid_syntaxes = ['intel', 'att']
    if syntax not in valid_syntaxes:
        return CodeResult(
            stdout="",
            stderr=f"Invalid syntax. Must be one of: {', '.join(valid_syntaxes)}",
            return_code=1
        )

    # Create temp files
    with tempfile.TemporaryDirectory() as tmpdir:
        asm_file = os.path.join(tmpdir, 'code.asm')
        obj_file = os.path.join(tmpdir, 'code.o')
        executable = os.path.join(tmpdir, 'code.out')

        # Write assembly code
        with open(asm_file, 'w') as f:
            f.write('\n'.join(lines[1:]))  # Skip the first line (comment)

        try:
            # Assemble based on architecture
            if arch in ['x86_64', 'x86']:
                # Use nasm for x86/x86_64
                format_flag = 'macho64' if arch == 'x86_64' and platform.system() == 'Darwin' else \
                            'elf64' if arch == 'x86_64' else \
                            'macho' if platform.system() == 'Darwin' else 'elf32'
                
                assemble_result = await run_process(['nasm', '-f', format_flag, asm_file, '-o', obj_file])
                if assemble_result.return_code != 0:
                    return assemble_result

                # Link
                link_result = await run_process(['ld', obj_file, '-o', executable])
                if link_result.return_code != 0:
                    return link_result

            elif arch == 'arm64':
                # Use as for arm64
                assemble_result = await run_process(['as', '-arch', 'arm64', asm_file, '-o', obj_file])
                if assemble_result.return_code != 0:
                    return assemble_result

                # Link
                link_result = await run_process(['ld', obj_file, '-o', executable, '-lSystem', '-syslibroot', '/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk', '-e', '_start'])
                if link_result.return_code != 0:
                    return link_result

            # Get hex dump
            try:
                with open(obj_file, 'rb') as f:
                    binary_data = f.read()
                hexdump = format_hexdump(binary_data)
            except Exception as e:
                hexdump = f"Failed to read binary: {str(e)}"

            # Run the program
            run_result = await run_process([executable])
            run_result.code_outputs = [CodeOutput(content=hexdump, language="hexdump")]
            return run_result

        except Exception as e:
            return CodeResult(
                stdout="",
                stderr=f"Failed to assemble or run: {str(e)}",
                return_code=1
            )
