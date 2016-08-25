import config from './config.example.json';
import Nexmo from '../src/index.js';
import chai from 'chai';
import nock from 'nock';
const expect = chai.expect;
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);

describe('Verify', () => {
  it('returns an error if the credentials are not set', () => {
    const n = new Nexmo();
    return expect(n.verify()).to.be.rejectedWith('You need to set credentials');
  });

  it('returns an error if the number is not passed as parameter', () => {
    const n = new Nexmo(config);
    return expect(n.verify()).to.be.rejectedWith('You need to pass a number');
  });

  it('when the token is expired ask for a new one', () => {
    const n = new Nexmo({
      appId: '123456',
      sharedSecret: '123456',
    });

    // there is already a token that we pretend it's expired
    n.token = 'UBR51htkeMhUoQ0cIWEyffIeCcytVxqEGhwav0b8/nUAbjaQvPURuTtCYtIQ1YztbiNxSVRnXWLB\n2Meby4EVsYNumN4savfON3GpvSYg4BhmJPzZ2eWPiq0DnL/NwiPc75kM1KZE+otU98OC1X0T7w==\n';

    // mock the call to verify, token expired error code
    nock('https://api.nexmo.com')
      .get('/sdk/verify/json')
      .query(true)
      .reply(200, {
        result_code: 3,
      }, {
        'Content-type': 'application/json',
        'x-nexmo-response-signature': '8f80b7d048034c5bce757b8dddc02bce',
      });

    // mock the call to ask for a new token
    nock('https://api.nexmo.com')
      .get('/sdk/token/json')
      .query(true)
      .reply(200, {
        result_code: 0,
        result_message: 'OK',
        timestamp: '1234567890',
        token: 'UBR51htkeMhUoQ0cIWEyffIeCcytVxqEGhwav0b8/nUAbjaQvPURuTtCYtIQ1YztbiNxSVRnXWLB\n2Meby4EVsYNumN4savfON3GpvSYg4BhmJPzZ2eWPiq0DnL/NwiPc75kM1KZE+otU98OC1X0T7w==\n',
      }, {
        'Content-type': 'application/json',
        'x-nexmo-response-signature': '8f80b7d048034c5bce757b8dddc02bce',
      });

    // mock the call to verify again (successfully)
    nock('https://api.nexmo.com')
      .get('/sdk/verify/json')
      .query(true)
      .reply(200, {
        result_code: 0,
        result_message: 'OK',
        timestamp: '1234567890',
        user_status: 'verified',
      }, {
        'Content-type': 'application/json',
        'x-nexmo-response-signature': 'df3000e7135f0ae477c2031f5fb7cf05',
      });

    return expect(n.verify({
      number: 44123456789,
    })).to.eventually.equal('verified');
  });
});
