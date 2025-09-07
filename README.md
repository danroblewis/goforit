# Code Evaluator

A real-time code evaluation system with a split-pane interface. Write code in multiple languages and see the results instantly.

## Features

- Real-time code evaluation
- Support for multiple programming languages (Python, JavaScript, Java, C++)
- Split-pane interface with Monaco editor
- Automatic code persistence
- Visual feedback for execution status
- 2-second timeout for all evaluations

## Setup

### Backend

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Start the FastAPI server:
```bash
uvicorn backend.main:app --reload
```

The backend will run on http://localhost:8000

### Frontend

1. Install Node.js dependencies:
```bash
cd frontend
npm install
```

2. Start the React development server:
```bash
npm start
```

The frontend will run on http://localhost:3000

## Usage

1. Open http://localhost:3000 in your browser
2. Select your preferred programming language from the dropdown
3. Start coding in the left pane
4. See results in real-time in the right pane
5. The background color will indicate execution status:
   - Light green: Successful execution
   - Light red: Errors or stderr output

## Supported Languages

- Python
- JavaScript
- Java
- C++

Each language is executed in its own environment with a 2-second timeout limit.
