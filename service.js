'use strict';
process.setMaxListeners(0);
require('events').EventEmitter.prototype._maxListeners = 100;

if (process.env.NEW_RELIC_ENABLED === 'true') require('newrelic');

var config = require('./config/config.js')();
var seneca = require('seneca')(config);
var store = require('seneca-postgresql-store');
var log = require('cp-logs-lib')({name: 'cp-users-service', level: 'warn'});
config.log = log.log;
var util = require('util');

seneca.log.info('using config', JSON.stringify(config, null, 4));

seneca.options(config);

seneca.use(store, config['postgresql-store']);
if (process.env.MAILTRAP_ENABLED === 'true') {
  seneca.use('mail', config.mailtrap);
} else {
  seneca.use('mail', config.gmail);
}

require('./migrate-psql-db.js')(function (err) {
  if (err) {
    console.error(err);
    process.exit(-1);
  }
  console.log('Migrations ok');

  seneca.use(require('./email-notifications.js'));
  seneca.use(require('./agreements.js'));
  seneca.use(require('./profiles.js'),
            { postgresql: config['postgresql-store'],
              logger: log.logger
            });
  seneca.use(require('./oauth2.js'), {clients: config.oauth2.clients});
  seneca.use('user');
  seneca.use('auth');
  seneca.use(require('./users.js'),
            { 'email-notifications': config['email-notifications'],
              'postgresql': config['postgresql-store'],
              'users': config['users'],
              'logger': log.logger
            });
  seneca.use(require('./user-profile.js'),
            { postgresql: config['postgresql-store'],
              logger: log.logger
            });
  seneca.use(require('./nodebb-api.js'), config.nodebb);
  seneca.use(require('cp-permissions-plugin'), {
    config: __dirname + '/config/permissions'
  });

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('uncaughtException', shutdown);

  function shutdown (err) {
    if (err !== void 0 && err.stack !== void 0) {
      console.error(new Date().toString() + ' FATAL: UncaughtException, please report: ' + util.inspect(err));
      console.error(util.inspect(err.stack));
      console.trace();
    }
    process.exit(0);
  }

  seneca.listen()
  .client({ type: 'web', port: 10304, pin: { role: 'cd-salesforce', cmd: '*' } })
  .client({ type: 'web', port: 10301, pin: 'role:cd-dojos,cmd:*' })
  .client({ type: 'web', port: 10305, pin: {role: 'cd-badges', cmd: '*'} });
});
