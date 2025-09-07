write a python fastapi server with a React web ui where the web ui is split in half, left and right. on the left is a code editor that supports a lot of programming languages. there should be a language selector dropdown box at the bottom left. 

every time someone pressed a key while editing text in the code editor, i want it to send an API request to the FastAPI server that evaluates that code based on the language chosen. The result (stdout and stderr) should be displayed on the right side. If the return code is an error, or if there is stderr content, the background color of the page should be light red. If there is no error, the background color should be light green. 

These two panes should take up the whole screen. No borders. 

For compiled languages, it should compile and run the program. For interpreted languages, it should run it through an interpreter. 

There should be a time limit to the compile and run API call of 2 seconds. There should be no concurrent compile and run requests. If there is already a request and a new request comes in, it should kill the current request and start a new one. 

