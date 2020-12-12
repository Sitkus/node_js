/**
 * All the handlers lives here
 */

// Dependencies
const _data = require('./data');
const helpers = require('./helpers');

// Container for handlers
const handlers = {
  ping: (data, callback) => {
    callback(200);
  },
  notFound: (data, callback) => {
    callback(404);
  },
  users: (data, callback) => {
    const acceptableMethods = ['post', 'get', 'put', 'delete'];
    if (acceptableMethods.indexOf(data.method) > -1) {
      handlers._users[data.method](data, callback);
    } else {
      callback(405);
    }
  },
  _users: {

    // Required data: firstName, lastName, phone, password, tosAgreement
    // Optional data: none
    post: (data, callback) => {
      // Check for required fields
      const firstName = typeof(data.payload.firstName) === 'string' && data.payload.firstName.trim().length > 0 ?
      data.payload.firstName.trim() :
      false;
      const lastName = typeof(data.payload.lastName) === 'string' && data.payload.lastName.trim().length > 0 ?
      data.payload.lastName.trim() :
      false;
      const phone = typeof(data.payload.phone) === 'string' && data.payload.phone.trim().length > 8 ?
      data.payload.phone.trim() :
      false;
      const password = typeof(data.payload.password) === 'string' && data.payload.password.trim().length > 8 ?
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
                  callback(500, { Error: 'Could not create the new user' });
                }
              });
            } else {
              callback(500, { Error: 'Error trying to hash the user\'s password' });
            }
          } else {
            callback(400, { Error: 'A user with that phone number already exists' });
          }
        });
      } else {
        callback(400, { Error: 'Missing required fields' });
      }
    },

    // Required data: phone
    // Optional data: none
    // @TODO Only let an authenticated user access their object. Dont let them access anyone elses
    get: (data, callback) => {
      // Check for required field
      const phone = typeof(data.queryStringObject.phone) === 'string' && data.queryStringObject.phone.trim().length > 8 ?
      data.queryStringObject.phone.trim() :
      false;

      if (phone) {
        // Lookup the user
        _data.read('users', phone, (err, userData) => {
          if (!err && userData) {
            delete userData.hashedPassword;
            callback(200, userData);
          } else {
            callback(404);
          }
        });
      } else {
        callback(400, { Error: 'Missing required fields' });
      }
    },

    // Required data: phone
    // Optional data: firstName, lastName, password (at least one must be specified)
    // @TODO Only let an authenticated user update their object. Dont let them access anyone elses
    put: (data, callback) => {
      // Check for required field
      const phone = typeof(data.payload.phone) === 'string' && data.payload.phone.trim().length > 8 ?
      data.payload.phone.trim() :
      false;
      // Check for optional fields
      const firstName = typeof(data.payload.firstName) === 'string' && data.payload.firstName.trim().length > 0 ?
      data.payload.firstName.trim() :
      false;
      const lastName = typeof(data.payload.lastName) === 'string' && data.payload.lastName.trim().length > 0 ?
      data.payload.lastName.trim() :
      false;
      const password = typeof(data.payload.password) === 'string' && data.payload.password.trim().length > 8 ?
      data.payload.password.trim() :
      false;

      if (phone) {
        if (firstName || lastName || password) {
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

              _data.update('users', phone, userData, (err) => {
                if (!err) {
                  callback(200);
                } else {
                  callback(500, { Error: 'Could not update the user' });
                }
              });
            } else {
              callback(400, { Error: 'Specified user doesn\'t exist' });
            }
          });
        } else {
          callback(400, { Error: 'Missing at least one optional field for update' });
        }
      } else {
        callback(400, { Error: 'Missing required fields' });
      }
    },

    // Required data: phone
    // Optional data: none
    // @TODO Only let an authenticated user delete their object. Dont let them access anyone elses
    // @TODO Cleanup (delete) any other data files associated with the user
    delete: (data, callback) => {
      // Check for required field
      const phone = typeof(data.queryStringObject.phone) === 'string' && data.queryStringObject.phone.trim().length > 8 ?
      data.queryStringObject.phone.trim() :
      false;

      if (phone) {
        // Lookup the user
        _data.read('users', phone, (err, userData) => {
          if (!err && userData) {
            _data.delete('users', phone, (err) => {
              if (!err) {
                callback(200);
              } else {
                callback(500, { Error: 'Could not delete the specified user' });
              }
            });
          } else {
            callback(400, { Error: 'Could not find the specified user' });
          }
        });
      } else {
        callback(400, { Error: 'Missing required fields' });
      }
    }
  }
};

// Export handlers container
module.exports = handlers;