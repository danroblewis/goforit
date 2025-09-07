import os
import sys
import uvicorn
import webbrowser
import socket
from contextlib import closing

def find_free_port():
    """Find a free port to run the server on."""
    with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as s:
        s.bind(('', 0))
        s.listen(1)
        port = s.getsockname()[1]
        return port

def main():
    """Run the goforit server and open the browser."""
    # Find a free port
    port = find_free_port()
    
    # Print welcome message
    print(f"""
╭──────────────────────────────────────────╮
│           Welcome to GoForIt!            │
│    Your code evaluation playground       │
╰──────────────────────────────────────────╯

Starting server on port {port}...
Opening browser...

Available languages:
- Python
- JavaScript
- TypeScript
- Java
- C++
- C
- C to Assembly
- Rust
- Go

Press Ctrl+C to stop the server.
""")

    # Open browser
    webbrowser.open(f'http://localhost:{port}')
    
    # Start server
    uvicorn.run(
        "goforit.main:app",
        host="127.0.0.1",
        port=port,
        log_level="info"
    )

if __name__ == "__main__":
    main()
