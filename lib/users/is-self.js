'use strict';
var async = require('async');
var _ = require('lodash');


function checkPermissions (args, cb) {
  var seneca = this;
  var plugin = args.role;
  var userId = args.userId || args.id;
  var isSelf = false;
  // Could check upon profile, but seems like an overkill to me
  if( userId === args.user.id ){
    isSelf = true;
  }
  return cb(null, isSelf);
}

module.exports = checkPermissions;
