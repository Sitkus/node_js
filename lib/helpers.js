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
      return JSON.parse(str);
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
  },

  // Create a random token id
  createRandomString: (strLength) => {
    // Verify that the str length is specified
    strLength = typeof(strLength) === 'number' && strLength > 0 ? strLength : false;

    if (strLength) {
      // Define all the possible alphanumeric characters, of a given length
      const possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';

      // Start the final string;
      let str = '';
      for (let i = 0; i < strLength; i++) {
        // Get a random character from the possibleCharacters string
        const randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));

        // Append a random character to final string
        str += randomCharacter;
      }

      return str;
    } else {
      return false;
    }
  }
};

// Export helpers container
module.exports = helpers;