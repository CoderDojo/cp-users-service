'use strict';

var async = require('async');

module.exports = function(options){
  var seneca = this;
  var plugin = 'cd-agreements';
  var ENTITY_NS = 'cd/agreements';

  seneca.add({role: plugin, cmd: 'get_agreements'}, cmd_get_agreements);
  seneca.add({role: plugin, cmd: 'count'}, cmd_count);

  function cmd_get_agreements(args, done){
    var seneca = this, usersIds = [], agreements_ent;

    usersIds = args.usersIds;
    
    if(!usersIds || !usersIds.length > 0){
      done("An error occurred");
    }

    agreements_ent =  seneca.make(ENTITY_NS);
    
    function get_agreement(id, cb){
      var agreements_ent =  seneca.make(ENTITY_NS);

      agreements_ent.list$({userId: id}, function(err, agreement){
        if(err){
          return cb(err);
        }

        return cb(null, agreement[0]);
      });
    }

    async.mapSeries(usersIds, get_agreement, function(err, results){
      if(err){
        return done(err);
      }

      return done(null, results);
    });

  }

  function cmd_count(args, done){
    var seneca = this, query = {};

    query = args.query ? args.query : {};
    query.limit$ = query.limit$ ? query.limit$ : 'NULL';

    seneca.make(ENTITY_NS).list$(query, function(err, agreements){
      if(err){
        return done(err);
      }

      var noOfAgreements = agreements.length;

      done(null, {noOfAgreements: noOfAgreements});
    });
  }

  return {
    name: plugin
  };
};