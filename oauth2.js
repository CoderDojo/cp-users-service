'use strict';

var _ = require('lodash');
var async = require('async');
var cuid = require('cuid');

module.exports = function(options){
  var seneca = this;
  var plugin = 'cd-oauth2';
  var OAUTH2_ENTITY = 'cd/oauth2';

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
    seneca.make$(OAUTH2_ENTITY).list$({userid: user.id}, function(err, auths){
      if (err) return cb(err);
      if (auths.length > 0) return cb(null, auths[0].code);

      var code = cuid();
      var ucEnt = seneca.make$(OAUTH2_ENTITY);
      ucEnt.userid = user.id;
      ucEnt.code = code;
      ucEnt.token = cuid();
      ucEnt.created = new Date();
      ucEnt.save$(function(err) {
        if (err) return cb(err);
        return cb(null, code);
      });
    });
  };

  function _getAccessTokenForAccessCode(code, cb) {
    seneca.make$(OAUTH2_ENTITY).list$({code:code}, function(err, auths){
      if (err) return cb(err);
      if (auths.length === 0) return cb('No token found for code: ' + code);
      return cb(null, auths[0].token);
    });
  };

  function _getUserForAccessToken(token, cb) {

    async.waterfall([
      getToken,
      getUser,
      checkPermissions
    ], cb);

    function getToken(done) {
      seneca.make$(OAUTH2_ENTITY).list$({token:token}, function(err, auths){
        if (err) return done(err);
        if (auths.length === 0) return done('No user found for token: ' + token);
        return done(null, auths);
      });
    }

    function getUser(auths, done) {
      seneca.act({role: 'cd-users', cmd:'load', id: auths[0].userid}, done);
    }

    function checkPermissions(user, done) {
      seneca.act({role: 'cd-profiles', cmd: 'list', query:{userId: user.id}}, function (err, profiles) {
        if(err) return done(err);
        var userProfile = profiles[0];
        user.profileId = userProfile.id;
        if(userProfile.userType === 'champion') user.isChampion = true;
        if(userProfile.userType === 'attendee-o13') user.isYouthOver13 = true;
        if(userProfile.userType === 'mentor') user.isMentor = true;

        seneca.act({role: 'cd-dojos', cmd: 'load_usersdojos', query:{userId: user.id}}, function (err, usersDojos) {
          if(err) return done(err);
          var championTypeFound = _.find(usersDojos, function (userDojo) {
            return _.contains(userDojo.userTypes, 'champion');
          });
          var youthOver13TypeFound = _.find(usersDojos, function (userDojo) {
            return _.contains(userDojo.userTypes, 'attendee-o13');
          });
          var mentorTypeFound = _.find(usersDojos, function (userDojo) {
            return _.contains(userDojo.userTypes, 'mentor');
          });
          if(championTypeFound) user.isChampion = true;
          if(youthOver13TypeFound) user.isYouthOver13 = true;
          if(mentorTypeFound) user.isMentor = true;
          return done(null, user);
        });

      });
    }
    
  };

  function cmd_authorize(args, done) {
    if (args.response_type !== 'code') {
      return done(null, {error: 'Only authorization code auth supported!'});
    }

    _verifyClientId(args.client_id, function(err) {
      if (err) return done(null, {error: err});

      if (!args.user) {
        return done(null, {
          http$:{
            redirect: '/login?redirect=' + args['redirect_uri']
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
        email: user.email,
        isAdmin: _.contains(user.roles, 'cdf-admin'),
        isChampion: user.isChampion,
        isYouthOver13: user.isYouthOver13,
        isMentor: user.isMentor,
        profileId: user.profileId
      };
      return done(null, profile);
    });
  };

  return {
    name: plugin
  };

};
