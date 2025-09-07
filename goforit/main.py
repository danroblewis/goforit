from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os
import json
from typing import Optional, List

from .runners import LANGUAGE_RUNNERS, CodeOutput

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
    if request.language not in LANGUAGE_RUNNERS:
        raise HTTPException(status_code=400, detail=f"Unsupported language: {request.language}")
    
    # Save the current code
    with open(SAVE_PATH, "w") as f:
        json.dump({"code": request.code, "language": request.language}, f)
    
    # Run the code using the appropriate runner
    runner = LANGUAGE_RUNNERS[request.language]
    result = await runner(request.code)
    
    return CodeResponse(
        stdout=result.stdout,
        stderr=result.stderr,
        return_code=result.return_code,
        code_outputs=[CodeOutputResponse(**output.__dict__) for output in result.code_outputs]
    )

@app.get("/api/last-code")
async def get_last_code():
    try:
        with open(SAVE_PATH, "r") as f:
            return json.load(f)
    except:
        try:
            default_code_path = os.path.join(os.path.dirname(__file__), "default_code.json")
            with open(default_code_path, "r") as f:
                return json.load(f)
        except:
            return {"code": "", "language": "python"}