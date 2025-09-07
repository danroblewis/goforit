import os
import re
import tempfile
from .base import run_process, CodeResult, CodeOutput
from .utils import format_hexdump

async def run_c_to_objdump(code: str) -> CodeResult:
    """Run C code and show the disassembled binary with hexdump."""
    # Extract compiler flags from first line comment if present
    lines = code.split('\n')
    compiler_flags = []
    if lines and lines[0].startswith('//'):
        compiler_flags = lines[0].lstrip('/ ').split()
    
    # Create temp files
    with tempfile.NamedTemporaryFile(suffix='.c', mode='w', delete=False) as f:
        f.write(code)
        c_file = f.name
        base_name = os.path.basename(c_file)
    
    try:
        # Compile with optimization flags from comment
        executable = c_file + '.out'
        object_file = c_file + '.o'
        
        # Compile to object file
        compile_cmd = ['gcc', '-c', c_file, '-o', object_file] + compiler_flags
        compile_result = await run_process(compile_cmd)
        
        if compile_result.return_code != 0:
            return compile_result
        
        # Get assembly output
        objdump_result = await run_process(['objdump', '-d', object_file])
        if objdump_result.return_code != 0:
            return objdump_result

        # Get hex dump
        hexdump_result = await run_process(['objdump', '-s', object_file])
        if hexdump_result.return_code != 0:
            # If objdump -s fails, read the file and format it ourselves
            try:
                with open(object_file, 'rb') as f:
                    binary_data = f.read()
                hexdump = format_hexdump(binary_data)
            except Exception as e:
                hexdump = f"Failed to read binary: {str(e)}"
        else:
            hexdump = hexdump_result.stdout

        # Clean up the objdump output by removing temp directory paths
        cleaned_output = objdump_result.stdout.replace(os.path.dirname(c_file) + '/', '')

        # Detect architecture from objdump output
        arch_match = re.search(r'file format\s+([^\n]+)', cleaned_output)
        arch_type = "unknown"
        if arch_match:
            arch_format = arch_match.group(1).strip()
            if "arm64" in arch_format:
                arch_type = "arm64"
            elif "x86-64" in arch_format:
                arch_type = "x86_64"
            elif "x86" in arch_format:
                arch_type = "x86"
            elif "mach-o" in arch_format:
                arch_type = "mach-o"
            else:
                arch_type = arch_format
        
        # Compile for execution
        compile_exec_cmd = ['gcc', c_file, '-o', executable] + compiler_flags
        compile_exec_result = await run_process(compile_exec_cmd)
        
        if compile_exec_result.return_code != 0:
            return compile_exec_result
        
        # Run the program
        run_result = await run_process([executable])
        
        # Return assembly, hex dump, and program output
        return CodeResult(
            stdout=run_result.stdout,
            stderr=run_result.stderr,
            return_code=run_result.return_code,
            code_outputs=[
                CodeOutput(content=cleaned_output, language=f"asm-{arch_type}"),
                CodeOutput(content=hexdump, language="hexdump")
            ]
        )
    
    finally:
        # Cleanup
        try:
            os.unlink(c_file)
            os.unlink(object_file)
            os.unlink(executable)
        except:
            pass
