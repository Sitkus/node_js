/**
 * Helpers for various tasks
 */

// Dependencies
const config = require('./config');
const crypto = require('crypto');

// Container for all the helpers
const helpers = {

  // Parse a JSON string to an object in all cases, without throwing
  parseJsonToObject: (str) => {
    try {
      const obj = JSON.parse(str);
      return obj;
    } catch (err) {
      return {};
    }
  },

  // Create a SHA256 hash
  hash: (password) => {
    if (typeof(password) === 'string' && password.length > 0) {
      return crypto.createHmac('sha256', config.hashingSecret).update(password).digest('hex');
    } else {
      return false;
    }
  }
};

// Export helpers container
module.exports = helpers;