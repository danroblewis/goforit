import tempfile
import os
import re
from .base import CodeResult, CodeOutput, run_process
from .utils import format_hexdump

async def run_java(code: str) -> CodeResult:
    match = re.search(r'public\s+class\s+(\w+)', code)
    if not match:
        return CodeResult(stdout="", stderr="Error: No public class found in the Java code", return_code=1)
    
    class_name = match.group(1)
    with tempfile.TemporaryDirectory() as tmpdir:
        java_file = os.path.join(tmpdir, f"{class_name}.java")
        with open(java_file, 'w') as f:
            f.write(code)
        
        # Compile the code
        compile_result = await run_process(['javac', java_file])
        if compile_result.return_code != 0:
            return compile_result

        # Get bytecode disassembly
        class_file = os.path.join(tmpdir, f"{class_name}.class")
        bytecode_result = await run_process(['javap', '-c', '-v', class_file])
        if bytecode_result.return_code != 0:
            return bytecode_result

        # Get hexdump of class file
        try:
            with open(class_file, 'rb') as f:
                binary_data = f.read()
            hexdump = format_hexdump(binary_data)
        except Exception as e:
            hexdump = f"Failed to read binary: {str(e)}"

        # Run the program
        run_result = await run_process(['java', '-cp', tmpdir, class_name])
        
        # Add bytecode and hexdump outputs
        run_result.code_outputs = [
            CodeOutput(content=bytecode_result.stdout, language="java-bytecode"),
            CodeOutput(content=hexdump, language="hexdump")
        ]
        return run_result