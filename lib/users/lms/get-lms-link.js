'use strict';
var async = require('async');
var _ = require('lodash');
var request = require('request');
var url = require('url');
var crypto = require('crypto');
var Uuid = require('node-uuid');

/**
 * Produce an link usable for SQSSO for Learnupon by
 * * retrieving or creating the user IF he's allowed to access the LMS
 * * synchronize the groups
 * to hence provide a link that'll log the user into the LMS,
 * with the courses corresponding to its userTypes
 * @param  {Object}   user
 * @return {Object}   url  contains the link to redirect to consume the SQSSO
 */
function getLMSLink (args, cb) {
  var seneca = this;
  var plugin = args.role;
  var APIKey = process.env.LMS_KEY;
  var user = args.user;
  var APIUrl = process.env.LMS_API_URL;
  var hash = crypto.createHash('md5');
  var response = {
    'url': ''
  };
  var LMSUsername = process.env.LMSUsername;
  var LMSPassword = process.env.LMSPassword;
  /**
   * GetLMSUser or Create it if it doesn't exists
   * or invite it if already exists in LMS but not in CoderDojo Portal
   * @return {Number} lmsUserId
   * @return {Array} UserTypes as GroupMembership
   */
  function getUser (waterfallCb) {
    var userTypes = [];
    var allowedUserTypes = ['mentor', 'champion', 'parent-guardian'];
    seneca.act({role: 'cd-profiles', cmd: 'load_user_profile', userId: user.id},
      function (err, profile) {
        userTypes = [profile.userType];
        //  Get extended userTypes
        seneca.act({role: 'cd-dojos', cmd: 'load_usersdojos', query:{ userId: user.id}},
          function (err, userDojos) {
            userTypes = _.flatten(userTypes.concat(_.map(userDojos, 'userTypes')));
            userTypes = _.intersection(userTypes, allowedUserTypes);
            async.waterfall([
              isAllowed,
              isNotRegistered,
              approvedSharing,
              isExisting
            ]);
            // Conditions determinating the workflow to get the user
            function isAllowed (wfCb) {
              if (!_.isEmpty(userTypes)) {
                return wfCb();
              } else {
                return cb(null, {ok: false, why: 'UserType not allowed', http$: {status: 403}});
              }
            }

            function isNotRegistered (wfCb) {
              if (_.isEmpty(user.lmsId)) {
                return wfCb();
              } else {
                //  The user already exists in the LMS, no need to recreate it
                //  After that, we simply recheck the group membership
                return waterfallCb(null, user.lmsId, userTypes);
              }
            }

            function approvedSharing (wfCb) {
              if (!_.isEmpty(args.approval)) {
                return wfCb();
              } else {
                return cb(null, {approvalRequired: true});
              }
            }

            function isExisting (wfCb) {
              request.get(APIUrl + 'users/search?email=' + encodeURIComponent(user.email), {
                auth: {
                  user: LMSUsername,
                  pass: LMSPassword
                },
                json: true,
              }, function (err, res, LMSUser) {
                if (LMSUser && !_.isEmpty(LMSUser.user)) {
                  // We need to sync up the LMS id into our system
                  return updateUser(LMSUser.user[0].id);
                } else {
                  // We need to create the user & update the LMSUserId into our system
                  return createUser();
                }
              });
            }

            // Processes to apply according to the user status

            /**
             * Create a LMS user based on Zen user details
             * @return {[type]}      [description]
             */
            function createUser () {
              //  The user doesn't exists yet on the LMS, we create it to save the corresponding Id
              request.post(APIUrl + 'users', {
                auth: {
                  user: LMSUsername,
                  pass: LMSPassword
                },
                json: {
                  User: {
                    email: user.email,
                    password: Uuid() }
                  }
                }, function(err, res, response) {
                  if (response && response.response_type === 'ERROR' && response.response_code === 400) {
                    return inviteUser();
                  } else {
                    return updateUser(response.id);
                  }
              });
            }

            /**
             * Update a Zen user to save the LmsId
             * @param  {String} lmsUserId
             * @return {[type]}         [description]
             */
            function updateUser (lmsUserId) {
              seneca.act({role: 'cd-users', cmd: 'update', user: {
                id: user.id,
                lmsId: lmsUserId
              }}, function (err, profile) {
                return waterfallCb(null, lmsUserId, userTypes);
              });
            }

            /**
             * Invite an existing LMS user into our Portal
             * @return exit act
             */
            function inviteUser () {
              // We assume that inviting multiple time the same user won't break shit
              async.eachSeries(userTypes, function (userType, serieCb) {
                request.get(APIUrl + 'groups?title=' + userType, {
                  auth: {
                    user: LMSUsername,
                    pass: LMSPassword
                  },
                  json: true
                }, function (err, res, group) {
                  group = group.groups[0];
                  request.post(APIUrl + 'group_invites', {
                    auth: {
                      user: LMSUsername,
                      pass: LMSPassword
                    },
                    json: {
                      GroupInvite: {
                        email_addresses: user.email,
                        group_membership_type_id: 1, // Type: Learner
                        group_id: group.id
                      }
                    }
                  }, function (err, res, body) {
                    return serieCb();
                  });
                }
              );
            }, function (err, res, body) {
              return cb(null, {ok: false, why: 'An invitation has been sent by email', http$: {status: 400}});
            });
          }
        });
    });
  }

  /**
   * Recover actual membership on LMS
   * @param  {Number} lmsUserId
   * @param  {Array} userTypes
   * @param  {Fn} waterfallCb
   */
  function getUserMemberships (lmsUserId, userTypes, waterfallCb) {
    // Get the user in LearnUpon
    request.get(APIUrl + 'group_memberships?user_id=' + lmsUserId, {
      auth: {
        user: LMSUsername,
        pass: LMSPassword
      },
      json: true
    }, function(err, res, groups) {
          var subscribedGroups = _.map(groups.group, 'title');
          var userTypesToSync = _.difference(userTypes, subscribedGroups);
          waterfallCb(null, lmsUserId, userTypesToSync);
      });
  }

  /**
   * Update LMS groups corresponding to the users' ones that arent synced yet
   * @param  {Number} lmsUserId
   * @param  {Array} userTypesToSync
   * @param  {Fn} waterfallCb
   */
  function updateGroup (lmsUserId, userTypesToSync, waterfallCb) {
    //  Get GroupId
    async.eachSeries(userTypesToSync, function (userType, serieCb) {
      request.get(APIUrl + 'groups?title=' + userType, {
        auth: {
          user: LMSUsername,
          pass: LMSPassword
        },
        json: true
      }, function (err, res, group) {
        group = group.groups[0];
        //  Update group membership
        request.post(APIUrl + 'group_memberships', {
          auth: {
            user: LMSUsername,
            pass: LMSPassword
          },
          json: {
            GroupMembership: {
              group_id: group.id,
              user_id: lmsUserId}
          }
        }, serieCb);
      });
    }, function (err, res) {
      waterfallCb();
    });
  }

  /**
   * Build an URL using the SQSSO login for LearnUpon
   * @param  {Function} cb waterfall callback
   */
  function buildURL (waterfallCb) {
    var email = user.email;
    var userName = user.name;
    var baseUrl = process.env.LMS_URL;
    var TS = Date.now();
    hash.update('USER='+ email +'&TS='+ TS +'&KEY='+ APIKey);
    var SSOToken = hash.digest('hex');
    response.url = url.format(
      _.extend(url.parse(baseUrl),
      {
      'query': {
        'Email': email,
        'SSOUserName': email,
        'SSOToken': SSOToken,
        'TS': TS,
        //  TODO: use those when we have real FirstName and LastName in the db
        // 'FirstName': userName,
        // 'LastName': userName
      }
    }));
    waterfallCb();
  }

  if (!_.isEmpty(LMSUsername) &&
      !_.isEmpty(LMSPassword) &&
      !_.isEmpty(APIKey)) {
        async.waterfall([
          getUser,
          getUserMemberships,
          updateGroup,
          buildURL
        ], function () {
          return cb(null, response);
        });
  } else {
    cb(new Error('Missing LMS env keys'));
  }
}

module.exports = getLMSLink;
