'use strict';
var _ = require('lodash');

/**
 * @param {Object} user
 * @param {String} requestId
 * @example curl http://localhost:10303/act -H "Content-type: application/json" --data-binary '{"role": "cd-users", cmd":"can_accept_join_request", "params":{"requestId": "xxxx"}, "user": { "id": "xxxxx" }}'
 */
function canAcceptJoinRequest (args, cb) {
  var seneca = this;
  var plugin = args.role;
  var userId = args.user.id;
  var requestId = args.params.requestId; 
  var membershipRequest = null;
  if (_.isUndefined(requestId)) {
    requestId = args.params.id;
  }
  // Could check upon profile, but seems like an overkill to me
  seneca.act({ role: 'cd-users', domain: 'join_requests', cmd: 'search', query: { id: requestId } }, (err, res) => {
    if (err) return cb(null, { allowed: false }); // Force the authorisation to return falsy
    if (res.length === 1) {
      membershipRequest = res[0];
      seneca.act({ role: 'cd-dojos', cmd: 'have_permissions_on_dojo', params: { dojoId: membershipRequest.dojoId }, user: args.user, perm: 'dojo-admin' }, (err, res) => {
        if (err) return cb(null, { allowed: false }); 
        return cb(null, { allowed: res.allowed });
      });
    } else {
      // More than one result for a single id
      // That's not supposed to happen..
      return cb(null, { allowed: false });
    }
  });
}

module.exports = canAcceptJoinRequest;
