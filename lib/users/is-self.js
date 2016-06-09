'use strict';
var async = require('async');
var _ = require('lodash');


function isSelf (args, cb) {
  var seneca = this;
  var plugin = args.role;
  var userId = args.userId || args.id ;
  if(args.user && _.isUndefined(userId)) userId = args.user.id;
  if(args.query && _.isUndefined(userId)) userId = args.query.userId || args.query.id ;
  console.log( 'isSelf : ', userId, args.user.id);
  var isSelf = false;
  // Could check upon profile, but seems like an overkill to me
  if( userId === args.user.id ){
    isSelf = true;
  }
  return cb(null, isSelf);
}

module.exports = isSelf;
