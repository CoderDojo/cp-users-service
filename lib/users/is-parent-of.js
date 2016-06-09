'use strict';
var async = require('async');
var _ = require('lodash');


function isParentOf (args, cb) {
  var seneca = this;
  var plugin = args.role;
  var userId = args.userId || args.id;
  if(args.user && _.isUndefined(userId)) userId = args.user.id;
  if(args.query && _.isUndefined(userId)) userId = args.query.userId || args.query.id ;
  var childrenIds = args.childrenIds || _.map(args.children, 'id');
  var isParent = false;
  //  Could also check the opposite way, from child to Parent
  seneca.act({role: 'cd-profiles', cmd: 'load_user_profile', userId: userId},
    function(err, user){
      if(err) return cb(null, false);
      if(_.includes(childrenIds, _.map(user.children, 'id') )) isParent = true;
      return cb(null, isParent);
  });
}

module.exports = isParentOf;
