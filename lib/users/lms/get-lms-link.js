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
  var APIUrl = 'https://coderdojo.learnupon.com/api/v1/';
  var hash = crypto.createHash('md5');
  var response = {
    'url': ''
  };
  var LMSUsername = process.env.LMSUsername;
  var LMSPassword = process.env.LMSPassword;

  /**
   * GetLMSUser or Create it if it doesn't exists
   * @return {Number} lmsUserId
   * @return {Array} UserTypes as GroupMembership
   */
  function getUser (waterfallCb) {
    var userTypes = [];
    var allowedUserTypes = ['mentor', 'champion'];
    seneca.act({role: 'cd-profiles', cmd: 'load_user_profile', userId: user.id},
      function (err, profile) {
        userTypes = [profile.userType];
        //  Get extended userTypes
        seneca.act({role: 'cd-dojos', cmd: 'load_usersdojos', query:{ userId: user.id}},
          function (err, userDojos) {
            userTypes = _.flatten(userTypes.concat(_.map(userDojos, 'userTypes')));
            userTypes = _.intersection(userTypes, allowedUserTypes);
            console.log('inters', userTypes, allowedUserTypes);
            if (!_.isEmpty(userTypes)) {
              if (_.isEmpty(user.lmsId)) {
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
                  }, function(err, res, lmsUser) {
                    seneca.act({role: 'cd-users', cmd: 'update', user: {
                      id: user.id,
                      lmsId: lmsUser.id
                    }}, function (err, profile) {
                      waterfallCb(null, lmsUser.id, userTypes);
                    });
                  });
              } else {
                //  The user already exists in the LMS, no need to recreate it
                waterfallCb(null, user.lmsId, userTypes);
              }
            } else {
              cb(null, {ok: false, why: 'UserType not allowed', http$: { status: 403}});
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
      json: {
        GroupMembership: {user_id: lmsUserId}
      }
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
    async.eachSeries(userTypesToSync, function(userType, serieCb){
      request.get(APIUrl+ 'groups?title=' + userType, {
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
    var baseUrl = 'https://coderdojo.learnupon.com/sqsso';
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
