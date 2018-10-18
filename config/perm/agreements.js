'use strict';

module.exports = function(){
  return {
    'load': [{
      role: 'basic-user',
      customValidator: [{
        role: 'cd-agreements',
        cmd: 'is_own_agreement',
      }],
    }],
    
    'save': [{
      role: 'basic-user',
    }],
    'count': [{
      role: 'cdf-admin',
    }],
    'loadUserAgreement': [{
      role: 'basic-user',
      customValidator: [{
        role: 'cd-users',
        cmd: 'is_self'
      }]
    }],
    'list': [{
      role: 'cdf-admin',
    }],
    'getVersion': [{
      role: 'none',
    }]
  };
};
