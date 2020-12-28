const config = require('./config');
const crypto = require('crypto');
const https = require('https');
const querystring = require('querystring');
const path = require('path');
const fs = require('fs');

const helpers = {
  parseJsonToObject(str) {
    try {
      return JSON.parse(str);
    } catch (err) {
      return {};
    }
  },

  hash(password) {
    if (typeof password === 'string' && password.length > 0) {
      return crypto.createHmac('sha256', config.hashingSecret).update(password).digest('hex');
    } else {
      return false;
    }
  },

  createRandomString(strLength) {
    strLength = typeof strLength === 'number' && strLength > 0 ? strLength : false;

    if (strLength) {
      const possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';

      let str = '';
      for (let i = 0; i < strLength; i++) {
        const randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));

        str += randomCharacter;
      }

      return str;
    } else {
      return false;
    }
  },

  sendTwilioSms(phone, msg, callback) {
    phone = typeof phone === 'string' && phone.trim().length > 7 ? phone.trim() : false;
    msg = typeof msg === 'string' && msg.trim().length > 0 && msg.trim().length <= 1600 ? msg.trim() : false;

    if (phone && msg) {
      let payload = {
        From: config.twilio.fromPhone,
        To: `+370${phone}`,
        Body: msg
      };

      const stringPayload = querystring.stringify(payload);

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
        const status = res.statusCode;

        if (status === 200 || status === 201) {
          callback(false);
        } else {
          callback(`Status code returned was: ${status}`);
        }
      });

      req.on('error', (err) => {
        callback(err);
      });

      req.write(stringPayload);

      req.end();
    } else {
      callback('Given parameters were missing or invalid.');
    }
  },

  getTemplate(templateName, data, callback) {
    templateName = typeof templateName === 'string' && templateName.length > 0 ? templateName : false;
    data = typeof data === 'object' && data !== null ? data : {};

    if (templateName) {
      const templatesDir = path.join(__dirname, '/../templates/');

      fs.readFile(`${templatesDir}${templateName}.html`, 'utf8', (err, htmlString) => {
        if (!err && htmlString && htmlString.length > 0) {
          const finalHtmlString = helpers.interpolate(htmlString, data);

          callback(false, finalHtmlString);
        } else {
          callback('No template could be found.');
        }
      });
    } else {
      callback('A valid template name was not specified.');
    }
  },

  /**
   * Add the universal header and footer to a string, and pass provided data
   * object to header and footer for interpolation
   */
  addUniversalTemplates(htmlString, data, callback) {
    htmlString = typeof htmlString === 'string' && htmlString.length > 0 ? htmlString : '';
    data = typeof data === 'object' && data !== null ? data : {};

    helpers.getTemplate('_header', data, (err, headerString) => {
      if (!err && headerString) {
        helpers.getTemplate('_footer', data, (err, footerString) => {
          if (!err && footerString) {
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
    htmlString = typeof htmlString === 'string' && htmlString.length > 0 ? htmlString : '';
    data = typeof data === 'object' && data !== null ? data : {};

    for (let key in config.templateGlobals) {
      if (config.templateGlobals.hasOwnProperty(key)) {
        data[`global.${key}`] = config.templateGlobals[key];
      }
    }

    for (let key in data) {
      if (data.hasOwnProperty(key)) {
        const replace = data[key];
        const find = `{${key}}`;

        htmlString = htmlString.replace(find, replace);
      }
    }

    return htmlString;
  },

  getStaticAsset(fileName, callback) {
    fileName = typeof fileName === 'string' && fileName.length > 0 ? fileName : false;

    if (fileName) {
      const publicDir = path.join(__dirname, '/../public/');

      fs.readFile(`${publicDir}${fileName}`, (err, data) => {
        if (!err && data) {
          callback(false, data);
        } else {
          callback('No file could be found.');
        }
      });
    } else {
      callback('A valid file name was not specified.');
    }
  }
};

module.exports = helpers;
