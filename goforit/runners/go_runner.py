import tempfile
import os
import time
import asyncio
from .base import CodeResult, CodeOutput, run_process
from .utils import detect_system_arch, format_hexdump

async def run_go(code: str) -> CodeResult:
    start_time = time.time()
    with tempfile.TemporaryDirectory() as tmpdir:
        # Write the code
        main_go = os.path.join(tmpdir, 'main.go')
        with open(main_go, 'w') as f:
            if not code.strip().startswith('package main'):
                code = 'package main\n\n' + code
            f.write(code)
        write_time = time.time() - start_time

        # Build the program with -mod=mod to avoid needing go.mod
        build_start = time.time()
        executable = os.path.join(tmpdir, 'main')
        build_result = await run_process(['go', 'build', '-mod=mod', '-o', executable, main_go])
        if build_result.return_code != 0:
            print(f"Write time: {write_time:.3f}s")
            print(f"Build time: {time.time() - build_start:.3f}s")
            return build_result
        build_time = time.time() - build_start

        # Run everything in parallel: objdump, hexdump, and program execution
        parallel_start = time.time()
        arch = detect_system_arch()
        
        # Read binary for hexdump
        try:
            with open(executable, 'rb') as f:
                binary_data = f.read()
        except Exception as e:
            print(f"Error reading binary: {e}")
            binary_data = b''
        
        # Create tasks for parallel execution
        tasks = [
            run_process(['objdump', '-d', executable]),  # objdump
            format_hexdump(binary_data),                 # hexdump
            run_process([executable])                    # program execution
        ]
        
        # Run all tasks in parallel and wait for results
        try:
            results = await asyncio.gather(*tasks)
            objdump_result, hexdump_output, run_result = results
        except Exception as e:
            print(f"Error in parallel execution: {e}")
            return CodeResult(stdout="", stderr=str(e), return_code=1)

        parallel_time = time.time() - parallel_start
        
        # Check for errors
        if objdump_result.return_code != 0:
            print(f"Write time: {write_time:.3f}s")
            print(f"Build time: {build_time:.3f}s")
            print(f"Parallel time: {parallel_time:.3f}s")
            return objdump_result
        if run_result.return_code != 0:
            print(f"Write time: {write_time:.3f}s")
            print(f"Build time: {build_time:.3f}s")
            print(f"Parallel time: {parallel_time:.3f}s")
            return run_result
        
        # Add objdump and hexdump outputs
        run_result.code_outputs = [
            CodeOutput(content=objdump_result.stdout, language=f"asm-{arch}"),
            CodeOutput(content=hexdump_output, language="hexdump")  # hexdump_output is now awaited
        ]

        # Print timing info
        print(f"\nGo runner timing:")
        print(f"Write time:     {write_time:.3f}s")
        print(f"Build time:     {build_time:.3f}s")
        print(f"Parallel time:  {parallel_time:.3f}s")
        print(f"Total time:     {time.time() - start_time:.3f}s")
        
        return run_result