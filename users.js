'use strict';

var _ = require('lodash');
var async = require('async');
var request = require('request');
var moment = require('moment');
var pg = require('pg');
var crypto = require('crypto');

module.exports = function (options) {
  var seneca = this;
  var plugin = 'cd-users';
  var ENTITY_NS = 'sys/user';
  var so = seneca.options();
  var protocol = process.env.PROTOCOL || 'http';

  seneca.add({role: plugin, cmd: 'create_reset'}, cmd_create_reset);
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
  seneca.add({role: plugin, cmd: 'load_prev_founder'}, cmd_load_prev_founder);
  seneca.add({role: plugin, cmd: 'kpi_number_of_youths_registered'}, cmd_kpi_number_of_youths_registered);
  seneca.add({role: plugin, cmd: 'kpi_number_of_champions_and_mentors_registered'}, cmd_kpi_number_of_champions_and_mentors_registered);
  seneca.add({role: plugin, cmd: 'kpi_number_of_youth_females_registered'}, cmd_kpi_number_of_youth_females_registered);
  seneca.add({role: 'cd-users', cmd: 'is_self'}, require('./lib/users/is-self'));
  seneca.add({role: 'cd-users', cmd: 'is_parent_of'}, require('./lib/users/is-parent-of'));

  seneca.add({role: 'user', cmd: 'encrypt_password'}, function (data, cb) {
    //  Default seneca's salt is 16b length (too small entropy) and can generate NULL char, which pg cannot handle
    if (_.isUndefined(data.salt)) {
      data.salt = crypto.randomBytes(256).toString('hex');
    }
    this.prior(data, cb);
  });

  function cmd_load_prev_founder (args, done) {
    var seneca = this;
    seneca.act({role: plugin, cmd: 'load', id: args.id}, function (err, user) {
      if (err) return done(err);
      return done(null, _.pick(user, ['id', 'email', 'name']));
    });
  }

  function cmd_load (args, done) {
    var seneca = this;
    var id = args.id;
    seneca.make(ENTITY_NS).load$(id, done);
  }

  function cmd_list (args, done) {
    var seneca = this;
    var query = {};
    if (args.ids) {
      query.ids = args.ids;
    } else if (args.query) {
      query = args.query;
    }
    seneca.make(ENTITY_NS).list$(query, done);
  }

  function checkPassword (args, done) {
    var containsNumber = /[0-9]/.test(args.password);
    var containsCharacter = /[!|@|#|$|%|^|&|*|(|)|-|_]/.test(args.password);
    var containsCapital = /[A-Z]/.test(args.password);
    var containsLowerCase = /[a-z]/.test(args.password);
    var minPasswordLength = 8;

    if (args.password === args.email) {
      return done(null, {ok: false, token: args.token, why: 'Password must not be the same as your email address'});
    } if ((args.password.length < minPasswordLength) || !(containsNumber || containsCharacter)) {
      return done(null, {ok: false, token: args.token, why: 'Password must be a minimum of 8 characters in length and contain at least one number or punctuation character'});
    } if (_.includes(args.roles, 'cdf-admin') && (!containsNumber || !containsCharacter || !containsCapital || !containsLowerCase)) {
      return done(null, {ok: false, token: args.token, why: 'An admin account must contain at least one number, one special character and one capital.'});
    }
    return done(null, args);
  }

  function cmd_register (args, done) {
    var isChampion = args.isChampion === true;
    var locality = args.locality || 'en_US';
    var emailCode = 'auth-register-';
    var emailSubject = args.emailSubject;
    var zenHostname = process.env.HOSTNAME || '127.0.0.1:8000';
    delete args.isChampion;

    if (args.initUserType.name === 'attendee-u13') {
      return done(new Error('Unable to register as attendee-u13'));
    }

    // Roles Available: basic-user, cdf-admin
    var seneca = this;

    if (!args['g-recaptcha-response']) {
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

    function verifyCaptcha (done) {
      request.post(postData, function (err, response, body) {
        if (err) {
          return done(err);
        }

        body = JSON.parse(body);

        if (!body.success) {
          return done('captcha-failed');
        }

        return done(null, body.success);
      });
    }

    function checkPermissions (success, done) {
      // if forumMods array contains the users email, make them an admin
      if (options.users.cdfAdmins.indexOf(args.email) > -1) {
        args.roles = ['cdf-admin'];
      } else {
        args.roles = ['basic-user'];
      }

      return done(null, success);
    }

    function registerUser (success, done) {
      args = _.omit(args, ['g-recaptcha-response', 'zenHostname', 'locality', 'user', 'emailSubject']);

      args.mailingList = (args.mailingList) ? 1 : 0;

      checkPassword(args, function (err, args) {
        if (err) return done(err);
        if (typeof args.ok !== 'undefined' && !args.ok) {
          return done(null, args);
        }
        seneca.act({role: 'user', cmd: 'register'}, args, function (err, registerResponse) {
          if (err) return done(err);
          if (!registerResponse.ok) {
            return done(null, registerResponse);
          }

          var user = registerResponse.user;
          // Create user profile based on initial user type.
          var userType = 'attendee-o13';
          if (user.initUserType) userType = user.initUserType.name;

          var profileData = {
            userId: user.id,
            name: user.name,
            email: user.email,
            userType: userType
          };
          seneca.act({role: 'cd-profiles', cmd: 'save', profile: profileData}, function (err, profile) {
            if (err) return done(err);
            if (registerResponse.ok === true && isChampion === true) {
              seneca.act({role: 'cd-salesforce', cmd: 'queud_update_users', param: {user: registerResponse.user}, fatal$: false});
            }
            done(null, registerResponse);
          });
        });
      });
    }

    function sendWelcomeEmail (registerResponse, done) {
      if (registerResponse.ok) {
        seneca.act({role: 'email-notifications', cmd: 'send'},
          {code: emailCode,
          locality: locality,
          to: args.email,
          subject: emailSubject,
          content: {name: args.name, year: moment(new Date()).format('YYYY'), link: protocol + '://' + zenHostname}
        }, function (err, response) {
          if (err) return done(err);
          return done(null, registerResponse);
        });
      } else {
        done(null, registerResponse);
      }
    }

    async.waterfall([
      verifyCaptcha,
      checkPermissions,
      registerUser,
      sendWelcomeEmail
    ], function (err, results) {
      if (err) {
        return done(null, {error: err});
      }

      return done(null, results);
    });
  }

  function sanitiseUser (user) {
    delete user.pass;
    delete user.salt;
    delete user.active;
    delete user.accounts;
    delete user.confirmcode;
    return user;
  }

  function cmd_promote (args, done) {
    var seneca = this;
    var newRoles = args.roles;
    var userId = args.id;
    var userEntity = seneca.make$(ENTITY_NS);

    userEntity.load$(userId, function (err, response) {
      if (err) return done(err);
      var user = response;
      _.each(newRoles, function (newRole) {
        user.roles.push(newRole);
      });
      user.roles = _.uniq(user.roles);
      userEntity.save$(user, function (err, response) { done(err, sanitiseUser(response)); });
    });
  }

  function cmd_get_users_by_emails (args, done) {
    var seneca = this;
    var query = {};

    query.email = new RegExp(escapeRegExp(args.email), 'i');
    query.limit$ = query.limit$ ? query.limit$ : 10;

    seneca.make(ENTITY_NS).list$(query, function (err, users) {
      if (err) {
        return done(err);
      }

      users = _.map(users, function (user) {
        return {email: user.email, id: user.id, name: user.name};
      });

      users = _.uniq(users, 'email');

      done(null, users);
    });

    // taken from https://developer.mozilla.org/en/docs/Web/JavaScript/Guide/Regular_Expressions
    // needed because if a userCreator email is abc+xyz@example.com, it breaks the input string for
    // building the regExps
    function escapeRegExp (string) {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
  }

  function cmd_update (args, done) {
    var seneca = this;
    var user = args.user;
    seneca.make(ENTITY_NS).save$(user, done);
  }

  function cmd_get_init_user_types (args, done) {
    // These types can be selected during registration on the platform.
    var initUserTypes = [
      {title: 'Parent/Guardian', name: 'parent-guardian'},
      {title: 'Mentor/Volunteer', name: 'mentor'},
      {title: 'Youth Over 13', name: 'attendee-o13'},
      {title: 'Youth Under 13', name: 'attendee-u13'},
      {title: 'Champion', name: 'champion'}
    ];
    done(null, initUserTypes);
  }

  /**
   * This function returns if true if a user is champion and it's dojos if any.
   */
  function cmd_is_champion (args, done) {
    var seneca = this;

    seneca.make(ENTITY_NS).load$({id: args.user.id}, function (err, user) {
      if (err) {
        return done(err);
      }

      user = user.data$();

      var query = {userId: args.user.id};

      seneca.act({
        role: 'cd-dojos',
        cmd: 'search_dojo_leads',
        query: query,
        user: user
      }, function (err, dojoLeads) {
        if (err) {
          return done(err);
        }

        if (dojoLeads.length > 0) {
          seneca.act({role: 'cd-dojos', cmd: 'my_dojos', user: user}, function (err, myDojos) {
            if (err) {
              return done(err);
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

  function cmd_reset_password (args, done) {
    var seneca = this;
    if (!_.isEmpty(args.email) || !_.isEmpty(args.nick) || !_.isEmpty(args.username)) {
      seneca.act({role: plugin, cmd: 'create_reset'}, args, function (err, response) {
        if (err) return done(err);
        return done(null, response);
      });
    } else {
      return done(null, {ok: false, err: 'Missing parameters'});
    }
  }

  function cmd_create_reset (args, done) {
    var seneca = this;

    var nick = args.nick || args.username;
    var email = args.email;
    var locality = args.locality || 'en_US';
    var emailCode = 'auth-create-reset-';
    var emailSubject = args.emailSubject;
    var zenHostname = process.env.HOSTNAME || '127.0.0.1:8000';

    var msg = {role: 'user', cmd: 'create_reset'};
    if (void 0 !== nick) msg.nick = nick;
    if (void 0 !== email) msg.email = email;

    seneca.act(msg, function (err, out) {
      if (err || !out.ok) return done(err, out);
      if (options['email-notifications'].sendemail) {
        seneca.act({role: 'email-notifications', cmd: 'send'},
          {code: emailCode,
          locality: locality,
          to: out.user.email,
          subject: emailSubject,
          content: {name: out.user.name,
            resetlink: protocol + '://' + zenHostname + '/reset_password/' + out.reset.id,
            year: moment(new Date()).format('YYYY')}
        }, function (err, response) {
          if (err) return done(err);
          return done(null, { ok: out.ok });
        });
      } else {
        return done(null, {ok: out.ok});
      }
    });
  }

  function cmd_execute_reset (args, done) {
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

      var userEntity = seneca.make$(ENTITY_NS);
      userEntity.load$({ id: reset.user }, function (err, user) {
        if (err) { return done(err); }
        user.password = args.password;
        checkPassword(user, function (err, user) {
          if (err) { return done(err); }
          if (typeof user.ok !== 'undefined' && !user.ok) {
            return done(null, user);
          }
          delete user.password;
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
    });
  }

  function cmd_load_champions_for_user (args, done) {
    var seneca = this;
    var userId = args.userId;

    // Load user's dojos
    // Load champion for each dojo
    seneca.act({role: 'cd-dojos', cmd: 'dojos_for_user', id: userId}, function (err, response) {
      if (err) return done(err);
      var dojos = response;
      async.map(dojos, function (dojo, cb) {
        if (!dojo) return cb();
        seneca.act({role: 'cd-dojos', cmd: 'load_dojo_champion', id: dojo.id}, cb);
      }, function (err, champions) {
        if (err) return done(err);
        champions = champions[0];
        champions = _.uniq(champions, function (champion) {
          return champion.id;
        });
        var currentUser = _.find(champions, function (champion) {
          return champion.id === userId;
        });
        // Delete current user from champions list.
        if (currentUser) champions = _.without(champions, currentUser);
        return done(null, champions);
      });
    });
  }

  function cmd_load_dojo_admins_for_user (args, done) {
    var seneca = this;
    var userId = args.userId;

    seneca.act({role: 'cd-dojos', cmd: 'dojos_for_user', id: userId}, function (err, dojos) {
      if (err) return done(err);
      async.map(dojos, function (dojo, cb) {
        if (!dojo) return cb();
        seneca.act({role: 'cd-dojos', cmd: 'load_dojo_admins', dojoId: dojo.id, user: args.user}, cb);
      }, function (err, dojoAdmins) {
        if (err) return done(err);
        dojoAdmins = _.flatten(dojoAdmins);
        return done(null, dojoAdmins);
      });
    });
  }

  function cmd_record_login (args, done) {
    var seneca = this;
    var data = args.data;
    var userEntity = seneca.make$(ENTITY_NS);

    if (!data.ok) return done();

    userEntity.load$(data.user.id, function (err, user) {
      if (err) return done(err);
      user.lastLogin = new Date();
      userEntity.save$(user, done);
    });
  }

  function cmd_login (args, done) {
    this.prior(args, function (err, loginResponse) {
      if (err) return done(err);
      if (!loginResponse.ok || !loginResponse.user) return done(null, loginResponse);

      async.series([
        verifyPermissions,
        recordLogin
      ], function (err) {
        if (err) {
          return done(err);
        }

        return done(null, loginResponse);
      });

      function verifyPermissions (next) {
        var userRole;

        // if CdfAdmins array contains the users email, they should be admin
        if (options.users.cdfAdmins.indexOf(args.email) > -1) {
          userRole = 'cdf-admin';
        } else {
          userRole = 'basic-user';
        }

        // if the users roles doesn't have the correct role, update them in the db to right role
        if (loginResponse.user.roles.indexOf(userRole) === -1) updateUserRole(); // update role
        else next(); // skip update role

        function updateUserRole () {
          var user = loginResponse.user;
          user.roles = [userRole];
          seneca.act({role: plugin, cmd: 'update', user: user, id: user.id}, next);
        }
      }

      function recordLogin (next) {
        seneca.act({role: plugin, cmd: 'record_login'}, {data: loginResponse}, next);
      }
    });
  }

  function cmd_kpi_number_of_youths_registered (args, done) {
    var seneca = this;
    var date18YearsAgo = moment().subtract(18, 'years');
    var date13YearsAgo = moment().subtract(13, 'years');
    var femaleSearch = args.femaleSearch || false;
    var kpiData = {numberOfAccountsUnder18: 0, youthsUnder13: 0, youthsOver13: 0, numberOfParentsRegistered: 0};

    options.postgresql.database = options.postgresql.name;
    options.postgresql.user = options.postgresql.username;

    var numberOfAccountsUnder18Query;
    var youthsOver13Query;
    var youthsUnder13Query;
    if (femaleSearch) {
      numberOfAccountsUnder18Query = "SELECT * FROM cd_profiles WHERE dob >= $1 AND gender = 'Female'";
      youthsOver13Query = "SELECT * FROM cd_profiles WHERE dob <= $1 AND dob >= $2 AND gender = 'Female'";
      youthsUnder13Query = "SELECT * FROM cd_profiles WHERE dob >= $1 AND gender = 'Female'";
    } else {
      numberOfAccountsUnder18Query = 'SELECT * FROM cd_profiles WHERE dob >= $1';
      youthsOver13Query = 'SELECT * FROM cd_profiles WHERE dob <= $1 AND dob >= $2';
      youthsUnder13Query = 'SELECT * FROM cd_profiles WHERE dob >= $1';
    }

    pg.connect(options.postgresql, function (err, client) {
      if (err) return done(err);
      client.query(numberOfAccountsUnder18Query, [date18YearsAgo], function (err, results) {
        if (err) return done(err);
        kpiData.numberOfAccountsUnder18 = results.rows.length;
        client.query(youthsOver13Query, [date13YearsAgo, date18YearsAgo], function (err, results) {
          if (err) return done(err);
          kpiData.youthsOver13 = results.rows.length;
          client.query(youthsUnder13Query, [date13YearsAgo], function (err, results) {
            if (err) return done(err);
            kpiData.youthsUnder13 = results.rows.length;
            client.end();
            seneca.act({role: 'cd-profiles', cmd: 'list', query: {userType: 'parent-guardian'}}, function (err, parentProfiles) {
              if (err) return done(err);
              kpiData.numberOfParentsRegistered = parentProfiles.length;
              return done(null, kpiData);
            });
          });
        });
      });
    });
  }

  function cmd_kpi_number_of_champions_and_mentors_registered (args, done) {
    var seneca = this;
    var kpiData = {numberOfChampionsRegistered: 0, numberOfMentorsRegistered: 0};

    seneca.act({role: 'cd-profiles', cmd: 'list', query: {userType: 'champion'}}, function (err, championProfiles) {
      if (err) return done(err);
      kpiData.numberOfChampionsRegistered = championProfiles.length;
      seneca.act({role: 'cd-profiles', cmd: 'list', query: {userType: 'mentor'}}, function (err, mentorProfiles) {
        if (err) return done(err);
        kpiData.numberOfMentorsRegistered = mentorProfiles.length;
        return done(null, kpiData);
      });
    });
  }

  function cmd_kpi_number_of_youth_females_registered (args, done) {
    var seneca = this;
    seneca.act({role: plugin, cmd: 'kpi_number_of_youths_registered', femaleSearch: true}, done);
  }

  return {
    name: plugin
  };
};
