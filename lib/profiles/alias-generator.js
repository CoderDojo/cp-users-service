var async = require('async');

module.exports = function(user, profile, done) {
    var seneca = this;
    var lowerCaseFirstName = user.firstName.toLowerCase();
    if (user.nick) return done(null);

    seneca.make('cd_first_name_counter').list$({
        firstName: lowerCaseFirstName
    }, function (err, results) {
        if (err) return done(err);
        var firstNameCount = results[0] || {
            firstName: lowerCaseFirstName,
            userCount: 0
        };
        firstNameCount.userCount++;
        var uniqNicknameFound = false;
        var nickname = user.firstName + firstNameCount.userCount;
        async.whilst(
            function () {
                return !uniqNicknameFound;
            },
            function (cb) {
                seneca.make('sys/user').list$({
                    nick: nickname
                }, function (err, users) {
                    if (err) return cb(err);
                    if (users.length === 0) {
                        uniqNicknameFound = true;
                    } else {
                        firstNameCount.userCount++;
                        nickname = user.firstName + firstNameCount.userCount;
                    }
                    cb(null, nickname);
                });
            },
            function (err) {
                if (err) return done(err);
                user.nick = nickname;
                profile.alias = nickname;
                seneca.make('cd_first_name_counter').save$(firstNameCount, function (err) {
                    if (err) return done(err);
                    done(null);
                });
            }
        );
    });
};