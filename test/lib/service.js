'use strict';

var async = require('async');
var config = require('../../config/config.js')({port: 11303});
var seneca = require('seneca')(config);
seneca.use(require('./insert-test-users'));
var service = 'cp-users-test';
var dgram = require('dgram');

seneca.ready(function() {
  var message = new Buffer(service);
  var client = dgram.createSocket('udp4');
  client.send(message, 0, message.length, 11404, 'localhost', function (err, bytes) {
    client.close();
  });
  seneca.add({role: service, cmd: 'suicide'}, function (err, cb) {
    seneca.close(function (err) {
      process.exit(err ? 1: 0);
    });
    cb();
  });
});

require('../../network.js')(seneca);
// Add "its" µs as a dependency
seneca.client({type: 'web', host: process.env.CD_USERS || 'localhost', port: 10303, pin: {role: 'cd-profiles', cmd: '*'}})
.client({type: 'web', host: process.env.CD_USERS || 'localhost', port: 10303, pin: {role: 'cd-agreements', cmd: '*'}})
.client({ type: 'web', host: process.env.CD_USERS || 'localhost', port: 10303, pin: {role: 'user', cmd: '*'}})
.client({type: 'web', host: process.env.CD_USERS || 'localhost', port: 10303, pin: {role: 'cd-users', cmd: '*'}})
