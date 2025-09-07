from .base import CodeOutput, CodeResult, run_process
from .python_runner import run_python
from .javascript_runner import run_javascript
from .typescript_runner import run_typescript
from .c_runner import run_c
from .cpp_runner import run_cpp
from .java_runner import run_java
from .rust_runner import run_rust
from .go_runner import run_go
from .assembly_runner import run_assembly
from .c_to_asm_runner import run_c_to_asm
from .c_to_objdump_runner import run_c_to_objdump

# Map of language identifiers to their runner functions
LANGUAGE_RUNNERS = {
    'python': run_python,
    'javascript': run_javascript,
    'typescript': run_typescript,
    'java': run_java,
    'cpp': run_cpp,
    'c': run_c,
    'c_to_asm': run_c_to_asm,
    'c_to_objdump': run_c_to_objdump,
    'assembly': run_assembly,
    'rust': run_rust,
    'go': run_go
}
