'use strict';
var async = require('async');
var _ = require('lodash');
var hiddenFields = require('./../../data/hidden-fields.js');

var mentorPublicFields = [
  'id',
  'name',
  'languagesSpoken',
  'programmingLanguages',
  'linkedin',
  'twitter',
  'userTypes',
  'dojos',
  'badges',
  'optionalHiddenFields'
];

var AdultPrivateFields = [
  'email'
];

var championPublicFields = [
  'id',
  'name',
  'languagesSpoken',
  'programmingLanguages',
  'linkedin',
  'twitter',
  'userTypes',
  'projects',
  'notes',
  'dojos',
  'optionalHiddenFields'
];

var attendeeO13PublicFields = [
  'alias',
  'linkedin',
  'twitter',
  'badges',
  'userTypes',
  'optionalHiddenFields'
];

var parentGuardianPublicFields = [
  'id',
  'name',
  'languagesSpoken',
  'programmingLanguages',
  'linkedin',
  'twitter',
  'userTypes',
  'dojos',
  'badges',
  'optionalHiddenFields',
  'children' // this will be removed at a later stage
];

var fieldWhiteList = {
  'mentor': mentorPublicFields,
  'champion': championPublicFields,
  'attendee-o13': attendeeO13PublicFields,
  'parent-guardian': parentGuardianPublicFields
};


  var youthBlackList = ['name'];

  // var allowedOptionalFieldsYouth = ['dojos', 'linkedin', 'twitter', 'badges'];
  var allowedOptionalFieldsYouth = _.filter(hiddenFields, function (field) {
    if (_.contains(field.allowedUserTypes, 'attendee-o13')) return field.modelName;
  });

  // var allowedOptionalFieldsChampion = ['notes', 'projects'];
  var allowedOptionalFieldsChampion = _.map(hiddenFields, function (field) {
    if (_.contains(field.allowedUserTypes, 'champion')) return field.modelName;
  });

  var allowedOptionalFieldsMentor = _.map(hiddenFields, function (field) {
    if (_.contains(field.allowedUserTypes, 'mentor')) return field.modelName;
  });

  var allowedOptionalFields = {
    'champion': allowedOptionalFieldsChampion,
    'attendee-o13': allowedOptionalFieldsYouth,
    'mentor': allowedOptionalFieldsMentor
  };


