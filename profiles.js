'use strict';

var pg = require('pg');
var LargeObjectManager = require('pg-large-object').LargeObjectManager;
var shortid = require('shortid');
var moment = require('moment');

module.exports = function (options) {
  var seneca = this;

  var ENTITY_NS = 'cd/profiles';
  var plugin = 'cd-profiles';
  var _ = require('lodash');
  var async = require('async');
  var hiddenFields = require('./data/hidden-fields.js');

  var syncedFields = [
    'name',
    'email',
    'phone'
  ];

  var immutableFields = ['userType', 'avatar'];

  var requiredProfileFields = ['name', 'alias', 'dob', 'country', 'place'];

  // var userTypes = ['champion', 'mentor', 'parent-guardian', 'attendee-o13', 'attendee-u13'];
  // var userTypes = ['attendee-u13', 'attendee-o13', 'parent-guardian', 'mentor', 'champion'];

  seneca.add({role: plugin, cmd: 'create'}, cmd_create);
  seneca.add({role: plugin, cmd: 'user_profile_data'}, require('./lib/profiles/user-profile-data'));
  seneca.add({role: plugin, cmd: 'load'}, cmd_load);
  seneca.add({role: plugin, cmd: 'load_user_profile'}, cmd_load_user_profile);
  seneca.add({role: plugin, cmd: 'save-youth-profile'}, cmd_save_youth_profile);
  seneca.add({role: plugin, cmd: 'save'}, cmd_save);
  seneca.add({role: plugin, cmd: 'update-youth-profile'}, cmd_update_youth);
  seneca.add({role: plugin, cmd: 'invite-parent-guardian'}, cmd_invite_parent_guardian);
  seneca.add({role: plugin, cmd: 'search'}, cmd_search);
  seneca.add({role: plugin, cmd: 'accept-parent-invite'}, cmd_accept_parent_invite);
  seneca.add({role: plugin, cmd: 'load_hidden_fields'}, cmd_load_hidden_fields);
  seneca.add({role: plugin, cmd: 'list'}, cmd_list);
  seneca.add({role: plugin, cmd: 'change_avatar'}, cmd_change_avatar);
  seneca.add({role: plugin, cmd: 'get_avatar'}, cmd_get_avatar);
  seneca.add({role: plugin, cmd: 'load_parents_for_user'}, require('./lib/profiles/load-parents-for-user'));
  seneca.add({role: plugin, cmd: 'load_children_for_user'}, require('./lib/profiles/load-children-for-user'));
  seneca.add({role: plugin, cmd: 'invite_ninja'}, cmd_invite_ninja);
  seneca.add({role: plugin, cmd: 'approve_invite_ninja'}, cmd_approve_invite_ninja);
  // Legacy call, replaced by load_children_for_user
  seneca.add({role: plugin, cmd: 'ninjas_for_user'}, require('./lib/profiles/load-children-for-user'));
  //  Perms
  seneca.add({role: plugin, cmd: 'is_own_profile'}, require('./lib/profiles/is-own-profile'));

  function cmd_search (args, done) {
    if (!args.query) {
      return done(new Error('Empty query'));
    }

    seneca.make$(ENTITY_NS).list$(args.query, done);
  }

  function cmd_create (args, done) {
    var profile = args.profile;
    if (!args.user) return done(null, {ok: false, why: 'args.user is undefined'});

    async.series([
      validateRequest,
      saveProfile
    ], function (err, res) {
      if (err) return done(null, {ok: false, why: err.message});
      return done(null, res);
    });

    function validateRequest (done) {
      var profileEntity = seneca.make$(ENTITY_NS);
      profileEntity.load$(profile.id, function (err, originalProfile) {
        if (err) return done(err);
        if (!originalProfile) return done();
        if (originalProfile.email !== profile.email) {
          seneca.act({role: 'cd-users', cmd: 'list', query: {nick: profile.email}}, function (err, users) {
            if (err) return done(err);
            if (!_.isEmpty(users)) return done(new Error('This email is already associated with an account.'));
            return done();
          });
        } else {
          return done();
        }
      });
    }

    function saveProfile (done) {
      var userId = args.user ? args.user.id : null;
      if (userId !== profile.userId) return done(null, new Error('Profiles can only be saved by the profile user.'));

      var cleanedProfile = _.omit(profile, 'user');
      // Fields accessible from saveProfile that needs to be passed down to the user entity
      if (profile.id) {
        cleanedProfile = _.omit(cleanedProfile, immutableFields);
      }
      seneca.act({role: plugin, cmd: 'save', profile: cleanedProfile}, function (err, retProfile) {
        if (err) return done(err);
        if (process.env.SALESFORCE_ENABLED === 'true') {
          seneca.act({ role: 'cd-profiles', cmd: 'load', id: profile.id }, function (err, fullProfile) {
            if (err) return done(err);
            if (fullProfile.userType.toLowerCase() === 'champion') {
              seneca.act({role: 'cd-salesforce', cmd: 'queud_update_profiles', param: {profile: fullProfile}, fatal$: false});
            }
          });
        }
        //  TODO: use seneca-mesh to avoid coupling the integration to the user
        if (args.user && !_.isEmpty(retProfile.email) && args.user.lmsId && args.user.email !== retProfile.email) {
          seneca.act({role: 'cd-users', cmd: 'update_lms_user', lmsId: args.user.lmsId, userEmail: args.user.email, profileEmail: retProfile.email});
        }
        syncUserObj(profile, function (err, res) {
          if (err) return done(err);

          syncForumProfile(retProfile, function (err, res) {
            if (err) seneca.log.error(err);
            var query = {userId: profile.userId};
            seneca.act({role: plugin, cmd: 'load'}, query, done);
          });
        });
      });
    }
  }

  function syncUserObj (profile, done) {
    var updatedFields = {};
    var userFields = ['mailingList'];
    updatedFields.id = profile.userId;
    _.each(syncedFields, function (field) {
      updatedFields[field] = profile[field];
    });
    _.extend(updatedFields, _.pick(profile.user, userFields));
    if (updatedFields.email) updatedFields.nick = profile.email;
    seneca.act({role: 'cd-users', cmd: 'update', user: updatedFields}, done);
  }

  function syncForumProfile (profile, done) {
    var forumProfile = _.clone(profile);
    forumProfile.username = forumProfile.name;
    seneca.act({role: 'cd-nodebb-api', cmd: 'update', user: forumProfile, id: forumProfile.userId}, done);
  }

  function cmd_save_youth_profile (args, done) {
    var profile = args.profile;
    var userId = args.user ? args.user.id : null;
    profile.parents = [];
    profile.parents.push(userId);

    if (profile.id) {
      profile = _.omit(profile, immutableFields);
    }

    var initUserType = profile.userTypes[0];
    var password = profile.password;

    var nick = profile.alias || profile.name;
    profile.name = profile.firstName && profile.lastName ? profile.firstName + ' ' + profile.lastName : profile.name;

    var user = {
      name: profile.name,
      firstName: profile.firstName,
      lastName: profile.lastName,
      nick: nick,
      email: profile.email,
      initUserType: {name: initUserType},
      password: password,
      roles: ['basic-user']
    };

    function registerUser (youth, done) {
      if (youth) {
        delete user.email;
        delete user.password;
      }

      seneca.act({role: 'user', cmd: 'register'}, user, function (err, data) {
        if (err) return done(err);
        if (!data.ok) return done(data.why);

        profile.userId = data && data.user && data.user.id;
        profile.userType = data && data.user && data.user.initUserType && data.user.initUserType.name;

        profile = _.omit(profile, ['userTypes', 'password']);
        _.defaults(profile, {private: true});
        var userId = args.user ? args.user.id : null;
        saveChild(profile, userId, done);
      });
    }

    function addUserToParentsDojos (profile, done) {
      var parentsDojos = [];
      var userType = profile.userType;
      async.each(profile.parents, function (parent, cb) {
        // Load parents dojos
        var query = {userId: parent};

        seneca.act({role: 'cd-dojos', cmd: 'load_usersdojos', query: query}, function (err, usersDojos) {
          if (err) return done(err);
          _.each(usersDojos, function (userDojo) {
            parentsDojos.push(userDojo.dojoId);
          });
          cb();
        });
      }, function (err) {
        if (err) return done(err);
        async.each(parentsDojos, function (parentDojo, cb) {
          var userDojo = {
            userId: profile.userId,
            owner: 0,
            dojoId: parentDojo,
            userTypes: [userType]
          };
          seneca.act({role: 'cd-dojos', cmd: 'save_usersdojos', userDojo: userDojo, user: args.user}, cb);
        }, function (err, res) {
          if (err) return done(err);
          return done(null, profile);
        });
      });
    }

    if (initUserType === 'attendee-o13') {
      async.waterfall([
        async.apply(registerUser, false),
        addUserToParentsDojos
      ], function (err, res) {
        if (err) return done(null, {error: err});
        return done(null, res);
      });
    } else if (initUserType === 'attendee-u13') {
      async.waterfall([
        async.apply(registerUser, true),
        addUserToParentsDojos
      ], function (err, res) {
        if (err) return done(null, {error: err});
        return done(null, res);
      });
    }
  }

  function cmd_update_youth (args, done) {
    var profile = args.profile;
    var derivedFields = ['password', 'userTypes', 'myChild', 'ownProfileFlag', 'dojos'];

    var fieldsToBeRemoved = _.union(derivedFields, immutableFields);

    profile = _.omit(profile, fieldsToBeRemoved);
    var cleanedProfile = _.omit(profile, 'user');
    seneca.act({role: plugin, cmd: 'save', profile: cleanedProfile}, function (err, savedProfile) {
      if (err) {
        return done(err);
      }

      syncUserObj(profile, function (err, res) {
        if (err) return done(err);

        return done(null, profile);
      });
    });
  }

  function saveChild (profile, parentId, done) {
    if (_.contains(profile.parents, parentId)) {
      seneca.make$(ENTITY_NS).save$(profile, function (err, profile) {
        if (err) {
          return done(err);
        }

        seneca.make$(ENTITY_NS).list$({userId: parentId}, function (err, results) {
          var parent = results[0];

          if (err) {
            return done(err);
          }

          parent.children = parent.children ? parent.children : [];
          parent.children.push(profile.userId);

          parent.save$(function (err) {
            if (err) {
              return done(err);
            }

            return done(null, profile);
          });
        });
      });
    } else {
      return done(new Error('Cannot save child'));
    }
  }

  function cmd_save (args, done) {
    var profile = args.profile;

    var profileKeys = _.keys(profile);
    var missingKeys = _.difference(requiredProfileFields, profileKeys);
    if (_.isEmpty(missingKeys)) profile.requiredFieldsComplete = true;
    profile.name = profile.firstName && profile.lastName ? profile.firstName + ' ' + profile.lastName : profile.name;

    seneca.make$(ENTITY_NS).save$(profile, done);
  }

  function cmd_invite_parent_guardian (args, done) {
    var data = args.data;
    var invitedParentEmail = data.invitedParentEmail;
    var childId = data.childId;
    var emailSubject = data.emailSubject;
    var zenHostname = process.env.HOSTNAME || '127.0.0.1:8000';

    var childQuery = {
      userId: childId
    };

    async.waterfall([
      resolveParent,
      resolveChild,
      updateChildProfile,
      sendEmail
    ], function (err, result) {
      if (err) return done(null, {ok: false, why: err.message});
      return done(null, result);
    });

    function resolveParent (done) {
      seneca.act({role: plugin, cmd: 'search', query: {email: invitedParentEmail}}, function (err, results) {
        if (err) return done(err);
        return done(null, results[0]);
      });
    }

    function resolveChild (parentProfile, done) {
      if (!parentProfile) return done(new Error('Parent profile does not exist.'));
      seneca.act({role: plugin, cmd: 'search'}, {query: childQuery}, function (err, results) {
        if (err) return done(err);
        if (_.isEmpty(results)) return done(new Error('Unable to find child profile'));
        return done(null, parentProfile, results[0]);
      });
    }

    function updateChildProfile (parentProfile, childProfile, done) {
      var inviteToken = {
        id: shortid.generate(),
        childId: childId,
        parentId: parentProfile.userId,
        parentEmail: invitedParentEmail,
        timestamp: new Date()
      };

      if (!childProfile.parentInvites) childProfile.parentInvites = [];
      childProfile.parentInvites.push(inviteToken);
      childProfile.parentInvites = _.chain(childProfile.parentInvites)
        .sortBy(function (parentInvite) {
          return parentInvite.timestamp;
        })
        .reverse()
        .uniq(function (parentInvite) {
          return parentInvite.parentEmail;
        })
        .value();

      seneca.act({role: plugin, cmd: 'save', profile: childProfile}, function (err, result) {
        if (err) return done(err);
        return done(null, parentProfile, result, inviteToken);
      });
    }

    function sendEmail (parentProfile, childProfile, inviteToken, done) {
      if (!childProfile || !parentProfile) return done(new Error('An error has occured while sending email'));

      var content = {
        link: 'http://' + zenHostname + '/dashboard/accept_parent_guardian_request/' + childProfile.id + '/' + inviteToken.id,
        childName: childProfile.name,
        parentName: parentProfile.name,
        year: moment(new Date()).format('YYYY')
      };

      var locality = args.locality || 'en_US';
      var code = 'invite-parent-guardian-';
      var to = invitedParentEmail;
      seneca.act({role: 'email-notifications', cmd: 'send', to: to, content: content, code: code, locality: locality, subject: emailSubject}, done);
    }
  }

  function cmd_accept_parent_invite (args, done) {
    var data = args.data;
    var inviteTokenId = data.inviteToken;
    var childProfileId = data.childProfileId;
    var requestingUserId = args.user ? args.user.id : null;

    async.waterfall([
      validateRequestingUserIsParent,
      loadInvite,
      updateParentProfile,
      updateNinjaProfile,
      removeInviteToken
    ], function (err, res) {
      if (err) return done(null, {ok: false, why: err.message});
      return done(null, res);
    });

    function validateRequestingUserIsParent (done) {
      seneca.act({role: plugin, cmd: 'list', query: {userId: requestingUserId}}, function (err, requestingUserProfiles) {
        if (err) return done(err);
        var requestingUserProfile = requestingUserProfiles[0];
        if (requestingUserProfile && requestingUserProfile.userType === 'parent-guardian') return done();
        seneca.act({role: 'cd-dojos', cmd: 'load_usersdojos', query: {userId: requestingUserId}}, function (err, usersDojos) {
          if (err) return done(err);
          var parentTypeFound = _.find(usersDojos, function (userDojo) {
            return _.contains(userDojo.userTypes, 'parent-guardian');
          });
          if (parentTypeFound) return done();
          return done(new Error('You must have the parent/guardian user type to accept this invite'));
        });
      });
    }

    function loadInvite (done) {
      seneca.act({role: plugin, cmd: 'load', id: childProfileId}, function (err, childProfile) {
        if (err) return done(err);
        var inviteTokenFound = _.find(childProfile.parentInvites, function (parentInvite) {
          return parentInvite.id === inviteTokenId;
        });
        if (!inviteTokenFound) return done(new Error('Invite token not found'));
        if (requestingUserId !== inviteTokenFound.parentId) return done(new Error('Only the invited parent can approve this request.'));
        return done(null, inviteTokenFound);
      });
    }

    function updateParentProfile (inviteToken, done) {
      seneca.act({role: plugin, cmd: 'list', query: {userId: inviteToken.parentId}}, function (err, parentProfiles) {
        if (err) return done(err);
        var parentProfile = parentProfiles[0];
        if (!parentProfile.children) parentProfile.children = [];
        parentProfile.children.push(inviteToken.childId);
        parentProfile.children = _.uniq(parentProfile.children);
        seneca.act({role: plugin, cmd: 'save', profile: parentProfile}, function (err, parentProfile) {
          if (err) return done(err);
          return done(null, inviteToken);
        });
      });
    }

    function updateNinjaProfile (inviteToken, done) {
      seneca.act({role: plugin, cmd: 'list', query: {userId: inviteToken.childId}}, function (err, ninjaProfiles) {
        if (err) return done(err);
        var ninjaProfile = ninjaProfiles[0];
        if (!ninjaProfile.parents) ninjaProfile.parents = [];
        ninjaProfile.parents.push(inviteToken.parentId);
        ninjaProfile.parents = _.uniq(ninjaProfile.parents);
        seneca.act({role: plugin, cmd: 'save', profile: ninjaProfile}, done);
      });
    }

    function removeInviteToken (ninjaProfile, done) {
      ninjaProfile.parentInvites = _.without(ninjaProfile.parentInvites, _.findWhere(ninjaProfile.parentInvites, {id: inviteTokenId}));
      seneca.act({role: plugin, cmd: 'save', profile: ninjaProfile}, done);
    }
  }

  function cmd_load_hidden_fields (args, done) {
    done(null, hiddenFields);
  }

  function cmd_change_avatar (args, done) {
    var hostname = process.env.HOSTNAME || '127.0.0.1:8000';
    var file = args.file;

    if (!_.contains(args.fileType, 'image')) return done(null, {ok: false, why: 'Avatar upload: file must be an image.'});
    if (file.length > 5242880) return done(null, {ok: false, why: 'Avatar upload: max file size of 5MB exceeded.'});

    var buf = new Buffer(file, 'base64');
    var type = buf.toString('hex', 0, 4);
    var types = ['ffd8ffe0', '89504e47', '47494638'];
    if (!_.contains(types, type)) return done(null, {ok: false, why: 'Avatar upload: file must be an image of type png, jpeg or gif.'});

    // pg conf properties
    options.postgresql.database = options.postgresql.name;
    options.postgresql.user = options.postgresql.username;

    pg.connect(options.postgresql, function (err, client) {
      if (err) { return seneca.log.error('Could not connect to postgres', err); }

      var man = new LargeObjectManager(client);

      client.query('BEGIN', function (err) {
        if (err) {
          seneca.log.error('Unable to create transaction');
          done(err);
          return;
        }

        var bufferSize = 16384;
        man.createAndWritableStream(bufferSize, function (err, oid, stream) {
          var noop = function () {};
          var avatarInfo = {
            oid: oid.toString(),
            sizeBytes: 0,
            name: args.fileName,
            type: args.fileType
          };

          if (err) {
            seneca.log.error('Unable to create a new large object');
            client.end();
            done(err);
            done = noop;
            return;
          }

          stream.write(buf, 'base64', function () {
            stream.end();
          });

          stream.on('data', function (chunk) {
            seneca.log.info('got ' + chunk.length + ' bytes of data');
            avatarInfo.sizeBytes += chunk.length;
          });

          stream.on('finish', function () {
            seneca.log.info('Uploaded largeObject. committing...', oid);
            client.query('COMMIT', function () {
              client.end();
              seneca.log.info('Saved LargeObject', oid);

              // update profile record with avatarInfo
              var profile = {
                id: args.profileId,
                avatar: avatarInfo
              };

              seneca.act({role: plugin, cmd: 'save'}, {profile: profile}, function (err, profile) {
                if (err) {
                  return done(err);
                }

                seneca.make$(ENTITY_NS).load$(profile.id, function (err, profile) {
                  if (err) seneca.log.error(err);

                  var protocol = process.env.PROTOCOL || 'http';

                  var forumProfile = _.clone(profile);
                  forumProfile.username = forumProfile.name;

                  forumProfile.uploadedpicture = protocol + '://' + hostname + '/api/1.0/profiles/' + profile.id + '/avatar_img';
                  forumProfile.picture = protocol + '://' + hostname + '/api/1.0/profiles/' + profile.id + '/avatar_img';

                  seneca.act({role: 'cd-nodebb-api', cmd: 'update', user: forumProfile, id: forumProfile.userId}, function (err, res) {
                    if (err) seneca.log.error(err);
                    if (res.error) seneca.log.error('NodeBB Profile Sync Error: ' + res.error);

                    done(undefined, profile);
                    done = noop;
                  });
                });
              });
            });
          });

          stream.on('error', function (err) {
            seneca.log.error('postgresql filestore error', err);
            done(err);
            done = noop;
          });
        });
      });
    });
  }

  function cmd_get_avatar (args, done) {
    var profileId = args.id;

    // pg conf properties
    options.postgresql.database = options.postgresql.name;
    options.postgresql.user = options.postgresql.username;

    seneca.act({role: plugin, cmd: 'load'}, {id: profileId}, function (err, profile) {
      if (err) {
        return done(err);
      }

      if (profile && profile.avatar) {
        pg.connect(options.postgresql, function (err, client) {
          if (err) {
            seneca.log.error('Unable to connect to postgresql', err);
            return done(err);
          }

          var man = new LargeObjectManager(client);

          client.query('BEGIN', function (err) {
            if (err) {
              seneca.log.error('Unable to create transaction', err);
              client.end();
              return done(err);
            }

            // If you are on a high latency connection and working with
            // large LargeObjects, you should increase the buffer size
            var bufferSize = 16384;
            man.openAndReadableStream(profile.avatar.oid, bufferSize, function (err, size, stream) {
              if (err) {
                seneca.log.error('Unable to open readable stream', err);
                client.end();
                return done(err);
              }
              var bufs = [];

              stream.on('data', function (d) {
                bufs.push(d);
              });

              stream.on('end', function () {
                client.query('COMMIT', function () {
                  client.end();
                });

                var buf = bufs.length > 1 ? Buffer.concat(bufs) : Buffer(bufs[0]);
                done(null, {imageData: buf.toString('base64'), imageInfo: profile.avatar});
              });
            });
          });
        });
      } else {
        done();
      }
    });
  }

  function cmd_load_user_profile (args, done) {
    seneca.make$(ENTITY_NS).load$({userId: args.userId}, done);
  }

  function cmd_load (args, done) {
    seneca.make$(ENTITY_NS).load$(args.id, done);
  }

  function cmd_list (args, done) {
    var query = args.query || {};
    if (!query.limit$) query.limit$ = 'NULL';

    var profilesEntity = seneca.make$(ENTITY_NS);
    profilesEntity.list$(query, done);
  }

  function cmd_invite_ninja (args, done) {
    var seneca = this;
    var ninjaData = args.ninjaData;
    var ninjaEmail = ninjaData.ninjaEmail;
    var emailSubject = ninjaData.emailSubject;
    var ninjaProfile;
    var inviteToken;

    async.waterfall([
      validateInviteRequest,
      loadParentProfile,
      addTokenToParentProfile,
      emailNinja
    ], function (err, res) {
      if (err) return done(null, {ok: false, why: err.message});
      return done(null, res);
    });

    function validateInviteRequest (done) {
      // Requesting user should have parent-guardian user type.
      // Ninja email should exist in cd_profiles.
      // Ninja should have attendee-o13 user type.
      async.series([
        validateRequestingUserIsNotParentOfNinja,
        validateNinjaEmailExists,
        validateNinjaHasAttendeeO13UserType
      ], done);

      function validateRequestingUserIsNotParentOfNinja (done) {
        seneca.act({role: plugin, cmd: 'list', query: {email: ninjaEmail}}, function (err, ninjaProfiles) {
          if (err) return done(err);
          var ninjaProfile = ninjaProfiles[0];
          var userId = args.user ? args.user.id : null;
          if (ninjaProfile && _.contains(ninjaProfile.parents, userId)) return done(new Error('User is already a parent of this Ninja'));
          return done();
        });
      }

      function validateNinjaEmailExists (done) {
        seneca.act({role: plugin, cmd: 'list', query: {email: ninjaEmail}}, function (err, ninjaProfiles) {
          if (err) return done(err);
          if (_.isEmpty(ninjaProfiles)) return done(new Error('Invalid invite request. Ninja email does not exist.'));
          ninjaProfile = ninjaProfiles[0];
          return done();
        });
      }

      function validateNinjaHasAttendeeO13UserType (done) {
        seneca.act({role: 'cd-dojos', cmd: 'load_usersdojos', query: {userId: ninjaProfile.userId}}, function (err, ninjaUsersDojos) {
          if (err) return done(err);
          var attendeeO13TypeFound = _.find(ninjaUsersDojos, function (ninjaUserDojo) {
            return _.contains(ninjaUserDojo.userTypes, 'attendee-o13');
          });
          if (attendeeO13TypeFound || ninjaProfile.userType === 'attendee-o13') return done();
          return done(new Error('Ninja must be an over 13 attendee'));
        });
      }
    }

    function loadParentProfile (validationResponse, done) {
      var userId = args.user ? args.user.id : null;
      seneca.act({role: plugin, cmd: 'list'}, {query: {userId: userId}}, done);
    }

    function addTokenToParentProfile (parentProfiles, done) {
      var parentProfile = parentProfiles[0];
      inviteToken = {
        id: shortid.generate(),
        ninjaEmail: ninjaEmail,
        parentProfileId: parentProfile.id,
        timestamp: new Date()
      };

      if (!parentProfile.ninjaInvites) parentProfile.ninjaInvites = [];
      parentProfile.ninjaInvites.push(inviteToken);
      parentProfile.ninjaInvites = _.chain(parentProfile.ninjaInvites)
        .sortBy(function (ninjaInvite) {
          return ninjaInvite.timestamp;
        })
        .reverse()
        .uniq(function (ninjaInvite) {
          return ninjaInvite.ninjaEmail;
        })
        .value();
      seneca.act({role: plugin, cmd: 'save', profile: parentProfile}, done);
    }

    function emailNinja (parentProfile, done) {
      var zenHostname = process.env.HOSTNAME || '127.0.0.1:8000';
      var content = {
        ninjaName: ninjaProfile.name,
        parentName: parentProfile.name,
        parentEmail: parentProfile.email,
        link: 'http://' + zenHostname + '/dashboard/approve_invite_ninja/' + inviteToken.parentProfileId + '/' + inviteToken.id,
        year: moment(new Date()).format('YYYY')
      };
      var locality = args.locality || 'en_US';
      var code = 'invite-ninja-over-13-';
      seneca.act({role: 'email-notifications', cmd: 'send', to: ninjaEmail, content: content, code: code, locality: locality, subject: emailSubject}, done);
    }
  }

  function cmd_approve_invite_ninja (args, done) {
    var seneca = this;
    var inviteData = args.data;
    var ninjaProfile;
    var parentProfile;

    async.series([
      validateRequest,
      updateNinjaAndParentProfiles,
      addNinjaToParentsDojos
    ], done);

    function validateRequest (done) {
      seneca.act({role: plugin, cmd: 'load', id: inviteData.parentProfileId}, function (err, response) {
        if (err) return done(err);
        parentProfile = response;
        if (!parentProfile.ninjaInvites) return done(new Error('No invite tokens exist for this profile'));
        var inviteTokenFound = _.find(parentProfile.ninjaInvites, function (ninjaInvite) {
          return ninjaInvite.id === inviteData.inviteTokenId;
        });
        if (!inviteTokenFound) return done(new Error('Invalid token'));
        var userId = args.user ? args.user.id : null;
        seneca.act({role: plugin, cmd: 'list', query: {userId: userId}}, function (err, ninjaProfiles) {
          if (err) return done(err);
          ninjaProfile = ninjaProfiles[0];
          if (ninjaProfile.email !== inviteTokenFound.ninjaEmail) return done(new Error('You cannot approve invite Ninja requests for other users.'));
          return done();
        });
      });
    }

    function updateNinjaAndParentProfiles (done) {
      // Add parent user id to Ninja parents array
      // Add ninja user id to Parent children array
      if (!parentProfile.children) parentProfile.children = [];
      parentProfile.children.push(ninjaProfile.userId);
      parentProfile.ninjaInvites = _.without(parentProfile.ninjaInvites, _.findWhere(parentProfile.ninjaInvites, {id: inviteData.inviteTokenId}));

      if (!ninjaProfile.parents) ninjaProfile.parents = [];
      ninjaProfile.parents.push(parentProfile.userId);

      seneca.act({role: plugin, cmd: 'save', profile: parentProfile}, function (err, response) {
        if (err) return done(err);
        seneca.act({role: plugin, cmd: 'save', profile: ninjaProfile}, done);
      });
    }

    function addNinjaToParentsDojos (done) {
      seneca.act({role: 'cd-dojos', cmd: 'load_usersdojos', query: {userId: parentProfile.userId}}, function (err, parentUsersDojos) {
        if (err) return done(err);
        async.each(parentUsersDojos, function (parentUserDojo, cb) {
          seneca.act({role: 'cd-dojos', cmd: 'load_usersdojos', query: {userId: ninjaProfile.userId, dojoId: parentUserDojo.dojoId}}, function (err, ninjaUsersDojos) {
            if (err) return cb(err);
            if (!_.isEmpty(ninjaUsersDojos)) return cb(); // Ninja is already a member of this Dojo.
            var userDojo = {
              owner: 0,
              userId: ninjaProfile.userId,
              dojoId: parentUserDojo.dojoId,
              userTypes: ['attendee-o13']
            };
            seneca.act({role: 'cd-dojos', cmd: 'save_usersdojos', userDojo: userDojo, user: args.user}, cb);
          });
        }, done);
      });
    }
  }

  return {
    name: plugin
  };
};
