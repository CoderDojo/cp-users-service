'use strict';

module.exports = function(options) {
  var seneca = this;

  var PARENT_GUARDIAN_PROFILE_ENTITY = 'cd/profiles';
  var plugin = 'cd-profiles';
  var _ = require('lodash');

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
    'badges'
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

  function cmd_create(args, done){
    var profile = args.profile;
    profile.userId = args.user;
    seneca.make$(PARENT_GUARDIAN_PROFILE_ENTITY).save$(profile, function(err, profile){
      var query = {userId: profile.userId};
      seneca.act({role: 'cd-profiles', cmd: 'list', query: query, user: args.user}, done);
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

          //Logic for public profiles
          if(!ownProfileFlag && ( !_.contains(profile.userTypes, 'attendee-u13') || !_.contains(profile.userTypes, 'parent-guardian'))){
            _.each(profile.userTypes, function(userType){
              publicFields = _.union(publicFields, fieldWhiteList[userType]);
            });

            if(_.contains(profile.userTypes, 'attendee-o13')){
              publicFields = _.xor(publicFields, youthBlackList);
            }

            profile = _.pick(profile, publicFields);
          }

          profile.ownProfileFlag = ownProfileFlag;

          return done(null, profile);

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