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
      // headersPreparedForFetch.append('Content-Type', 'application/json');

      if (app.config.sessionToken) {
        headersPreparedForFetch.append('token', app.config.sessionToken.id);
      }

      for (let headerKey in headers) {
        headersPreparedForFetch.append(headerKey, headers[headerKey]);
      }

      // console.log(requestUrl, method, headersPreparedForFetch);

      fetch(requestUrl, {
        method: method,
        headers: headersPreparedForFetch
      })
        .then((response) => {
          console.log(response);
          return response.json().then((data) => {
            console.log(data);
            return {
              status: response.status,
              body: data
            };
          });
        })
        .then((response) => {
          console.log(response);
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
  bindForms() {
    document.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();

      const selectedForm = document.querySelector('form');

      const formId = selectedForm.getAttribute('id');
      const path = selectedForm.getAttribute('action');
      const method = selectedForm.getAttribute('method').toUpperCase();

      document.querySelector(`#${formId} .form__error`).style.display = 'hidden';

      let payload = {};
      const elements = selectedForm.elements;
      console.log(elements);

      for (let i = 0; i < elements.length; i++) {
        if (elements[i].nodeName !== 'BUTTON') {
          const valueOfElement =
            elements[i].attributes.type.value === 'checkbox' ? elements[i].checked : elements[i].value;

          payload[elements[i].name] = valueOfElement;
        }
      }
      console.log(payload);

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
  },
  formResponseProcessor(formId, requestPayload, responsePayload) {
    const functionToCall = false;

    if (formId === 'form--create') {
      // @TODO Do something here now that the account has been created successfully
      console.log('The account create form was successfully submitted');
    }
  },
  init() {
    app.bindForms();
  }
};

window.onload = () => {
  app.init();
};
