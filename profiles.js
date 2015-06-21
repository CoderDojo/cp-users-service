'use strict';

module.exports = function(options) {
  var seneca = this;

  var PARENT_GUARDIAN_PROFILE_ENTITY = 'cd/profiles';
  var plugin = 'cd-profiles';
  var _ = require('lodash');
  var async = require('async');
  var uuid = require('node-uuid');

  var mentorPublicFields = [
    'name',
    'languagesSpoken',
    'programmingLanguages',
    'linkedin',
    'twitter',
    'userTypes',
    'dojos'
  ];

  var championPublicFields = [
    'name',
    'languagesSpoken',
    'programmingLanguages',
    'linkedin',
    'twitter',
    'userTypes',
    'projects',
    'notes',
    'dojos'
  ];

  var attendeeO13PublicFields = [
    'alias',
    'linkedin',
    'twitter',
    'badges',
    'userTypes'
  ];

  var fieldWhiteList = {
    'mentor': mentorPublicFields,
    'champion': championPublicFields,
    'attendee-o13': attendeeO13PublicFields
  };

  var youthBlackList = ['name'];


  //var userTypes = ['champion', 'mentor', 'parent-guardian', 'attendee-o13', 'attendee-u13'];
  var userTypes = ['attendee-u13', 'attendee-o13', 'parent-guardian', 'mentor', 'champion'];


  seneca.add({role: plugin, cmd: 'create'}, cmd_create);
  seneca.add({role: plugin, cmd: 'list'}, cmd_list);
  seneca.add({role: plugin, cmd: 'save'}, cmd_save);
  seneca.add({role: plugin, cmd: 'save-youth-profile'}, cmd_save_youth_child);

  function cmd_create(args, done){
    var profile = args.profile;
    profile.userId = args.user;
    seneca.make$(PARENT_GUARDIAN_PROFILE_ENTITY).save$(profile, function(err, profile){
      var query = {userId: profile.userId};
      seneca.act({role: 'cd-profiles', cmd: 'list', query: query, user: args.user}, done);
    });
  }

  //TODO: clean up with async

  function cmd_save_youth_child(args, done){
    var profile = args.profile;
    profile.parents = [];
    profile.parents.push(args.profile.parent);
    
    //TODO add validation for profile types

    //Send error
    if(!_.contains(profile.parents, args.user)){
      return done('Cannot add child');
    }

    var initUserType =  profile.userTypes[0];
    var password = profile.password;
    var parentId = profile.parent;

    delete profile.userTypes;
    delete profile.password;
    delete profile.parent;

    var nick = profile.alias || profile.name;
    
    var user = {
      name: profile.name,
      nick: nick,
      email: profile.email,
      initUserType: {name : initUserType},
      password: password,
      roles: ['basic-user']
    };

    if(initUserType === 'attendee-o13'){
      seneca.act({role: 'user', cmd: 'register'}, user ,function(err, data){
        if(err){
          console.log("registration failed");
          return done(err);
        }

        //TODO update errors on front-end
        if(!data.ok){
          console.log("error", data.why)
          return done(data.why);
        }


        profile.userId = data && data.user && data.user.id;
        console.log("initUserType", typeof data.user.initUserType, data.user.initUserType);
        profile.userType = data && data.user && data.user.initUserType && data.user.initUserType.name;

        //Save child
        saveChild(profile, parentId , done)

      });
    } else if(initUserType === 'attendee-u13') {
      //If the child is under 13 create a user id
      profile.userId = uuid.v4();

      saveChild(profile, parentId, done);
    }
  }

  function saveChild(profile, parentId,done){
    seneca.make$(PARENT_GUARDIAN_PROFILE_ENTITY).save$(profile, function(err, profile){
      if(err){
        console.log("could not save profile");
        return done(err);
      }

      console.log("###################parentId", parentId);
      seneca.make$(PARENT_GUARDIAN_PROFILE_ENTITY).list$({userId: parentId}, function(err, results){
        var parent = results[0];

        if(err){
          console.log("could not load profile")
          return done(err);
        }

        parent.children = parent.children ? parent.children : [];
        parent.children.push(profile.userId);

        parent.save$(function(err){
          if(err){
            console.log("could not save parent profile");
            return done(err);
          }
          return done(null, profile);
        });
      });

    });
  }

  function cmd_list(args, done){
    var query = args.query;
    var publicFields = [];

    seneca.make$(PARENT_GUARDIAN_PROFILE_ENTITY).list$(query, function(err, profiles){
      if(err){
        return done(err);
      }

      var profile = profiles[0];

      var query = {userId: profile.userId};
      seneca.act({role: 'cd-dojos', cmd: 'load_usersdojos', query: query}, function(err, usersDojos){
        if(err){
          done(err);
        }

        seneca.act({role: 'cd-dojos', cmd: 'dojos_for_user', id: profile.userId}, function(err, dojos){
          if(err){
            done(err);
          }

          profile.dojos = _.map(dojos, function(dojo){
            return {id: dojo.id, name: dojo.name, urlSlug: dojo.urlSlug};
          });


          var ownProfileFlag = profile && profile.userId === args.user ? true : false;

          profile.userTypes = [];

          if(_.isEmpty(usersDojos)){
            profile.userTypes.push(profile.userType);
          } else {
            profile.userTypes = _.flatten(_.pluck(usersDojos, 'userTypes'));
            profile.userTypes.push(profile.userType);
          }

          profile.myChild = _.contains(profile.parents, args.user) ? true : false;
          //Logic for public profiles
          if(!ownProfileFlag &&
             !profile.myChild &&
            ( !_.contains(profile.userTypes, 'attendee-u13') || !_.contains(profile.userTypes, 'parent-guardian'))){
            _.each(profile.userTypes, function(userType){
              publicFields = _.union(publicFields, fieldWhiteList[userType]);
            });

            if(_.contains(profile.userTypes, 'attendee-o13')){
              publicFields = _.xor(publicFields, youthBlackList);
            }

            profile = _.pick(profile, publicFields);
          }

          //Ensure that only parents of children can retrieve their full public profile
          if(_.contains(profile.userTypes, 'attendee-u13') &&
            !_.contains(profile.parents, profile.userId)){

            profile = {};
          }

          var resolvedChildren = [];
          if(!_.isEmpty(profile.children) && _.contains(profile.userTypes, 'parent-guardian')){
            async.each(profile.children, function(child, callback){
              seneca.make$(PARENT_GUARDIAN_PROFILE_ENTITY).list$({userId: child}, function(err, results){
                console.log("returned children", results);
                if(err){
                  return callback(err);
                } 
                resolvedChildren.push(results[0]);
                console.log("resolvedChildren", resolvedChildren);
                return callback();
              });
            }, function(err){
              if(err){
                return done(err);
              }

              console.log("resolvedChildren", resolvedChildren);
              profile.resolvedChildren = resolvedChildren;
              profile.ownProfileFlag = ownProfileFlag;

              return done(null, profile);
            });
          } else {
            profile.resolvedChildren = resolvedChildren;
            profile.ownProfileFlag = ownProfileFlag;

            return done(null, profile);
          }
        });

      });
    });
  }

  function cmd_save(args, done) {
    var profile = args.profile;

    seneca.make$(PARENT_GUARDIAN_PROFILE_ENTITY).save$(profile, done);
  }

  return {
    name: plugin
  };

};