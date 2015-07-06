'use strict';

var _ = require('lodash');
var async = require('async');
var request = require('request');

module.exports = function(options){
  var seneca = this;
  var plugin = 'cd-users';
  var ENTITY_NS = 'sys/user';

  var so = seneca.options();

  seneca.add({role: plugin, cmd: 'list'}, cmd_list);
  seneca.add({role: plugin, cmd: 'register'}, cmd_register);
  seneca.add({role: plugin, cmd: 'promote'}, cmd_promote);
  seneca.add({role: plugin, cmd: 'get_users_by_emails'}, cmd_get_users_by_emails);

  function cmd_list(args, done){
    var seneca = this;

    async.waterfall([
      function(done) {
        seneca.make(ENTITY_NS).list$({ids: args.ids}, done);
      },
      function(users, done) {
        return done(null, _.map(users, function (user) {
          return user.data$();
        }));
      }
    ], done);
  }

  function updateSalesForce(user) {
    // ideally would be done in a workqueue
    process.nextTick(function() {
      if (process.env.SALESFORCE_ENABLED !== 'true') return;

      var lead = {
        PlatformId__c: user.id,
        PlatformUrl__c: 'https://zen.coderdojo.com/dashboard/profile/' + user.id,
        Email: user.email,
        LastName: user.name,
        Company: 'n/a'
      };

      seneca.act('role:cd-salesforce,cmd:save_lead', {userId: user.id, lead: lead}, function (err, res){
        if (err) return seneca.log.error('Error creating lead in SalesForce!', err);
        seneca.log.info('Created lead in SalesForce', lead, res);
      });
    });
  }

  function cmd_register(args, done) {
    // TODO - this is a bit of a temporary hack until phase1 catches up with master!
    // Then the champion registers via the 'Start Dojo' wizard, we need to know if it's
    // a champion that's registering and if so, update salesforce
    var isChampion = args.isChampion === true;
    delete args.isChampion;

    //Roles Available: basic-user, mentor, champion, cdf-admin
    var seneca = this;

    if(!args['g-recaptcha-response']){
      return done(new Error('Error with captcha'));
    }

    var secret = so['recaptcha_secret_key'];
    var captchaResponse = args['g-recaptcha-response'];

    var postData = {
                    url: 'https://www.google.com/recaptcha/api/siteverify',
                    form: {
                      response: captchaResponse,
                      secret: secret
                    }
                  };

    function verifyCaptcha(done){
      request.post(postData, function(err, response, body){
        if(err){
          return done(err);
        }

        body = JSON.parse(body);

        if(!body.success){
          return done(JSON.stringify(body['error-codes']));
        }

        return done(null, body.success);
      });
    }

    function registerUser(success, done){
      args = _.omit(args, ['g-recaptcha-response']);

      args.roles = ['basic-user'];
      args.mailingList = (args.mailingList) ? 1 : 0;
      seneca.act({role:'user', cmd:'register'}, args, function(err, response) {
        if(err) return done(err);
        if (isChampion === true) updateSalesForce(response.user);

        done(null, response);
      });

    }

    async.waterfall([
      verifyCaptcha,
      registerUser
    ], done);
  }

  function cmd_promote(args, done) {
    var seneca = this;
    var newRoles = args.roles;
    var userId = args.id;
    var userEntity = seneca.make$(ENTITY_NS);

    userEntity.load$(userId, function(err, response) {
      if(err) return done(err);
      var user = response;
      _.each(newRoles, function(newRole) {
        user.roles.push(newRole);
      });
      user.roles = _.uniq(user.roles);
      userEntity.save$(user, function(err, response) {
        if(err) return done(err);
        done(null, response);
      });
    });

  }

  function cmd_get_users_by_emails(args, done){
    var seneca = this, query = {};

    query.email = new RegExp(args.email, 'i');
    query.limit$ = query.limit$ ? query.limit$ : 10;

    seneca.make(ENTITY_NS).list$(query, function(err, users){
      if(err){
        return done(err);
      }

      users = _.map(users, function(user){
        return {email: user.email, id: user.id};
      });

      users = _.uniq(users, 'email');

      done(null, users);
    });
  }

  return {
    name: plugin
  };
};
