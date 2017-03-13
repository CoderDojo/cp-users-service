'use strict';
var _ = require('lodash');

/**
 * @param  {Object}   user
 * @example "curl 'http://localhost:10303/act'  -H 'Content-Type: application/json' --data-binary '{"role":"cd-users", "domain": "join_requests", "cmd": "search", "query": {"userType":"champion"} }'
 */
function joinRequests (seneca, role) {
  var joinRequests = {};
  var entity = seneca.make$('cd/v_join_requests');

  joinRequests.search = function (args, done) {
    var query = args.query;
    entity.list$(query, done);
  };

  _.each(_.keys(joinRequests), function (cmd) {
    seneca.add({role: role, domain: 'join_requests', cmd: cmd}, joinRequests[cmd]);
  });

  return joinRequests;
}

module.exports = joinRequests;
