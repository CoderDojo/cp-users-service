'use strict';

var fs = require('fs');
var CpTranslations = require('cp-translations');
var I18NHelper = require('cp-i18n-lib');
var i18nHelper = new I18NHelper({
  poFilePath: CpTranslations.getPoFilePath(),
  poFileName: 'messages.po',
  domain: 'coder-dojo-platform'
});

module.exports = function (options) {
  var seneca = this;
  var plugin = 'email-notifications';

  var so = seneca.options();

  options = seneca.util.deepextend({}, so[plugin], options);

  seneca.add({role: plugin, cmd: 'send'}, send_notification);

  function send_notification (args, done) {
    var subject = args.subject;
    var subjectVariables = args.subjectVariables || [];
    var subjectTranslation;
    if (options.sendemail) {
      var emailCode = args.code + args.locality;
      if (!fs.existsSync(CpTranslations.getEmailTemplatePath(emailCode))) emailCode = args.code + 'en_US';
      if (!args.to) return done(null, {ok: false, why: 'No recipient set.'});

      subjectTranslation = i18nHelper.getClosestTranslation(args.locality, subject);
      if (subjectTranslation === null) {
        return done(null, {ok: false, why: 'Invalid email subject.'});
      }

      seneca.act({
        role: 'mail', cmd: 'send',
        from: options.sendFrom,
        code: emailCode,
        to: args.to,
        subject: subjectTranslation.fetch(subjectVariables),
        content: args.content
      }, done);
    } else {
      done();
    }
  }

  return {
    name: plugin
  };
};
