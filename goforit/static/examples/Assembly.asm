// arch: x86_64 syntax: intel
section .data
    msg db 'Hello from Assembly!', 0xa  ; String with newline
    len equ $ - msg                     ; Length of string

section .text
    global _start

_start:
    ; Write the string
    mov rax, 1      ; write syscall
    mov rdi, 1      ; stdout
    mov rsi, msg    ; message
    mov rdx, len    ; length
    syscall

    ; Exit
    mov rax, 60     ; exit syscall
    xor rdi, rdi    ; status 0
    syscall