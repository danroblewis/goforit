// arch: x86 syntax: intel

section .data
    msg db 'Hello from x86!', 0xa     ; String with newline
    len equ $ - msg                   ; Length of string

section .text
    global _start

_start:
    ; Write the string
    mov eax, 4      ; syscall: write
    mov ebx, 1      ; file descriptor: stdout
    mov ecx, msg    ; message to write
    mov edx, len    ; message length
    int 0x80        ; invoke syscall

    ; Exit
    mov eax, 1      ; syscall: exit
    xor ebx, ebx    ; status: 0
    int 0x80        ; invoke syscall
