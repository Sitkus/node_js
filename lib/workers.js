const https = require('https');
const http = require('http');
const path = require('path');
const url = require('url');
const fs = require('fs');
const _data = require('./data');
const _logs = require('./logs');
const helpers = require('./helpers');
const util = require('util');
const debug = util.debuglog('workers');

const workers = {
  gatherAllChecks() {
    _data.list('checks', (err, checks) => {
      if (!err && checks && checks.length > 0) {
        checks.forEach((check) => {
          _data.read('checks', check, (err, originalCheckData) => {
            if (!err && originalCheckData) {
              workers.validateCheckData(originalCheckData);
            } else {
              debug("Error reading one of the check's data: ", err);
            }
          });
        });
      } else {
        debug('Error: Could not find any checks to process.');
      }
    });
  },

  validateCheckData(originalCheckData) {
    originalCheckData = typeof originalCheckData === 'object' && originalCheckData !== null ? originalCheckData : {};
    originalCheckData.id =
      typeof originalCheckData.id === 'string' && originalCheckData.id.trim().length === 20
        ? originalCheckData.id.trim()
        : false;
    originalCheckData.phone =
      typeof originalCheckData.phone === 'string' && originalCheckData.phone.trim().length > 7
        ? originalCheckData.phone.trim()
        : false;
    originalCheckData.protocol =
      typeof originalCheckData.protocol === 'string' && ['http', 'https'].indexOf(originalCheckData.protocol) > -1
        ? originalCheckData.protocol
        : false;
    originalCheckData.url =
      typeof originalCheckData.url === 'string' && originalCheckData.url.trim().length > 0
        ? originalCheckData.url.trim()
        : false;
    originalCheckData.method =
      typeof originalCheckData.method === 'string' &&
      ['post', 'get', 'put', 'delete'].indexOf(originalCheckData.method) > -1
        ? originalCheckData.method
        : false;
    originalCheckData.successCodes =
      typeof originalCheckData.successCodes === 'object' &&
      originalCheckData.successCodes instanceof Array &&
      originalCheckData.successCodes.length > 0
        ? originalCheckData.successCodes
        : false;
    originalCheckData.timeoutSeconds =
      typeof originalCheckData.timeoutSeconds == 'number' &&
      originalCheckData.timeoutSeconds % 1 === 0 &&
      originalCheckData.timeoutSeconds >= 1 &&
      originalCheckData.timeoutSeconds <= 5
        ? originalCheckData.timeoutSeconds
        : false;

    originalCheckData.state =
      typeof originalCheckData.state == 'string' && ['up', 'down'].indexOf(originalCheckData.state) > -1
        ? originalCheckData.state
        : 'down';
    originalCheckData.lastChecked =
      typeof originalCheckData.lastChecked == 'number' && originalCheckData.lastChecked > 0
        ? originalCheckData.lastChecked
        : false;

    if (
      originalCheckData.id &&
      originalCheckData.phone &&
      originalCheckData.protocol &&
      originalCheckData.url &&
      originalCheckData.method &&
      originalCheckData.successCodes &&
      originalCheckData.timeoutSeconds
    ) {
      workers.performCheck(originalCheckData);
    } else {
      debug('Error: One of the checks is not properly formatted. Skipping.');
    }
  },

  performCheck(originalCheckData) {
    const checkOutcome = {
      error: false,
      responseCode: false
    };

    let outcomeSent = false;

    const parsedUrl = url.parse(`${originalCheckData.protocol}://${originalCheckData.url}`, true);
    const hostName = parsedUrl.hostname;
    const path = parsedUrl.path;

    const requestDetails = {
      protocol: `${originalCheckData.protocol}:`,
      hostname: hostName,
      method: originalCheckData.method.toUpperCase(),
      path: path,
      timeout: originalCheckData.timeoutSeconds * 1000
    };

    const _moduleToUse = originalCheckData.protocol === 'http' ? http : https;
    const req = _moduleToUse.request(requestDetails, (res) => {
      const status = res.statusCode;

      checkOutcome.responseCode = status;
      if (!outcomeSent) {
        workers.processCheckOutcome(originalCheckData, checkOutcome);
        outcomeSent = true;
      }
    });

    req.on('error', (err) => {
      checkOutcome.error = { error: true, value: err };

      if (!outcomeSent) {
        workers.processCheckOutcome(originalCheckData, checkOutcome);
        outcomeSent = true;
      }
    });

    req.on('timeout', () => {
      checkOutcome.error = { error: true, value: 'timeout' };

      if (!outcomeSent) {
        workers.processCheckOutcome(originalCheckData, checkOutcome);
        outcomeSent = true;
      }
    });

    req.end();
  },

  /**
   * Process the check outcome, update the check data as needed, trigger an alert if needed
   * Special logic for accomodating a check that has never been tested before (don't alert on that one)
   */
  processCheckOutcome(originalCheckData, checkOutcome) {
    const state =
      !checkOutcome.error &&
      checkOutcome.responseCode &&
      originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1
        ? 'up'
        : 'down';

    const alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false;

    const timeOfCheck = Date.now();
    workers.log(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck);

    let newCheckData = originalCheckData;
    newCheckData.state = state;
    newCheckData.lastChecked = timeOfCheck;

    _data.update('checks', newCheckData.id, newCheckData, (err) => {
      if (!err) {
        if (alertWarranted) {
          workers.alertUserToStatusChange(newCheckData);
        } else {
          debug('Check outcome has not changed, no alert needed.');
        }
      } else {
        debug('Error trying to save updates to one of the checks.');
      }
    });
  },

  alertUserToStatusChange(newCheckData) {
    const msg = `Alert: Your check for ${newCheckData.method.toUpperCase()} ${newCheckData.protocol}://${
      newCheckData.url
    } is currently ${newCheckData.state}`;

    helpers.sendTwilioSms(newCheckData.phone, msg, (err) => {
      if (!err) {
        debug('Success: User was alerted to a status change in their check, via sms: ', msg);
      } else {
        debug('Error: Could not send sms alert to user who had a state change in their check ', err);
      }
    });
  },

  log(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck) {
    const logData = {
      check: originalCheckData,
      outcome: checkOutcome,
      state: state,
      alert: alertWarranted,
      time: timeOfCheck
    };

    const logString = JSON.stringify(logData);

    const logFileName = originalCheckData.id;

    _logs.append(logFileName, logString, (err) => {
      if (!err) {
        debug('Logging to file succeeded.');
      } else {
        debug('Logging to file failed.');
      }
    });
  },

  loop() {
    setInterval(() => {
      workers.gatherAllChecks();
    }, 1000 * 5);
  },

  /**
   * Rotate (compress) the log files
   */
  rotateLogs() {
    _logs.list(false, (err, logs) => {
      if (!err && logs && logs.length > 0) {
        logs.forEach((logName) => {
          const logId = logName.replace('.log', '');
          const newFileId = `${logId}-${Date.now()}`;

          _logs.compress(logId, newFileId, (err) => {
            if (!err) {
              _logs.truncate(logId, (err) => {
                if (!err) {
                  debug('Success truncating log file.');
                } else {
                  debug('Error truncating log file.');
                }
              });
            } else {
              debug('Error compressing one of the log files.', err);
            }
          });
        });
      } else {
        debug('Error: Could not find any logs to rotate.');
      }
    });
  },

  /**
   * Timer to execute the log-rotation process once per day
   */
  logRotationLoop() {
    setInterval(() => {
      workers.rotateLogs();
    }, 1000 * 60 * 60 * 24);
  },

  init() {
    console.log('\x1b[33m%s\x1b[0m', 'Background workers are running.');

    workers.gatherAllChecks();

    workers.loop();

    workers.rotateLogs();

    workers.logRotationLoop();
  }
};

module.exports = workers;
