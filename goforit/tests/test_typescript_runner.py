import pytest
from goforit.language_runners import run_typescript

def test_hello_world(run_async):
    code = '''
console.log("Hello, World!");
'''
    result = run_async(run_typescript(code))
    assert result.stdout.strip() == "Hello, World!"
    assert result.stderr == ""
    assert result.return_code == 0
    assert len(result.code_outputs) == 1
    assert result.code_outputs[0].language == 'javascript'

def test_type_checking(run_async):
    code = '''
let x: string = 42;  // Type error
console.log(x);
'''
    result = run_async(run_typescript(code))
    assert result.return_code != 0
    assert "Type 'number' is not assignable to type 'string'" in result.stderr

def test_interface(run_async):
    code = '''
interface Point {
    x: number;
    y: number;
}

function printPoint(p: Point) {
    console.log(`(${p.x}, ${p.y})`);
}

const point: Point = { x: 10, y: 20 };
printPoint(point);
'''
    result = run_async(run_typescript(code))
    assert result.stdout.strip() == "(10, 20)"
    assert result.stderr == ""
    assert result.return_code == 0

def test_async_function(run_async):
    code = '''
async function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.log("Start");
    await delay(100);
    console.log("End");
}

main().catch(console.error);
'''
    result = run_async(run_typescript(code))
    assert "Start" in result.stdout
    assert "End" in result.stdout
    assert result.stderr == ""
    assert result.return_code == 0

def test_generics(run_async):
    code = '''
function identity<T>(arg: T): T {
    return arg;
}

const num = identity<number>(42);
const str = identity<string>("hello");
console.log(num, str);
'''
    result = run_async(run_typescript(code))
    assert result.stdout.strip() == "42 hello"
    assert result.stderr == ""
    assert result.return_code == 0
