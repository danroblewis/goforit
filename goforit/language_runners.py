import asyncio
import tempfile
import os
import re
import platform
from typing import Tuple, Optional
from dataclasses import dataclass

@dataclass
class CodeOutput:
    content: str
    language: Optional[str] = None

class CodeResult:
    def __init__(self, stdout: str = "", stderr: str = "", return_code: int = 0, code_outputs: list[CodeOutput] = None):
        self.stdout = stdout
        self.stderr = stderr
        self.return_code = return_code
        self.code_outputs = code_outputs or []

def detect_system_arch():
    """Detect the system's architecture for assembly output."""
    machine = platform.machine().lower()
    if machine in ['x86_64', 'amd64']:
        return 'x86_64'
    elif machine in ['arm64', 'aarch64']:
        return 'arm64'
    elif machine in ['i386', 'i686', 'x86']:
        return 'x86'
    else:
        return 'unknown'

def format_hexdump(data: bytes, width: int = 16) -> str:
    """Format binary data as a hexdump with address, hex values, and ASCII representation."""
    result = []
    for i in range(0, len(data), width):
        chunk = data[i:i + width]
        # Address
        result.append(f"{i:08x}  ")
        
        # Hex values
        hex_values = []
        ascii_values = []
        
        for j, byte in enumerate(chunk):
            hex_values.append(f"{byte:02x}")
            # Add extra space every 8 bytes
            if j % 8 == 7:
                hex_values.append(" ")
            # Printable ASCII or dot
            ascii_values.append(chr(byte) if 32 <= byte <= 126 else ".")
        
        # Pad hex values if not a full line
        while len(hex_values) < width + (width // 8):
            hex_values.append("  ")
            if len(hex_values) % 9 == 8:  # Account for the extra spaces
                hex_values.append(" ")
        
        # Combine parts
        result.append(" ".join(hex_values))
        result.append(" |")
        result.append("".join(ascii_values))
        result.append("|\n")
    
    return "".join(result)

[... rest of the file unchanged until run_c_to_asm ...]

async def run_c_to_asm(code: str) -> CodeResult:
    # Extract compiler flags from first line comment if present
    lines = code.split('\n')
    compiler_flags = []
    if lines and lines[0].startswith('//'):
        compiler_flags = lines[0].lstrip('/ ').split()
    
    # Create temp files
    with tempfile.NamedTemporaryFile(suffix='.c', mode='w', delete=False) as f:
        f.write(code)
        c_file = f.name
    
    try:
        # Detect architecture
        arch = detect_system_arch()
        
        # Generate assembly output with architecture header
        asm_result = await run_process(['gcc', '-S', '-masm=intel', '-o', '-'] + compiler_flags + [c_file])
        if asm_result.return_code != 0:
            return asm_result

        # Add architecture header to assembly output
        asm_output = f"// arch: {arch} syntax: intel\n\n{asm_result.stdout}"

        # Compile for execution
        executable = c_file + '.out'
        compile_result = await run_process(['gcc', c_file, '-o', executable] + compiler_flags)
        if compile_result.return_code != 0:
            return compile_result
        
        # Run the program
        run_result = await run_process([executable])
        
        # Return assembly and program output
        return CodeResult(
            stdout=run_result.stdout,
            stderr=run_result.stderr,
            return_code=run_result.return_code,
            code_outputs=[
                CodeOutput(content=asm_output, language="asm-intel")
            ]
        )
    
    finally:
        # Cleanup
        try:
            os.unlink(c_file)
            os.unlink(executable)
        except:
            pass

[... rest of the file unchanged ...]