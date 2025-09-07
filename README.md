# Code Evaluator

A real-time code evaluation environment with support for multiple programming languages and assembly output visualization.

## Features

- **Real-time Code Evaluation**: Code is evaluated as you type
- **Multiple Language Support**:
  - Python
  - JavaScript (Node.js)
  - Java
  - C++
  - C
  - C to Assembly (with architecture detection)
- **Assembly Output**: View the generated assembly code for C programs with syntax highlighting
- **Visual Feedback**: Background color changes based on execution status
  - Dark grayish green: Successful execution with output
  - Dark grayish red: Compilation/runtime errors
  - Dark gray: No output
- **Code Persistence**: Automatically saves and loads your last edited code
- **Responsive Design**: Fully responsive layout that adapts to window resizing

## Installation

1. Clone the repository:
```bash
git clone https://github.com/danroblewis/goforit.git
cd goforit
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Ensure you have the following installed on your system:
- Python 3.x
- Node.js (for JavaScript evaluation)
- GCC (for C/C++ compilation)
- Java Development Kit (for Java compilation)

## Usage

1. Start the server:
```bash
uvicorn backend.main:app --reload
```

2. Open your browser and navigate to:
```
http://localhost:8000
```

3. Select a language from the dropdown and start coding!

### C to Assembly Features

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
├── backend/
│   ├── main.py           # FastAPI application
│   ├── language_runners.py # Language-specific runners
│   └── static/
│       └── index.html    # Frontend application
└── requirements.txt      # Python dependencies
```

## License

MIT License