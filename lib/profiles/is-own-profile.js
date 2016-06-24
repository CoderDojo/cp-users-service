'use strict';
var async = require('async');
var _ = require('lodash');


function isOwnProfile (args, cb) {
  var seneca = this;
  var plugin = args.role;
  var userId = args.user.id;
  var refProfileId = args.params.profileId || args.params.id ;
  seneca.act({role: 'cd-profiles', cmd: 'load_user_profile', userId: userId}, function(err, profile){
    if (err) return done(null, {'allowed': false});
    var isSelf = false;
    // Could check upon profile, but seems like an overkill to me
    if( profile.id === refProfileId ){
      isSelf = true;
    }
    return cb(null, {'allowed': isSelf});
  });
}

module.exports = isOwnProfile;
