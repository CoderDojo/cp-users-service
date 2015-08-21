'use strict';

var _ = require('lodash');
var async = require('async');
var request = require('request');
var moment = require('moment');

module.exports = function(options){
  var seneca = this;
  var plugin = 'cd-users';
  var ENTITY_NS = 'sys/user';
  var so = seneca.options();

  seneca.add({role: 'auth', cmd: 'create_reset'}, cmd_create_reset);
  seneca.add({role: plugin, cmd: 'load'}, cmd_load);
  seneca.add({role: plugin, cmd: 'list'}, cmd_list);
  seneca.add({role: plugin, cmd: 'register'}, cmd_register);
  seneca.add({role: plugin, cmd: 'promote'}, cmd_promote);
  seneca.add({role: plugin, cmd: 'get_users_by_emails'}, cmd_get_users_by_emails);
  seneca.add({role: plugin, cmd: 'update'}, cmd_update);
  seneca.add({role: plugin, cmd: 'get_init_user_types'}, cmd_get_init_user_types);
  seneca.add({role: plugin, cmd: 'is_champion'}, cmd_is_champion);
  seneca.add({role: plugin, cmd: 'reset_password'}, cmd_reset_password);
  seneca.add({role: plugin, cmd: 'execute_reset'}, cmd_execute_reset);
  seneca.add({role: plugin, cmd: 'load_champions_for_user'}, cmd_load_champions_for_user);
  seneca.add({role: plugin, cmd: 'load_dojo_admins_for_user'}, cmd_load_dojo_admins_for_user);
  seneca.add({role: plugin, cmd: 'record_login'}, cmd_record_login);
  seneca.add({role: 'user', cmd: 'login'}, cmd_login);

  function cmd_load(args, done) {
    var seneca = this;
    var id = args.id;
    var userEntity = seneca.make(ENTITY_NS);

    userEntity.load$(id, done);
  }

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

  // We create an Account in Salesforce with the champion information and we also create a Lead.
  // The user.id is used for both Account and Leads.
  function updateSalesForce(user) {
    // ideally would be done in a workqueue
    process.nextTick(function() {
      if (process.env.SALESFORCE_ENABLED !== 'true') return;

      var account = {
        PlatformId__c: user.id,
        PlatformUrl__c: 'https://zen.coderdojo.com/dashboard/profile/' + user.id,
        Email__c: user.email,
        Name: user.name,
        RecordTypeId: process.env.SALESFORCE_ACC_RECORDTYPEID
      };

      seneca.act('role:cd-salesforce,cmd:save_account', {userId: user.id, account:account}, function (err, res){
        if (err) return seneca.log.error('Error creating Account in SalesForce!', err);
        seneca.log.info('Created Account in SalesForce', account, res);

        var lead = {
          PlatformId__c: user.id,
          PlatformUrl__c: 'https://zen.coderdojo.com/dashboard/profile/' + user.id,
          Email__c: user.email,
          LastName: user.name,
          RecordTypeId: process.env.SALESFORCE_LEAD_RECORDTYPEID,
          Company: '<n/a>',
          Language__c: 'en_US',
          "ChampionAccount__c": res.id$
        };

        seneca.act('role:cd-salesforce,cmd:save_lead', {userId: user.id, lead:lead}, function (err, res){
          if (err) return seneca.log.error('Error creating Lead in SalesForce!', err);
          seneca.log.info('Created Lead in SalesForce', account, res);
        });
      });
    });
  }

  function cmd_register(args, done) {
    var isChampion = args.isChampion === true;
    var locality = args.locality || 'en_US';
    var emailCode = 'auth-register-' + locality;
    var emailSubject = args.emailSubject;
    var zenHostname = args.zenHostname;
    delete args.isChampion;

    if(args.initUserType.name === 'attendee-u13'){
      return done(new Error('Unable to register as attendee-u13'));
    }

    //Roles Available: basic-user, cdf-admin
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
          return done('captcha-failed');
        }

        return done(null, body.success);
      });
    }

    function registerUser(success, done){
      args = _.omit(args, ['g-recaptcha-response', 'zenHostname', 'locality', 'user', 'emailSubject']);

      //all users registering with the email address @coderdojo.org get promoted to admin
      if(args.email.indexOf('@coderdojo.org') > 0) args.roles = ['cdf-admin'];
      else args.roles = ['basic-user'];

      args.mailingList = (args.mailingList) ? 1 : 0;

      seneca.act({role:'user', cmd:'register'}, args, function (err, registerResponse) {
        if(err) return done(err);
        if(!registerResponse.ok){
          return done(null, registerResponse);
        }

        var user = registerResponse.user;
        //Create user profile based on initial user type.
        var userType = 'attendee-o13';
        if (user.initUserType) userType = user.initUserType.name;

        var profileData = {
          userId:user.id,
          name: user.name,
          email:user.email,
          userType: userType
        };
        seneca.act({role:'cd-profiles', cmd:'save', profile: profileData}, function (err, profile) {
          if(err) return done(err);
          if (registerResponse.ok === true && isChampion === true) updateSalesForce(registerResponse.user);
          done(null, registerResponse);
        });
      });
    }

    function sendWelcomeEmail(registerResponse, done) {
      if(registerResponse.ok){
        seneca.act({role:'email-notifications', cmd:'send'},
          {code: emailCode,
          to: args.email,
          subject: emailSubject,
          content:{name: args.name, year: moment(new Date()).format('YYYY'), link: 'http://' + zenHostname}
        }, function (err, response) {
          if(err) return done(err);
          return done(null, registerResponse);
        });
      } else {
        done(null, registerResponse);
      }
    }

    async.waterfall([
      verifyCaptcha,
      registerUser,
      sendWelcomeEmail
    ], function(err, results){
      if(err){
        return done(null, {error: err});
      }

      return done(null, results);
    });
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
        return {email: user.email, id: user.id, name: user.name};
      });

      users = _.uniq(users, 'email');

      done(null, users);
    });
  }

  function cmd_update(args, done) {
    var seneca = this;
    var user = args.user;

    var userEntity = seneca.make(ENTITY_NS);

    userEntity.save$(user, done);
  }

  function cmd_get_init_user_types(args, done) {
    var seneca = this;
    //These types can be selected during registration on the platform.
    var initUserTypes = [
      {title: 'Parent/Guardian', name: 'parent-guardian'},
      {title: 'Mentor/Volunteer', name: 'mentor'},
      {title: 'Ninja Over 13', name: 'attendee-o13'},
      {title: 'Ninja Under 13', name: 'attendee-u13'},
      {title: 'Champion', name: 'champion'}
    ];
    done(null, initUserTypes);
  }

  /**
   * This function returns if true if a user is champion and it's dojos if any.
   */
  function cmd_is_champion(args, done){
    var seneca = this;

    seneca.make(ENTITY_NS).load$({id: args.id}, function(err, user) {
      if (err) {
        return done(err)
      }

      user = user.data$();

      var query = {userId: args.id}

      seneca.act({
        role: 'cd-dojos',
        cmd: 'search_dojo_leads',
        query: query,
        user: user
      }, function (err, dojoLeads) {
        if (err) {
          return done(err)
        }

        if (dojoLeads.length > 0) {
          seneca.act({role: 'cd-dojos', cmd: 'my_dojos', user: user}, function (err, myDojos) {
            if (err) {
              return done(err)
            }

            return done(null, {
              isChampion: true,
              dojos: myDojos
            });
          });
        } else {
          return done(null, {isChampion: false});
        }
      });
    });
  }

  function cmd_reset_password(args, done) {
    var seneca = this;
    seneca.act({role: 'auth', cmd: 'create_reset'}, args, function (err, response) {
      if(err) return done(err);
      return done(null, response);
    })
  }

  function cmd_create_reset(args, done) {
    var seneca = this
    var useract = seneca.pin({role:'user',cmd:'*'});

    var nick  = args.nick || args.username;
    var email = args.email;
    var locality = args.locality || 'en_US';
    var emailCode = 'auth-create-reset-' + locality;
    var emailSubject = args.emailSubject;
    var zenHostname = args.zenHostname || '127.0.0.1:8000';

    var args = {}
    if( void 0 != nick )  args.nick  = nick;
    if( void 0 != email ) args.email = email;

    useract.create_reset( args, function( err, out ) {
      if(err || !out.ok) return done(err,out);
      if(options['email-notifications'].sendemail) {
        seneca.act({role:'email-notifications', cmd:'send'},
          {code: emailCode,
          to: out.user.email,
          subject: emailSubject,
          content:{name: out.user.name, resetlink: 'http://' + zenHostname + '/reset_password/' + out.reset.id, year: moment(new Date()).format('YYYY')}
        }, function (err, response) {
          if(err) return done(err);
          return done(null,{
            ok: out.ok,
          })
        });
      } else {
        return done(null, {ok: out.ok});
      }
    })
  }

  function cmd_execute_reset(args, done) {
    var resetEntity = seneca.make$('sys/reset');
    resetEntity.load$({ id: args.token }, function (err, reset) {
      if (err) { return done(err); }

      if (!reset) {
        return done(null, { ok: false, token: args.token, why: 'Reset not found.' });
      }

      if (!reset.active) {
        return done(null, { ok: false, token: args.token, why: 'Reset not active.' });
      }

      if (new Date() < new Date(reset.when) + options.resetperiod) {
        return done(null, { ok: false, token: args.token, why: 'Reset stale.' });
      }

      var userEntity = seneca.make$('sys/user');

      userEntity.load$({ id: reset.user }, function (err, user) {
        if (err) { return done(err); }
        seneca.act({ role: 'user', cmd: 'change_password', user: user, password: args.password, repeat: args.repeat }, function (err, out) {
          if (err) { return done(err); }

          out.reset = reset;
          if (!out.ok) { return done(null, out); }

          reset.active = false;
          reset.save$(function (err, reset) {
            if (err) { return done(err); }
            return done(null, { user: user, reset: reset, ok: true });
          });
        });
      });
    });
  }

  function cmd_load_champions_for_user(args, done) {
    var seneca = this;
    var userId = args.userId;

    //Load user's dojos
    //Load champion for each dojo
    seneca.act({role:'cd-dojos', cmd:'dojos_for_user', id: userId}, function (err, response) {
      if(err) return done(err);
      var dojos = response;
      async.map(dojos, function (dojo, cb) {
        if(!dojo) return cb();
        seneca.act({role:'cd-dojos', cmd:'load_dojo_champion', id: dojo.id}, cb);
      }, function (err, champions) {
        if(err) return done(err);
        champions = champions[0];
        champions = _.uniq(champions, function (champion) {
          return champion.id;
        });
        var currentUser = _.find(champions, function (champion) {
          return champion.id === userId
        });
        //Delete current user from champions list.
        if(currentUser) champions = _.without(champions, currentUser);
        return done(null, champions);
      });
    });
  }

  function cmd_load_dojo_admins_for_user(args, done) {
    var seneca = this;
    var userId = args.userId;

    seneca.act({role: 'cd-dojos', cmd: 'dojos_for_user', id: userId}, function (err, dojos) {
      if(err) return done(err);
      async.map(dojos, function (dojo, cb) {
        if(!dojo) return cb();
        seneca.act({role: 'cd-dojos', cmd: 'load_dojo_admins', dojoId: dojo.id}, cb);
      }, function (err, dojoAdmins) {
        if(err) return done(err);
        dojoAdmins = _.flatten(dojoAdmins);
        return done(null, dojoAdmins);
      });
    });
  }

  function cmd_record_login(args, done) {
    var seneca = this;
    var data = args.data;
    var userEntity = seneca.make$(ENTITY_NS);

    userEntity.load$(data.user.id, function (err, user) {
      if(err) return done(err);
      user.lastLogin = new Date();
      userEntity.save$(user, done);
    });
  }

  function cmd_login(args, done) {
    this.prior(args, function (err, loginResponse) {
      if(err) return done(err)
      seneca.act({role: plugin, cmd:'record_login'}, {data: loginResponse}, function (err, res) {
        if(err) return done(err);
        return done(null, loginResponse);
      });
    });
  }

  return {
    name: plugin
  };

};
