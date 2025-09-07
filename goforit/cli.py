import os
import sys
import uvicorn
import webbrowser
import socket
import argparse
from contextlib import closing

def find_free_port():
    """Find a free port to run the server on."""
    with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as s:
        s.bind(('', 0))
        s.listen(1)
        port = s.getsockname()[1]
        return port

def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='Run the GoForIt code evaluation server.')
    parser.add_argument('-p', '--port', type=int, help='Port to run the server on (default: random free port)')
    parser.add_argument('--host', help='Host to run the server on (default: 127.0.0.1)')
    return parser.parse_args()

def main():
    """Run the goforit server and open the browser."""
    args = parse_args()
    
    # Get host from args, env, or default
    host = args.host or os.environ.get('HOST') or '127.0.0.1'
    
    # Get port from args, env, or find a free one
    port = args.port or os.environ.get('PORT')
    if port:
        port = int(port)
    else:
        port = find_free_port()
    
    # Print welcome message
    print(f"""
╭──────────────────────────────────────────╮
│           Welcome to GoForIt!            │
│    Your code evaluation playground       │
╰──────────────────────────────────────────╯

Starting server on {host}:{port}...
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
    webbrowser.open(f'http://{host}:{port}')
    
    # Start server
    uvicorn.run(
        "goforit.main:app",
        host=host,
        port=port,
        log_level="info"
    )

if __name__ == "__main__":
    main()