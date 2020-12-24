/**
 * All the handlers lives here
 */

// Dependencies
const _data = require('./data');
const helpers = require('./helpers');
const config = require('./config');

const handlers = {

  /**
   * Ping route
   */
  ping: (data, callback) => {
    callback(200);
  },

  /**
   * Not Found route
   */
  notFound: (data, callback) => {
    callback(404);
  },

  /**
   * Users route
   */
  users: (data, callback) => {
    const acceptableMethods = ['post', 'get', 'put', 'delete'];

    if (acceptableMethods.indexOf(data.method) > -1) {
      handlers._users[data.method](data, callback);
    } else {
      callback(405);
    }
  },

  /**
   * Container for all the users route methods
   */
  _users: {

    /**
     * Required data: firstName, lastName, phone, password, tosAgreement
     * Optional data: none
     */
    post: (data, callback) => {

      // Check for required fields
      const firstName = typeof(data.payload.firstName) === 'string' && data.payload.firstName.trim().length > 0 ?
      data.payload.firstName.trim() :
      false;
      const lastName = typeof(data.payload.lastName) === 'string' && data.payload.lastName.trim().length > 0 ?
      data.payload.lastName.trim() :
      false;
      const phone = typeof(data.payload.phone) === 'string' && data.payload.phone.trim().length > 7 ?
      data.payload.phone.trim() :
      false;
      const password = typeof(data.payload.password) === 'string' && data.payload.password.trim().length > 0 ?
      data.payload.password.trim() :
      false;
      const tosAgreement = typeof(data.payload.tosAgreement) === 'boolean' && data.payload.tosAgreement ? true : false;

      if (firstName && lastName && phone && password && tosAgreement) {

        // Make sure the user doesn't already exist
        _data.read('users', phone, (err, userData) => {
          if (err) {
            // Hash the password
            const hashedPassword = helpers.hash(password);

            if (hashedPassword) {
              const user = {
                firstName,
                lastName,
                phone,
                hashedPassword,
                tosAgreement: true
              };

              // Store the user in data structure
              _data.create('users', phone, user, (err) => {
                if (!err) {
                  callback(200);
                } else {
                  console.log(err);
                  callback(500, { Error: 'Could not create the new user.' });
                }
              });
            } else {
              callback(500, { Error: 'Error trying to hash the user\'s password.' });
            }
          } else {
            callback(400, { Error: 'A user with that phone number already exists.' });
          }
        });
      } else {
        callback(400, { Error: 'Missing required fields.' });
      }
    },

    /**
     * Required data: phone
     * Optional data: none
     */
    get: (data, callback) => {

      // Check for required field
      const phone = typeof(data.queryStringObject.phone) === 'string' && data.queryStringObject.phone.trim().length > 7 ?
      data.queryStringObject.phone.trim() :
      false;

      if (phone) {
        // Get the token from headers
        const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;

        handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
          if (tokenIsValid) {

            // Lookup the user
            _data.read('users', phone, (err, userData) => {
              if (!err && userData) {
                // Delete the hashed password
                delete userData.hashedPassword;

                callback(200, userData);
              } else {
                callback(404);
              }
            });
          } else {
            callback(403, { Error: 'Missing required token in header, or token is invalid.' });
          }
        });
      } else {
        callback(400, { Error: 'Missing required fields.' });
      }
    },

    /**
     * Required data: phone
     * Optional data: firstName, lastName, password (at least one must be specified)
     */
    put: (data, callback) => {
      
      // Check for required field
      const phone = typeof(data.payload.phone) === 'string' && data.payload.phone.trim().length > 7 ?
      data.payload.phone.trim() :
      false;

      // Check for optional fields
      const firstName = typeof(data.payload.firstName) === 'string' && data.payload.firstName.trim().length > 0 ?
      data.payload.firstName.trim() :
      false;
      const lastName = typeof(data.payload.lastName) === 'string' && data.payload.lastName.trim().length > 0 ?
      data.payload.lastName.trim() :
      false;
      const password = typeof(data.payload.password) === 'string' && data.payload.password.trim().length > 0 ?
      data.payload.password.trim() :
      false;

      if (phone) {
        if (firstName || lastName || password) {
          // Get the token from headers
          const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;

          handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
            if (tokenIsValid) {
              // Lookup the user
              _data.read('users', phone, (err, userData) => {
                if (!err && userData) {

                  // Update the fields if necessary
                  if (firstName) {
                    userData.firstName = firstName;
                  }

                  if (lastName) {
                    userData.lastName = lastName;
                  }
                  
                  if (password) {
                    userData.hashedPassword = helpers.hash(password);
                  }

                  // Store the new updates
                  _data.update('users', phone, userData, (err) => {
                    if (!err) {
                      callback(200);
                    } else {
                      callback(500, { Error: 'Could not update the user.' });
                    }
                  });
                } else {
                  callback(400, { Error: 'Specified user doesn\'t exist.' });
                }
              });
            } else {
              callback(403, { Error: 'Missing required token in header, or token is invalid.' });
            }
          });
        } else {
          callback(400, { Error: 'Missing at least one optional field for update.' });
        }
      } else {
        callback(400, { Error: 'Missing required fields.' });
      }
    },

    /**
     * Required data: phone
     * Optional data: none
     */
    delete: (data, callback) => {

      // Check for required field
      const phone = typeof(data.queryStringObject.phone) === 'string' && data.queryStringObject.phone.trim().length > 7 ?
      data.queryStringObject.phone.trim() :
      false;

      if (phone) {

        // Get the token from headers
        const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;

        handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
          if (tokenIsValid) {

            // Lookup the user
            _data.read('users', phone, (err, userData) => {
              if (!err && userData) {

                // Delete the user
                _data.delete('users', phone, (err) => {
                  if (!err) {
                    // Delete each of the checks associated with the user
                    let userChecks = typeof(userData.checks) === 'object' && userData.checks instanceof Array ? userData.checks : [];
                    const checksToDelete = userChecks.length;

                    if (checksToDelete > 0) {
                      let checksDeleted = 0;
                      let deletionErrors = false;

                      // Loop through the checks
                      userChecks.forEach(checkId => {
                        // Delete the check
                        _data.delete('checks', checkId, (err) => {
                          if (err) {
                            deletionErrors = true;
                          }

                          checksDeleted++;
                          if (checksDeleted === checksToDelete) {
                            if (!deletionErrors) {
                              callback(200);
                            } else {
                              callback(500, { Error: 'Errors encountered while attempting to delete all of the user\'s checks. All checks may not have been deleted from the system successfully.' });
                            }
                          }
                        });
                      });
                    } else {
                      callback(200);
                    }
                  } else {
                    callback(500, { Error: 'Could not delete the specified user.' });
                  }
                });
              } else {
                callback(400, { Error: 'Could not find the specified user.' });
              }
            });
          } else {
            callback(403, { Error: 'Missing required token in header, or token is invalid.' });
          }
        });
      } else {
        callback(400, { Error: 'Missing required fields.' });
      }
    }
  },

  /**
   * Tokens route
   */
  tokens: (data, callback) => {
    const acceptableMethods = ['post', 'get', 'put', 'delete'];

    if (acceptableMethods.indexOf(data.method) > -1) {
      handlers._tokens[data.method](data, callback);
    } else {
      callback(405);
    }
  },

  /**
   * Container for all the tokens route methods
   */
  _tokens: {

    /**
     * Required data: phone, password
     * Optional data: none
     */
    post: (data, callback) => {

      // Check for required fields
      const phone = typeof(data.payload.phone) === 'string' && data.payload.phone.trim().length > 7 ?
      data.payload.phone.trim() :
      false;
      const password = typeof(data.payload.password) === 'string' && data.payload.password.trim().length > 0 ?
      data.payload.password.trim() :
      false;

      if (phone && password) {

        // Lookup the user who matches that phone number
        _data.read('users', phone, (err, userData) => {
          if (!err && userData) {
            // Hash the password and compare it to hashed password stored on user we are reading
            const hashedPassword = helpers.hash(password);

            if (hashedPassword === userData.hashedPassword) {

              // If password is valid, create random token ID. Set an expiration date to 1 hour in the future
              const tokenId = helpers.createRandomString(20);
              const expires = Date.now() + 1000 * 60 * 60;
              const tokenData = {
                phone: phone,
                id: tokenId,
                expires: expires
              };

              // Create a token
              _data.create('tokens', tokenId, tokenData, (err) => {
                if (!err) {
                  callback(200, tokenData);
                } else {
                  callback(500, { Error: 'Could not create the new token.' });
                }
              });
            } else {
              callback(400, { Error: 'Password did not match the specified user\'s stored password.' });
            }
          } else {
            callback(400, { Error: 'Could not find the specified user.' });
          }
        });
      } else {
        callback(400, { Error: 'Missing required fields.' });
      }
    },

    /**
     * Required data: id (token)
     * Optional data: none
     */
    get: (data, callback) => {

      // Check that id is valid
      const id = typeof(data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim().length === 20 ?
      data.queryStringObject.id.trim() :
      false;

      if (id) {
        // Lookup the user
        _data.read('tokens', id, (err, tokenData) => {
          if (!err && tokenData) {
            callback(200, tokenData);
          } else {
            callback(404);
          }
        });
      } else {
        callback(400, { Error: 'Missing required field, or field is invalid.' });
      }
    },

    /**
     * Required data: id (token), extend (boolean)
     * Optional data: none
     */
    put: (data, callback) => {

      // Check for required fields
      const id = typeof(data.payload.id) === 'string' && data.payload.id.trim().length === 20 ?
      data.payload.id.trim() :
      false;
      const extend = typeof(data.payload.extend) === 'boolean' && data.payload.extend ? true : false;

      if (id && extend) {

        // Lookup the token
        _data.read('tokens', id, (err, tokenData) => {
          if (!err && tokenData) {
            // Check if token isn't expired yet
            if (tokenData.expires > Date.now()) {

              // Extend the expiration date 1 hour from the current moment
              tokenData.expires = Date.now() + 1000 * 60 * 60;

              // Store the new expiration date
              _data.update('tokens', id, tokenData, (err) => {
                if (!err) {
                  callback(200);
                } else {
                  callback(500, { Error: 'Could not update the token\'s expiration date.' })
                }
              });
            } else {
              callback(400, { Error: 'Token is already expired and cannot be extended.' });
            }
          } else {
            callback(400, { Error: 'Specified token does not exist.' });
          }
        });
      } else {
        callback(400, { Error: 'Missing required field(s), or field(s) are invalid.' });
      }
    },

    /**
     * Required data: id
     * Optional data: none
     */
    delete: (data, callback) => {

      // Check that id is valid
      const id = typeof(data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim().length === 20 ?
      data.queryStringObject.id.trim() :
      false;

      if (id) {

        // Lookup the token
        _data.read('tokens', id, (err, tokenData) => {
          if (!err && tokenData) {

            // Delete the token
            _data.delete('tokens', id, (err) => {
              if (!err) {
                callback(200);
              } else {
                callback(500, { Error: 'Could not delete the specified token.' });
              }
            });
          } else {
            callback(400, { Error: 'Could not find the specified token.' });
          }
        });
      } else {
        callback(400, { Error: 'Missing required field.' });
      }
    },

    /**
     * Verify if a given token id is currently valid for a given user
     */
    verifyToken: (id, phone, callback) => {

      // Lookup the token
      _data.read('tokens', id, (err, tokenData) => {
        if (!err && tokenData) {
          // Check that the token is for the given user and is not expired
          if (tokenData.phone === phone && tokenData.expires > Date.now()) {
            callback(true);
          } else {
            callback(false);
          }
        } else {
          callback(false);
        }
      });
    }
  },

  /**
   * Checks route
   */
  checks: (data, callback) => {
    const acceptableMethods = ['post', 'get', 'put', 'delete'];

    if (acceptableMethods.indexOf(data.method) > -1) {
      handlers._checks[data.method](data, callback);
    } else {
      callback(405);
    }
  },

  /**
   * Container for all the checks route methods
   */
  _checks: {

    /**
     * Required data: protocol, url, method, successCodes, timeoutSeconds
     * Optional data: none
     */
    post: (data, callback) => {

      // Check for required fields
      const protocol = typeof(data.payload.protocol) === 'string' && ['https', 'http'].indexOf(data.payload.protocol) > -1 ?
      data.payload.protocol :
      false;
      const url = typeof(data.payload.url) === 'string' && data.payload.url.trim().length > 0 ?
      data.payload.url.trim() :
      false;
      const method = typeof(data.payload.method) === 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ?
      data.payload.method :
      false;
      const successCodes = typeof(data.payload.successCodes) === 'object' &&
      data.payload.successCodes instanceof Array &&
      data.payload.successCodes.length > 0 ?
      data.payload.successCodes :
      false;
      const timeoutSeconds = typeof(data.payload.timeoutSeconds) === 'number' &&
      data.payload.timeoutSeconds % 1 === 0 &&
      data.payload.timeoutSeconds >= 1 &&
      data.payload.timeoutSeconds <= 5 ?
      data.payload.timeoutSeconds :
      false;

      if (protocol && url && method && successCodes && timeoutSeconds) {
        // Get the token from headers
        const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;

        // Lookup the user phone by reading the token
        _data.read('tokens', token, (err, tokenData) => {
          if (!err && tokenData) {
            const userPhone = tokenData.phone;

            // Lookup the user data
            _data.read('users', userPhone, (err, userData) => {
              if (!err && userData) {
                const userChecks = typeof(userData.checks) === 'object' && userData.checks instanceof Array ? userData.checks : [];

                if (userChecks.length < config.maxChecks) {
                  // Create a random id for check
                  const checkId = helpers.createRandomString(20);

                  // Create check object including userPhone
                  let checkObject = {
                    id: checkId,
                    phone: userPhone,
                    protocol: protocol,
                    url: url,
                    method: method,
                    successCodes: successCodes,
                    timeoutSeconds: timeoutSeconds
                  };

                  // Save the object
                  _data.create('checks', checkId, checkObject, (err) => {
                    if (!err) {
                      userData.checks = userChecks;
                      userData.checks.push(checkId);

                      // Save the new user data
                      _data.update('users', userPhone, userData, (err) => {
                        if (!err) {
                          callback(200, checkObject);
                        } else {
                          callback(500, { Error: 'Could not update the user with the new check.' });
                        }
                      });
                    } else {
                      callback(500, { Error: 'Could not create the new check.' });
                    }
                  });
                } else {
                  callback(400, { Error: `The user already has the maximum number of checks (${config.maxChecks})` });
                }
              } else {
                callback(403);
              }
            });
          } else {
            callback(403);
          }
        });
      } else {
        callback(400, { Error: 'Missing required fields or fields are invalid.' });
      }

    },

    /**
     * Required data: id
     * Optional data: none
     */
    get: (data, callback) => {

      // Check the required field
      const id = typeof(data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim().length === 20 ?
      data.queryStringObject.id.trim() :
      false;

      if (id) {
        // Lookup the check
        _data.read('checks', id, (err, checkData) => {
          if (!err && checkData) {
            // Get the token that sent the request
            const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;

            // Verify that the fiven token is valid and belonds to the user who created the check
            console.log('This is check data', checkData);
            handlers._tokens.verifyToken(token, checkData.phone, (tokenIsValid) => {
              if (tokenIsValid) {
                callback(200, checkData);
              } else {
                callback(403);
              }
            });
          } else {
            callback(404);
          }
        });
      } else {
        callback(400, { Error: 'Missing required field, or field is invalid.' });
      }
    },

    /**
     * Required data: id
     * Optional data: protocol, url, method, successCodes, timeoutSeconds (one must be sent)
     */
    put: (data, callback) => {

      // Check for required field
      const id = typeof(data.payload.id) === 'string' && data.payload.id.trim().length === 20 ?
      data.payload.id.trim() :
      false;

      // Check for optional fields
      const protocol = typeof(data.payload.protocol) === 'string' && ['https', 'http'].indexOf(data.payload.protocol) > -1 ?
      data.payload.protocol :
      false;
      const url = typeof(data.payload.url) === 'string' && data.payload.url.trim().length > 0 ?
      data.payload.url.trim() :
      false;
      const method = typeof(data.payload.method) === 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ?
      data.payload.method :
      false;
      const successCodes = typeof(data.payload.successCodes) === 'object' &&
      data.payload.successCodes instanceof Array &&
      data.payload.successCodes.length > 0 ?
      data.payload.successCodes :
      false;
      const timeoutSeconds = typeof(data.payload.timeoutSeconds) === 'number' &&
      data.payload.timeoutSeconds % 1 === 0 &&
      data.payload.timeoutSeconds >= 1 &&
      data.payload.timeoutSeconds <= 5 ?
      data.payload.timeoutSeconds :
      false;

      if (id) {
        if (protocol || url || method || successCodes || timeoutSeconds) {
          // Look up the check
          _data.read('checks', id, (err, checkData) => {
            if (!err && checkData) {
              // Get the token that sent the request
              const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;

              // Verify that the given token is valid and belonds to the user who created the check
              handlers._tokens.verifyToken(token, checkData.phone, (tokenIsValid) => {
                if (tokenIsValid) {
                  // Update the fields if necessary
                  if (protocol) {
                    checkData.protocol = protocol;
                  }

                  if (url) {
                    checkData.url = url;
                  }
                  
                  if (method) {
                    checkData.method = method;
                  }

                  if (successCodes) {
                    checkData.successCodes = successCodes;
                  }

                  if (timeoutSeconds) {
                    checkData.timeoutSeconds = timeoutSeconds;
                  }

                  // Store new updates
                  _data.update('checks', id, checkData, (err) => {
                    if (!err) {
                      callback(200);
                    } else {
                      callback(500, { Error: 'Could not update the check.' });
                    }
                  });
                } else {
                  callback(403);
                }
              });
            } else {
              callback(400, { Error: 'Check ID did not exist.' });
            }
          });
        } else {
          callback(400, { Error: 'Missing fields to update.' });
        }
      } else {
        callback(400, { Error: 'Missing required fields.' });
      }
    },

    /**
     * Required data: id
     * Optional data: none
     */
    delete: (data, callback) => {

      // Check require field
      const id = typeof(data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim().length === 20 ?
      data.queryStringObject.id.trim() :
      false;

      if (id) {
        // Lookup the check
        _data.read('checks', id, (err, checkData) => {
          if (!err && checkData) {
            // Get the token that sent the request
            const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;

            // Verify that the given token is valid and belongs to the user who created the check
            handlers._tokens.verifyToken(token, checkData.phone, (tokenIsValid) => {
              if (tokenIsValid) {
                // Delete the check data
                _data.delete('checks', id, (err) => {
                  if (!err) {
                    // Lookup the user's object to get all their checks
                    _data.read('users', checkData.phone, (err, userData) => {
                      if (!err && userData) {
                        const userChecks = typeof(userData.checks) === 'object' && userData.checks instanceof Array ? userData.checks : [];

                        // Remove the deleted check from their list of checks
                        const checkPosition = userChecks.indexOf(id);
                        if (checkPosition > -1) {
                          userChecks.splice(checkPosition, 1);

                          // Re-save the user's data
                          userData.checks = userChecks;
                          _data.update('users', checkData.phone, userData, (err) => {
                            if (!err) {
                              callback(200);
                            } else {
                              callback(500, { Error: 'Could not update the user.' });
                            }
                          });
                        } else {
                          callback(500, { Error: 'Could not find the check on the user\'s object, so could not remove it.' });
                        }
                      } else {
                        callback(500, { Error: 'Could not find the user who created the check, so could not remove the check from the list of checks on their user object.' });
                      }
                    });
                  } else {
                    callback(500, { Error: 'Could not delete the check data.' });
                  }
                });
              } else {
                callback(403);
              }
            });
          } else {
            callback(400, { Error: 'The check ID specified could not be found.' });
          }
        });
      } else {
        callback(400, { Error: 'Missing calid id' });
      }
    }
  }
};

module.exports = handlers;