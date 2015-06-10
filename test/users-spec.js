'use strict';

var seneca = require('seneca')(),
    config = require(__dirname + '/../config/config.js')(),
    util   = require('util'),
    async  = require('async'),
    _      = require('lodash'),
    fs     = require('fs'),
    expect = require('chai').expect;

var role = "cd-users";

console.log('using configuration', JSON.stringify(config, null, 4));
seneca.options(config);

var using_postgres = false; // can be set to true for debugging
if (using_postgres) seneca.use('postgresql-store', config["postgresql-store"]);

seneca
  .use(__dirname + '/../users.js')
  .use(__dirname + '/../agreements.js')
  .use(__dirname + '/../profiles.js')
  .use('user');

var userEnt = seneca.make$('sys/user'),
    agrmEnt = seneca.make$('cd/agreements'),
    users   = JSON.parse(fs.readFileSync(__dirname + '/fixtures/users.json', 'utf8')),
    agrms   = JSON.parse(fs.readFileSync(__dirname + '/fixtures/agreements.json', 'utf8'));

// NOTE: all tests are basic
//       they just follow the happy scenario for each exposed action

function expect_contain_properties(actual, expected){
    // console.log('comparing ' + util.inspect(actual) + ' against ' + util.inspect(expected));
    // console.log('keys ' + util.inspect(Object.keys(expected)));
  _.each(Object.keys(expected), function(key){
    if (key.toString().indexOf('$') === -1) {
      // console.log('key: ' + key + '. Results: ' + util.inspect(actual[key]) + ' and ' + util.inspect(expected[key]));
      expect(actual[key]).to.be.deep.equal(expected[key]);
    }
  })
  return;
}

describe('Users Microservice test', function(){

  before(function(done){
    seneca.ready(function(){
      userEnt.remove$({all$: 1}, function(err){
        if(err) return done(err);

        done();
      });
    });
  });

  before(function(done){
    function registerUser(user, cb){
      seneca.act(user, {role: role, cmd: 'register'}, function(err, res){
        if(err) return cb(err);

        return cb();
      });
    }

    var initUsers = function (cb) {
      async.eachSeries(users, registerUser, cb);
    };

    async.series([
      initUsers
    ], done);
  });

  describe('List', function(){
    it('list users from db', function(done){
      seneca.act({role: role, cmd: 'list'}, function(err, users){
        if(err) return done(err);

        // console.log('users: ' + util.inspect(users))

        expect(users.length).to.be.equal(5);
        _.each(users, function(element){
          expect(element).to.be.ok;
        })

        done();
      });
    });
  });

  describe('Register', function(){
    it('save user to db', function(done){
      
      var user = {
        "name": "test6",
        "email": "test6@example.com",
        "password": "pass6",
        "termsConditionsAccepted": true,
        "initUserType": "mentor"
      }

      seneca.act({role: role, cmd: 'register'}, user, function(err, savedUser){
        if(err) return done(err);

        // console.log('savedUser: ' + util.inspect(savedUser));

        expect(savedUser).to.be.ok;
        expect(savedUser.ok).to.be.true;

        var expectedFields = [ 'nick', 'email', 'name', 'active', 'when', 'termsConditionsAccepted',
                              'roles', 'mailingList', 'salt', 'pass', 'id' ];
        var actualFields = Object.keys(savedUser.user);
        _.each(expectedFields, function(field){
          expect(actualFields).to.include(field);
        })

        userEnt.load$({email:user.email}, function(err, loadedUser){
          if(err) return done(err);

          // console.log('loadedUser: ' + util.inspect(loadedUser));
          expect_contain_properties(loadedUser, _.omit(savedUser.user, 'when'));

          done();
        });
      });
    });
  });

  describe('Promote', function(){
    it('append \'super-admin\' to user\'s role list', function(done){
      userEnt.load$({email:users[0].email}, function(err, loadedUser){
        if(err) return done(err);

        // console.log('loadedUser: ' + util.inspect(loadedUser));
        expect(loadedUser.roles).to.be.ok;
        expect(loadedUser.roles).to.include('basic-user');

        seneca.act({role: role, cmd: 'promote', roles:['super-admin']}, loadedUser, function(err, promotedUser){
          if(err) return done(err);

          // console.log('promotedUser: ' + util.inspect(promotedUser));
          expect(promotedUser.roles).to.be.ok;
          expect(promotedUser.roles).to.include('basic-user');
          expect(promotedUser.roles).to.include('super-admin');

          done();
        });
      });
    });
  });

  describe.skip('Get users by emails', function(){
    it('load user from db based on email', function(done){
      if (using_postgres) {
        userEnt.load$({email:users[0].email}, function(err, selectedUser){
          if(err) return done(err);

          console.log('selectedUser: ' + util.inspect(selectedUser));
          expect(selectedUser.roles).to.be.ok;

          seneca.act({role: role, cmd: 'get_users_by_emails', email:selectedUser.email},
            function(err, usersFound){
            if(err) return done(err);

            console.log('usersFound: ' + util.inspect(usersFound));

            expect(usersFound.length).to.be.equal(1);
            expect(usersFound[0].email).to.be.equal(selectedUser.email);

            userEnt.load$(usersFound[0].id, function(err, loadedUser){
              if(err) return done(err);
              expect_contain_properties(loadedUser, selectedUser);

              done();
            });
          });
        });
      } else {
        var err = new Error('POSTGRES SPECIFIC: dojos.js makes postgres-specific query which is not supported in other stores: query:{email:/email/i} in cmd_get_users_by_emails');
        done(err);
      }
    });
  });

});

describe('Agreements Microservice test', function(){
  var role = "cd-agreements";

  before(function(done){
    seneca.ready(function(){
      agrmEnt.remove$({all$: 1}, function(err){
        if(err) return done(err);

        done();
      });
    });
  });

  var loadAgreements = function(agr, cb){
    if (using_postgres) agr.id = ''; // this is unusually necessary
    agrmEnt.save$(agr, function(err, agr){
      if(err) return cb(err);
        cb();
    });
  }

  before(function(done){
    async.eachSeries(agrms, loadAgreements, function(err){
      if(err) return done(err);
      done();
    });
  });

  describe('List', function(){
    it('load agreements from db', function(done){
      seneca.act({role: role, cmd:'list', userIds:[agrms[0].userId, agrms[1].userId]}, function(err, listedAgrms){

        // console.log('listedAgrms:' + util.inspect(listedAgrms));

        expect(listedAgrms[0].userId).to.be.equal(agrms[0].userId);
        expect(listedAgrms[1].userId).to.be.equal(agrms[1].userId);

        expect(listedAgrms.length).to.be.equal(2);
        if (using_postgres) delete agrms[0].id; // cleanup after the fix
        expect_contain_properties(listedAgrms[0].agreements[0], agrms[0]);
        if (using_postgres) delete agrms[1].id;
        expect_contain_properties(listedAgrms[1].agreements[0], agrms[1]);

        done();
      });
    });
  });

  describe('Count', function(){
    it('Not Implemented', function(done){

      var query = { userId:agrms[0].userId };
      if (!using_postgres) query.limit$ = 10;

      seneca.act({role: role, cmd:'count', query:query}, function(err, listedAgrms){

        // console.log('listedAgrms:' + util.inspect(listedAgrms));
        expect(listedAgrms.noOfAgreements).to.be.equal(1);

        done();
      });
    });
  });

});