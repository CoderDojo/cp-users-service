'use strict';

var _ = require('lodash');
var async = require('async');
var cuid = require('cuid');

module.exports = function (options) {
  var seneca = this;
  var plugin = 'cd-oauth2';
  var OAUTH2_ENTITY = 'cd/oauth2';

  seneca.add({role: plugin, cmd: 'authorize'}, cmd_authorize);
  seneca.add({role: plugin, cmd: 'token'}, cmd_token);
  seneca.add({role: plugin, cmd: 'profile'}, cmd_profile);

  // NOTE: currently got from the config, this may be moved to the database in the near future..
  function _verifyClientId (clientId, cb) {
    if (!options.clients[clientId]) return cb('Invalid client_id: ' + clientId);
    return cb();
  }

  function _verifyCallbackUrl (callback, cb) {
    var allowed = _.map(options.clients, 'baseUrl');
    var valid = _.some(allowed, function (url) {
      //  We can't use _.includes as it match for partials which is insecure
      return _.isEqual(url, callback);
    });
    if (!valid) return cb('Invalid callback_url: ' + callback);
    return cb();
  }

  function _getAccessCodeForUser (user, cb) {
    //  NOTE : maybe use load for security sake ??????!!
    seneca.make$(OAUTH2_ENTITY).list$({userid: user.id}, function (err, auths) {
      if (err) return cb(err);
      if (auths.length > 0) return cb(null, auths[0].code);

      var code = cuid();
      var ucEnt = seneca.make$(OAUTH2_ENTITY);
      ucEnt.userid = user.id;
      ucEnt.code = code;
      ucEnt.token = cuid();
      ucEnt.created = new Date();
      ucEnt.save$(function (err) {
        if (err) return cb(err);
        return cb(null, code);
      });
    });
  }

  function _getAccessTokenForAccessCode (code, cb) {
    seneca.make$(OAUTH2_ENTITY).list$({code: code}, function (err, auths) {
      if (err) return cb(err);
      if (auths.length === 0) return cb('No token found for code: ' + code);
      return cb(null, auths[0].token);
    });
  }

  function _getUserForAccessToken (token, cb) {
    async.waterfall([
      getToken,
      getUser,
      checkPermissions
    ], cb);

    function getToken (done) {
      seneca.make$(OAUTH2_ENTITY).list$({token: token}, function (err, auths) {
        if (err) return done(err);
        if (auths.length === 0) return done('No user found for token: ' + token);
        return done(null, auths);
      });
    }

    function getUser (auths, done) {
      //  Why.
      var userEntity = seneca.make('sys/user');
      userEntity.load$(auths[0].userid, done);
    }

    function checkPermissions (user, done) {
      seneca.act({role: 'cd-profiles', cmd: 'load_user_profile', userId: user.id}, function (err, userProfile) {
        if (err) return done(err);
        user.profileId = userProfile.id;
        if (userProfile.userType === 'champion') user.isChampion = true;
        if (userProfile.userType === 'attendee-o13') user.isYouthOver13 = true;
        if (userProfile.userType === 'mentor') user.isMentor = true;
        if (userProfile.userType === 'parent-guardian') user.isAdult = true;
        if (userProfile.children && userProfile.children.length > 0) user.isParent = true;

        seneca.act({role: 'cd-dojos', cmd: 'load_usersdojos', query: {userId: user.id}}, function (err, usersDojos) {
          if (err) return done(err);
          var championTypeFound = _.find(usersDojos, function (userDojo) {
            return _.includes(userDojo.userTypes, 'champion');
          });
          var youthOver13TypeFound = _.find(usersDojos, function (userDojo) {
            return _.includes(userDojo.userTypes, 'attendee-o13');
          });
          var mentorTypeFound = _.find(usersDojos, function (userDojo) {
            return _.includes(userDojo.userTypes, 'mentor');
          });
          var verifyFound = _.some(usersDojos, 'backgroundChecked');
          if (championTypeFound) user.isChampion = true;
          if (youthOver13TypeFound) user.isYouthOver13 = true;
          if (mentorTypeFound) user.isMentor = true;
          if (verifyFound) user.isVerified = true;
          return done(null, user);
        });
      });
    }
  }

  function cmd_authorize (args, done) {
    if (args.response_type !== 'code') {
      return done(null, {error: 'Only authorization code auth supported!'});
    }
    async.waterfall([
      function (waterfallCb) {
        if (args.redirect_uri) {
          _verifyCallbackUrl(args.redirect_uri, function (err) {
            if (err) {
              return done(null, {
                error: err,
                http$: {
                  status: 403
                }
              });
            } else {
              waterfallCb();
            }
          });
        } else {
          return done(null, {error: 'Missing callback_url', http$: {status: 422}});
        }
      },
      function (waterfallCb) {
        _verifyClientId(args.client_id, function (err) {
          if (err) return done(null, {error: err});
          if (!args.user) {
            return done(null, {
              http$: {
                redirect: '/login?redirect=' + args.redirect_uri
              }
            });
          } else {
            waterfallCb();
          }
        });
      },
      function (waterfallCb) {
        _getAccessCodeForUser(args.user, function (err, code) {
          if (err) return done(null, {error: err, http$: {status: 500}});
          done(null, {
            http$: {
              redirect: args.redirect_uri + '?code=' + code
            }
          });
        });
      }
    ]);
  }

  function cmd_token (args, done) {
    //  TODO : check if code exists maybe ?
    _getAccessTokenForAccessCode(args.code, function (err, access_token) {
      if (err) return done(null, {error: err, http$: {status: 500}});
      var resp = {
        'access_token': access_token
      };
      return done(null, resp);
    });
  }

  function cmd_profile (args, done) {
    if (args.access_token) {
      _getUserForAccessToken(args.access_token, function (err, user) {
        if (err) return done(null, {error: err, http$: {status: 500}});
        var profile = {
          id: user.id,
          name: user.name,
          email: user.email,
          isAdmin: _.includes(user.roles, 'cdf-admin'),
          isChampion: user.isChampion,
          isYouthOver13: user.isYouthOver13,
          isMentor: user.isMentor,
          isParent: user.isParent,
          isAdult: user.isAdult,
          isVerified: user.isVerified,
          profileId: user.profileId
        };
        return done(null, profile);
      });
    } else {
      return done(null, {error: 'Please provide a token', http$: {status: 422}});
    }
  }

  return {
    name: plugin
  };
};
