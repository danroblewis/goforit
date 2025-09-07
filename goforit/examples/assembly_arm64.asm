// arch: arm64 syntax: intel

.data
message:
    .ascii "Hello from ARM64!\n"
    len = . - message

.text
.global _start
_start:
    // Write message
    mov x0, #1          // stdout
    adrp x1, message@PAGE
    add x1, x1, message@PAGEOFF
    mov x2, #len        // length
    mov x16, #4         // write syscall
    svc #0x80          // invoke syscall

    // Exit
    mov x0, #0          // status code 0
    mov x16, #1         // exit syscall
    svc #0x80          // invoke syscall
