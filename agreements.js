'use strict';

var async = require('async');

module.exports = function (options) {
  var seneca = this;
  var plugin = 'cd-agreements';
  var ENTITY_NS = 'cd/agreements';

  seneca.add({role: plugin, cmd: 'save'}, cmd_save);
  seneca.add({role: plugin, cmd: 'count'}, cmd_count);
  seneca.add({role: plugin, cmd: 'list'}, cmd_list);
  seneca.add({role: plugin, cmd: 'getVersion'}, cmd_get_version);
  seneca.add({role: plugin, cmd: 'loadUserAgreement'}, cmd_load_user_agreement);

  function cmd_get_version (args, done) {
    var version = 2;
    return done(null, {version: version});
  }

  function cmd_save (args, done) {
    var agreementEntity = seneca.make$(ENTITY_NS);
    var agreement = args.agreement;
    agreement.timestamp = new Date();
    var user = args.user;
    agreement.userId = user.id;
    async.waterfall([
      getCurrentVersion,
      loadCurrentAgreementsForUser,
      saveAgreement
    ], done);
    function getCurrentVersion (wCb) {
      seneca.act({role: plugin, cmd: 'getVersion'}, function (err, response) {
        if (err) return done(err);
        agreement.agreementVersion = response.version;
        wCb(null, response.version);
      });
    }
    function loadCurrentAgreementsForUser (version, wCb) {
      agreementEntity.load$({userId: agreement.userId, agreementVersion: version},
      function (err, response) {
        if (err) return done(err);
        return wCb(null, response);
      });
    }
    function saveAgreement (response, wCb) {
      if (!response || !response.id) {
        agreementEntity.save$(agreement, wCb);
      } else {
        if (response && response.id) return wCb(null, {msg: 'Charter already signed.'});
      }
    }
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

  function cmd_list (args, done) {
    var query = args.query;
    seneca.make(ENTITY_NS).list$(query, done);
  }

  function cmd_load_user_agreement (args, done) {
    var seneca = this;

    seneca.make(ENTITY_NS).load$({userId: args.userId, agreementVersion: args.version}, done);
  }

  return {
    name: plugin
  };
};
