'use strict';

module.exports = function (options) {
  var seneca = this;
  var plugin = 'cd-user-profile';
  var ENTITY_NS = 'cd_user_profile';

  seneca.add({role: plugin, cmd: 'load'}, cmd_load);
  seneca.add({role: plugin, cmd: 'list'}, cmd_list);

  function cmd_load (args, done) {
    var seneca = this;
    var id = args.id;
    seneca.make(ENTITY_NS).load$(id, done);
  }

  function cmd_list (args, done) {
    var seneca = this;
    var query = {};
    if (args.ids) {
      query.ids = args.ids;
    } else if (args.query) {
      query = args.query;
    }
    seneca.make(ENTITY_NS).list$(query, done);
  }
};
