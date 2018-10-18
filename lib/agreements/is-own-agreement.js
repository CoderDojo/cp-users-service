'use strict';
var async = require('async');
var _ = require('lodash');


function isOwnAgreement (args, cb) {
  const seneca = this;
  const plugin = args.role;
  const userId = args.user.id;
  const id = args.params.id;
  seneca.act({ role: 'cd-agreements', cmd: 'load', id }, function (err, agreement) {
    if (err) {
      seneca.log.error(seneca.customValidatorLogFormatter('cd-agreements', 'isOwnAgreement', err, { id, userId }));
      return cb(null, {'allowed': false});
    }
    var isSelf = false;
    if (agreement.userId === userId) {
      isSelf = true;
    }
    return cb(null, {'allowed': isSelf});
  });
}

module.exports = isOwnAgreement;
