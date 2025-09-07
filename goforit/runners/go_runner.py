import os
import tempfile
from .base import run_process, CodeResult

async def run_go(code: str) -> CodeResult:
    """Run Go code using 'go run'."""
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
