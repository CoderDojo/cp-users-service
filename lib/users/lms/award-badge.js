'use strict';
var async = require('async');
var _ = require('lodash');

/**
 * Webhook handler to award badges based on courses
 * Courses "Code" must correspond to the badge slug
 * @param  {Object} certificate contains all the info, header/user/course passed
 */
function awardLMSBadge (args, cb) {
  var seneca = this;
  var plugin = args.role;
  var certif = args;
  var user = certif.user;

  function checkTestStatus (waterfallCb) {
    if (certif.header.webHookType !== 'course_completion')
      return cb(null, 'Unhandled webhook');
    if (certif.enrollmentStatus !== 'passed' && certif.enrollmentStatus !== 'completed' )
      return cb(null, 'Unhandled status');
    waterfallCb(null, certif.courseReferenceCode);
  }

  function getBadge (badgeName, waterfallCb) {
    seneca.act({role: 'cd-badges', cmd: 'getBadge', slug: badgeName},
      function (err, badge) {
        if (err) return cb(err);
        waterfallCb(null, badge);
    });
  }

  function getUser (badge, waterfallCb) {
    seneca.act({role: 'cd-users', cmd: 'list', query: {lmsId: user.userId}},
      function (err, sysUser) {
        if (err) return cb(err);
        if (_.isEmpty(sysUser)) return cb(null, {ok: false, why: 'LMSUser not found'});
        return waterfallCb(null, sysUser[0], badge);
    });
  }

  function awardBadge (sysUser, badge, waterfallCb) {
    var applicationData = {
      user: sysUser,
      badge: badge.badge,
      emailSubject: 'You have been awarded a new CoderDojo digital badge!'
    };
    seneca.act({role: 'cd-badges', cmd: 'sendBadgeApplication',
        applicationData: applicationData,
        user: {id: null}
      },
      function (err, user) {
        if (err) return cb(err);
        waterfallCb();
    });
  }


  async.waterfall([
    checkTestStatus,
    getBadge,
    getUser,
    awardBadge
  ], cb);

}

module.exports = awardLMSBadge;
