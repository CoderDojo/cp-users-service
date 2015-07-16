'use strict';
var path = require('path');

module.exports = function() {

  // Utility function for local development running with boot2docker
  // where we need the ip address of boot2docker instead of localhost.
  // This is for accessing containerised services.
  function localhost() {
    if (process.env.DOCKER_HOST) {
      return require('url').parse(process.env.DOCKER_HOST).hostname;
    }
    if (process.env.TARGETIP) {
      return process.env.TARGETIP;
    }
    return '127.0.0.1';
  }

  function pgConfig() {
    return {
      name: process.env.POSTGRES_NAME,
      host: process.env.POSTGRES_HOST || localhost(),
      port: process.env.POSTGRES_PORT || 5432,
      username: process.env.POSTGRES_USERNAME,
      password: process.env.POSTGRES_PASSWORD
    }
  }

  function esConfig() {
    return {
      connection: {
        host : (process.env.ES_HOST || localhost()) + ':9200',
        index: process.env.ES_INDEX,
        sniffOnStart: false,
        sniffInterval: false
      }
    };
  }

  return {
    'postgresql-store': pgConfig(),
    elasticsearch: esConfig(),
    'email-notifications': {
      sendemail:true,
      email: {
        'invite-parent-guardian':{
          subject:'test'
        }
      }
    },
    auth: {
      sendemail: true,
      email: {
        code: {
          register: 'auth-register',
          create_reset: 'auth-create-reset'
        },
        subject: {
          register: 'Welcome to CoderDojo!',
          create_reset: 'CoderDojo Password Reset'
        },
        content: {
          resetlinkprefix: 'http://127.0.0.1:8000/reset_password',
          confirmlinkprefix: 'http://127.0.0.1:8000/confirm'
        }
      }
    },
    mail: {
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
        // service: 'Gmail',
        // auth: {
        //   user: 'youremail@example.com',
        //   pass: 'yourpass'
        // }
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
    }
  };
}
