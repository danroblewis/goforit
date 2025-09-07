import os
import tempfile
from .base import run_process

async def run_c(code: str):
    """Run C code by compiling and executing."""
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
