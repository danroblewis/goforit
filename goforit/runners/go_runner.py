import tempfile
import os
import re
import time
import asyncio
from .base import CodeResult, CodeOutput, run_process
from .utils import detect_system_arch, format_hexdump

def parse_build_flags(code: str) -> list[str]:
    """Extract build flags from first line comment."""
    flags_match = re.match(r'//\s*flags:\s*(.*)', code)
    if not flags_match:
        # Default optimization flags for smaller binaries and faster builds
        return ['-ldflags=-s,-w']  # Strip debug info and DWARF tables
    return flags_match.group(1).split()

async def run_go(code: str) -> CodeResult:
    start_time = time.time()
    with tempfile.TemporaryDirectory() as tmpdir:
        # Parse build flags
        build_flags = parse_build_flags(code)
        
        # Write the code, ensuring package main is first
        main_go = os.path.join(tmpdir, 'main.go')
        code_lines = code.strip().split('\n')
        
        # Remove any existing package declaration
        code_lines = [line for line in code_lines if not line.strip().startswith('package ')]
        
        # Add package main as first line (after any comments)
        for i, line in enumerate(code_lines):
            if not line.strip().startswith('//'):
                code_lines.insert(i, 'package main')
                break
        else:
            # If we're here, the file was all comments
            code_lines.append('package main')
        
        with open(main_go, 'w') as f:
            f.write('\n'.join(code_lines))
        write_time = time.time() - start_time

        # Build the program with -mod=mod to avoid needing go.mod
        build_start = time.time()
        executable = os.path.join(tmpdir, 'main')
        build_cmd = ['go', 'build', '-mod=mod', '-o', executable]
        build_cmd.extend(build_flags)
        build_cmd.append(main_go)
        
        build_result = await run_process(build_cmd)
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
            CodeOutput(content=hexdump_output, language="hexdump")
        ]

        # Print timing info
        print(f"\nGo runner timing:")
        print(f"Write time:     {write_time:.3f}s")
        print(f"Build time:     {build_time:.3f}s")
        print(f"Parallel time:  {parallel_time:.3f}s")
        print(f"Total time:     {time.time() - start_time:.3f}s")
        
        return run_result