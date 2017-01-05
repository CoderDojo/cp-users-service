'use strict';
var async = require('async');
var _ = require('lodash');


function isParentOf (args, cb) {
  var seneca = this;
  var plugin = args.role;
  var userId = args.user.id;
  var childrenId = args.params.userId;
  if(_.isUndefined(childrenId) && args.params.profile) childrenId = args.params.profile.userId;
  if(_.isUndefined(childrenId) && args.params.query) childrenId = args.params.query.userId;
  var isParent = false;
  //  Could also check the opposite way, from child to Parent
  seneca.act({role: 'cd-profiles', cmd: 'load_user_profile', userId: userId},
    function (err, user) {
      if (err) {
        seneca.log.error(seneca.customValidatorLogger('cd-profiles', 'isParentOf', err, {userId: userId, childrenId: childrenId}));
        return cb(null, {'allowed': false});
      }

      if (_.includes(user.children, childrenId )) isParent = true;
      return cb(null, {'allowed': isParent});
  });
}

module.exports = isParentOf;
