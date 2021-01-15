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
        body: method === 'GET' || method === 'get' ? null : JSON.stringify(payload)
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
  logUserOut(redirectUser) {
    redirectUser = typeof redirectUser === 'boolean' ? redirectUser : true;

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

        if (redirectUser) {
          window.location = '/session/deleted';
        }
      }
    );
  },
  bindForms() {
    if (document.querySelector('form')) {
      const allForms = document.querySelectorAll('form');

      for (let i = 0; i < allForms.length; i++) {
        allForms[i].addEventListener('submit', (e) => {
          e.preventDefault();

          const formId = allForms[i].getAttribute('id');
          const path = allForms[i].getAttribute('action');
          let method = allForms[i].getAttribute('method').toUpperCase();

          document.querySelector(`#${formId} .form__error`).style.display = 'none';

          if (document.querySelector(`#${formId} .form__success`)) {
            document.querySelector(`#${formId} .form__success`).style.display = 'none';
          }

          let payload = {};
          const elements = allForms[i].elements;

          for (let i = 0; i < elements.length; i++) {
            if (elements[i].type !== 'submit') {
              const classOfElement =
                typeof elements[i].classList.value === 'string' && elements[i].classList.value.length > 0
                  ? elements[i].classList.value
                  : '';
              const valueOfElement =
                elements[i].type === 'checkbox' && !classOfElement.includes('form__multiselect')
                  ? elements[i].checked
                  : !classOfElement.includes('form__intval')
                  ? elements[i].value
                  : parseInt(elements[i].value);

              const elementIsChecked = elements[i].checked;
              let nameOfElement = elements[i].name;

              if (nameOfElement === '_method') {
                method = valueOfElement;
              } else {
                if (nameOfElement === 'httpmethod') {
                  nameOfElement = 'method';
                }

                if (nameOfElement === 'uid') {
                  nameOfElement = 'id';
                }

                if (classOfElement.includes('form__multiselect')) {
                  if (elementIsChecked) {
                    payload[nameOfElement] =
                      typeof payload[nameOfElement] === 'object' && payload[nameOfElement] instanceof Array
                        ? payload[nameOfElement]
                        : [];

                    payload[nameOfElement].push(valueOfElement);
                  }
                } else {
                  payload[nameOfElement] = valueOfElement;
                }
              }
            }
          }

          const queryStringObject = method === 'DELETE' ? payload : {};

          app.client.request(undefined, path, method, queryStringObject, payload, (statusCode, responsePayload) => {
            if (statusCode !== 200) {
              if (statusCode == 403) {
                app.logUserOut();
              } else {
                const error =
                  typeof responsePayload.Error === 'string'
                    ? responsePayload.Error
                    : 'An error occured, please try again';

                document.querySelector(`#${formId} .form__error`).innerHTML = error;

                document.querySelector(`#${formId} .form__error`).style.display = 'block';
              }
            } else {
              app.formResponseProcessor(formId, payload, responsePayload);
            }
          });
        });
      }
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
    }

    if (formId === 'form--session-create') {
      app.setSessionToken(responsePayload);
      window.location = '/checks/all';
    }

    const formsWithSuccessMessages = ['form--account-edit', 'form--account-edit2', 'form--checks-edit'];

    if (formsWithSuccessMessages.indexOf(formId) > -1) {
      document.querySelector(`#${formId} .form__success`).style.display = 'block';
    }

    if (formId === 'form--account-deleted') {
      if (confirm('Are sure you want to delete this account?')) {
        app.logUserOut(false);
        window.location = '/account/deleted';
      }
    }

    if (formId === 'form--checks-create') {
      window.location = '/checks/all';
    }

    if (formId === 'form--checks-delete') {
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
  renewToken(callback) {
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
            'api/tokens',
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
  loadDataOnPage() {
    const bodyClasses = document.querySelector('body').classList;
    const primaryClass = typeof bodyClasses[0] === 'string' ? bodyClasses[0] : false;

    if (primaryClass === 'account-edit') {
      app.loadAccountEditPage();
    }

    if (primaryClass === 'checks-list') {
      app.loadChecksListPage();
    }

    if (primaryClass === 'checks-edit') {
      app.loadChecksEditPage();
    }
  },
  loadAccountEditPage() {
    const phone = typeof app.config.sessionToken.phone === 'string' ? app.config.sessionToken.phone : false;

    if (phone) {
      const queryStringObject = {
        phone
      };

      app.client.request(undefined, 'api/users', 'GET', queryStringObject, undefined, (statusCode, responsePayload) => {
        if (statusCode === 200) {
          document.querySelector('.form__input--first-name').value = responsePayload.firstName;
          document.querySelector('.form__input--last-name').value = responsePayload.lastName;
          document.querySelector('.form__input--display-phone-input').value = responsePayload.phone;

          const hiddenPhoneInputs = document.querySelectorAll('.form__input--hidden');

          for (let i = 0; i < hiddenPhoneInputs.length; i++) {
            hiddenPhoneInputs[i].value = responsePayload.phone;
          }
        } else {
          app.logUserOut();
        }
      });
    } else {
      app.logUserOut();
    }
  },
  loadChecksListPage() {
    const phone = typeof app.config.sessionToken.phone == 'string' ? app.config.sessionToken.phone : false;

    if (phone) {
      const queryStringObject = {
        phone: phone
      };

      app.client.request(undefined, 'api/users', 'GET', queryStringObject, undefined, (statusCode, responsePayload) => {
        if (statusCode == 200) {
          const allChecks =
            typeof responsePayload.checks === 'object' &&
            responsePayload.checks instanceof Array &&
            responsePayload.checks.length > 0
              ? responsePayload.checks
              : [];

          // Fix here, issue with responsePayload.checks switching from object to undefined quickly.
          console.log(typeof responsePayload.checks);

          if (allChecks.length > 0) {
            allChecks.forEach((checkId) => {
              const newQueryStringObject = {
                id: checkId
              };

              app.client.request(
                undefined,
                'api/checks',
                'GET',
                newQueryStringObject,
                undefined,
                (statusCode, responsePayload) => {
                  if (statusCode == 200) {
                    const checkData = responsePayload;

                    const table = document.querySelector('.checks');
                    const tr = table.insertRow(-1);
                    tr.classList.add('checks__row');

                    const td0 = tr.insertCell(0);
                    const td1 = tr.insertCell(1);
                    const td2 = tr.insertCell(2);
                    const td3 = tr.insertCell(3);
                    const td4 = tr.insertCell(4);

                    td0.innerHTML = responsePayload.method.toUpperCase();
                    td1.innerHTML = `${responsePayload.protocol}://`;
                    td2.innerHTML = responsePayload.url;

                    const state = typeof responsePayload.state === 'string' ? responsePayload.state : 'unknown';

                    td3.innerHTML = state;
                    td4.innerHTML = `<a href="/checks/edit?id=${responsePayload.id}">View / Edit / Delete</a>`;
                  } else {
                    console.log('Error trying to load check ID: ', checkId);
                  }
                }
              );
            });

            if (allChecks.length < 5) {
              document.querySelector('.main__btn--checks-create').style.display = 'block';
            }
          } else {
            console.log(allChecks);
            document.querySelector('.checks__no-checks').style.display = 'table-row';
            document.querySelector('.main__btn--create-check').style.display = 'block';
          }
        } else {
          app.logUserOut();
        }
      });
    } else {
      app.logUserOut();
    }
  },
  loadChecksEditPage() {
    const id =
      typeof window.location.href.split('=')[1] === 'string' && window.location.href.split('=')[1].length > 0
        ? window.location.href.split('=')[1]
        : false;

    if (id) {
      const queryStringObject = {
        id: id
      };

      app.client.request(
        undefined,
        'api/checks',
        'GET',
        queryStringObject,
        undefined,
        (statusCode, responsePayload) => {
          if (statusCode == 200) {
            const hiddenIdInputs = document.querySelectorAll('.form__input--hidden-id');

            for (var i = 0; i < hiddenIdInputs.length; i++) {
              hiddenIdInputs[i].value = responsePayload.id;
            }

            document.querySelector('#form--checks-edit .form__input--display-id-input').value = responsePayload.id;
            document.querySelector('#form--checks-edit .form__input--display-state').value = responsePayload.state;
            document.querySelector('#form--checks-edit .form__select--protocol').value = responsePayload.protocol;
            document.querySelector('#form--checks-edit .form__input--url').value = responsePayload.url;
            document.querySelector('#form--checks-edit .form__select--method').value = responsePayload.method;
            document.querySelector('#form--checks-edit .form__select--timeout').value = responsePayload.timeoutSeconds;

            const successCodeCheckboxes = document.querySelectorAll(
              '#form--checks-edit .form__checkbox--success-codes'
            );

            for (var i = 0; i < successCodeCheckboxes.length; i++) {
              if (responsePayload.successCodes.includes(parseInt(successCodeCheckboxes[i].value))) {
                successCodeCheckboxes[i].checked = true;
              }
            }
          } else {
            window.location = '/checks/all';
          }
        }
      );
    } else {
      window.location = '/checks/all';
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

    app.loadDataOnPage();
  }
};

window.onload = () => {
  app.init();
};
