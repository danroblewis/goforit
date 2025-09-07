import tempfile
import os
from .base import CodeResult, CodeOutput, run_process
from .utils import detect_system_arch, format_hexdump

async def run_c(code: str) -> CodeResult:
    # Extract compiler flags from first line comment
    lines = code.split('\n')
    compiler_flags = []
    if lines and lines[0].startswith('//'):
        compiler_flags = lines[0].lstrip('/ ').split()

    with tempfile.NamedTemporaryFile(suffix='.c', mode='w', delete=False) as f:
        f.write(code)
        c_file = f.name

    try:
        # Get assembly output
        arch = detect_system_arch()
        asm_result = await run_process(['gcc', '-S', '-masm=intel', '-o', '-'] + compiler_flags + [c_file])
        if asm_result.return_code == 0:
            asm_output = f"// arch: {arch} syntax: intel\n\n{asm_result.stdout}"
        else:
            return asm_result

        # Get objdump output
        object_file = c_file + '.o'
        compile_obj_result = await run_process(['gcc', '-c', c_file, '-o', object_file] + compiler_flags)
        if compile_obj_result.return_code != 0:
            return compile_obj_result

        objdump_result = await run_process(['objdump', '-d', object_file])
        if objdump_result.return_code != 0:
            return objdump_result

        # Get hexdump
        try:
            with open(object_file, 'rb') as f:
                binary_data = f.read()
            hexdump = format_hexdump(binary_data)
        except Exception as e:
            hexdump = f"Failed to read binary: {str(e)}"

        # Compile and run the program
        executable = c_file + '.out'
        compile_result = await run_process(['gcc', c_file, '-o', executable] + compiler_flags)
        if compile_result.return_code != 0:
            return compile_result

        run_result = await run_process([executable])
        
        # Add all outputs
        run_result.code_outputs = [
            CodeOutput(content=asm_output, language="asm-intel"),
            CodeOutput(content=objdump_result.stdout, language=f"asm-{arch}"),
            CodeOutput(content=hexdump, language="hexdump")
        ]
        return run_result

    finally:
        try:
            os.unlink(c_file)
            os.unlink(object_file)
            os.unlink(executable)
        except:
            pass