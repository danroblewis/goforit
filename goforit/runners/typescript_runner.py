import os
import json
import tempfile
from .base import run_process, CodeResult, CodeOutput

async def run_typescript(code: str) -> CodeResult:
    """Run TypeScript code by compiling to JavaScript and running with Node.js."""
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
