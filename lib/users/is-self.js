'use strict';
var async = require('async');
var _ = require('lodash');


function isSelf (args, cb) {
  var seneca = this;
  var plugin = args.role;
  var userId = args.user.id;
  var refUserId = args.params.userId || args.params.id;
  if (args.params.query && _.isUndefined(refUserId)) {
    refUserId = args.params.query.userId || args.params.query.id;
  }
  if (args.params.profile && _.isUndefined(refUserId)) {
    refUserId = args.params.profile.userId;
  }
  // Used by invite-parent-guardian
  if (args.params.data && _.isUndefined(refUserId)) {
    refUserId = args.params.data.childId;
  }
  // Used by generate-user-invite
  if (args.params.data && args.params.data.user && _.isUndefined(refUserId)) {
    refUserId = args.params.data.user.id;
  }
  var isSelf = false;
  // Could check upon profile, but seems like an overkill to me
  if( userId === refUserId ){
    isSelf = true;
  }
  return cb(null, {'allowed': isSelf});
}

module.exports = isSelf;
