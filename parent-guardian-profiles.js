'use strict';

module.exports = function(options) {
  var seneca = this;
  //var YOUTH_PROFILE_ENTITY = 'cd/youthprofiles';
  var PARENT_GUARDIAN_PROFILE_ENTITY = 'cd/parentguardianprofiles';
  var plugin = 'cd-parentguardianprofiles';

  seneca.add({role: plugin, cmd: 'create'}, cmd_create);
  seneca.add({role: plugin, cmd: 'delete'}, cmd_delete);
  seneca.add({role: plugin, cmd: 'list'}, cmd_list);
  //seneca.add({role: plugin, cmd: 'update'}, cmd_update);

  function cmd_create(args, done){
    var profile = args.profile;
    
    profile.parentGuardianId = args.user.id;
    seneca.make$(PARENT_GUARDIAN_PROFILE_ENTITY).save$(profile, done);
  }

  // function cmd_delete(args, done){
  //   var id = args.id;

  //   seneca.make$(PARENT_GUARDIAN_PROFILE_ENTITY).remove$({id: id}, done);
  // }

  function cmd_list(args, done){
    var query = args.query;

    seneca.make$(PARENT_GUARDIAN_PROFILE_ENTITY).list$(query, done);
  }

  return {
    name: plugin
  };

};