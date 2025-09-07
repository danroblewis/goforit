import pytest
from goforit.runners.utils import format_hexdump, detect_system_arch

def test_format_hexdump():
    # Test with simple data
    data = b"Hello, World!"
    hexdump = format_hexdump(data)
    lines = hexdump.split('\n')
    
    # Check first line format
    first_line = lines[0]
    assert first_line.startswith('00000000')  # Address
    assert '48 65 6c 6c' in first_line  # Hex values for "Hell"
    assert '|Hello, World!|' in first_line  # ASCII representation

    # Test with non-printable characters
    data = bytes(range(32))  # First 32 ASCII characters (non-printable)
    hexdump = format_hexdump(data)
    assert '.' * 16 in hexdump  # Non-printable chars should be dots

    # Test line wrapping
    data = b"A" * 32  # Should span multiple lines
    hexdump = format_hexdump(data)
    lines = [l for l in hexdump.split('\n') if l]
    assert len(lines) == 2  # Should be two full lines
    assert lines[0].startswith('00000000')
    assert lines[1].startswith('00000010')  # Second line starts at offset 16

    # Test zero line skipping
    data = b"A" * 16 + b"\0" * 32 + b"B" * 16
    hexdump = format_hexdump(data)
    lines = [l for l in hexdump.split('\n') if l]
    assert len(lines) == 3  # Should be: first line, *, last line
    assert lines[0].startswith('00000000')  # First line with A's
    assert lines[1] == '*'  # Zero lines replaced with *
    assert lines[2].startswith('00000030')  # Last line with B's
    assert '41 41 41 41' in lines[0]  # Hex for "AAAA"
    assert '42 42 42 42' in lines[2]  # Hex for "BBBB"

def test_detect_system_arch():
    arch = detect_system_arch()
    # Should return one of the known architectures
    assert arch in ['x86_64', 'arm64', 'x86', 'unknown']
    # Should match the current system
    import platform
    machine = platform.machine().lower()
    if 'x86_64' in machine or 'amd64' in machine:
        assert arch == 'x86_64'
    elif 'arm64' in machine or 'aarch64' in machine:
        assert arch == 'arm64'
    elif 'i386' in machine or 'i686' in machine or 'x86' in machine:
        assert arch == 'x86'