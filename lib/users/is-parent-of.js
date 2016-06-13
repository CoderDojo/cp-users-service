'use strict';
var async = require('async');
var _ = require('lodash');


function isParentOf (args, cb) {
  var seneca = this;
  var plugin = args.role;
  var userId = args.user.id;
  var childrenId = args.params.userId || args.params.query.userId;
  var isParent = false;
  //  Could also check the opposite way, from child to Parent
  seneca.act({role: 'cd-profiles', cmd: 'load_user_profile', userId: userId},
    function(err, user){
      if(err) return cb(null, false);
      console.log("profile",user.children, childrenId);
      if(_.includes(user.children, childrenId )) isParent = true;
      return cb(null, isParent);
  });
}

module.exports = isParentOf;
