'use strict';

module.exports = function(){
  return {
      'create': [{
        role: 'basic-user',
      }],
      'user_profile_data': [{
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
      }, {
        role: 'basic-user',
        userType: 'champion',
        extendedUserTypes: true,
        customValidator: [{
          role: 'cd-dojos',
          cmd: 'belongs_to_dojo'
        }]
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
      }, { role: 'basic-user',
        userType: 'attendee-u13',
        customValidator: [{
          role: 'cd-users',
          cmd: 'is_self'
        }]
      }, { role: 'basic-user',
        userType: 'attendee-o13',
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
      }]}],
      'get_avatar': [{
        role: 'none',
      }],
      'load_parents_for_user': [
      { role: 'basic-user',
        userType: 'champion',
        extendedUserTypes: true
      },
      { role: 'basic-user',
        customValidator: [{
          role: 'cd-dojos',
          cmd: 'is_having_perm',
          param: {
            perm: 'dojo-admin'
          }
        }]
      },
      { role: 'basic-user',
        customValidator: [{
          role: 'cd-dojos',
          cmd: 'is_having_perm',
          param: {
            perm: 'ticketing-admin'
          }
        }]
      },
      { role: 'basic-user',
        customValidator: [{
          role: 'cd-users',
          cmd: 'is_self'
        }]
      },
      { role: 'basic-user',
        customValidator: [{
          role: 'cd-users',
          cmd: 'is_parent_of'
        }]
      }],

      'invite_ninja': [{
        role: 'basic-user',
        userType: 'parent-guardian'
      },
      {
        role: 'basic-user',
        userType: 'champion',
        extendedUserTypes: true
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