function cmd_user_profile_data (args, done) {
  var seneca = this;
  var plugin = args.role;
  var query = args.query;
  var ENTITY_NS = 'cd/profiles';
  var flags = {
    myChild : false,
    ownProfile : false,
    isChampion : false,
    isTicketingAdmin : false,
    requestingUserIsChampionOf: false,
    requestingUserIsMentorOf : false,
    requestingUserIsDojoAdminOf : false,
    requestingUserIsTicketingAdminOf : false,
    requestingUserIsCDF : false
  };

  if (!query || !query.userId) {
    return done(null, {error: 'Invalid query.'});
  }

  var publicFields = [];

  async.waterfall([
    getProfile,
    getUser,
    getUsersDojos,
    getDojosForUser,
    assignUserTypesAndUserPermissions,
    addFlags,
    optionalFieldsFilter,
    privateFilter,
    privateFilter,
    publicProfilesFilter,
    under13Filter,
    resolveChildren,
    resolveParents
  ],
    function (err, profile) {
      if (err) return done(null, {error: err});
      return done(null, profile);
    }
  );

  function getProfile (done) {
    var query = args.query;

    seneca.make$(ENTITY_NS).list$({userId: query.userId}, function (err, results) {
      if (err) {
        return done(err);
      }

      var profile = results[0];
      if (!profile || !profile.userId) {
        return done(new Error('Invalid Profile'));
      }

      return done(null, profile);
    });
  }

  function getUser (profile, done) {
    seneca.act({role: 'cd-users', cmd: 'load', id: query.userId, user: args.user}, function (err, user) {
      if (err) return done(err);
      profile.user = user;
      return done(null, profile);
    });
  }

  function getUsersDojos (profile, done) {
    var query = {userId: profile.userId};

    seneca.act({role: 'cd-dojos', cmd: 'load_usersdojos', query: {userId: query.userId}}, function (err, usersDojos) {
      if (err) {
        return done(err);
      }
      return done(null, profile, usersDojos);
    });
  }

  function getDojosForUser (profile, usersDojos, done) {
    seneca.act({role: 'cd-dojos', cmd: 'dojos_for_user', id: profile.userId}, function (err, dojos) {
      if (err) {
        return done(err);
      }

      profile.dojos = _.map(dojos, function (dojo) {
        return {id: dojo.id, name: dojo.name, urlSlug: dojo.urlSlug};
      });

      return done(null, profile, usersDojos);
    });
  }

  function assignUserTypesAndUserPermissions (profile, usersDojos, done) {
    profile.userTypes = [];
    profile.userPermissions = [];

    if (_.isEmpty(usersDojos)) {
      profile.userTypes.push(profile.userType);
    } else {
      profile.userTypes = _.flatten(_.pluck(usersDojos, 'userTypes'));
      profile.userTypes.push(profile.userType);
    }

    profile.userPermissions = usersDojos.userPermissions;

    return done(null, profile);
  }

  function addFlags (profile, done) {
    var userId = args.user ? args.user.id : null;
    flags.ownProfile = profile && profile.userId === userId;
    flags.myChild = _.contains(profile.parents, userId);
    flags.isTicketingAdmin = _.find(profile.userPermissions, function (profileUserPermission) {
      return profileUserPermission.name === 'ticketing-admin';
    });
    if (userId) {
      seneca.act({role: 'cd-users', cmd: 'load', id: userId}, function (err, user) {
        if (err) return done(err);
        if (_.contains(user.roles, 'cdf-admin')) flags.requestingUserIsCDF = true;
        return done(null, profile);
      });
    } else {
      return done(null, profile);
    }
  }

  function optionalFieldsFilter (profile, done) {

    function getProfileDojos (wfCb) {
      seneca.act({role: 'cd-dojos', cmd: 'load_usersdojos', query: {userId: profile.userId}}, function (err, profileDojos) {
        if (err) return done(err);
        return wfCb(null, profileDojos);
      });
    }

    function getRequestingUserDojos (profileDojos, wfCb) {
      if (args.user) {
        var query = {userId: args.user.id};
        console.error(profileDojos);
        if (profileDojos.length) query.dojoId = {in$: _.map(profileDojos, 'dojoId')};
        seneca.act({role: 'cd-dojos', cmd: 'load_usersdojos', query: query},
          function (err, requestingUserDojos) {
            if (err) return done(err);
            return wfCb(null, profileDojos, requestingUserDojos);
        });
      } else {
        return wfCb(null, profileDojos);
      }
    }

    function mapFlags (profileDojos, requestingUserDojos, wfCb) {
      var requestingUser = args.user;
      _.each(requestingUserDojos, function (requestingUserDojo) {
        if (_.contains(requestingUserDojo.userTypes, 'champion')) flags.requestingUserIsChampionOf = true;
        if (_.contains(requestingUserDojo.userTypes, 'mentor')) flags.requestingUserIsMentorOf = true;
        if (_.find(requestingUserDojo.userPermissions, {'title':'Dojo Admin','name':'dojo-admin'})) flags.requestingUserIsDojoAdminOf = true;
        if (_.find(requestingUserDojo.userPermissions, {'title':'Ticketing Admin','name':'ticketing-admin'})) flags.requestingUserIsTicketingAdminOf = true;
      });
      _.each(profileDojos, function (profileDojo) {
        if (_.contains(profileDojo.userTypes, 'champion')) flags.isChampion = true;
        if (_.find(profileDojo.userPermissions, {'title':'Dojo Admin','name':'dojo-admin'})) flags.isDojoAdmin = true;
        if (_.find(profileDojo.userPermissions, {'title':'Ticketing Admin','name':'ticketing-admin'})) flags.isTicketingAdmin = true;
      });
      wfCb(null, profile);
    }

    function filterFields (err, profile) {
      var allowedFields = [];

      if (_.contains(profile.userTypes, 'attendee-o13')) {
        allowedFields = _.union(allowedFields, allowedOptionalFields['attendee-o13']);
      }

      if (_.contains(profile.userTypes, 'champion')) {
        allowedFields = _.union(allowedFields, allowedOptionalFields['champion']);
      }

      if (_.contains(profile.userTypes, 'mentor')) {
        allowedFields = _.union(allowedFields, allowedOptionalFields['mentor']);
      }

      var keysToOmit = [];
      if (!flags.ownProfile && !flags.myChild && !flags.requestingUserIsTicketingAdmin && !flags.requestingUserIsChampionOf && !flags.requestingUserIsDojoAdminOf && !flags.requestingUserIsCDF) {
        _.forOwn(profile.optionalHiddenFields, function (value, key) {
          if (value && _.contains(allowedFields, key)) {
            keysToOmit.push(key);
          }
        });
      }
      console.log('keysToOmit',keysToOmit);
      profile = _.omit(profile, keysToOmit);
      return done(err, profile);
    }

    async.waterfall([
      getProfileDojos,
      getRequestingUserDojos,
      mapFlags
    ], filterFields);
  }

  function privateFilter (profile, done) {
    if (flags.ownProfile || flags.myChild || flags.requestingUserIsTicketingAdmin || flags.requestingUserIsChampionOf || flags.requestingUserIsDojoAdminOf || flags.requestingUserIsCDF) {
      return done(null, profile);
    }

    if (profile.private) {
      console.log('Private filter')
      profile = {};
    }

    return done(null, profile);
  }

  function publicProfilesFilter (profile, done) {
    var publicProfileFlag = !flags.requestingUserIsDojoAdminOf && !flags.requestingUserIsChampionOf &&
     !flags.ownProfile && !flags.myChild && !flags.requestingUserIsTicketingAdmin &&
     !_.contains(profile.userTypes, 'attendee-u13') && !flags.requestingUserIsCDF;

     console.log('publicProfileFlag', publicProfileFlag, profile.userTypes, profile);

    if (publicProfileFlag) {
      _.each(profile.userTypes, function (userType) {
        publicFields = _.union(publicFields, fieldWhiteList[userType]);
      });

      if (_.contains(profile.userTypes, 'attendee-o13')) {
        publicFields = _.remove(publicFields, function (publicField) {
          var idx = youthBlackList.indexOf(publicField);

          return !(idx > -1);
        });
      }

      // Add optional hidden fields to publicFields if they are set to false.
      _.forOwn(profile.optionalHiddenFields, function (value, key) {
        if (!value) {
          publicFields.push(key);
        }
      });

      if (_.contains(profile.userTypes, 'parent-guardian') && (flags.requestingUserIsChampionOf || flags.requestingUserIsDojoAdminOf)) {
        publicFields.concat(AdultPrivateFields);
      }

      profile = _.pick(profile, publicFields);
      return done(null, profile);
    } else {
      return done(null, profile);
    }
  }

  function under13Filter (profile, done) {
    // Ensure that only parents of children can retrieve their full public profile
    var userId = args.user ? args.user.id : null;
    if (_.contains(profile.userTypes, 'attendee-u13') && !flags.myChild &&
      !flags.requestingUserIsChampionOf && !flags.requestingUserIsDojoAdminOf && !flags.ownProfile && !flags.requestingUserIsCDF) {

      console.log('qsdqsd', _.contains(profile.userTypes, 'attendee-u13') , flags.myChild ,
        flags.requestingUserIsChampionOf, flags.requestingUserIsDojoAdminOf , flags.ownProfile);
      profile = {};
    }
    return done(null, profile);
  }

  function resolveChildren (profile, done) {
    var resolvedChildren = [];

    if (!_.isEmpty(profile.children)) {
      async.each(profile.children, function (child, callback) {
        seneca.make$(ENTITY_NS).list$({userId: child}, function (err, results) {
          if (err) {
            return callback(err);
          }
          resolvedChildren.push(results[0]);
          return callback();
        });
      }, function (err) {
        if (err) {
          return done(err);
        }

        _.omit(profile, 'children');
        profile.resolvedChildren = resolvedChildren;

        return done(null, profile);
      });
    } else {
      profile.resolvedChildren = resolvedChildren;

      return done(null, profile);
    }
  }

  function resolveParents (profile, done) {
    var resolvedParents = [];

    if (!_.isEmpty(profile.parents)) {
      async.each(profile.parents, function (parent, callback) {
        seneca.make$(ENTITY_NS).list$({userId: parent}, function (err, results) {
          if (err) {
            return callback(err);
          }
          resolvedParents.push(results[0]);
          return callback();
        });
      }, function (err) {
        if (err) {
          return done(err);
        }

        profile.resolvedParents = resolvedParents;

        return done(null, profile);
      });
    } else {
      profile.resolvedParents = resolvedParents;

      return done(null, profile);
    }
  }
}


module.exports = cmd_user_profile_data;
