'use strict';
var async = require('async');

function cmd_load_children_for_user (args, done) {
  var seneca = this;
  var userId = args.userId;

  seneca.act({role: 'cd-profiles', cmd: 'load_user_profile', userId: userId}, function (err, parentProfile) {
    if (err) return done(err);
    if (!parentProfile) return done(null, {error: 'User profile not found for userId ' + userId, http$: {status: 404}});
    if (!parentProfile.children) return done(null, []);
    async.map(parentProfile.children, function (childUserId, cb) {
      seneca.act({role: 'cd-users', cmd: 'load', id: childUserId, user: args.user}, cb);
    }, function (err, children) {
      if (err) return done(err);
      return done(null, children);
    });
  });
}

module.exports = cmd_load_children_for_user;
