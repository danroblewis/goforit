import asyncio
import tempfile
import os
import re
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

async def run_c(code: str) -> CodeResult:
    # For C, we need to compile, so we'll use a temp file
    with tempfile.NamedTemporaryFile(suffix='.c', mode='w', delete=False) as f:
        f.write(code)
        c_file = f.name
    
    try:
        # Compile
        executable = c_file + '.out'
        compile_result = await run_process(['gcc', c_file, '-o', executable])
        
        if compile_result.return_code != 0:
            return compile_result
        
        # Run
        run_result = await run_process([executable])
        return run_result
    
    finally:
        # Cleanup
        try:
            os.unlink(c_file)
            os.unlink(executable)
        except:
            pass

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
        
        # Return assembly and program output
        return CodeResult(
            stdout=run_result.stdout,
            stderr=run_result.stderr,
            return_code=run_result.return_code,
            code_outputs=[
                CodeOutput(content=cleaned_output, language=f"asm-{arch_type}")
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

async def run_cpp(code: str) -> CodeResult:
    # For C++, we need to compile, so we'll use a temp file
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

async def run_rust(code: str) -> CodeResult:
    # Create a temporary directory for the Rust project
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create a basic Rust project structure
        main_rs = os.path.join(tmpdir, 'main.rs')
        
        # Write the code to main.rs
        with open(main_rs, 'w') as f:
            f.write(code)
        
        try:
            # Compile the Rust code
            compile_result = await run_process(['rustc', main_rs, '-o', os.path.join(tmpdir, 'program')])
            if compile_result.return_code != 0:
                return compile_result
            
            # Run the program
            return await run_process([os.path.join(tmpdir, 'program')])
        
        except Exception as e:
            return CodeResult(
                stdout="",
                stderr=f"Failed to execute Rust code: {str(e)}",
                return_code=1
            )

async def run_go(code: str) -> CodeResult:
    # Create a temporary directory for the Go project
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create main.go
        main_go = os.path.join(tmpdir, 'main.go')
        
        # Write the code to main.go
        with open(main_go, 'w') as f:
            # If no package main is specified, add it
            if not code.strip().startswith('package main'):
                code = 'package main\n\n' + code
            f.write(code)
        
        try:
            # Run the Go code directly (go run compiles and runs in one step)
            return await run_process(['go', 'run', main_go])
        
        except Exception as e:
            return CodeResult(
                stdout="",
                stderr=f"Failed to execute Go code: {str(e)}",
                return_code=1
            )

# Map of language identifiers to their runner functions
LANGUAGE_RUNNERS = {
    'python': run_python,
    'javascript': run_javascript,
    'java': run_java,
    'cpp': run_cpp,
    'c': run_c,
    'c_to_asm': run_c_to_asm,
    'rust': run_rust,
    'go': run_go
}