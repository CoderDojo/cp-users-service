'use strict';
var async = require('async');
var _ = require('lodash');


function checkPermissions (args, cb) {
  var seneca = this;
  var plugin = args.role;
  var userId = args.userId || args.id;
  var childrenIds = args.childrenIds || _.map(args.children, 'id');
  var isParent = false;
  seneca.act({role: 'cd-profiles', cmd: 'load', userId: userId},
    function(err, user){
      if(err) return cb(null, false);
      if(_.includes(childrenIds, _.map(user.children, 'id') )) isParent = true;
      return cb(null, isParent);
  });
  //  Could also check the opposite way, from child to Parent
  return cb(null, isParent);
}

module.exports = checkPermissions;
