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
  //var userTypes = ['attendee-u13', 'attendee-o13', 'parent-guardian', 'mentor', 'champion'];


  seneca.add({role: plugin, cmd: 'create'}, cmd_create);
  seneca.add({role: plugin, cmd: 'list'}, cmd_list);
  seneca.add({role: plugin, cmd: 'save-youth-profile'}, cmd_save_youth_profile);
  seneca.add({role: plugin, cmd: 'save'}, cmd_save);
  seneca.add({role: plugin, cmd: 'update-youth-profile'}, cmd_update_youth);
  seneca.add({role: plugin, cmd: 'invite-parent-guardian'}, cmd_invite_parent_guardian);
  seneca.add({role: plugin, cmd: 'search'}, cmd_search);
  seneca.add({role: plugin, cmd: 'accept-invite'}, cmd_accept_invite);


  function cmd_search(args, done){
    if(!args.query){
      return done(new Error('Empty query'));
    }

    seneca.make$(PARENT_GUARDIAN_PROFILE_ENTITY).list$(args.query, done);
  }

  function cmd_create(args, done){
    var profile = args.profile;
    profile.userId = args.user;
    seneca.make$(PARENT_GUARDIAN_PROFILE_ENTITY).save$(profile, function(err, profile){
      var query = {userId: profile.userId};
      seneca.act({role: 'cd-profiles', cmd: 'list', query: query, user: args.user}, done);
    });
  }

  //TODO: clean up with async

  function cmd_save_youth_profile(args, done){
    var profile = args.profile;
    profile.parents = [];
    profile.parents.push(args.user);
    //TODO add validation for profile types

    //Send error
    if(!_.contains(profile.parents, args.user)){
      return done(new Error('Unable to save child profile'));
    }

    var initUserType =  profile.userTypes[0];
    var password = profile.password;

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
          return done(err);
        }

        //TODO update errors on front-end
        if(!data.ok){
          return done(data.why);
        }

        profile.userId = data && data.user && data.user.id;
        profile.userType = data && data.user && data.user.initUserType && data.user.initUserType.name;
        
        profile = _.omit(profile,['userTypes', 'password']);

        saveChild(profile, args.user , done);

      });
    } else if(initUserType === 'attendee-u13') {
      //If the child is under 13 create a user id
      profile = _.omit(profile,['userTypes', 'password']);
      profile.userId = uuid.v4();
      saveChild(profile, args.user, done);
    }
  }

  function cmd_update_youth(args, done){
    if(!_.contains(args.profile.parents, args.user)){
      return done(new Error('Not authorized to update profile'));
    }
    var profile = args.profile;
    
    profile = _.omit(profile, ['password','userTypes', 'myChild', 'ownProfileFlag', 'dojos', 'email']);
    seneca.make$(PARENT_GUARDIAN_PROFILE_ENTITY).save$(profile, function(err, profile){
      if(err){
        return done(err);
      }

      return done(null, profile);
    });
  }

  function saveChild(profile, parentId, done){
    if(_.contains(profile.parents, parentId)){
      seneca.make$(PARENT_GUARDIAN_PROFILE_ENTITY).save$(profile, function(err, profile){
        if(err){
          return done(err);
        }

        seneca.make$(PARENT_GUARDIAN_PROFILE_ENTITY).list$({userId: parentId}, function(err, results){
          var parent = results[0];

          if(err){
            return done(err);
          }

          parent.children = parent.children ? parent.children : [];
          parent.children.push(profile.userId);

          parent.save$(function(err){
            if(err){
              return done(err);
            }

            return done(null, profile);
          });
        });

      });
    } else {
      return done('not your child');
    }
  }

  function cmd_list(args, done){
    var query = args.query;
    if(!query.userId){
      return done(new Error('Internal Error'));
    }

    var publicFields = [];

    seneca.make$(PARENT_GUARDIAN_PROFILE_ENTITY).list$({userId: query.userId}, function(err, profiles){
      if(err){
        return done(err);
      }

      var profile = profiles[0];



      if(!profile || !profile.userId){
        return done(new Error('Invalid Profile'));
      }

      var query = {userId: profile.userId};
      seneca.act({role: 'cd-dojos', cmd: 'load_usersdojos', query: {userId: query.userId}}, function(err, usersDojos){
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
                if(err){
                  return callback(err);
                } 
                resolvedChildren.push(results[0]);
                return callback();
              });
            }, function(err){
              if(err){
                return done(err);
              }

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

  function cmd_invite_parent_guardian(args, done){
    var inviteToken = uuid.v4();
    var data = args.data;
    var invitedParentEmail = data.invitedParentEmail;
    var childId = data.childId;
    var requestingParentId = args.user;
    
    var childQuery = {
      userId: childId
    };

    var parentQuery = {
      userId: requestingParentId
    };

    async.waterfall([
      resolveChild,
      resolveRequestingParent,
      updateParentProfile,
      sendEmail,
    ], done);
    //TODO: Add error if child doesnt belong to the parent/guardian
    function resolveChild(done){
      seneca.act({role: plugin, cmd: 'search'}, {query: childQuery}, function(err, results){
        if(err){
          return done(err);
        }

        if(_.isEmpty(results)){
          return done(new Error('Unable to find child profile'));
        }

        if(!_.contains(results[0].parents, args.user)){
          return done(new Error('Not an existing parent or guardian'));
        }

        done(null, results[0]);
      });
    }

    function resolveRequestingParent(childProfile, done){
      seneca.act({role: plugin, cmd: 'search'}, {query: parentQuery}, function(err, results){
        if(err){
          return done(err);
        }

       if(_.isEmpty(results)){
          return done(new Error('Unable to find parent profile'));
        }


        var parentProfile = results[0];
        return done(null, parentProfile, childProfile);
      });
    }

    function updateParentProfile(parentProfile, childProfile, done){
      var timestamp = new Date();
      
      var inviteRequest = {
        token: inviteToken,
        invitedParentEmail: invitedParentEmail,
        childProfileId: childProfile.userId,
        timestamp: timestamp
      };

      if(!parentProfile.inviteRequests){
        parentProfile.inviteRequests = [];
      }

      parentProfile.inviteRequests.push(inviteRequest);
      
      //TODO figure out a way to keep the most recent invite per child and req email
      parentProfile.inviteRequests = _.chain(parentProfile.inviteRequests)
        .sortBy(function(inviteRequest){
          return inviteRequest.timestamp;
        })
        .reverse()
        .value();


      seneca.act({role: plugin, cmd: 'save'}, {profile: parentProfile},function(err, parentProfile){
        if(err){
          return done(err);
        }

        done(err, parentProfile, childProfile, inviteRequest);
      });
    }

    function sendEmail(parentProfile, childProfile, inviteRequest, done){
      if(!childProfile || !parentProfile){
        return done(new Error('An error has occured while sending email'));
      }

      var content = {
        link: 'http://localhost:8000/accept_parent_guardian_request/' + parentProfile.userId + '/' + childProfile.userId + '/' + inviteToken,
        childName: childProfile.name,
        parentName: parentProfile.name 
      };


      var code = 'invite-parent-guardian';
      var to =  inviteRequest.invitedParentEmail;

      seneca.act({role:'email-notifications', cmd: 'send', to:to, content:content, code: code}, done);
    }

  }

  function cmd_accept_invite(args, done){
    var data = args.data;
    var inviteToken = data.inviteToken;
    var childProfileId = data.childProfileId;
    var parentProfileId = data.parentProfileId;

    async.waterfall([
      getParentProfile,
      getChildProfile,
      getInvitedParentProfile,
      validateInvite,
      updateInviteParentProfile,
      updateChildProfile
    ], done);

    function getParentProfile(done){
      seneca.act({role: plugin, cmd: 'search'}, {userId : parentProfileId}, function(err, results){
        if(err){
          return done(err);
        }

        if(_.isEmpty(results)){
          return done(new Error('Invalid invite'));
        }

        var parent =  results[0];

        if(!_.contains(parent.children, childProfileId)){
          return done(new Error('Cannot add child'));
        }

        var inviteRequests = parent.inviteRequests;

        return done(null, inviteRequests);
      });
    }

    function getChildProfile(inviteRequests, done){
      seneca.act({role: plugin, cmd: 'search'}, {userId: childProfileId}, function(err, results){
        if(err){
          return done(err);
        }

        if(_.isEmpty(results)){
          return done(new Error('Invalid invite'));
        }

        return done(null, inviteRequests, results[0]);
      });
    }

    function getInvitedParentProfile (inviteRequests, childProfile, done){
      if(!args && args.user){
        return done(new Error('An error occured while attempting to get profile'));
      }
      seneca.act({role: plugin, cmd: 'search'}, {userId: args.user}, function(err, results){
        if(err){
          return done(err);
        }
        
        if(_.isEmpty(results)){
          return done(new Error('An error occured while attempting to get profile'));
        }

        return done(null, inviteRequests, childProfile, results[0]);
      });
    }


    
    function validateInvite(inviteRequests, childProfile, invitedParent ,done){
      var foundInvite = _.find(inviteRequests, function(inviteRequest){
        return  inviteToken === inviteRequest.inviteToken &&
                childProfile.userId === inviteRequest.childProfileId &&
                invitedParent.email === inviteRequest.invitedParentEmail;
      });
      
      if(!foundInvite){
        return done(new Error('Invalid invite'));
      } else { 
        return done(null, invitedParent, childProfile);
      }
    }

    function updateInviteParentProfile(invitedParent, childProfile, done){
      if(!invitedParent.children) {
        invitedParent.children = [];
      }

      invitedParent.children.push(childProfileId);

      invitedParent.save$(function(err, invitedParent){
        if(err){
          return done(err);
        }

        done(null, invitedParent, childProfile);
      });
    }

    function updateChildProfile(invitedParent, childProfile, done){
      if(!childProfile.parents){
        childProfile.parents = [];
      }

      childProfile.parents.push(invitedParent.userId);

      childProfile.save$(done);
    }
  }



  return {
    name: plugin
  };

};