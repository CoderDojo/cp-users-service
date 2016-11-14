'use strict';
var path = require('path');

var generator = require('xoauth2').createXOAuth2Generator({
  user: process.env.GMAIL_USER,
  clientId: process.env.GMAIL_CLIENT_ID,
  clientSecret: process.env.GMAIL_CLIENT_SECRET,
  refreshToken: process.env.GMAIL_REFRESH_TOKEN
});

module.exports = function (options) {
  function pgConfig () {
    return {
      name: process.env.POSTGRES_NAME,
      host: process.env.POSTGRES_HOST || '127.0.0.1',
      port: process.env.POSTGRES_PORT || 5432,
      username: process.env.POSTGRES_USERNAME,
      password: process.env.POSTGRES_PASSWORD
    };
  }

  function cdfAdmins () {
    var admins = process.env.CDF_ADMINS || '';
    return admins.split(',');
  }

  return {
    'postgresql-store': pgConfig(),
    'email-notifications': {
      sendemail: true,
      sendFrom: 'The CoderDojo Team <info@coderdojo.org>'
    },
    mailtrap: {
      folder: path.resolve(__dirname + '/../email-templates'),
      mail: {
        from: 'no-reply@coderdojo.com'
      },
      config: {
        host: process.env.MAIL_HOST,
        port: process.env.MAIL_PORT,
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS
        }
      }
    },
    gmail: {
      folder: path.resolve(__dirname + '/../email-templates'),
      config: {
        service: 'gmail',
        auth: {
          xoauth2: generator
        }
      }
    },
    'recaptcha_secret_key': process.env.RECAPTCHA_SECRET_KEY || '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe',
    transport: {
      type: 'web',
      web: {
        timeout: 120000,
        port: options && options.port ? options.port : 10303
      }
    },
    oauth2: {
      clients: {
        coderdojoadultforums: { code: process.env.CODERDOJO_ADULT_FORUMS_SECRET || 'ilikecode',
          baseUrl: process.env.ADULT_FORUM + '/auth/CoderDojo/callback'},
        coderdojoyouthforums: { code: process.env.CODERDOJO_YOUTH_FORUMS_SECRET || 'ilikecode',
        baseUrl: process.env.YOUTH_FORUM + '/auth/CoderDojo/callback'}
      }
    },
    nodebb: {
      host: process.env.NODEBB_HOST,
      port: process.env.NODEBB_PORT,
      apiToken: process.env.NODEBB_TOKEN
    },
    timeout: 120000,
    strict: {add: false, result: false},
    users: {
      cdfAdmins: cdfAdmins()
    },
    actcache: {active: false}
  };
};
