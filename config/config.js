'use strict';
var path = require('path');
var assert = require('assert');
var LogEntries = require('le_node');
var generator = require('xoauth2').createXOAuth2Generator({
  user: process.env.GMAIL_USER,
  clientId: process.env.GMAIL_CLIENT_ID,
  clientSecret: process.env.GMAIL_CLIENT_SECRET,
  refreshToken: process.env.GMAIL_REFRESH_TOKEN
});

module.exports = function() {
  function log () {
    // seneca custom log handlers
    function debugHandler() {
      if (process.env.LOGENTRIES_ENABLED === 'true') {
        assert.ok(process.env.LOGENTRIES_DEBUG_TOKEN, 'No LOGENTRIES_DEBUG_TOKEN set');
        var le = new LogEntries({
          token: process.env.LOGENTRIES_DEBUG_TOKEN,
          flatten: true,
          flattenArrays: true
        });

        le.log('debug', arguments);
      }
    }

    function errorHandler() {
      console.error(JSON.stringify(arguments));

      if (process.env.LOGENTRIES_ENABLED === 'true') {
        assert.ok(process.env.LOGENTRIES_ERRORS_TOKEN, 'No LOGENTRIES_ERROR_TOKEN set');
        var le = new LogEntries({
          token: process.env.LOGENTRIES_ERRORS_TOKEN,
          flatten: true,
          flattenArrays: true
        });

        le.log('err', arguments);
      }
    }

    return {
      map:[{
        level:'debug', handler: debugHandler
      }, {
        level:'error', handler: errorHandler
      }]
    };
  };

  function pgConfig() {
    return {
      name: process.env.POSTGRES_NAME,
      host: process.env.POSTGRES_HOST || '127.0.0.1',
      port: process.env.POSTGRES_PORT || 5432,
      username: process.env.POSTGRES_USERNAME,
      password: process.env.POSTGRES_PASSWORD
    }
  }

  return {
    'postgresql-store': pgConfig(),
    'email-notifications': {
      sendemail:true,
      email: {
      }
    },
    mailtrap: {
      folder: path.resolve(__dirname + '/../email-templates'),
      mail: {
        from:'no-reply@coderdojo.com'
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
    'recaptcha_secret_key': process.env.RECAPTCHA_SECRET_KEY,
    transport: {
      type: 'web',
      web: {
        host: '0.0.0.0',
        port: 10303
      }
    },
    oauth2: {
      clients: {
        coderdojoadultforums: process.env.CODERDOJO_FORUMS_SECRET || 'ilikecode'
      }
    },
    nodebb: {
      host: process.env.NODEBB_HOST,
      port: process.env.NODEBB_PORT,
      apiToken: process.env.NODEBB_TOKEN
    },
    timeout: 120000,
    strict: {add:false,  result:false},
    log: log()
  };
}
