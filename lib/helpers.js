/**
 * Helpers for various tasks
 */

// Dependencies
const config = require('./config');
const crypto = require('crypto');
const https = require('https');
const querystring = require('querystring');
const path = require('path');
const fs = require('fs');

const helpers = {
  /**
   * Parses a JSON string to an object in all cases, without throwing an error
   */
  parseJsonToObject(str) {
    try {
      return JSON.parse(str);
    } catch (err) {
      return {};
    }
  },

  /**
   * Creates a SHA256 hash from given password
   */
  hash(password) {
    if (typeof password === 'string' && password.length > 0) {
      return crypto
        .createHmac('sha256', config.hashingSecret)
        .update(password)
        .digest('hex');
    } else {
      return false;
    }
  },

  /**
   * Creates a random string of letters and numbers in set length
   */
  createRandomString(strLength) {
    // Verify that the str length is specified
    strLength =
      typeof strLength === 'number' && strLength > 0 ? strLength : false;

    if (strLength) {
      // Define all the possible alphanumeric characters, of a given length
      const possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';

      // Start the final string;
      let str = '';
      for (let i = 0; i < strLength; i++) {
        // Get a random character from the possibleCharacters string
        const randomCharacter = possibleCharacters.charAt(
          Math.floor(Math.random() * possibleCharacters.length)
        );

        // Append a random character to final string
        str += randomCharacter;
      }

      return str;
    } else {
      return false;
    }
  },

  /**
   * Sending a Twilio service message
   */
  sendTwilioSms(phone, msg, callback) {
    // Validate parameters
    phone =
      typeof phone === 'string' && phone.trim().length > 7
        ? phone.trim()
        : false;
    msg =
      typeof msg === 'string' &&
      msg.trim().length > 0 &&
      msg.trim().length <= 1600
        ? msg.trim()
        : false;

    if (phone && msg) {
      // Configure the request payload
      let payload = {
        From: config.twilio.fromPhone,
        To: `+370${phone}`,
        Body: msg
      };

      const stringPayload = querystring.stringify(payload);

      // Configure the request details
      let requestDetails = {
        protocol: 'https:',
        hostname: 'api.twilio.com',
        method: 'POST',
        path: `/2010-04-01/Accounts/${config.twilio.accountSid}/Messages.json`,
        auth: `${config.twilio.accountSid}:${config.twilio.authToken}`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(stringPayload)
        }
      };

      const req = https.request(requestDetails, (res) => {
        // Grab the status of the sent request
        const status = res.statusCode;

        // Callback successfully if the request went through
        if (status === 200 || status === 201) {
          callback(false);
        } else {
          callback(`Status code returned was: ${status}`);
        }
      });

      // Bind to the error event so it doesn't get thrown
      req.on('error', (err) => {
        callback(err);
      });

      // Add the payload
      req.write(stringPayload);

      // End the request
      req.end();
    } else {
      callback('Given parameters were missing or invalid.');
    }
  },

  /**
   * Get the string content of a template
   */
  getTemplate(templateName, data, callback) {
    templateName =
      typeof templateName === 'string' && templateName.length > 0
        ? templateName
        : false;
    data = typeof data === 'object' && data !== null ? data : {};

    if (templateName) {
      const templatesDir = path.join(__dirname, '/../templates/');

      fs.readFile(
        `${templatesDir}${templateName}.html`,
        'utf8',
        (err, htmlString) => {
          if (!err && htmlString && htmlString.length > 0) {
            // Do interpolation on the string
            const finalHtmlString = helpers.interpolate(htmlString, data);

            callback(false, finalHtmlString);
          } else {
            callback('No template could be found.');
          }
        }
      );
    } else {
      callback('A valid template name was not specified.');
    }
  },

  /**
   * Add the universal header and footer to a string, and pass provided data
   * object to header and footer for interpolation
   */
  addUniversalTemplates(htmlString, data, callback) {
    htmlString =
      typeof htmlString === 'string' && htmlString.length > 0 ? htmlString : '';
    data = typeof data === 'object' && data !== null ? data : {};

    // Get the header
    helpers.getTemplate('_header', data, (err, headerString) => {
      if (!err && headerString) {
        // Get the footer
        helpers.getTemplate('_footer', data, (err, footerString) => {
          if (!err && footerString) {
            // Add them all together
            const combinedStrings = `${headerString}${htmlString}${footerString}`;
            callback(false, combinedStrings);
          } else {
            callback('Could not find the footer template.');
          }
        });
      } else {
        callback('Could not find the header template.');
      }
    });
  },

  /**
   * Take a given string and data object, and find/replace all the keys within it
   */
  interpolate(htmlString, data) {
    htmlString =
      typeof htmlString === 'string' && htmlString.length > 0 ? htmlString : '';
    data = typeof data === 'object' && data !== null ? data : {};

    // Add the templateGlobals to the data object, prepending their key name with 'global'
    for (let key in config.templateGlobals) {
      if (config.templateGlobals.hasOwnProperty(key)) {
        data[`global.${key}`] = config.templateGlobals[key];
      }
    }

    // For each key in the data object, insert its value into the string at the corresponding placeholder
    for (let key in data) {
      if (data.hasOwnProperty(key)) {
        const replace = data[key];
        const find = `{${key}}`;

        htmlString = htmlString.replace(find, replace);
      }
    }

    return htmlString;
  }
};

module.exports = helpers;
