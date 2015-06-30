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

  // Note: currently got from the config, this may be moved to the database in the near future..
  function _verifyClientId(clientId, cb) {
    setImmediate(function() {
      if (!options.clients[clientId]) return cb('Invalid client_id: ' + clientId);
      return cb();
    });
  };

  function _getAccessCodeForUser(user, cb) {

  };

  function cmd_authorize(args, done) {
    console.log("AUTHORIZE", args, args.user);

    if (args.response_type !== 'code') {
      return done(null, {error: 'Only authorization code auth supported!'});
    }

    _verifyClientId(args.client_id, function(err) {
      if (err) return done(null, {error: err});

      // TODO - need a redirect here on login also..
      if (!args.user) {
        return done(null, {
          http$:{
            redirect: '/login'
          }
        });
      }

      _getAccessCodeForUser(args.user.id, function(err, code) {
        if (err) return done(err);

        done(null, {
          http$:{
            redirect: args['redirect_uri'] + '?code=' + args.user.id
          }
        });
      });
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
