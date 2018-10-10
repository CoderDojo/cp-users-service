'use strict';

module.exports = function(){
  return {
    'load': [{
      role: 'basic-user',
    }],
    
    'save': [{
      role: 'basic-user',
    }],
    'count': [{
      role: 'cdf-admin',
    }],
    'loadUserAgreement': [{
      role: 'basic-user',
    }],
    'list': [{
      role: 'cdf-admin',
    }],
    'getVersion': [{
      role: 'none',
    }]
  };
};
