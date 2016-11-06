'use strict';
var _ = require('lodash');

/**
 * @param  {Object}   user
 */
function joinRequests (seneca, role) {
  var joinRequests = {};
  var entity = seneca.make$('cd/join_requests');

  joinRequests.list = function (args, done) {
    var query = args.query;
    entity.list$(query, done);
  };

  _.each(_.keys(joinRequests), function (cmd) {
    seneca.add({role: role, domain: 'join_requests', cmd: cmd}, joinRequests[cmd]);
  });

  return joinRequests;
}

module.exports = joinRequests;
