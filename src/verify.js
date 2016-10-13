import shared from './shared';
import nexmoRequest from './nexmoRequest';
import {
  checkToken,
}
from './token';

const apiEndpoint = shared.apiEndpoints.verify;
const generateParameters = shared.generateParameters;

let retry = 0;

function verify(params) {
  const client = this;

  return new Promise((resolve, reject) => {
    if (!shared.isClientSet(client)) {
      return reject('You need to set credentials');
    }

    if (!params || !params.number) {
      return reject('You need to pass a number');
    }

    return checkToken(client)
      .then((token) => {
        client.token = token;

        const queryParams = {
          app_id: client.appId,
          device_id: client.deviceId,
          number: params.number,
          source_ip_address: client.sourceIp,
        };

        if (params.lg) {
          queryParams.lg = params.lg;
        }

        if (params.country) {
          queryParams.country = params.country;
        }

        nexmoRequest(apiEndpoint + generateParameters(queryParams, client))
          .then((res) => {
            // Check if the token is invalid request a new one and call again the function
            if (res.data.result_code === 3) {
              if (retry < 1) {
                retry = 1;
                client.token = 'invalid';
                return verify.call(client, params);
              }
            } else {
              retry = 0;
            }

            // Any result_code different than zero means an error, return the error.
            if (res.data.result_code !== 0) {
              return reject(res.data.result_message);
            }

            if (!shared.isResponseValid(res, client.sharedSecret)) {
              return reject('Response verification failed');
            }
            return resolve(res.data.user_status);
          })
          .catch(err => reject(err));
      })
      .catch(err => reject(err));
  });
}

module.exports = verify;
