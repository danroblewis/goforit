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

async def run_typescript(code: str) -> CodeResult:
    # Create a temporary directory for TypeScript compilation
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create tsconfig.json for module support
        tsconfig = {
            "compilerOptions": {
                "target": "ES2020",
                "module": "commonjs",
                "strict": True,
                "esModuleInterop": True,
                "skipLibCheck": True,
                "forceConsistentCasingInFileNames": True,
                "outDir": "dist"
            }
        }
        
        # Write tsconfig.json
        with open(os.path.join(tmpdir, 'tsconfig.json'), 'w') as f:
            import json
            json.dump(tsconfig, f, indent=2)
        
        # Write TypeScript code
        ts_file = os.path.join(tmpdir, 'main.ts')
        with open(ts_file, 'w') as f:
            f.write(code)
        
        try:
            # Compile TypeScript to JavaScript
            compile_result = await run_process(['tsc', '--project', tmpdir])
            if compile_result.return_code != 0:
                return compile_result
            
            # Run the compiled JavaScript
            js_file = os.path.join(tmpdir, 'dist', 'main.js')
            if not os.path.exists(js_file):
                return CodeResult(
                    stdout="",
                    stderr="TypeScript compilation failed: no output file generated",
                    return_code=1
                )
            
            # Read the compiled JavaScript
            with open(js_file, 'r') as f:
                js_code = f.read()
            
            # Run the JavaScript code
            run_result = await run_process(['node', '-e', js_code])
            
            # Include the compiled JavaScript in the output
            run_result.code_outputs = [CodeOutput(content=js_code, language='javascript')]
            return run_result
            
        except Exception as e:
            return CodeResult(
                stdout="",
                stderr=f"Failed to execute TypeScript code: {str(e)}",
                return_code=1
            )

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
    
    try:
        # Generate assembly output
        asm_result = await run_process(['gcc', '-S', '-masm=intel', '-o', '-'] + compiler_flags + [c_file])
        if asm_result.return_code != 0:
            return asm_result

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
                CodeOutput(content=asm_result.stdout, language="asm-intel")
            ]
        )
    
    finally:
        # Cleanup
        try:
            os.unlink(c_file)
            os.unlink(executable)
        except:
            pass

async def run_c_to_objdump(code: str) -> CodeResult:
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

async def run_assembly(code: str) -> CodeResult:
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
    'typescript': run_typescript,
    'java': run_java,
    'cpp': run_cpp,
    'c': run_c,
    'c_to_asm': run_c_to_asm,
    'c_to_objdump': run_c_to_objdump,
    'assembly': run_assembly,
    'rust': run_rust,
    'go': run_go
}