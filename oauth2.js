'use strict';

var _ = require('lodash');
var async = require('async');
var cuid = require('cuid');

// TMP!!
var codes = {};
var tokens = {};

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
    if (codes[user.id]) return cb(null, codes[user.id]);

    var code = cuid();
    codes[code] = user;
    return cb(null, code);
  };

  function _getAccessTokenForAccessCode(code, cb) {
    var user = codes[code];
    if (!user) return cb('No access code found: ' + code);
    var token = code + '-' + user.id;
    tokens[token] = user;
    return cb(null, token);
  }

  function _getUserForAccessToken(token, cb) {
    var user = tokens[token];
    if (!user) return cb('No token found: ' + token);
    return cb(null, user);
  };

  function cmd_authorize(args, done) {
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

      _getAccessCodeForUser(args.user, function(err, code) {
        if (err) return done(null, {error: err, http$: {status: 500}});

        done(null, {
          http$:{
            redirect: args['redirect_uri'] + '?code=' + code
          }
        });
      });
    });
  };

  function cmd_token(args, done) {
    _getAccessTokenForAccessCode(args.code, function(err, access_token) {
      if (err) return done(null, {error: err, http$: {status: 500}});

      var resp = {
        'access_token': access_token,
      };
      return done(null, resp);
    });
  };

  function cmd_profile(args, done) {
    _getUserForAccessToken(args.access_token, function(err, user) {
      if (err) return done(null, {error: err, http$: {status: 500}});
      var profile = {
        id: user.id,
        name: user.name,
        email: user.email
      };
      return done(null, profile);
    });
  };

  return {
    name: plugin
  };

};
