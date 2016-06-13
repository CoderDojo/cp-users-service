'use strict';
var async = require('async');
var _ = require('lodash');


function isSelf (args, cb) {
  var seneca = this;
  var plugin = args.role;
  var userId = args.user.id;
  var refUserId = args.params.userId || args.params.id ;
  if(args.params.query && _.isUndefined(refUserId))
    refUserId = args.params.query.userId || args.params.query.id ;
  console.log( 'isSelf : ', userId, refUserId);
  var isSelf = false;
  // Could check upon profile, but seems like an overkill to me
  if( userId === refUserId ){
    isSelf = true;
  }
  return cb(null, isSelf);
}

module.exports = isSelf;
