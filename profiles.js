'use strict';

module.exports = function(options) {
  var seneca = this;

  var PARENT_GUARDIAN_PROFILE_ENTITY = 'cd/profiles';
  var plugin = 'cd-profiles';

  seneca.add({role: plugin, cmd: 'create'}, cmd_create);
  seneca.add({role: plugin, cmd: 'list'}, cmd_list);

  function cmd_create(args, done){
    var profile = args.profile;
    
    profile.parentGuardianId = args.user.id;
    seneca.make$(PARENT_GUARDIAN_PROFILE_ENTITY).save$(profile, done);
  }

  function cmd_list(args, done){
    var query = args.query;

    seneca.make$(PARENT_GUARDIAN_PROFILE_ENTITY).list$(query, done);
  }

  return {
    name: plugin
  };

};