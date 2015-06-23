'use strict';
var _ = require('lodash');

var config = require('../config/config.js')();
var ESOptions = require('../es-options.js');

var seneca = require('seneca')();

var argv = require('optimist')
  .boolean('d')
  .alias('d', 'withcleanup')
  .argv;

seneca.log.info('using config', JSON.stringify(config, null, 4));
seneca.options(config);

seneca.use('postgresql-store');
seneca.use('elasticsearch', _.defaults(config["elasticsearch"], ESOptions));

seneca
  .use('user')
  .use('../profiles.js')
  .use('../users.js')
  .use(require('../test/lib/test-user-data.js'));

seneca.ready(function() {

  function docleanup(done) {
    if (argv.withcleanup) {
      seneca.act({ role: 'test-user-data', cmd: 'clean', timeout: false }, done);
    }
    else {
      setImmediate(done);
    }
  }

  docleanup(function(err) {
    seneca.act({ role: 'test-user-data', cmd: 'insert', timeout: false }, function (err) {
      if (err) {
        console.log('insert test-user-data failed:', err);
      }
      else {
        console.log('test-user-data inserted successfully');
      }

      seneca.close(function(){
        process.exit();
      });
    });
  });
});
