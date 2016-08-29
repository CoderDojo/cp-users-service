'use strict';
var async = require('async');
var _ = require('lodash');
var request = require('request');
var url = require('url');
var crypto = require('crypto');
var Uuid = require('node-uuid');

/**
 * Update LMS user with the new email to ensure that the linking is not lost upon email update
 * Doesn't "hard fail" as it shouldn't break the profile saving
 * @param  {String}   userEmail
 * @param  {String}   profileEmail
 * @param  {String}   lmsId
 */
function updateUser (args, cb) {
  var seneca = this;
  var plugin = args.role;
  var APIKey = process.env.LMS_KEY;
  var APIUrl = 'https://coderdojo.learnupon.com/api/v1/';
  var LMSUsername = process.env.LMSUsername;
  var LMSPassword = process.env.LMSPassword;
  var oldEmail = args.userEmail;
  var newEmail = args.profileEmail;
  var lmsId = args.lmsId;
  if (!_.isEmpty(lmsId)) {
    request.put(APIUrl + 'users/' + lmsId, {
      auth: {
        user: LMSUsername,
        pass: LMSPassword
      },
      json: {
        User: {
          email: newEmail,
          username: newEmail
          }
        }
      }, function(err, res, lmsUser) {
        if (err) {
          seneca.log.error(new Error(err));
        }
        cb();
    });
  }
}

module.exports = updateUser;
