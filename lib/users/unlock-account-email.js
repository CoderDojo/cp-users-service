const moment = require('moment');

const protocol = process.env.PROTOCOL || 'http';
const zenHostname = process.env.HOSTNAME || '127.0.0.1:8000';

function unlockAccountEmail(args, done) {
  const seneca = this;
  const email = args.email;

  seneca.act({ role: 'cd-users', cmd: 'get_users_by_email', email }, (err, users) => {
    if (err) return done(err);
    seneca.act({ role: 'email-notifications', cmd: 'send' }, {
      code: 'user-lockout-',
      locality: args.locality || 'en_US',
      to: email,
      subject: 'CoderDojo Zen Account Lockout',
      content: {
        name: users[0].name,
        resetlink: `${protocol}://${zenHostname}/reset_password`,
        year: moment(new Date()).format('YYYY'),
      },
    }, (err, response) => {
      if (err) return done(err);
      return done(null, { ok: true });
    });
  });
}

module.exports = unlockAccountEmail;
