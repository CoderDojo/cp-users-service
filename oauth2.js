'use strict';

var _ = require('lodash');
var async = require('async');

module.exports = function(options){
  var seneca = this;
  var plugin = 'cd-oauth2';
  var ENTITY_NS = 'cd/oauth2';

  seneca.add({role: plugin, cmd: 'authorize'}, cmd_authorize);
  seneca.add({role: plugin, cmd: 'token'}, cmd_token);
  seneca.add({role: plugin, cmd: 'profile'}, cmd_profile);

  function cmd_authorize(args, done) {
    console.log("AUTHORIZE", args, args.user);
    return done(null, {
      http$:{
        redirect: args['redirect_uri'] + '?code=' + args.user.id
      }
    });
  };

  function cmd_token(args, done) {
    console.log("TOKEN - code", args.code);

    var resp = {
      'access_token': 'abcdefg',
      'refresh_token': 'zxcvb'
    };
    return done(null, resp);
  };

  function cmd_profile(args, done) {
    console.log("PROFILE", args);
    var profile = {
      id: '12345',
      name: 'foo',
      email: 'foo@example.com'
    };
    return done(null, profile);
  };

  return {
    name: plugin
  };

};
