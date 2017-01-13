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
  'badges',
  'dojos',
  'optionalHiddenFields'
];

var attendeeO13PublicFields = [
  'id',
  'name',
  'alias',
  'linkedin',
  'twitter',
  'badges',
  'userTypes',
  'dojos',
  'parents',
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
  'children'
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
    user: {
      myChild : false,
      ownProfile : false,
      isChampion : false,
      isTicketingAdmin : false,
      isDojoAdmin : false
    },
    // Is champion is a combination
    requestingUser: {
      isChampionOf: false,
      isMentorOf : false,
      isDojoAdminOf : false,
      isTicketingAdminOf : false,
      canBypassPrivate: false,
      isCDF : false
    },
    shared: {
      isChampion: false,
      isMentor : false,
      isDojoAdmin : false,
      isTicketingAdmin : false,
      isParentOf : false,
      isChildrenOf: false,
      isFamily: false
    }
  };

  if (!query || !query.userId) {
    return done(null, {err: 'Invalid query.'});
  }

  var publicFields = [];

  async.waterfall([
    // Setup context
    getProfile,
    getUser,
    getUsersDojos,
    getDojosForUser,
    assignUserTypesAndUserPermissions,
    addFlags,
    optionalFieldsFilter,
    aggregateFlags,
    // Filter
    privateFilter,
    publicProfilesFilter,
    under13Filter,
    // Extend Data
    resolveChildren,
    resolveParents
  ],
    function (err, profile) {
      console.log('finalCb', err, profile);
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
    seneca.act({role: 'cd-dojos', cmd: 'load_usersdojos', query: {userId: profile.userId}}, function (err, usersDojos) {
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
    flags.user.ownProfile = profile && profile.userId === userId;
    flags.user.myChild = _.contains(profile.parents, userId);
    flags.user.isTicketingAdmin = _.find(profile.userPermissions, function (profileUserPermission) {
      return profileUserPermission.name === 'ticketing-admin';
    });
    if (userId) {
      seneca.act({role: 'cd-users', cmd: 'load', id: userId}, function (err, user) {
        if (err) return done(err);
        if (_.contains(user.roles, 'cdf-admin')) flags.requestingUser.isCDF = true;
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
        if (profileDojos.length) query.dojoId = {in$: _.map(profileDojos, 'dojoId')};
        seneca.act({role: 'cd-dojos', cmd: 'load_usersdojos', query: query},
          function (err, requestingUserDojos) {
            if (err) return done(err);
            return wfCb(null, profileDojos, requestingUserDojos);
        });
      } else {
        return wfCb(null, profileDojos, null);
      }
    }

    function getRequestingUserProfile (profileDojos, requestingUserDojos, wfCb) {
      if (args.user) {
        seneca.act({role: 'cd-profiles', cmd: 'load_user_profile', userId: args.user.id},
          function (err, requestingUserProfile) {
            if (err) return done(err);
            return wfCb(null, profileDojos, requestingUserDojos, requestingUserProfile);
        });
      } else {
        return wfCb(null, profileDojos, null, null);
      }
    }

    function mapFlags (profileDojos, requestingUserDojos, requestingUserProfile, wfCb) {
      var requestingUser = args.user;
      // We look at viewer rights
      _.each(requestingUserDojos, function (requestingUserDojo) {
        if (_.contains(requestingUserDojo.userTypes, 'champion')) flags.requestingUser.isChampionOf = true;
        if (_.contains(requestingUserDojo.userTypes, 'mentor')) flags.requestingUser.isMentorOf = true;
        if (_.find(requestingUserDojo.userPermissions, {'title':'Dojo Admin','name':'dojo-admin'})) flags.requestingUser.isDojoAdminOf = true;
        if (_.find(requestingUserDojo.userPermissions, {'title':'Ticketing Admin','name':'ticketing-admin'})) flags.requestingUser.isTicketingAdminOf = true;
      });
      // Viewed user flags
      _.each(profileDojos, function (profileDojo) {
        if (_.contains(profileDojo.userTypes, 'champion')) flags.user.isChampion = true;
        if (_.find(profileDojo.userPermissions, {'title':'Dojo Admin','name':'dojo-admin'})) flags.user.isDojoAdmin = true;
        if (_.find(profileDojo.userPermissions, {'title':'Ticketing Admin','name':'ticketing-admin'})) flags.user.isTicketingAdmin = true;
      });
      // We look at relationship between user and viewer
      _.find(requestingUserDojos, function (requestingUserDojo) {
        var sharedProfileDojos = _.filter(profileDojos, function (profileDojo) {
          return profileDojo.dojoId === requestingUserDojo.dojoId;
        });
        _.each(sharedProfileDojos, function (sharedProfileDojo) {
          if (_.find(sharedProfileDojo.userPermissions, {'title':'Dojo Admin','name':'dojo-admin'})) flags.shared.isDojoAdmin = true;
          if (_.find(sharedProfileDojo.userPermissions, {'title':'Ticketing Admin','name':'ticketing-admin'})) flags.shared.isTicketingAdmin = true;
        });
      });

      flags.shared.isParentOf = _.includes(profile.parents, requestingUser.id)
      flags.shared.isChildrenOf = _.includes(profile.children, requestingUser.id);

      wfCb(null, profile, requestingUserProfile);
    }

    function filterFields (err, profile, requestingUserProfile) {
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
      if (!flags.user.ownProfile && !flags.user.myChild && !flags.requestingUser.isTicketingAdmin &&
         !flags.requestingUser.isChampionOf && !flags.requestingUser.isDojoAdminOf && !flags.requestingUser.isCDF) {
        _.forOwn(profile.optionalHiddenFields, function (value, key) {
          if (value && _.contains(allowedFields, key)) {
            keysToOmit.push(key);
          }
        });
      }
      console.log('keysToOmit',keysToOmit);
      profile = _.omit(profile, keysToOmit);
      return done(err, profile, requestingUserProfile);
    }

    async.waterfall([
      getProfileDojos,
      getRequestingUserDojos,
      getRequestingUserProfile,
      mapFlags
    ], filterFields);
  }

  function aggregateFlags (profile, requestingUserProfile, done) {
    flags.shared.isFamily = _.some(profile.parents, function (parent) {
      return _.includes(requestingUserProfile.parents, parent);
    }) || flags.shared.isParentOf || flags.shared.isChildrenOf;

    flags.requestingUser.canBypassFilter = flags.requestingUser.isDojoAdminOf || flags.requestingUser.isChampionOf ||
      flags.user.ownProfile || flags.user.myChild || flags.requestingUser.isTicketingAdminOf || flags.requestingUser.isCDF ||flags.shared.isFamily;

    flags.requestingUser.canBypassPrivate = flags.requestingUser.canBypassFilter || flags.shared.isChampion || flags.shared.isDojoAdmin || flags.shared.isTicketingAdmin;
    return done(null, profile);
  }

  function privateFilter (profile, done) {
    if (profile.private && !flags.requestingUser.canBypassPrivate) {
      profile = {};
    }
    return done(null, profile);
  }

  /**
   * [publicProfilesFilter removes fields based upon whitelist
   * if the user is noone of the
   * @param  {[type]}   profile [description]
   * @param  {Function} done    [description]
   * @return {[type]}           [description]
   */
  function publicProfilesFilter (profile, done) {

    if (!flags.requestingUser.canBypassFilter && !_.contains(profile.userTypes, 'attendee-u13')) {
      // Build the list of fields to pick
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
      profile = _.pick(profile, publicFields);
      return done(null, profile);
    } else {
      // We return the full profile, without picking fields
      return done(null, profile);
    }
  }

  /**
  * under13Filter ensure that only allowed people can retrieve their full public profile
  * @param  {[type]}   profile [description]
  * @param  {Function} done    [description]
  * @return {[type]}           [description]
  */
  function under13Filter (profile, done) {
    if (_.contains(profile.userTypes, 'attendee-u13') && !flags.requestingUser.canBypassFilter) {
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
