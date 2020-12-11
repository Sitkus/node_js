/**
 * Create and export configuration variables
 */

// All environments container
const environments = {
  staging: {
    httpPort: 3000,
    httpsPort: 3001,
    envName: 'staging'
  },
  production: {
    httpPort: 5000,
    httpsPort: 5001,
    envName: 'production'
  }
}

// Determine which environment was passed as a command-line argument
const currentEnvironment = typeof(process.env.NODE_ENV) === 'string' ? process.env.NODE_ENV.toLowerCase() : '';

const environmentToExport = typeof(environments[currentEnvironment]) === 'object' ? environments[currentEnvironment] : environments.staging;

// Export module
module.exports = environmentToExport;
