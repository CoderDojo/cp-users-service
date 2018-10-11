'use strict';
var async = require('async');
var _ = require('lodash');

function isParentOf (args, cb) {
  var seneca = this;
  var userId = args.user.id;
  var childrenId = args.params.userId;
  var childrenProfileId;
  if (_.isUndefined(childrenId) && args.params.profile) childrenId = args.params.profile.userId;
  if (_.isUndefined(childrenId) && args.params.query) childrenId = args.params.query.userId;
  if (_.isUndefined(childrenId) && args.params.profileId) childrenProfileId = args.params.profileId;
  if (_.isUndefined(childrenId) && args.params.id) childrenId = args.params.id;
  // Used by invite-parent-guardian
  if (_.isUndefined(childrenId) && args.params.data) childrenId = args.params.data.childId;
  var getChildrenUserId = function (wfCb) {
    if (!childrenId && childrenProfileId) {
      seneca.act({role: 'cd-profiles', cmd: 'load', id: childrenProfileId}, function (err, profile) {
        if (err) return cb(null, {'allowed': false});
        childrenId = profile.userId;
        wfCb();
      });
    } else {
      wfCb();
    }
  };
  // Checks relationship both ways - parent has child, and child has parent
  var checkChildrenBelongsToUser = function (wfCb) {
    async.parallel({
      parentHasChild: function (done) {
        seneca.act({role: 'cd-profiles', cmd: 'load_user_profile', userId: userId},
          function (err, user) {
            if (err) {
              seneca.log.error(seneca.customValidatorLogFormatter('cd-profiles', 'isParentOf', err, {userId: userId, childrenId: childrenId}));
              return done(null, false);
            }
            if (user && user.children) {
              return done(null, _.includes(user.children, childrenId));
            } else {
              return done(null, false);
            }
          });
      },
      childHasParent: function (done) {
        seneca.act({role: 'cd-profiles', cmd: 'load_user_profile', userId: childrenId},
          function (err, user) {
            if (err) {
              seneca.log.error(seneca.customValidatorLogFormatter('cd-profiles', 'isParentOf', err, {userId: userId, childrenId: childrenId}));
              return done(null, false);
            }
            if (user && user.parents) {
              return done(null, _.includes(user.parents, userId));
            } else {
              return done(null, false);
            }
          });
      }
    }, function (err, results) {
      if (err) {
        return cb(null, {'allowed': false});
      }
      return cb(null, {'allowed': results.parentHasChild && results.childHasParent});
    });
  };

  async.waterfall([
    getChildrenUserId,
    checkChildrenBelongsToUser
  ]);
}

module.exports = isParentOf;
