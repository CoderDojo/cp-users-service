'use strict';

var seneca = require('seneca')(),
    config = require(__dirname + '/config/config.js')(),
    util   = require('util'),
    async  = require('async'),
    _      = require('lodash'),
    fs     = require('fs'),
    expect = require('chai').expect,
    lab = exports.lab = require('lab').script();

var role = "cd-users";

console.log('using configuration', JSON.stringify(config, null, 4));
seneca.options(config);

var using_postgres = false; // can be set to true for debugging
if (using_postgres) seneca.use('postgresql-store', config["postgresql-store"]);

seneca
  .use(__dirname + '/../users.js', { 'postgresql': config['postgresql-store'], 'users': config['users']})
  .use(__dirname + '/../agreements.js')
  .use(__dirname + '/../profiles.js')
  .use(__dirname + '/../email-notifications.js')
  .use(__dirname + '/stubs/cd-nodebb-api.js')
  .use('mail', config.mailtrap)
  .use('user');

var userEnt = seneca.make$('sys/user'),
    agrmEnt = seneca.make$('cd/agreements'),
    users   = JSON.parse(fs.readFileSync(__dirname + '/fixtures/users.json', 'utf8')),
    agrms   = JSON.parse(fs.readFileSync(__dirname + '/fixtures/agreements.json', 'utf8')),
    profiles = JSON.parse(fs.readFileSync(__dirname + '/fixtures/profiles.json', 'utf8'));

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

lab.experiment('Profiles Microservice test', { timeout: 5000}, function () {
  lab.test('create', function (done) {
    var profile = {
      "name": "test-user",
      "email": "test-user@example.com",
      "alias": "test-user-alias"
    };
    seneca.act({role: 'cd-profiles', cmd: 'create', profile: profile}, done);
  });

  lab.test('save', function (done) {
    var profile = {
      "name": "test-user",
      "email": "test-user@example.com",
      "alias": "test-user-alias"
    };
    seneca.act({role: 'cd-profiles', cmd: 'save', profile: profile}, done);
  });

  lab.test('load', function (done) {
    var id = 'f8bbf130-e7c3-4da6-ad0f-28475d4811c7';
    seneca.act({role: 'cd-profiles', cmd: 'load', id: id}, done);
  }); 

  lab.test('user_profile_data', function (done) {
    var userId = '';
    seneca.act({role: 'cd-profiles', cmd: 'user_profile_data', userId: 'aa5c42d9-ff6b-40bb-824b-0b787dafd35f'}, done);
  });
});

lab.experiment('Users Microservice test', { timeout: 5000 }, function(){
  lab.before(function(done){
    seneca.ready(function(){
      userEnt.remove$({all$: 1}, function(err){
        if(err) return done(err);

        done();
      });
    });
  });

  lab.before(function(done){
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

  lab.experiment('List', function(){
    lab.test('list users from db', function(done){
      seneca.act({role: role, cmd: 'list', query: {}}, function(err, users){
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

  lab.experiment('Register', function(){
    lab.test('save user to db', function(done){

      var user = {
        "name": "test6",
        "email": "test6@example.com",
        "password": "pass6",
        "termsConditionsAccepted": true,
        "initUserType": "mentor",
        "g-recaptcha-response": "03AHJ_VuufpHRAc3bbYfeMunZ-nOYP5rjdSwlw7e4Btq-RGYYvCRTJJkXptbQuBwJDL0ZWQ7eHeQRoTI9iRZlakVlpVDB9rd0kYw2iNcMXG9qNNNBNv_qNjTyE4RwZ3x0zAt2aqg-LjboEqRyLqbOO032kal8wz_GGKbrykJMV0kiSdCbABlSalNHUwlP9II7nGs1me9x84owsr5ZCFkCYtQehguTm6nMe9HRq7hLbQb4hK8HuWwfqQ1z5CIuKk7el5taxNC1h4QuqWsNgGlWAv_Gqp4dJjz683kNCV2vbTlofz6FwttNZwD-mS1l4OrTCdvdX9JBcipXbjlIF1RFyBbXGvSAftp3_ajmoAjstwSdAZVtD1Whm_x8nUo_0pFp6x0n0Y1j8Ztc87oxAXswI-Yvf8JFu8Bhaw_SwAz2Qk7meR2Mvx5lKz_3IzK_b15gnmXenqamBpksv"
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

  lab.experiment('Promote', function(){
    lab.test('append \'super-admin\' to user\'s role list', function(done){
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

  lab.experiment('KPIs', function () {

    lab.test.skip('count number of youths registered', function (done) {
      seneca.act({role: role, cmd: 'kpi_number_of_youths_registered'}, function (err, kpiData) {
        if(err) return done(err);
        expect(kpiData).to.have.property('numberOfAccountsUnder18').that.is.a('number');
        expect(kpiData).to.have.property('youthsUnder13').that.is.a('number');
        expect(kpiData).to.have.property('youthsOver13').that.is.a('number');
        expect(kpiData).to.have.property('numberOfParentsRegistered').that.is.a('number');
        return done();
      });
    });

    lab.test('count number of champions and mentors registered', function (done) {
      seneca.act({role: role, cmd: 'kpi_number_of_champions_and_mentors_registered'}, function (err, kpiData) {
        if(err) return done(err);
        expect(kpiData).to.have.property('numberOfChampionsRegistered').that.is.a('number');
        expect(kpiData).to.have.property('numberOfMentorsRegistered').that.is.a('number');
        return done();
      });
    });

    lab.test.skip('count number of youth females registered', function (done) {
      seneca.act({role: role, cmd: 'kpi_number_of_youth_females_registered'}, function (err, kpiData) {
        if(err) return done(err);
        expect(kpiData).to.have.property('numberOfAccountsUnder18').that.is.a('number');
        expect(kpiData).to.have.property('youthsUnder13').that.is.a('number');
        expect(kpiData).to.have.property('youthsOver13').that.is.a('number');
        expect(kpiData).to.have.property('numberOfParentsRegistered').that.is.a('number');
        return done();
      });
    });
  });

  lab.experiment.skip('Get users by emails', function(){
    lab.test('load user from db based on email', function(done){
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

lab.experiment('Agreements Microservice test', function(){
  var role = "cd-agreements";

  lab.before(function(done){
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

  lab.before(function(done){
    async.eachSeries(agrms, loadAgreements, function(err){
      if(err) return done(err);
      done();
    });
  });

  lab.experiment('List', function(){
    lab.test('load agreements from db', function(done){
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

  lab.experiment('Count', function(){
    lab.test('Not Implemented', function(done){

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
