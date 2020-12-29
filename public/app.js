const app = {
  config: {
    sessionToken: false
  },
  client: {
    request(headers, path, method, queryStringObject, payload, callback) {
      // Setting defaults
      headers = typeof headers === 'object' && headers !== null ? headers : {};
      path = typeof path === 'string' ? path : '/';
      method =
        typeof method === 'string' && ['POST', 'GET', 'PUT', 'DELETE'].indexOf(method.toUpperCase()) > -1
          ? method.toUpperCase()
          : 'GET';
      queryStringObject = typeof queryStringObject === 'object' && queryStringObject !== null ? queryStringObject : {};
      payload = typeof payload === 'object' && payload !== null ? payload : {};
      callback = typeof callback === 'function' ? callback : false;

      const requestUrl = `${path}?`;
      let counter = 0;

      for (let queryKey in queryStringObject) {
        if (queryStringObject.hasOwnProperty(queryKey)) {
          counter++;

          if (counter > 1) {
            requestUrl += '&';
          }

          requestUrl += `${queryKey}=${queryStringObject[queryKey]}`;
        }
      }

      let headersPreparedForFetch = new Headers();
      headersPreparedForFetch.append('Content-Type', 'application/json');

      if (app.config.sessionToken) {
        headersPreparedForFetch.append('token', app.config.sessionToken.id);
      }

      for (let headerKey in headers) {
        headersPreparedForFetch.append(headerKey, headers[headerKey]);
      }

      fetch(requestUrl, {
        method: method,
        headers: headersPreparedForFetch
      })
        .then((response) => {
          return response.json().then((data) => {
            return {
              status: response.status,
              body: data
            };
          });
        })
        .then((response) => {
          if (callback) {
            try {
              callback(response.status, response.body);
            } catch (err) {
              callback(response.status, false);
            }
          }
        });
    }
  }
};
