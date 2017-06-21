var async = require('async');
/**
 * Resave sys_user structure for those affected by https://github.com/CoderDojo/community-platform/issues/1202
 */
module.exports = function (args, done) {
  var seneca = this;
  var plugin = args.role;
  var entity = seneca.make$('sys_user');
  entity.native$(function (err, client, release) {
    var finishUp = function (err) {
      release();
      done(err);
    };
    if (err) finishUp(err);
    client.query('SELECT p.id, u.id as userId FROM cd_profiles p JOIN sys_user u on u.id = p.user_id WHERE u.name != p.name;',
    function (err, res) {
      if (err) finishUp(err);
      async.each(res.rows, function (faulty, eCb) {
        async.waterfall([
          // Recover originalProfile
          function (wfCb) {
            seneca.act({role: plugin, cmd: 'load', id: faulty.id}, function (err, profile) {
              if (err) eCb(err);
              wfCb(null, profile);
            });
          },
          // Recover original user for perm bypass
          function (profile, wfCb) {
            // it's not a typo, camelCase is not applied through native$
            seneca.act({role: 'cd-users', cmd: 'load', id: faulty.userid}, function (err, user) {
              if (err) eCb(err);
              wfCb(null, profile, user);
            });
          },
          // re-Save profiles
          function (profile, user, wfCb) {
            if (['attendee-o13', 'attendee-u13'].indexOf(profile.userType) > -1) {
              seneca.act({role: plugin, cmd: 'update-youth-profile', profile: profile, user: user}, wfCb);
            } else {
              seneca.act({role: plugin, cmd: 'create', profile: profile, user: user}, wfCb);
            }
          }
        ], eCb);
      }, finishUp);
    });
  });
};
