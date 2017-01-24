'use strict';
var async = require('async');
var _ = require('lodash');


function isParentOf (args, cb) {
  var seneca = this;
  var plugin = args.role;
  var userId = args.user.id;
  var childrenId = args.params.userId;
  var childrenProfileId;
  if(_.isUndefined(childrenId) && args.params.profile) childrenId = args.params.profile.userId;
  if(_.isUndefined(childrenId) && args.params.query) childrenId = args.params.query.userId;
  if(_.isUndefined(childrenId) && args.params.profileId) childrenProfileId = args.params.profileId;
  var isParent = false;
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
  var checkChildrenBelongsToUser = function (wfCb) {
    seneca.act({role: 'cd-profiles', cmd: 'load_user_profile', userId: userId},
      function (err, user) {
        if (err) {
          seneca.log.error(seneca.customValidatorLogFormatter('cd-profiles', 'isParentOf', err, {userId: userId, childrenId: childrenId}));
          return cb(null, {'allowed': false});
        }
        if (_.includes(user.children, childrenId )) isParent = true;
        return cb(null, {'allowed': isParent});
    });
  };

  //  Could also check the opposite way, from child to Parent
  async.waterfall([
    getChildrenUserId,
    checkChildrenBelongsToUser
  ]);
}

module.exports = isParentOf;
