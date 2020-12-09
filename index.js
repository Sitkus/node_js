/*
 * Primary file for API
 *
 */

// Dependencies
const http = require('http');

// Server should respond to all requests with a string
const server = http.createServer((req, res) => {
  res.end('Hello world!\n');
});

// Start the server, and have it listen on port 3000
server.listen(3000, () => {
  console.log('The server is running and listening on port 3000 now!');
});
