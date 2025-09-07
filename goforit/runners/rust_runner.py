import os
import tempfile
from .base import run_process, CodeResult

async def run_rust(code: str) -> CodeResult:
    """Run Rust code by compiling and executing."""
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
