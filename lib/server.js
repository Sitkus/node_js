/**
 * Server system for API
 */

// Dependencies
const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./config');
const fs = require('fs');
const handlers = require('./handlers');
const helpers = require('./helpers');
const path = require('path');

const server = {

  /**
   * Instantiate the HTTP server
   */
  httpServer: http.createServer((req, res) => {
    server.unifiedServer(req, res);
  }),

  /**
   * Instantiate the HTTPS server
   */
  httpsServerOptions: {
    key: fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
    cert: fs.readFileSync(path.join(__dirname, '/../https/cert.pem'))
  },
  httpsServer: https.createServer(this.httpsServerOptions, (req, res) => {
    server.unifiedServer(req, res);
  }),

  /**
   * All the server logic for both the HTTP and HTTPS servers
   */
  unifiedServer: (req, res) => {

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

    // Get the payload, if any
    const decoder = new StringDecoder('utf-8');
    let buffer = '';

    req.on('data', (data) => {
      buffer += decoder.write(data);
    });

    req.on('end', () => {
      buffer += decoder.end();

      // Choose the handler this request should go to
      const chosenHandler = typeof(server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;

      // Construct the data object to send to the handler
      const data = {
        trimmedPath,
        queryStringObject,
        method,
        headers,
        payload: helpers.parseJsonToObject(buffer)
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
  },

  /**
   * Define a request router
   */
  router: {
    ping: handlers.ping,
    users: handlers.users,
    tokens: handlers.tokens,
    checks: handlers.checks
  },

  init: () => {

    // Start the HTTP server
    server.httpServer.listen(config.httpPort, () => {
      console.log(`The server is running and listening on port ${config.httpPort} now!`);
    });

    // Start the HTTPS server
    server.httpsServer.listen(config.httpsPort, () => {
      console.log(`The server is running and listening on port ${config.httpsPort} now!`);
    });
  }
};

module.exports = server;
