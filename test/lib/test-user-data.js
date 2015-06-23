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

    var register = function(profile, done){
      seneca.act({role: 'cd-users', cmd: 'register'}, profile, done);
    };

    var registerusers = function (done) {
      async.eachSeries(users, register, done);
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

