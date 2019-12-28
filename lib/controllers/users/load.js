/**
 * This is the act you should call when the result is exposed to the front-end
 */

var _ = require('lodash');
/**
 * Load a sys_user without any sensitive data
 * @param  {String}   id  user Id
 */
function cmd_load (args, done) {
  var seneca = this;
  var ENTITY_NS = 'sys/user';
  var sensitiveData = ['lmsId', 'pass', 'salt', 'profilePassword'];
  seneca.make(ENTITY_NS).load$(args.id, function (err, user) {
    return done(err, _.omit(user, sensitiveData));
  });
}

module.exports = cmd_load;
