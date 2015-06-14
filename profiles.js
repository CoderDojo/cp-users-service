'use strict';

module.exports = function(options) {
  var seneca = this;

  var PARENT_GUARDIAN_PROFILE_ENTITY = 'cd/profiles';
  var plugin = 'cd-profiles';

  seneca.add({role: plugin, cmd: 'create'}, cmd_create);
  seneca.add({role: plugin, cmd: 'list'}, cmd_list);
  seneca.add({role: plugin, cmd: 'save'}, cmd_save);

  function cmd_create(args, done){
    var profile = args.profile;
    profile.userId = args.user;
    console.log(JSON.stringify(args));
    seneca.make$(PARENT_GUARDIAN_PROFILE_ENTITY).save$(profile, done);
  }

  function cmd_list(args, done){
    var query = args.query;
    
    seneca.make$(PARENT_GUARDIAN_PROFILE_ENTITY).list$(query, done);
  }

  function cmd_save(args, done) {
    var profile = args.profile;

    seneca.make$(PARENT_GUARDIAN_PROFILE_ENTITY).save$(profile, done);
  }

  return {
    name: plugin
  };

};