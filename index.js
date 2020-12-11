/**
 * Primary file for API
 */

// Dependencies
const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./config');
const fs = require('fs');

// Instantiate HTTP server
const httpServer = http.createServer((req, res) => {
  unifiedServer(req, res);
});

// Start the HTTP server
httpServer.listen(config.httpPort, () => {
  console.log(`The server is running and listening on port ${config.httpPort} now!`);
});

// Instantiate HTTPS server
const httpsServerOptions = {
  key: fs.readFileSync('./https/key.pem'),
  cert: fs.readFileSync('./https/cert.pem')
};

const httpsServer = https.createServer(httpsServerOptions, (req, res) => {
  unifiedServer(req, res);
});

// Start the HTTPS server
httpsServer.listen(config.httpsPort, () => {
  console.log(`The server is running and listening on port ${config.httpsPort} now!`);
});

// Unified server to launch either HTTP or HTTPS
const unifiedServer = (req, res) => {

    // Get the url and parse it
    const parsedUrl = url.parse(req.url, true);

    // Get the path
    const path = parsedUrl.pathname;
    const trimmedPath = path.replace(/^\/+|\/+$/g, '');

    // Get the query string as an object
    const queryStringObject = parsedUrl.query;

    // Get the HTTP Method
    const method = req.method.toLowerCase();

    // Get the headers as an object
    const headers = req.headers;

    // Get the payload if any
    const decoder = new StringDecoder('utf-8');
    let buffer = '';

    req.on('data', (data) => {
      buffer += decoder.write(data);
    });

    req.on('end', () => {
      buffer += decoder.end();

      // Choose the handler this request should go to
      const chosenHandler = typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound;

      // Construct the data object to send to the handler
      const data = {
        trimmedPath: trimmedPath,
        queryStringObject: queryStringObject,
        method: method,
        headers: headers,
        payload: buffer
      };

      // Route the request to the handler specified in the router
      chosenHandler(data, (statusCode, payload) => {
        // Use the status code called back by the handle, or default
        statusCode = typeof(statusCode) === 'number' ? statusCode : 200;

        // Use the payload called back by the handler, or default
        payload = typeof(payload) === 'object' ? payload : {};

        // Convert the payload to a string
        const payloadString = JSON.stringify(payload);

        // Send the response and write statusCode
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(statusCode);
        res.end(payloadString);

        // Log the request path
        console.log(`Returning the response: `, statusCode, payloadString);
      });
    });
};

// Define the handlers
const handlers = {
  ping: (data, callback) => {
    callback(200);
  },
  notFound: (data, callback) => {
    callback(404);
  }
};

// Define a request router
const router = {
  ping: handlers.ping
};
