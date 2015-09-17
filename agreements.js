'use strict';

var async = require('async');

module.exports = function (options) {
  var seneca = this;
  var plugin = 'cd-agreements';
  var ENTITY_NS = 'cd/agreements';

  seneca.add({role: plugin, cmd: 'save'}, cmd_save);
  seneca.add({role: plugin, cmd: 'list'}, cmd_list);
  seneca.add({role: plugin, cmd: 'count'}, cmd_count);
  seneca.add({role: plugin, cmd: 'load_user_agreement'}, cmd_load_user_agreement);

  function cmd_save (args, done) {
    var agreementEntity = seneca.make$(ENTITY_NS);
    var agreement = args.agreement;

    agreement.timestamp = new Date();

    agreementEntity.load$({userId: agreement.userId}, function(err, response) {
      if (err) return done(err);
      if (!response || !response.id) {
        agreementEntity.save$(agreement, done);
      } else {
        return done(null, {msg: 'Charter already signed.'});
      }
    });
  }

  function cmd_list (args, done) {
    var seneca = this;

    function get_user_agreements (userId, done) {
      seneca.make(ENTITY_NS).list$({userId: userId}, done);
    }

    async.mapSeries(args.userIds, function (userId, done) {
      async.waterfall([
        function (done) {
          get_user_agreements(userId, done);
        },
        function (agreements, done) {
          return done(null, {
            userId: userId,
            agreements: agreements
          });
        }
      ], done);
    }, done);
  }

  function cmd_count (args, done) {
    var seneca = this;

    var query = args.query ? args.query : {};
    query.limit$ = query.limit$ ? query.limit$ : 'NULL';

    seneca.make(ENTITY_NS).list$(query, function (err, agreements) {
      if (err) {
        return done(err);
      }

      var noOfAgreements = agreements.length;

      done(null, {noOfAgreements: noOfAgreements});
    });
  }

  function cmd_load_user_agreement (args, done) {
    var seneca = this;

    seneca.make(ENTITY_NS).load$({userId: args.id}, done);
  }

  return {
    name: plugin
  };
};
