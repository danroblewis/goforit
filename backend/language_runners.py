import asyncio
import tempfile
import os
from typing import Tuple, Optional

class CodeResult:
    def __init__(self, stdout: str, stderr: str, return_code: int):
        self.stdout = stdout
        self.stderr = stderr
        self.return_code = return_code

async def run_process(cmd: list[str], input_text: Optional[str] = None, timeout: int = 2) -> CodeResult:
    try:
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdin=asyncio.subprocess.PIPE if input_text else None,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            preexec_fn=os.setsid
        )
        
        try:
            stdout, stderr = await asyncio.wait_for(
                process.communicate(input_text.encode() if input_text else None),
                timeout=timeout
            )
            return CodeResult(
                stdout=stdout.decode(),
                stderr=stderr.decode(),
                return_code=process.returncode or 0
            )
        except asyncio.TimeoutError:
            os.killpg(os.getpgid(process.pid), 9)
            return CodeResult(
                stdout="",
                stderr="Execution timed out",
                return_code=124
            )
    except Exception as e:
        return CodeResult(
            stdout="",
            stderr=f"Failed to execute: {str(e)}",
            return_code=1
        )

async def run_python(code: str) -> CodeResult:
    return await run_process(['python', '-c', code])

async def run_javascript(code: str) -> CodeResult:
    return await run_process(['node', '-e', code])

async def run_cpp(code: str) -> CodeResult:
    # For C++, we still need to compile, so we'll use a temp file
    with tempfile.NamedTemporaryFile(suffix='.cpp', mode='w', delete=False) as f:
        f.write(code)
        cpp_file = f.name
    
    try:
        # Compile
        executable = cpp_file + '.out'
        compile_result = await run_process(['g++', cpp_file, '-o', executable])
        
        if compile_result.return_code != 0:
            return compile_result
        
        # Run
        run_result = await run_process([executable])
        return run_result
    
    finally:
        # Cleanup
        try:
            os.unlink(cpp_file)
            os.unlink(executable)
        except:
            pass

async def run_java(code: str) -> CodeResult:
    # Java requires a class definition, so we need to extract the class name
    # and create a temporary file with the correct name
    import re
    
    # Try to find the public class name
    match = re.search(r'public\s+class\s+(\w+)', code)
    if not match:
        return CodeResult(
            stdout="",
            stderr="Error: No public class found in the Java code",
            return_code=1
        )
    
    class_name = match.group(1)
    
    # Create a temporary directory to hold our Java files
    with tempfile.TemporaryDirectory() as tmpdir:
        java_file = os.path.join(tmpdir, f"{class_name}.java")
        
        # Write the code to a file
        with open(java_file, 'w') as f:
            f.write(code)
        
        try:
            # Compile
            compile_result = await run_process(['javac', java_file])
            if compile_result.return_code != 0:
                return compile_result
            
            # Run
            return await run_process(['java', '-cp', tmpdir, class_name])
        
        except Exception as e:
            return CodeResult(
                stdout="",
                stderr=f"Failed to execute Java code: {str(e)}",
                return_code=1
            )

# Map of language identifiers to their runner functions
LANGUAGE_RUNNERS = {
    'python': run_python,
    'javascript': run_javascript,
    'java': run_java,
    'cpp': run_cpp
}
