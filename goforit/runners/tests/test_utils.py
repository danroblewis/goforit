import base64
from goforit.runners.utils import format_binary_for_hexdump, detect_system_arch

def test_format_binary_for_hexdump():
    # Test basic binary data
    data = b'Hello, World!'
    base64_data = format_binary_for_hexdump(data)
    assert base64_data == base64.b64encode(data).decode('utf-8')

    # Test empty data
    data = b''
    base64_data = format_binary_for_hexdump(data)
    assert base64_data == ''

    # Test binary data with zeros
    data = b'\x00\x01\x02\x00\x00\x00\x03\x04'
    base64_data = format_binary_for_hexdump(data)
    assert base64_data == base64.b64encode(data).decode('utf-8')

    # Test large binary data
    data = b'x' * 1024
    base64_data = format_binary_for_hexdump(data)
    assert base64_data == base64.b64encode(data).decode('utf-8')