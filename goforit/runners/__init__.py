from .c_runner import run_c
from .cpp_runner import run_cpp
from .java_runner import run_java
from .go_runner import run_go
from .assembly_runner import run_assembly
from .python_runner import run_python
from .javascript_runner import run_javascript
from .typescript_runner import run_typescript
from .rust_runner import run_rust
from .utils import detect_system_arch, format_binary_for_hexdump
from .base import CodeResult, CodeOutput

LANGUAGE_RUNNERS = {
    'c': run_c,
    'cpp': run_cpp,
    'java': run_java,
    'go': run_go,
    'assembly': run_assembly,
    'python': run_python,
    'javascript': run_javascript,
    'typescript': run_typescript,
    'rust': run_rust,
}