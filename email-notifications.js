'use strict';

module.exports = function( options ) {
  var seneca = this;
  var plugin = 'email-notifications';
  var fs = require('fs');
  var path = require('path');
  var so = seneca.options();

  options = seneca.util.deepextend({
  }, so[plugin], options);


  seneca.add({ role:plugin, cmd:'send' }, send_notification);

  function send_notification(args, done) {
    if (options.sendemail && options.email) {
      var email = options.email[args.code];
      if (!fs.existsSync(path.join(__dirname, '/email-templates/', args.code))) {
        args.code = args.code.substring(0, args.code.length-5) + 'en_US';
      }
      seneca.act({
        role: 'mail', cmd: 'send',
        code: args.code,
        to: args.to,
        subject: args.subject,
        content: args.content
      }, done);
    }
    else {
      done();
    }
  }

  return {
    name: plugin
  };
};