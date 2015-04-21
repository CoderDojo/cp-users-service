'use strict';

var config = require('config');

var seneca = require('seneca')();

seneca.log.info('using config', JSON.stringify(config, null, 4));

seneca.options(config);

seneca
  .use('postgresql-store', config["postgresql-store"])
  .use('./agreements.js')
  .use('./users.js')
  .listen();
