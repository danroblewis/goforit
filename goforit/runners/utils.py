import platform
import base64

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

def format_binary_for_hexdump(data: bytes) -> str:
    """Convert binary data to base64 for sending to frontend."""
    return base64.b64encode(data).decode('utf-8')