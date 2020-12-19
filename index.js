/**
 * Primary file for API
 */

// Dependencies
const server = require('./lib/server');
const workers = require('./lib/workers');

// Declaring an app
const app = {

  /**
   * Initialize method
   */
  init: () => {

    // Start the server
    server.init();

    // Star the workers
    workers.init();
  }
};

// Self executing
app.init();

module.exports = app;