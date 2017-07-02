'use strict';

var _ = require('lodash');
var async = require('async');

 module.exports = function () {

   var seneca = this;

   var plugin = 'test-user-data';

   seneca.add({role: plugin, cmd: 'insert', entity: 'user'}, function (args, done) {

     async.waterfall([
       createIndependants,
       createDependantsChildren
     ], function (err, users) {
       return done(null);
     });

     function createIndependants (wfCb) {
       var users = require('../fixtures/e2e/users.json');
       async.eachSeries(users, function (user, cb) {
         seneca.act(user, {role: 'cd-users', cmd: 'register'}, function (err, response) {
           if (err) return done(err);
           if (response.ok === false) {
             console.error('insert failed: ', response);
             return cb(response);
           }
           return cb(err, response);
         });
       }, wfCb);
     }

     function createDependantsChildren (wfCb) {
       var children = require('../fixtures/e2e/children.json');
       async.eachSeries(children, function (child, cb) {
         function getParent (wfCb) {
           seneca.act({role: 'cd-users', cmd: 'list', query: {email: child.parentEmail}}, function (err, parents) {
             if (err) return done(err);
             return wfCb(null, parents[0]);
           });
         }

         function saveChild (parent, wfCb) {
           child.parents = [parent.userId];
           seneca.act({role: 'cd-profiles', cmd: 'save-youth-profile', profile: child.data, user: parent}, function (err, savedChild) {
             if (err) return wfCb(err);
             if (savedChild.ok === false) {
               console.error('insert failed: ', savedChild);
               return wfCb(savedChild);
             }
             return wfCb(err, savedChild);
           });
         }

         async.waterfall([
           getParent,
           saveChild
         ], cb);

       }, function (err, data) {
         return wfCb();
       });

     }

   });

   seneca.add({role: plugin, cmd: 'insert', entity: 'agreement'}, function (args, done) {
     var users = require('../fixtures/e2e/users.json');
     var champs = _.filter(users, function (user) {
       return user.user.email.indexOf('champion') > -1;
     });
     async.eachSeries(champs, function (champ, sCb) {
       async.waterfall([
        getUser,
        saveAgreement
      ], sCb);

       function getUser (wfCb) {
        seneca.act({role: 'cd-users', cmd: 'list', query: {email: champ.user.email}}, function (err, champs) {
          if (err) return done(err);
          return wfCb(null, champs[0]);
        });
       }

       function saveAgreement (champ, wfCb) {
         var payload = {
           fullName: champ.name,
           userId: champ.id
         };
         seneca.act({role: 'cd-agreements', cmd: 'save', agreement: payload}, function (err, agreement) {
            if (err) return done(err);
            return wfCb(null, agreement);
         });
       }
     }, done);
   });

   return {
     name: plugin
   };
 };
