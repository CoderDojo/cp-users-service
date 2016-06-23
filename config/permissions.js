'use strict';

module.exports = function(){
  return {
      'cd-users': require('./perm/users.js')(),
      'cd-profiles': require('./perm/profiles.js')(),

      'auth': {
        'create_reset': [{
          role: 'none',
        }],
      },
      'user': {
        'login': [{
          role: 'none',
        }],
        'logout': [{
          role: 'none',
        }],
      },

  };
};
