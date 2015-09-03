'use strict';

module.exports = function(options) {
  var seneca = this;
  var plugin = 'cd-nodebb-api';
 
  seneca.add({role: plugin, cmd: 'update'}, cmd_update);

  function cmd_update(args, done) {
    done(null, {});
  }

  return {
    name: plugin
  };
};