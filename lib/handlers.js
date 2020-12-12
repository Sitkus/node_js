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
        _data.read('users', phone, (err, data) => {
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
    get: (data, callback) => {

    },
    put: (data, callback) => {

    },
    delete: (data, callback) => {

    }
  }
};

// Export handlers container
module.exports = handlers;