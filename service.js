'use strict';

if (process.env.NEW_RELIC_ENABLED === 'true') require('newrelic');

var config = require('./config/config.js')();
var seneca = require('seneca')(config);
var store = require('seneca-postgresql-store');

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
  seneca.use(require('./profiles.js'), { postgresql: config['postgresql-store'] });
  seneca.use(require('./oauth2.js'), {clients: config.oauth2.clients});
  seneca.use('user');
  seneca.use('auth');
  seneca.use(require('./users.js'),
            { 'email-notifications': config['email-notifications'],
              'postgresql': config['postgresql-store'],
              'users': config['users']
            });
  seneca.use(require('./nodebb-api.js'), config.nodebb);

  seneca.listen()
  .client({ type: 'web', port: 10304, pin: { role: 'cd-salesforce', cmd: '*' } })
  .client({ type: 'web', port: 10301, pin: 'role:cd-dojos,cmd:*' });
});
