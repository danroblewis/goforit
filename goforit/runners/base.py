import asyncio
import os
from typing import Optional
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
