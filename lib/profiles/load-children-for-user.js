'use strict';
var async = require('async');

function cmd_load_children_for_user (args, done) {
  var seneca = this;
  var userId = args.userId;

  seneca.act({role: 'cd-profiles', cmd: 'load_user_profile', userId: userId}, function (err, parentProfile) {
    if (err) return done(err);
    if (!parentProfile || !parentProfile.children) return done();
    async.map(parentProfile.children, function (childUserId, cb) {
      seneca.act({role: 'cd-users', cmd: 'load', id: childUserId, user: args.user}, cb);
    }, function (err, children) {
      if (err) return done(err);
      return done(null, children);
    });
  });
}

module.exports = cmd_load_children_for_user;
