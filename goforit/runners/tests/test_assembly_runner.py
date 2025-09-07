import pytest
import platform
from ..assembly_runner import run_assembly

def test_missing_arch_header(run_async):
    code = '''
    section .text
    global _start
    _start:
        mov rax, 60
        xor rdi, rdi
        syscall
    '''
    result = run_async(run_assembly(code))
    assert "First line must be a comment" in result.stderr
    assert result.return_code != 0

def test_invalid_arch(run_async):
    code = '''// arch: invalid syntax: intel
    section .text
    global _start
    _start:
        mov rax, 60
        xor rdi, rdi
        syscall
    '''
    result = run_async(run_assembly(code))
    assert "Invalid architecture" in result.stderr
    assert result.return_code != 0

def test_invalid_syntax(run_async):
    code = '''// arch: x86_64 syntax: invalid
    section .text
    global _start
    _start:
        mov rax, 60
        xor rdi, rdi
        syscall
    '''
    result = run_async(run_assembly(code))
    assert "Invalid syntax" in result.stderr
    assert result.return_code != 0

@pytest.mark.skipif(platform.machine().lower() not in ['x86_64', 'amd64'],
                   reason="x86_64 assembly test requires x86_64 platform")
def test_x86_64_assembly(run_async):
    code = '''// arch: x86_64 syntax: intel
    section .text
    global _start
    _start:
        mov rax, 60     ; exit syscall
        xor rdi, rdi    ; status 0
        syscall
    '''
    result = run_async(run_assembly(code))
    assert result.return_code == 0
    assert len(result.code_outputs) == 1
    assert result.code_outputs[0].language == "hexdump"

@pytest.mark.skipif(platform.machine().lower() not in ['arm64', 'aarch64'],
                   reason="ARM64 assembly test requires ARM64 platform")
def test_arm64_assembly(run_async):
    code = '''// arch: arm64 syntax: intel
    .text
    .global _start
    _start:
        mov x0, #0      // status code 0
        mov x16, #1     // exit syscall
        svc #0x80       // invoke syscall
    '''
    result = run_async(run_assembly(code))
    assert result.return_code == 0
    assert len(result.code_outputs) == 1
    assert result.code_outputs[0].language == "hexdump"
