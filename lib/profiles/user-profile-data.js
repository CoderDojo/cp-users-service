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
  if (_.includes(field.allowedUserTypes, 'attendee-o13')) return field.modelName;
});

// var allowedOptionalFieldsChampion = ['notes', 'projects'];
var allowedOptionalFieldsChampion = _.map(hiddenFields, function (field) {
  if (_.includes(field.allowedUserTypes, 'champion')) return field.modelName;
});

var allowedOptionalFieldsMentor = _.map(hiddenFields, function (field) {
  if (_.includes(field.allowedUserTypes, 'mentor')) return field.modelName;
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
  var proxyProfile = args.proxyProfile;
  var ENTITY_NS = 'cd/profiles';
  var flags = {
    user: {
      myChild: false,
      ownProfile: false,
      isChampion: false,
      isTicketingAdmin: false,
      isDojoAdmin: false
    },
    // Is champion is a combination
    requestingUser: {
      isChampionOf: false,
      isMentorOf: false,
      isDojoAdminOf: false,
      isTicketingAdminOf: false,
      canBypassPrivate: false,
      isCDF: false
    },
    shared: {
      isChampion: false,
      isMentor: false,
      isDojoAdmin: false,
      isTicketingAdmin: false,
      isParentOf: false,
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
    under13Filter
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
    seneca.act({role: 'cd-users', ctrl: 'user', cmd: 'load', id: query.userId}, function (err, user) {
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
      profile.userTypes = _.flatten(usersDojos.map(ud => ud.userTypes));
      profile.userTypes.push(profile.userType);
    }
    profile.userTypes = _.uniq(profile.userTypes);
    profile.userPermissions = usersDojos.userPermissions;

    return done(null, profile);
  }

  function addFlags (profile, done) {
    var userId = args.user ? args.user.id : null;
    flags.user.ownProfile = profile && profile.userId === userId;
    flags.user.myChild = _.includes(profile.parents, userId);
    flags.user.isTicketingAdmin = _.find(profile.userPermissions, function (profileUserPermission) {
      return profileUserPermission.name === 'ticketing-admin';
    });
    if (userId) {
      seneca.act({role: 'cd-users', cmd: 'load', id: userId}, function (err, user) {
        if (err) return done(err);
        if (_.includes(user.roles, 'cdf-admin')) flags.requestingUser.isCDF = true;
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
        return wfCb(null, profileDojos, requestingUserDojos, null);
      }
    }

    function mapFlags (profileDojos, requestingUserDojos, requestingUserProfile, wfCb) {
      var requestingUser = args.user;
      var requestingUserSharedDojos = _.filter(_.clone(requestingUserDojos), function (relationshipDojo) {
        return _.find(profileDojos, {dojoId: relationshipDojo.dojoId}) || _.find(profile.user.joinRequests, {dojoId: relationshipDojo.dojoId});
      });
      // Nearly the same but the relationship (perm/userType) are different
      var viewedUserSharedDojos = _.filter(_.clone(profileDojos), function (relationshipDojo) {
        return _.find(requestingUserDojos, {dojoId: relationshipDojo.dojoId});
      });

      // We look at viewer rights
      _.each(requestingUserSharedDojos, function (requestingUserDojo) {
        if (_.includes(requestingUserDojo.userTypes, 'champion')) flags.requestingUser.isChampionOf = true;
        if (_.includes(requestingUserDojo.userTypes, 'mentor')) flags.requestingUser.isMentorOf = true;
        if (_.find(requestingUserDojo.userPermissions, {'title': 'Dojo Admin', 'name': 'dojo-admin'})) flags.requestingUser.isDojoAdminOf = true;
        if (_.find(requestingUserDojo.userPermissions, {'title': 'Ticketing Admin', 'name': 'ticketing-admin'})) flags.requestingUser.isTicketingAdminOf = true;
      });

      // Viewed user flags
      _.each(profileDojos, function (profileDojo) {
        if (_.includes(profileDojo.userTypes, 'champion')) flags.user.isChampion = true;
        if (_.find(profileDojo.userPermissions, {'title': 'Dojo Admin', 'name': 'dojo-admin'})) flags.user.isDojoAdmin = true;
        if (_.find(profileDojo.userPermissions, {'title': 'Ticketing Admin', 'name': 'ticketing-admin'})) flags.user.isTicketingAdmin = true;
      });

      // We look at relationship between user and viewer
      _.each(viewedUserSharedDojos, function (sharedProfileDojo) {
        if (_.find(sharedProfileDojo.userPermissions, {'title': 'Dojo Admin', 'name': 'dojo-admin'})) flags.shared.isDojoAdmin = true;
        if (_.find(sharedProfileDojo.userPermissions, {'title': 'Ticketing Admin', 'name': 'ticketing-admin'})) flags.shared.isTicketingAdmin = true;
      });

      flags.shared.isParentOf = _.includes(profile.parents, requestingUser.id);
      flags.shared.isChildrenOf = _.includes(profile.children, requestingUser.id);

      wfCb(null, profile, requestingUserProfile);
    }

    function filterFields (err, profile, requestingUserProfile) {
      var allowedFields = [];

      if (_.includes(profile.userTypes, 'attendee-o13')) {
        allowedFields = _.union(allowedFields, allowedOptionalFields['attendee-o13']);
      }

      if (_.includes(profile.userTypes, 'champion')) {
        allowedFields = _.union(allowedFields, allowedOptionalFields['champion']);
      }

      if (_.includes(profile.userTypes, 'mentor')) {
        allowedFields = _.union(allowedFields, allowedOptionalFields['mentor']);
      }

      var keysToOmit = [];
      if (!flags.user.ownProfile && !flags.user.myChild && !flags.requestingUser.isTicketingAdmin &&
         !flags.requestingUser.isChampionOf && !flags.requestingUser.isDojoAdminOf && !flags.requestingUser.isCDF) {
        _.forOwn(profile.optionalHiddenFields, function (value, key) {
          if (value && _.includes(allowedFields, key)) {
            keysToOmit.push(key);
          }
        });
      }
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
    flags.shared.isFamily =
    // Kid -> parent
    _.some(profile.parents, function (parent) {
      return _.includes(requestingUserProfile.parents, parent) &&
        (proxyProfile ? _.includes(proxyProfile.children, requestingUserProfile.userId) : true);
    }) ||
    flags.shared.isParentOf || flags.shared.isChildrenOf ||
    // parent -> kid
    // This is to connect 2 parents so that they can see each other on their kid profile
    // This imply that if you share ANY kid, you'll see the other person profile
    _.some(profile.children, function (child) {
      return _.includes(requestingUserProfile.children, child) &&
        (proxyProfile ? _.includes(proxyProfile.parents, requestingUserProfile.userId) : true);
    });
    flags.requestingUser.canBypassFilter = flags.requestingUser.isDojoAdminOf || flags.requestingUser.isChampionOf ||
      flags.user.ownProfile || flags.user.myChild || flags.requestingUser.isTicketingAdminOf || flags.requestingUser.isCDF || flags.shared.isFamily;

    flags.requestingUser.canBypassPrivate = flags.requestingUser.canBypassFilter ||
    // We exclude visibility of o13 champs
    ((flags.shared.isChampion || flags.shared.isDojoAdmin || flags.shared.isTicketingAdmin) && !_.includes(profile.userTypes, 'attendee-o13'));

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
    if (!flags.requestingUser.canBypassFilter && !_.includes(profile.userTypes, 'attendee-u13')) {
      // Build the list of fields to pick
      _.each(profile.userTypes, function (userType) {
        publicFields = _.union(publicFields, fieldWhiteList[userType]);
      });

      if (_.includes(profile.userTypes, 'attendee-o13')) {
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
    if (_.includes(profile.userTypes, 'attendee-u13') && !flags.requestingUser.canBypassFilter) {
      profile = {};
    }
    return done(null, profile);
  }
}

module.exports = cmd_user_profile_data;
