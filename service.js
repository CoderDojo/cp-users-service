'use strict';
process.setMaxListeners(0);
require('events').EventEmitter.prototype._maxListeners = 100;

const newrelic = process.env.NEW_RELIC_ENABLED === 'true' ? require('newrelic') : undefined;
const senecaNR = require('seneca-newrelic');
var config = require('./config/config.js')();
var seneca = require('seneca')(config);
var _ = require('lodash');
var store = require('seneca-postgresql-store');
var storeQuery = require('seneca-store-query');
var service = 'cp-users-service';
var log = require('cp-logs-lib')({name: service, level: 'warn'});
config.log = log.log;
var util = require('util');
var dgram = require('dgram');

if (process.env.NODE_ENV !== 'production') {
  seneca.log.info('using config', JSON.stringify(config, null, 4));
}

seneca.options(config);
seneca.decorate('customValidatorLogFormatter', require('./lib/custom-validator-log-formatter'));
seneca.use(store, config['postgresql-store']);
seneca.use(storeQuery);
if (process.env.MAILTRAP_ENABLED === 'true') {
  seneca.use('mail', config.mailtrap);
} else {
  seneca.use('mail', config.email);
}

if (!_.isUndefined(newrelic)) {
  seneca.use(senecaNR, {
    newrelic,
    roles: ['cd-users'],
    filter (p) {
      p.user = p.user ? p.user.id : undefined;
      p.login = p.login ? p.login.id : undefined;
      return p;
    }
  });
}

function shutdown (err) {
  if (err !== undefined) {
    var error = {
      date: new Date().toString(),
      msg: err.stack !== undefined
        ? 'FATAL: UncaughtException, please report: ' + util.inspect(err.stack)
        : 'FATAL: UncaughtException, no stack trace',
      err: util.inspect(err)
    };
    console.error(JSON.stringify(error));
    process.exit(1);
  }
  process.exit(0);
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
  process.on('SIGUSR2', shutdown);

  require('./network.js')(seneca);

  seneca.ready(function (err) {
    if (err) return shutdown(err);
    var message = new Buffer(service);
    var client = dgram.createSocket('udp4');
    client.send(message, 0, message.length, 11404, 'localhost', function (err, bytes) {
      if (err) return shutdown(err);
      client.close();
    });

    var escape = require('seneca-standard-query/lib/relational-util').escapeStr;
    ['load', 'list'].forEach(function (cmd) {
      seneca.wrap('role: entity, cmd: ' + cmd, function filterFields (args, cb) {
        try {
          ['limit$', 'skip$'].forEach(function (field) {
            if (args.q[field] && args.q[field] !== 'NULL' && !/^[0-9]+$/g.test(args.q[field] + '')) {
              throw new Error('Expect limit$, skip$ to be a number');
            }
          });
          if (args.q.sort$) {
            if (args.q.sort$ && typeof args.q.sort$ === 'object') {
              var order = args.q.sort$;
              _.each(order, function (ascdesc, column) {
                if (!/^[a-zA-Z0-9_]+$/g.test(column)) {
                  throw new Error('Unexpect characters in sort$');
                }
              });
            } else {
              throw new Error('Expect sort$ to be an object');
            }
          }
          if (args.q.fields$) {
            args.q.fields$.forEach(function (field, index) {
              args.q.fields$[index] = '\"' + escape(field) + '\"';
            });
          }
          this.prior(args, cb);
        } catch (err) {
          // cb to avoid seneca-transport to hang while waiting for timeout error
          return cb(err);
        }
      });
    });
  });
});
