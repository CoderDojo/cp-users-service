'use strict';

var _ = require('lodash');

module.exports = function(options){
  var seneca = this;
  var plugin = 'cd-users';
  var ENTITY_NS = 'sys/user';

  seneca.add({role: plugin, cmd: 'get_emails'}, cmd_get_emails);

  function cmd_get_emails(args, done){
    var seneca = this, usersIds = [], user_ent, mappedUsers;

    usersIds = args.usersIds;
    console.log(args.usersIds);

    user_ent = seneca.make(ENTITY_NS);
    user_ent.list$({ids: usersIds}, function(err, users){
      if(err){
        return done(err);
      }

      mappedUsers = _.map(users, function(user){
                      return {id: user.id, email: user.email};
                    });

      done(null, mappedUsers);
    });
    
  }

  return {
    name: plugin
  };
};