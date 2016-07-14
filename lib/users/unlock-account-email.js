'use strict';
var async = require('async');
var _ = require('lodash');
var protocol = process.env.PROTOCOL || 'http';
var zenHostname = process.env.HOSTNAME || '127.0.0.1:8000';

function unlockAccountEmail (args, cb) {
  var seneca = this;
  var email = args.email;
  var locality = args.locality || 'en_US';
  var emailCode = 'user-lockout-';
  var emailSubject = 'CoderDojo Zen Account Lockout';

  seneca.act({role: 'cd-users', cmd: 'get_users_by_email', email: email}, function (err, users) {
    if (err) return done(err);
    if (options['email-notifications'].sendemail) {
      seneca.act({role: 'email-notifications', cmd: 'send'}, {
        code: emailCode,
        locality: locality,
        to: email,
        subject: emailSubject,
        content: {name: users[0].name, resetlink: protocol + '://' + zenHostname + '/reset_password', year: moment(new Date()).format('YYYY')}
      }, function (err, response) {
        if (err) return done(err);
        return done(null, { ok: true });
      });
    } else {
      return done(null, {ok: false});
    }
  });
}

module.exports = unlockAccountEmail;
