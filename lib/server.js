const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./config');
const fs = require('fs');
const handlers = require('./handlers');
const helpers = require('./helpers');
const path = require('path');
const util = require('util');
const debug = util.debuglog('server');

const server = {
  httpServer: http.createServer((req, res) => {
    server.unifiedServer(req, res);
  }),

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
  unifiedServer(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    const trimmedPath = path.replace(/^\/+|\/+$/g, '');
    const queryStringObject = parsedUrl.query;
    const method = req.method.toLowerCase();
    const headers = req.headers;
    const decoder = new StringDecoder('utf-8');

    let buffer = '';

    req.on('data', (data) => {
      buffer += decoder.write(data);
    });

    req.on('end', () => {
      buffer += decoder.end();

      let chosenHandler =
        typeof server.router[trimmedPath] !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;

      chosenHandler = trimmedPath.indexOf('public/') > -1 ? handlers.public : chosenHandler;

      const data = {
        trimmedPath,
        queryStringObject,
        method,
        headers,
        payload: helpers.parseJsonToObject(buffer)
      };

      /**
       * Route the request to the handler specified in the router
       */
      chosenHandler(data, (statusCode, payload, contentType) => {
        contentType = typeof contentType === 'string' ? contentType : 'json';
        statusCode = typeof statusCode === 'number' ? statusCode : 200;

        // Return the response parts that are content-type specific
        let payloadString = '';

        if (contentType === 'json') {
          res.setHeader('Content-Type', 'application/json');
          payload = typeof payload === 'object' ? payload : {};
          payloadString = JSON.stringify(payload);
        } else if (contentType === 'html') {
          res.setHeader('Content-Type', 'text/html');
          payloadString = typeof payload === 'string' ? payload : '';
        } else if (contentType === 'favicon') {
          res.setHeader('Content-Type', 'image/x-icon');
          payloadString = typeof payload !== 'undefined' ? payload : '';
        } else if (contentType === 'plain') {
          res.setHeader('Content-Type', 'text/plain');
          payloadString = typeof payload !== 'undefined' ? payload : '';
        } else if (contentType === 'css') {
          res.setHeader('Content-Type', 'text/css');
          payloadString = typeof payload !== 'undefined' ? payload : '';
        } else if (contentType === 'png') {
          res.setHeader('Content-Type', 'image/png');
          payloadString = typeof payload !== 'undefined' ? payload : '';
        } else if (contentType === 'jpg') {
          res.setHeader('Content-Type', 'image/jpeg');
          payloadString = typeof payload !== 'undefined' ? payload : '';
        }

        res.writeHead(statusCode);
        res.end(payloadString);

        if (statusCode === 200) {
          debug('\x1b[32m%s\x1b[0m', `${method.toUpperCase()} /${trimmedPath} ${statusCode}`);
        } else {
          debug('\x1b[31m%s\x1b[0m', `${method.toUpperCase()} /${trimmedPath} ${statusCode}`);
        }
      });
    });
  },

  router: {
    '': handlers.index,
    'account/create': handlers.accountCreate,
    'account/edit': handlers.accountEdit,
    'account/deleted': handlers.accountDeleted,
    'session/create': handlers.sessionCreate,
    'session/deleted': handlers.sessionDeleted,
    'checks/all': handlers.checksList,
    'checks/create': handlers.checksCreate,
    'checks/edit': handlers.checksEdit,
    ping: handlers.ping,
    'api/users': handlers.users,
    'api/tokens': handlers.tokens,
    'api/checks': handlers.checks,
    'favicon.ico': handlers.favicon,
    public: handlers.public
  },

  init() {
    server.httpServer.listen(config.httpPort, () => {
      console.log('\x1b[36m%s\x1b[0m', `The server is running and listening on port ${config.httpPort} now!`);
    });

    server.httpsServer.listen(config.httpsPort, () => {
      console.log('\x1b[35m%s\x1b[0m', `The server is running and listening on port ${config.httpsPort} now!`);
    });
  }
};

module.exports = server;
