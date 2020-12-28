const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');

const lib = {
  baseDir: path.join(__dirname, '/../.data/'),

  create(dir, fileName, data, callback) {
    fs.open(`${lib.baseDir}${dir}/${fileName}.json`, 'wx', (err, fileDescriptor) => {
      if (!err && fileDescriptor) {
        const stringData = JSON.stringify(data);

        fs.writeFile(fileDescriptor, stringData, (err) => {
          if (!err) {
            fs.close(fileDescriptor, (err) => {
              if (!err) {
                callback(false);
              } else {
                callback('Error closing new file');
              }
            });
          } else {
            callback('Error writing to a new file');
          }
        });
      } else {
        callback('Could not create a new file');
      }
    });
  },

  read(dir, fileName, callback) {
    fs.readFile(`${lib.baseDir}${dir}/${fileName}.json`, 'utf8', (err, data) => {
      if (!err && data) {
        callback(false, helpers.parseJsonToObject(data));
      } else {
        callback(err, data);
      }
    });
  },

  update(dir, fileName, data, callback) {
    fs.open(`${lib.baseDir}${dir}/${fileName}.json`, 'r+', (err, fileDescriptor) => {
      if (!err && fileDescriptor) {
        const stringData = JSON.stringify(data);

        fs.ftruncate(fileDescriptor, (err) => {
          if (!err) {
            fs.writeFile(fileDescriptor, stringData, (err) => {
              if (!err) {
                fs.close(fileDescriptor, (err) => {
                  if (!err) {
                    callback(false);
                  } else {
                    callback('Error closing existing file');
                  }
                });
              } else {
                callback('Error writing to an existing file');
              }
            });
          } else {
            callback('Error truncating a file');
          }
        });
      } else {
        callback('Could not open file for updating, it may not exist yet');
      }
    });
  },

  delete(dir, fileName, callback) {
    fs.unlink(`${lib.baseDir}${dir}/${fileName}.json`, (err) => {
      if (!err) {
        callback(false);
      } else {
        callback('Error deleting file');
      }
    });
  },

  list(dir, callback) {
    fs.readdir(`${lib.baseDir}${dir}/`, (err, data) => {
      if (!err && data && data.length > 0) {
        let trimmedFileNames = [];

        data.forEach((fileName) => {
          trimmedFileNames.push(fileName.replace('.json', ''));
        });

        callback(false, trimmedFileNames);
      } else {
        callback(err, data);
      }
    });
  }
};

module.exports = lib;
