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
      var emailCode = args.code + args.locality;
      if (!fs.existsSync(path.join(__dirname, '/email-templates/', emailCode))) emailCode = args.code + 'en_US';
      seneca.act({
        role: 'mail', cmd: 'send',
        from: options.sendFrom,
        code: emailCode,
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