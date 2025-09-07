# Code Evaluator

A real-time code evaluation environment with support for multiple programming languages and assembly output visualization.

## Quick Start

Install and run with a single command:
```bash
uv pip install --force-reinstall "git+https://github.com/danroblewis/goforit.git"
goforit
```

This will:
1. Install the package and its dependencies
2. Start the server on a free port
3. Open your browser automatically

### Configuration

You can configure the server using command-line arguments or environment variables:

```bash
# Using command-line arguments
goforit -p 8000 --host 0.0.0.0

# Using environment variables
PORT=8000 HOST=0.0.0.0 goforit
```

Options:
- `-p, --port`: Port to run the server on (default: random free port)
- `--host`: Host to run the server on (default: 127.0.0.1)
- Environment variables: `PORT` and `HOST`

## Features

- **Real-time Code Evaluation**: Code is evaluated as you type
- **Multiple Language Support**:
  - Python
  - JavaScript
  - TypeScript
  - Java
  - C++
  - C
  - C to Assembly (with architecture detection)
  - Rust
  - Go
- **Assembly Output**: View the generated assembly code for C programs with syntax highlighting
- **Visual Feedback**: Background color changes based on execution status
  - Dark grayish green: Successful execution with output
  - Dark grayish red: Compilation/runtime errors
  - Dark gray: No output
- **Code Persistence**: Automatically saves and loads your last edited code
- **Responsive Design**: Fully responsive layout that adapts to window resizing

## Prerequisites

You'll need these installed for the languages you want to use:
- Python 3.8 or later (required)
- Node.js (for JavaScript/TypeScript)
- TypeScript (`npm install -g typescript`)
- Java Development Kit (for Java)
- GCC (for C/C++)
- Rust (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)
- Go (`brew install go` on macOS)

## Manual Installation

If you prefer to install manually:

1. Clone the repository:
```bash
git clone https://github.com/danroblewis/goforit.git
cd goforit
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Start the server:
```bash
uvicorn goforit.main:app --reload
```

4. Open your browser and navigate to:
```
http://localhost:8000
```

## C to Assembly Features

When using the "C to Assembly" mode:
- The first line can be a C comment containing compiler flags:
```c
// -O3 -march=native
int main() {
    return 42;
}
```
- Assembly output shows the architecture (e.g., arm64, x86_64)
- Assembly is syntax highlighted for better readability

## Technical Details

### Backend
- FastAPI for the web server
- Async process execution with timeouts
- Language-specific runners for each supported language
- Temporary file management for compiled languages

### Frontend
- Single-page application
- Monaco Editor for code editing
- Custom assembly syntax highlighting
- Real-time evaluation with request queuing
- Responsive layout using CSS Flexbox

### Security
- Process execution timeouts (2 seconds)
- No concurrent evaluations (queued execution)
- Proper cleanup of temporary files
- Process group termination for timeouts

## API Endpoints

- `POST /api/evaluate`: Evaluates code
  ```json
  {
    "code": "print('Hello, World!')",
    "language": "python"
  }
  ```

- `GET /api/last-code`: Retrieves last saved code
  ```json
  {
    "code": "...",
    "language": "..."
  }
  ```

## Development

The project structure:
```
goforit/
├── goforit/
│   ├── main.py           # FastAPI application
│   ├── language_runners.py # Language-specific runners
│   ├── cli.py            # Command-line interface
│   ├── tests/            # Python unit tests
│   └── static/
│       ├── index.html    # Frontend application
│       ├── styles.css    # CSS styles
│       └── js/           # JavaScript modules and tests
├── pyproject.toml        # Python package configuration
└── requirements.txt      # Python dependencies
```

### Running Tests

Run Python tests:
```bash
python -m pytest
```

Run JavaScript tests:
```bash
cd goforit/static/js
npm install
npm test
```

## License

MIT License