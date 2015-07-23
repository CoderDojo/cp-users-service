'use strict';

var _ = require('lodash');
var async = require('async');

module.exports = function (options) {
  var seneca = this;
  var plugin = 'test-user-data';
  var users = [
    { nick: 'admin@example.com', name: 'Admin', email: 'admin@example.com', password: 'test', roles: ['cdf-admin'], initUserType: { name: 'champion'}},
    { nick: 'manager@example.com', name: 'Manager', email: 'manager@example.com', password: 'test', roles: ['cdf-admin'], initUserType: {name:  'champion'}}
  ];

  seneca.add({ role: plugin, cmd: 'insert' }, function (args, done) {

    var userpin = seneca.pin({ role: 'user', cmd: '*' });

    var registerusers = function (done) {
      async.eachSeries(users, function(user, cb){
        userpin.register(user, function(err, response){
          if (err) return done(err);
          if (response.ok === false) {
            console.error('instert failed: ', response);
            return cb(null, response);
          }

          var profileData = {
            userId:   response.user.id,
            email:    response.user.email,
            userType: response.user.initUserType.name
          };
          seneca.act({role:'cd-profiles', cmd:'save', profile: profileData}, cb);
        });
      }, done);
    };

    async.series([
      registerusers
    ], done);

  });

  seneca.add({ role: plugin, cmd: 'clean' }, function (args, done) {
    var userpin = seneca.pin({ role: 'user', cmd: '*' });

    var deleteusers = function (done) {
      async.eachSeries(users, userpin.delete, done);
    };

    async.series([
      deleteusers
    ], done);
  });

  return {
    name: plugin
  };
};
