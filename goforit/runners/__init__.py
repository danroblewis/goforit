from .base import CodeResult, CodeOutput, run_process
from .utils import detect_system_arch, format_hexdump

from .python_runner import run_python
from .javascript_runner import run_javascript
from .typescript_runner import run_typescript
from .c_runner import run_c
from .cpp_runner import run_cpp
from .java_runner import run_java
from .rust_runner import run_rust
from .go_runner import run_go
from .assembly_runner import run_assembly

LANGUAGE_RUNNERS = {
    'python': run_python,
    'javascript': run_javascript,
    'typescript': run_typescript,
    'c': run_c,
    'cpp': run_cpp,
    'java': run_java,
    'rust': run_rust,
    'go': run_go,
    'assembly': run_assembly,
}