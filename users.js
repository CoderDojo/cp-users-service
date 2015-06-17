'use strict';

var _ = require('lodash');
var async = require('async');
var oauthserver = require('oauth2-server');

var oauth = oauthserver({
  model: require('./oauth-model'),
  grants: ['authorization_code'],
  debug: true
});

module.exports = function(options){
  var seneca = this;
  var plugin = 'cd-users';
  var ENTITY_NS = 'sys/user';

  seneca.add({role: plugin, cmd: 'load'}, cmd_load);
  seneca.add({role: plugin, cmd: 'list'}, cmd_list);
  seneca.add({role: plugin, cmd: 'register'}, cmd_register);
  seneca.add({role: plugin, cmd: 'promote'}, cmd_promote);
  seneca.add({role: plugin, cmd: 'get_users_by_emails'}, cmd_get_users_by_emails);
  seneca.add({role: plugin, cmd: 'update'}, cmd_update);
  seneca.add({role: plugin, cmd: 'authorize'}, cmd_oauth_authorize);
  seneca.add({role: plugin, cmd: 'token'}, cmd_oauth_token);
  seneca.add({role: plugin, cmd: 'userprofile'}, cmd_oauth_userprofile);

  function cmd_load(args, done) {
    var seneca = this;
    var id = args.id;

    var userEntity = seneca.make(ENTITY_NS);
    userEntity.load$(id, done);
  }

  function cmd_list(args, done){
    var seneca = this;

    async.waterfall([
      function(done) {
        seneca.make(ENTITY_NS).list$({ids: args.ids}, done);
      },
      function(users, done) {
        return done(null, _.map(users, function (user) {
          return user.data$();
        }));
      }
    ], done);
  }

  function cmd_register(args, done) {
    //Roles Available: basic-user, cdf-admin
    //TO-DO: define basic-user and cdf-admin permissions
    //cdf-admin role should give user global access to the system.
    var seneca = this;
    args.roles = ['basic-user'];
    args.mailingList = (args.mailingList) ? 1 : 0;
    seneca.act({role:'user', cmd:'register'}, args, function(err, response) {
      if(err) return done(err);
      done(null, response);
    });
  }

  function cmd_promote(args, done) {
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

  function cmd_get_users_by_emails(args, done){
    var seneca = this, query = {};
    
    query.email = new RegExp(args.email, 'i');
    query.limit$ = query.limit$ ? query.limit$ : 10;

    seneca.make(ENTITY_NS).list$(query, function(err, users){
      if(err){
        return done(err);
      }

      users = _.map(users, function(user){
        return {email: user.email, id: user.id};
      });

      users = _.uniq(users, 'email');

      done(null, users);
    });
  }

  function cmd_update(args, done) {
    var seneca = this;
    var user = args.user;

    var userEntity = seneca.make(ENTITY_NS);

    userEntity.save$(user, done);
  }

  function cmd_oauth_authorize(args, done) {
    var seneca = this;
    var user = args.user;
    console.log('calling authorize');
    oauth.authCodeGrant(function(args, done){
      console.log('in authCodeGrant()')
      done(null, true)
    })



    done(null, "nonce")
  }

  function cmd_oauth_token(args, done){
    var seneca = this;
    var user = args.user;

    console.log('calling token')

    done(null, 'nonce')
  }

  function cmd_oauth_userprofile(args, done){
    var seneca = this;
    var user = args.user;

    console.log('calling userprofile')

    done(null, 'nonce')
  }

  return {
    name: plugin
  };
};
