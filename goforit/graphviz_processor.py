import re
from typing import List, Optional
from .runners import CodeOutput

def find_graphviz_blocks(text: str) -> List[str]:
    """Find all Graphviz blocks in text.
    Looks for both 'graph {...}' and 'digraph {...}' patterns.
    Handles nested braces correctly."""
    
    blocks = []
    # Look for graph or digraph declarations
    pattern = r'(?:^|\n)\s*((?:di)?graph\s+[a-zA-Z0-9_]*\s*{)'
    
    for match in re.finditer(pattern, text, re.MULTILINE):
        start_pos = match.start(1)
        current_pos = match.end(1)
        brace_count = 1  # We've found the first opening brace
        
        # Keep track of the full block including the declaration
        block = match.group(1)
        
        # Find the matching closing brace, accounting for nesting
        while brace_count > 0 and current_pos < len(text):
            char = text[current_pos]
            if char == '{':
                brace_count += 1
            elif char == '}':
                brace_count -= 1
            block += char
            current_pos += 1
            
            # Break if we've found the matching closing brace
            if brace_count == 0:
                blocks.append(block.strip())
                break
    
    print(f"Found Graphviz blocks: {blocks}")  # Debug logging
    return blocks

def create_graphviz_outputs(stdout: str) -> List[CodeOutput]:
    """Process stdout and create Graphviz outputs for any graph definitions found."""
    print(f"Processing stdout: {stdout!r}")  # Debug logging
    outputs = []
    
    # Find all graph blocks
    graph_blocks = find_graphviz_blocks(stdout)
    
    # Create a CodeOutput for each graph block
    for i, graph in enumerate(graph_blocks):
        print(f"Creating output for graph: {graph}")  # Debug logging
        outputs.append(CodeOutput(
            content=graph,
            language='graphviz'
        ))
    
    return outputs

def process_result(result) -> None:
    """Process a CodeResult object to add Graphviz outputs if any are found."""
    if not result.stdout:
        print("No stdout to process")  # Debug logging
        return
        
    print(f"Processing result with stdout: {result.stdout!r}")  # Debug logging
    graphviz_outputs = create_graphviz_outputs(result.stdout)
    if graphviz_outputs:
        print(f"Adding {len(graphviz_outputs)} graphviz outputs")  # Debug logging
        result.code_outputs.extend(graphviz_outputs)
    else:
        print("No graphviz outputs found")  # Debug logging