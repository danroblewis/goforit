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
  - Assembly (x86, x86_64, ARM64)
  - Rust
  - Go
  - Haskell
  - Prolog
  - Ruby
  - Brainfuck
  - Lua
- **Assembly Output**: View the generated assembly code for C programs with syntax highlighting
- **Visual Feedback**: Background color changes based on execution status
  - Dark grayish green: Successful execution with output
  - Dark grayish red: Compilation/runtime errors
  - Dark gray: No output
- **Code Persistence**: Automatically saves and loads your last edited code
- **Responsive Design**: Fully responsive layout that adapts to window resizing

## Dependencies Installation

### macOS

Using Homebrew:
```bash
# Required base tools
brew install python@3.11 node gcc nasm

# Language-specific tools
brew install openjdk    # Java
brew install go        # Go
brew install rust      # Rust
brew install ghc cabal-install  # Haskell
brew install swi-prolog         # Prolog
brew install ruby              # Ruby
brew install lua               # Lua

# Install TypeScript globally
npm install -g typescript

# Link OpenJDK
sudo ln -sfn $(brew --prefix)/opt/openjdk/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk.jdk
```

### Linux (Ubuntu/Debian)

```bash
# Update package list
sudo apt update

# Required base tools
sudo apt install -y python3 python3-pip nodejs gcc nasm build-essential

# Language-specific tools
sudo apt install -y default-jdk        # Java
sudo apt install -y golang-go          # Go
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh  # Rust
sudo apt install -y ghc cabal-install  # Haskell
sudo apt install -y swi-prolog         # Prolog
sudo apt install -y ruby               # Ruby
sudo apt install -y lua5.4             # Lua

# Install TypeScript globally
sudo npm install -g typescript
```

### Linux (Fedora/RHEL)

```bash
# Update package list
sudo dnf update

# Required base tools
sudo dnf install -y python3 python3-pip nodejs gcc nasm

# Language-specific tools
sudo dnf install -y java-latest-openjdk-devel  # Java
sudo dnf install -y golang                     # Go
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh  # Rust
sudo dnf install -y ghc cabal-install         # Haskell
sudo dnf install -y pl                        # Prolog
sudo dnf install -y ruby                      # Ruby
sudo dnf install -y lua                       # Lua

# Install TypeScript globally
sudo npm install -g typescript
```

## Manual Installation

If you prefer to install manually:

1. Clone the repository:
```bash
git clone https://github.com/danroblewis/goforit.git
cd goforit
```

2. Install Python dependencies:
```bash
pip install -e .
```

3. Start the server:
```bash
goforit
```

4. Or run directly with uvicorn:
```bash
uvicorn goforit.main:app --reload
```

## Assembly Language Support

### Direct Assembly Mode
When using the "Assembly" mode, specify the architecture and syntax in the first line comment:
```nasm
// arch: x86_64 syntax: intel
section .data
    msg db 'Hello, World!', 0xa
    len equ $ - msg

section .text
    global _start
_start:
    mov rax, 1      ; write syscall
    mov rdi, 1      ; stdout
    mov rsi, msg    ; message
    mov rdx, len    ; length
    syscall
    mov rax, 60     ; exit syscall
    xor rdi, rdi    ; status 0
    syscall
```

Supported architectures:
- `x86_64`: 64-bit x86 assembly
- `x86`: 32-bit x86 assembly
- `arm64`: ARM64 assembly (Apple Silicon/M1/M2)

Supported syntaxes:
- `intel`: Intel syntax (default)
- `att`: AT&T syntax

### C to Assembly Mode
Shows the compiler's assembly output using `gcc -S`:
```c
// -O3 -march=native
int main() {
    return 42;
}
```

### C to Objdump Mode
Shows disassembled binary using `objdump -d` and includes a hexdump of the binary:
```c
// -O3 -march=native
int main() {
    return 42;
}
```

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
│   ├── cli.py            # Command-line interface
│   ├── examples/         # Example programs
│   ├── runners/         # Language-specific runners
│   │   ├── __init__.py  # Runner registry
│   │   ├── base.py      # Base classes and utilities
│   │   ├── utils.py     # Shared utilities
│   │   ├── python_runner.py
│   │   ├── javascript_runner.py
│   │   ├── typescript_runner.py
│   │   ├── java_runner.py
│   │   ├── cpp_runner.py
│   │   ├── c_runner.py
│   │   ├── assembly_runner.py
│   │   ├── rust_runner.py
│   │   ├── go_runner.py
│   │   ├── haskell_runner.py
│   │   ├── prolog_runner.py
│   │   ├── ruby_runner.py
│   │   ├── brainfuck_runner.py
│   │   ├── lua_runner.py
│   │   └── tests/       # Runner unit tests
│   └── static/
│       ├── index.html   # Frontend application
│       ├── styles.css   # CSS styles
│       └── js/          # JavaScript modules
│           ├── app.js
│           ├── codeEvaluator.js
│           ├── assemblyHighlighter.js
│           ├── assemblyLanguage.js
│           ├── hexdumpHighlighter.js
│           ├── haskellLanguage.js
│           ├── prologLanguage.js
│           ├── rubyLanguage.js
│           ├── brainfuckLanguage.js
│           └── luaLanguage.js
└── pyproject.toml       # Project configuration and dependencies
```

### Running Tests

Run Python tests:
```bash
python -m pytest
```

## License

MIT License