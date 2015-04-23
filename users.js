'use strict';

var _ = require('lodash');

module.exports = function(options){
  var seneca = this;
  var plugin = 'cd-users';
  var ENTITY_NS = 'sys/user';

  seneca.add({role: plugin, cmd: 'get_emails'}, cmd_get_emails);
  seneca.add({role: plugin, cmd: 'register_user'}, cmd_register_user);
  seneca.add({role: plugin, cmd: 'promote_user'}, cmd_promote_user);

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

  function cmd_register_user(args, done) {
    //Roles Available: basic-user, mentor, champion, cdf-admin
    var seneca = this;
    args.roles = ['basic-user'];
    seneca.act({role:'user', cmd:'register'}, args, function(err, response) {
      if(err) return done(err);
      done(null, response);
    });
  }

  function cmd_promote_user(args, done) {
    var seneca = this;
    var newRoles = args.roles;
    var userId = args.id;
    var userEntity = seneca.make$(ENTITY_NS);

    userEntity.load$(userId, function(err, response) {
      if(err) return done(err);
      var user = response;
      _.each(newRoles, function(newRole) {
        user.roles.push(newRole);
      });
      user.roles = _.uniq(user.roles);
      userEntity.save$(user, function(err, response) {
        if(err) return done(err);
        done(null, response);
      });
    });

  }

  return {
    name: plugin
  };
};