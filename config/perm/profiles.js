'use strict';

module.exports = function(){
  return {
      'create': [{
        role: 'basic-user',
        customValidator: [{
          role: 'cd-users',
          cmd: 'is_self'
        }]
      },
      {
        role: 'basic-user',
        userType: 'parent-guardian',
        customValidator: [{
          role: 'cd-users',
          cmd: 'is_parent_of'
        }]
      }],
      'user_profile_data': [{
        role: 'none',
      }],
      'load': [{
        role: 'basic-user',
        customValidator: [{
          role: 'cd-users',
          cmd: 'is_self'
        }]
      }, {
        role: 'basic-user',
        userType: 'parent-guardian',
        customValidator: [{
          role: 'cd-users',
          cmd: 'is_parent_of'
        }]
      }
    ],
      'load_user_profile': [{
        role: 'basic-user',
        customValidator: [{
          role: 'cd-users',
          cmd: 'is_self'
        }]
      }, {
        role: 'basic-user',
        userType: 'parent-guardian',
        customValidator: [{
          role: 'cd-users',
          cmd: 'is_parent_of'
        }]
      }],
      'save': [{
        role: 'basic-user',
      }],
      // Create youth
      'save-youth-profile': [{
        role: 'basic-user'
      }],
      // Update youth
      'update-youth-profile': [{
        role: 'basic-user',
        customValidator: [{
          role: 'cd-users',
          cmd: 'is_parent_of'
        }]
      }, {
        role: 'basic-user',
        customValidator: [{
          role: 'cd-users',
          cmd: 'is_self'
        }]
      }],
      //  TODO : ensure you're calling it for yourself?
      //  TODO : strict mode to avoid the permission hierarchy
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
        role: 'none'
      }],
      'list': [{
        role: 'basic-user',
      }],
      'change_avatar': [{
        role: 'basic-user',
        customValidator: [{
          role: 'cd-profiles',
          cmd: 'is_own_profile'
        }]
      },
      { role: 'basic-user',
        customValidator: [{
          role: 'cd-users',
          cmd: 'is_parent_of'
        }]
      }],
      'get_avatar': [{
        role: 'none',
      }],
      // Relies on user-profile-data data scoping
      'load_parents_for_user': [{
        role: 'basic-user'
      }],
      'load_children_for_user': [{
        role: 'basic-user'
      }],

      'invite_ninja': [{
        role: 'basic-user',
        userType: 'parent-guardian'
      },
      {
        role: 'basic-user',
        userType: 'champion'
      },
      {
        role: 'basic-user',
        userType: 'mentor'
      }],
      //  TODO : check if approved = the one supposed to open
      'approve_invite_ninja': [{
        role: 'basic-user',
        userType: 'attendee-o13'
      }],
      'ninjas_for_user': [{
        role: 'basic-user',
        userType: 'parent-guardian'
      },
      { role: 'basic-user',
        userType: 'champion',
        extendedUserTypes: true
      },
      { role: 'basic-user',
        customValidator:[ {
          role: 'cd-users',
          cmd: 'is_self'
      }]}],
  };
};
