import asyncio
from .base import CodeResult, CodeOutput

class BrainfuckVM:
    def __init__(self, code: str, input_data: str = ""):
        self.code = code
        self.input_data = input_data
        self.input_pos = 0
        self.memory = [0] * 30000  # Standard tape size
        self.data_ptr = 0
        self.code_ptr = 0
        self.output = []
        self.debug_info = []
        self.steps = 0
        self.max_steps = 1000000  # Prevent infinite loops

    def get_input(self) -> int:
        if self.input_pos < len(self.input_data):
            result = ord(self.input_data[self.input_pos])
            self.input_pos += 1
            return result
        return 0

    def run(self) -> tuple[str, str]:
        # Find matching brackets first
        brackets = {}
        stack = []
        for i, c in enumerate(self.code):
            if c == '[':
                stack.append(i)
            elif c == ']':
                if not stack:
                    return "", "Unmatched closing bracket at position " + str(i)
                opening = stack.pop()
                brackets[opening] = i  # Jump forward from [ to ]
                brackets[i] = opening  # Jump backward from ] to [
        if stack:
            return "", "Unmatched opening bracket at position " + str(stack[0])

        # Run the program
        while self.code_ptr < len(self.code) and self.steps < self.max_steps:
            self.steps += 1
            c = self.code[self.code_ptr]

            # Add debug info periodically
            if self.steps % 1000 == 0:
                self.debug_info.append(f"Step {self.steps}: ptr={self.data_ptr} val={self.memory[self.data_ptr]}")

            if c == '>':
                self.data_ptr = (self.data_ptr + 1) % 30000
            elif c == '<':
                self.data_ptr = (self.data_ptr - 1) % 30000
            elif c == '+':
                self.memory[self.data_ptr] = (self.memory[self.data_ptr] + 1) % 256
            elif c == '-':
                self.memory[self.data_ptr] = (self.memory[self.data_ptr] - 1) % 256
            elif c == '.':
                self.output.append(chr(self.memory[self.data_ptr]))
            elif c == ',':
                self.memory[self.data_ptr] = self.get_input()
            elif c == '[':
                if self.memory[self.data_ptr] == 0:
                    self.code_ptr = brackets[self.code_ptr]  # Jump to matching ]
            elif c == ']':
                if self.memory[self.data_ptr] != 0:
                    self.code_ptr = brackets[self.code_ptr]  # Jump back to matching [
                    continue  # Skip the increment since we're jumping back

            self.code_ptr += 1

        output = "".join(self.output)
        debug = "\n".join(self.debug_info)

        if self.steps >= self.max_steps:
            debug += "\nProgram exceeded maximum step count (possible infinite loop)"

        return output, debug

async def run_brainfuck(code: str) -> CodeResult:
    # Remove comments (anything that's not a Brainfuck command)
    code = "".join(c for c in code if c in "[]<>+-.,")

    # Run the program
    vm = BrainfuckVM(code)
    output, debug = vm.run()

    # If there was debug output, add it as a code output
    result = CodeResult(stdout=output)
    if debug:
        result.code_outputs = [
            CodeOutput(content=debug, language="brainfuck-debug")
        ]

    return result