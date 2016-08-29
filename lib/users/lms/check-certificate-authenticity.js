'use strict';
var _ = require('lodash');
var crypto = require('crypto');

/**
 * Verify the validity of a LMS certificate by comparing the signature of this cert
 * to the value of its hash + our shared private key
 * @param  {String}   certificate the certificate as a string
 * @param  {String}   signature   extracted expected hash
 */
function checkValidity (args, cb) {
  var seneca = this;
  var hash = crypto.createHash('md5');
  var webhookSecret = process.env.LMS_WEBHOOK_SECRET;
  var signature = args.signature;
  var certif = args.certif;
  var stringCertif = certif + ':' + webhookSecret;
  hash.update(stringCertif);
  var digest = hash.digest('hex');
  if ( !_.isEmpty(webhookSecret)){
    if ( digest !== signature){
      cb(null, {ok: false, why: 'Invalid signature', http$:{status: 401}});
    } else {
      cb(null, {ok: true});
    }
  } else {
    cb(new Error('Missing Webhook Secret'));
  }
}


module.exports = checkValidity;
