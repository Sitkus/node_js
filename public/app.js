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

      let requestUrl = `${path}?`;
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

      let headersPreparedForFetch = new Headers({
        'Content-Type': 'application/json'
      });

      if (app.config.sessionToken) {
        headersPreparedForFetch.append('token', app.config.sessionToken.id);
      }

      for (let headerKey in headers) {
        headersPreparedForFetch.append(headerKey, headers[headerKey]);
      }

      fetch(requestUrl, {
        method: method,
        headers: headersPreparedForFetch,
        body: JSON.stringify(payload)
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
  },
  bindLogoutButton() {
    document.getElementById('logout-btn').addEventListener('click', (e) => {
      e.preventDefault();

      app.logUserOut();
    });
  },
  logUserOut() {
    const tokenId = typeof app.config.sessionToken.id === 'string' ? app.config.sessionToken.id : false;

    const queryStringObject = {
      id: tokenId
    };

    app.client.request(
      undefined,
      'api/tokens',
      'DELETE',
      queryStringObject,
      undefined,
      (statusCode, responsePayload) => {
        app.setSessionToken(false);

        window.location = '/session/delete';
      }
    );
  },
  bindForms() {
    if (document.querySelector('form')) {
      document.querySelector('form').addEventListener('submit', (e) => {
        e.preventDefault();

        const selectedForm = document.querySelector('form');

        const formId = selectedForm.getAttribute('id');
        const path = selectedForm.getAttribute('action');
        const method = selectedForm.getAttribute('method').toUpperCase();

        document.querySelector(`#${formId} .form__error`).style.display = 'hidden';

        let payload = {};
        const elements = selectedForm.elements;

        for (let i = 0; i < elements.length; i++) {
          if (elements[i].nodeName !== 'BUTTON') {
            const valueOfElement =
              elements[i].attributes.type.value === 'checkbox' ? elements[i].checked : elements[i].value;

            payload[elements[i].name] = valueOfElement;
          }
        }

        app.client.request(undefined, path, method, undefined, payload, (statusCode, responsePayload) => {
          if (statusCode !== 200) {
            const error =
              typeof responsePayload.Error === 'string' ? responsePayload.Error : 'An error occured, please try again';

            document.querySelector(`#${formId} .form__error`).innerHTML = error;

            document.querySelector(`#${formId} .form__error`).style.display = 'block';
          } else {
            app.formResponseProcessor(formId, payload, responsePayload);
          }
        });
      });
    }
  },
  formResponseProcessor(formId, requestPayload, responsePayload) {
    const functionToCall = false;

    if (formId === 'form--create') {
      const newPayload = {
        phone: requestPayload.phone,
        password: requestPayload.password
      };

      app.client.request(
        undefined,
        'api/tokens',
        'POST',
        undefined,
        newPayload,
        (newStatusCode, newResponsePayload) => {
          if (newStatusCode !== 200) {
            document.querySelector(`#${formId} .form__error`).innerHTML =
              'Sorry, an error has occured. Please try again.';

            document.querySelector(`#${formId} .form__error`).style.display = 'block';
          } else {
            app.setSessionToken(newResponsePayload);
            window.location = '/checks/all';
          }
        }
      );
    } else if (formId === 'form--session-create') {
      app.setSessionToken(responsePayload);
      window.location = '/checks/all';
    }
  },
  getSessionToken() {
    const tokenString = localStorage.getItem('token');

    if (typeof tokenString === 'string') {
      try {
        const token = JSON.parse(tokenString);
        app.config.sessionToken = token;

        if (typeof token === 'object') {
          app.setLoggedInClass(true);
        } else {
          app.setLoggedInClass(false);
        }
      } catch (err) {
        app.config.sessionToken = false;
        app.setLoggedInClass(false);
      }
    }
  },
  setLoggedInClass(add) {
    const target = document.querySelector('body');

    if (add) {
      target.classList.add('logged-in');
    } else {
      target.classList.remove('logged-in');
    }
  },
  setSessionToken(token) {
    app.config.sessionToken = token;
    const tokenString = JSON.stringify(token);
    localStorage.setItem('token', tokenString);

    if (typeof token === 'object') {
      app.setLoggedInClass(true);
    } else {
      app.setLoggedInClass(false);
    }
  },
  renewToken() {
    const currentToken = typeof app.config.sessionToken === 'object' ? app.config.sessionToken : false;

    if (currentToken) {
      const payload = {
        id: currentToken.id,
        extend: true
      };

      app.client.request(undefined, 'api/tokens', 'PUT', undefined, payload, (statusCode, responsePayload) => {
        if (statusCode === 200) {
          const queryStringObject = { id: currentToken.id };

          app.client.request(
            undefined,
            'api/token',
            'GET',
            queryStringObject,
            undefined,
            (statusCode, responsePayload) => {
              if (statusCode === 200) {
                app.setSessionToken(responsePayload);
                callback(false);
              } else {
                app.setSessionToken(false);
                callback(true);
              }
            }
          );
        } else {
          app.setSessionToken(false);
          callback(true);
        }
      });
    } else {
      app.setSessionToken(false);
      callback(true);
    }
  },
  tokenRenewalLoop() {
    setInterval(() => {
      app.renewToken((err) => {
        if (!err) {
          console.log(`Token renewed successfully @ ${Date.now()}`);
        }
      });
    }, 1000 * 60);
  },
  init() {
    app.bindForms();

    app.bindLogoutButton();

    app.getSessionToken();

    app.tokenRenewalLoop();
  }
};

window.onload = () => {
  app.init();
};
