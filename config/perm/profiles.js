'use strict';

module.exports = function(){
  return {
      'create': [{
        role: 'basic-user',
      }],
      'user_profile_data': [{
        role: 'basic-user',
      }],
      'load': [{
        role: 'basic-user',
      }],
      'load_user_profile': [{
        role: 'basic-user',
      }],
      'save-youth-profile': [{
        role: 'basic-user',
        userType: 'parent-guardian'
      }],
      'save': [{
        role: 'basic-user',
      }],
      'update-youth-profile': [{
        role: 'basic-user',
        userType: 'parent-guardian',
        customValidator: [{
          role: 'cd-users',
          cmd: 'is_parent_of'
        }]
      },
      { role: 'basic-user',
        userType: 'attendee-u13',
        customValidator: [{
          role: 'cd-users',
          cmd: 'is_self'
        }]
      },
      { role: 'basic-user',
        userType: 'attendee-o13',
        customValidator: [{
          role: 'cd-users',
          cmd: 'is_self'
        }]
      }],
      'invite-parent-guardian': [{
        role: 'basic-user',
        userType: 'attendee-o13'
      }],

      'accept-parent-invite': [{
        role: 'basic-user',
        userType: 'parent-guardian',
      }],
      // TODO: ??usage
      'search': [{
        role: 'basic-user',

      }],

      'load_hidden_fields': [{
        role: 'basic-user',
        customValidator: [{
          role: 'cd-users',
          cmd: 'is_self'
        }]
      },
      { role: 'cdf-admin'
      }],
      'list': [{
        role: 'basic-user',
      }],
      'change_avatar': [{
        role: 'basic-user',
        customValidator: [{
          role: 'cd-users',
          cmd: 'is_self'
      }]}],
      'get_avatar': [{
        role: 'none',
      }],
      'load_parents_for_user': [{
        role: 'basic-user',
        userType: 'champion'
      },
      { role: 'basic-user',
        customValidator: [{
          role: 'cd-users',
          cmd: 'is_self'
      }]}],
      'invite_ninja': [{
        role: 'basic-user',
        userType: 'parent'
      }],
      'approve_invite_ninja': [{
        role: 'basic-user',
        userType: 'attendee-o13'
      }],

      'ninjas_for_user': [{
        role: 'basic-user',
        userType: 'parent-guardian'
      },
      {
        role: 'basic-user',
        userType: 'champion'
      },
      {
        role: 'basic-user',
        customValidator:[ {
          role: 'cd-users',
          cmd: 'is_self'
      }]}],
  };
};
