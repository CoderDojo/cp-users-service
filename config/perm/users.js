'use strict';

module.exports = function(){
  return {
      'load': [{
        role: 'basic-user',
        userTypes: 'champion'
      },
      { role: 'basic-user',
        // customValidator: [{
        //   role: 'cd-users',
        //   cmd: 'is_self'
        // }]
      },
      { role: 'basic-user',
        userType: 'parent',
        // customValidator: [{
        //   role: 'cd-users',
        //   cmd: 'is_parent_of',
        // }]
      }],
      'list': [{
        role: 'basic-user',
        userTypes: 'champion'
      }],
      'register': [{
        role: 'none',
      }],
      'promote': [{
        role: 'cdf-admin',
      }],

      'get_users_by_emails': [{
        role: 'basic-user',
        userTypes: 'champion'
      },
      { role: 'basic-user',
        permissions: ['dojo-admin']
      }],

      'update': [{
        role: 'basic-user',
        customValidator: [{
          role: 'cd-users',
          cmd: 'is_self'
        }]
      },
      { role: 'basic-user',
        userType: 'parent',
        customValidator: [{
          role: 'cd-users',
          cmd: 'is_parent_of'
        }]
      }],

      'get_init_user_types': [{
        role: 'none',
      }],

      'is_champion': [{
        role: 'basic-user',
      }],

      'reset_password': [{
        role: 'none',
      }],

      'execute_reset': [{
        role: 'none',
      }],

      //  TODO: lookup
      'load_champions_for_user': [{
        role: 'basic-user',
      }],

      'record_login': [{
        role: 'basic-user',
      }],

      //  TODO: lookup
      'load_prev_founder': [{
        role: 'cdf-admin',
      }],
      'kpi_number_of_youths_registered': [{
        role: 'cdf-admin',
      }],
      'kpi_number_of_champions_and_mentors_registered': [{
        role: 'cdf-admin',
      }],
      'kpi_number_of_youth_females_registered': [{
        role: 'cdf-admin',
      }],
  };
};
