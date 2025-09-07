import json
import os
import time
from typing import Optional, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

from .runners import LANGUAGE_RUNNERS, CodeResult, CodeOutput

app = FastAPI()

# Mount static files
static_path = os.path.join(os.path.dirname(__file__), "static")
app.mount("/static", StaticFiles(directory=static_path), name="static")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Path to store the last code
SAVE_PATH = "last_code.json"
DEFAULT_CODE_PATH = os.path.join(os.path.dirname(__file__), "default_code.json")

class CodeRequest(BaseModel):
    code: str
    language: str

class CodeOutputResponse(BaseModel):
    content: str
    language: Optional[str] = None

class CodeResponse(BaseModel):
    stdout: str
    stderr: str
    return_code: int
    code_outputs: List[CodeOutputResponse] = []

@app.get("/")
async def read_root():
    return FileResponse(os.path.join(static_path, "index.html"))

@app.post("/api/evaluate")
async def evaluate(request: CodeRequest) -> CodeResponse:
    start_time = time.time()
    
    # Check language support
    if request.language not in LANGUAGE_RUNNERS:
        raise HTTPException(status_code=400, detail=f"Unsupported language: {request.language}")
    
    # Save the current code
    save_start = time.time()
    with open(SAVE_PATH, "w") as f:
        json.dump({"code": request.code, "language": request.language}, f)
    save_time = time.time() - save_start
    
    # Run the code using the appropriate runner
    run_start = time.time()
    runner = LANGUAGE_RUNNERS[request.language]
    result = await runner(request.code)
    run_time = time.time() - run_start
    
    # Convert to response model
    response_start = time.time()
    response = CodeResponse(
        stdout=result.stdout,
        stderr=result.stderr,
        return_code=result.return_code,
        code_outputs=[CodeOutputResponse(**output.__dict__) for output in result.code_outputs]
    )
    response_time = time.time() - response_start
    
    # Print timing info
    total_time = time.time() - start_time
    print(f"\nAPI endpoint timing:")
    print(f"Save time:      {save_time:.3f}s")
    print(f"Run time:       {run_time:.3f}s")
    print(f"Response time:  {response_time:.3f}s")
    print(f"Total time:     {total_time:.3f}s")
    
    return response

@app.get("/api/last-code")
async def get_last_code():
    try:
        with open(SAVE_PATH, "r") as f:
            return json.load(f)
    except FileNotFoundError:
        try:
            with open(DEFAULT_CODE_PATH, "r") as f:
                return json.load(f)
        except FileNotFoundError:
            return {"code": "", "language": "python"}
        except Exception:
            return {"code": "", "language": "python"}
    except Exception:
        return {"code": "", "language": "python"}