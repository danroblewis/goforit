// arch: x86_64 syntax: intel

section .data
    msg db 'Hello from x86_64!', 0xa  ; String with newline
    len equ $ - msg                   ; Length of string

section .text
    global _start

_start:
    ; Write the string
    mov rax, 1      ; syscall: write
    mov rdi, 1      ; file descriptor: stdout
    mov rsi, msg    ; message to write
    mov rdx, len    ; message length
    syscall

    ; Exit
    mov rax, 60     ; syscall: exit
    xor rdi, rdi    ; status: 0
    syscall
