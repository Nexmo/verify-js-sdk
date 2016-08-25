import popsicle from 'popsicle';
import shared from './shared.js';
import {
  checkToken,
}
from './token.js';

const nexmoHeaders = shared.nexmoHeaders;
const apiEndpoint = shared.apiEndpoints.verify;
const generateParameters = shared.generateParameters;

let retry = 0;

function verify(params) {
  const client = this;

  if (!shared.isClientSet(client)) {
    // console.log('console: credentials missing');
    return Promise.reject('You need to set credentials');
  }

  if (!params || !params.number) {
    // console.log('console: number missing');
    return Promise.reject('You need to pass a number');
  }

  // console.log('retry: ', retry);

  return checkToken(client)
  .then((token) => {
    client.token = token;

    const queryParams = {
      'app_id': client.appId,
      'device_id': client.deviceId,
      'number': params.number,
      'source_ip_address': client.sourceIp,
    };

    if (params.lg) {
      queryParams.lg = params.lg;
    }

    if (params.country) {
      queryParams.country = params.country;
    }

    return popsicle(apiEndpoint + generateParameters(queryParams, client))
      .use(nexmoHeaders())
      .then((res) => {
        // Check if the token is invalid request a new one and call again the function
        if (res.body.result_code === 3) {
          if (retry < 1) {
            retry = 1;
            client.token = 'invalid';
            return verify.call(client, params);
          }
          // what happens if the second time it can't retrieve the token?
          // should it try again n times?
          // else {
          //   retry += 1;
          //   return reject(res.body.result_message);
          // }
        } else {
          retry = 0;
        }

        // Any result_code different than zero means an error, return the error.
        if (res.body.result_code !== 0) {
          return Promise.reject(res.body.result_message);
        }

        if (!shared.isResponseValid(res, client.sharedSecret)) {
          return Promise.reject('Response verification failed');
        } else {
          return Promise.resolve(res.body.user_status);
        }
      })
      .catch((err) => {
        return Promise.reject(err);
      });
  })
  .catch((err) => {
    return Promise.reject(err);
  });
}

module.exports = verify;
