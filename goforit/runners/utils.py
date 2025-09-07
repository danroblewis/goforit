import platform

def detect_system_arch():
    """Detect the system's architecture for assembly output."""
    machine = platform.machine().lower()
    if machine in ['x86_64', 'amd64']:
        return 'x86_64'
    elif machine in ['arm64', 'aarch64']:
        return 'arm64'
    elif machine in ['i386', 'i686', 'x86']:
        return 'x86'
    else:
        return 'unknown'

def format_hexdump(data: bytes, width: int = 16) -> str:
    """Format binary data as a hexdump with address, hex values, and ASCII representation.
    Skips lines that contain only zeros."""
    result = []
    last_line_was_zeros = False

    for i in range(0, len(data), width):
        chunk = data[i:i + width]
        
        # Check if this line is all zeros
        if all(byte == 0 for byte in chunk):
            if not last_line_was_zeros:  # Only add the * line once
                result.append("*\n")
                last_line_was_zeros = True
            continue
        last_line_was_zeros = False
        
        # Add address
        result.append(f"{i:08x}  ")
        
        hex_values = []
        ascii_values = []
        
        # Process each byte
        for j, byte in enumerate(chunk):
            hex_values.append(f"{byte:02x}")
            if j % 8 == 7:
                hex_values.append(" ")
            ascii_values.append(chr(byte) if 32 <= byte <= 126 else ".")
        
        # Pad hex values if needed
        while len(hex_values) < width + (width // 8):
            hex_values.append("  ")
            if len(hex_values) % 9 == 8:
                hex_values.append(" ")
        
        # Join everything together
        result.append(" ".join(hex_values))
        result.append(" |")
        result.append("".join(ascii_values))
        result.append("|\n")
    
    return "".join(result)