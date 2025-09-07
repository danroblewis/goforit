import os
import tempfile
from .base import run_process

async def run_cpp(code: str):
    """Run C++ code by compiling and executing."""
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
