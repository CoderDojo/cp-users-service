'use strict';

require('newrelic');
var _ =require('lodash');

var config = require('./config/config.js')();
var ESOptions = require('./es-options.js');

var seneca = require('seneca')();

seneca.log.info('using config', JSON.stringify(config, null, 4));

seneca.options(config);

seneca.use('postgresql-store', config["postgresql-store"]);
seneca.use('elasticsearch', _.defaults(config["elasticsearch"], ESOptions));
seneca.use(require('./es.js'));
seneca.use('mail', config['mail']);
seneca.use(require('./email-notifications.js'));
seneca.use(require('./agreements.js'));
seneca.use(require('./profiles.js'), {postgresql: config["postgresql-store"]});
seneca.use(require('./oauth2.js'), config.oauth2);
seneca.use('user');
seneca.use('auth');
seneca.use(require('./users.js'), {'email-notifications': config['email-notifications']});

seneca.listen()
  .client({type: 'web', host: process.env.DOCKER_HOST_IP || process.env.TARGETIP || '127.0.0.1', port: 10304, pin: 'role:cd-salesforce,cmd:*'})
  .client({type: 'web', host: process.env.DOCKER_HOST_IP || process.env.TARGETIP || '127.0.0.1', port: 10301, pin: 'role:cd-dojos,cmd:*'});
