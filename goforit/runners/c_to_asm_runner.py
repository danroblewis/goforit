import os
import tempfile
from .base import run_process, CodeResult, CodeOutput
from .utils import detect_system_arch

async def run_c_to_asm(code: str) -> CodeResult:
    """Run C code and show the generated assembly."""
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
