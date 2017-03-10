'use strict';
var async = require('async');

function cmd_load_parents_for_user (args, done) {
  var seneca = this;
  var userId = args.userId;

  seneca.act({role: args.role, cmd: 'list', query: {userId: userId}}, function (err, response) {
    if (err) return done(err);
    var childProfile = response[0];
    if (!childProfile || !childProfile.parents) return done();
    async.map(childProfile.parents, function (parentUserId, cb) {
      seneca.act({role: 'cd-profiles', cmd: 'user_profile_data', query: {userId: parentUserId}, user: args.user, proxyProfile: childProfile}, cb);
    }, function (err, parents) {
      if (err) return done(err);
      return done(null, parents);
    });
  });
}

module.exports = cmd_load_parents_for_user;
