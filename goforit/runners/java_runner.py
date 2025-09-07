import os
import re
import tempfile
from .base import run_process, CodeResult

async def run_java(code: str) -> CodeResult:
    """Run Java code by compiling and executing."""
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
