'use strict';

module.exports = function(){
  return {
      'load': [{ role: 'basic-user',
        customValidator: [{
          role: 'cd-users',
          cmd: 'is_self'
        }]
      },
      { role: 'basic-user',
        userType: 'parent-guardian',
        customValidator: [{
          role: 'cd-users',
          cmd: 'is_parent_of',
        }]
      }],
      'register': [{
        role: 'none',
      }],
      'promote': [{
        role: 'cdf-admin',
      }],

      'update': [{
        role: 'basic-user',
        customValidator: [{
          role: 'cd-users',
          cmd: 'is_self'
        }]
      },
      { role: 'basic-user',
        userType: 'parent-guardian',
        customValidator: [{
          role: 'cd-users',
          cmd: 'is_parent_of'
        }]
      }],

      'get_init_user_types': [{
        role: 'none',
      }],
      //  Could be public as champion are public by design
      'is_champion': [{
        role: 'basic-user',
      }],

      'reset_password': [{
        role: 'none',
      }],

      'execute_reset': [{
        role: 'none',
      }],

      'load_champions_for_user': [{
        role: 'basic-user',
        customValidator: [{
          role: 'cd-users',
            cmd: 'is_self'
          }]
        },
        { role: 'basic-user',
          customValidator: [{
            role: 'cd-dojos',
            cmd: 'have_permissions_on_user',
            perm: 'dojo-admin'
          }]
      }, {
        role: 'basic-user',
        customValidator: [
          { role: 'cd-users',
            cmd: 'is_parent_of'
          }]
      }],
      'load_dojo_admins_for_user': [{
        role: 'basic-user',
        customValidator: [
          { role: 'cd-users',
            cmd: 'is_self'
          }]
      }, {
        role: 'basic-user',
        customValidator: [
          { role: 'cd-users',
            cmd: 'is_parent_of'
          }]
      }, {
        role: 'basic-user',
        customValidator: [{
          role: 'cd-dojos',
          cmd: 'have_permissions_on_user',
          perm: 'dojo-admin'
        }]
      }],
      'record_login': [{
        role: 'basic-user',
      }],

      //  TODO: lookup
      'load_prev_founder': [{
        role: 'basic-user',
        //TODO : how to pass a require a context which is not accessible in the first place ?
        // customValidator: [{
        //   role: 'cd-dojos',
        //   cmd: 'have_permissions',
        //   perm: 'dojo-admin'
        // }]
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
      'get_users_by_emails': [{
        role: 'cdf-admin',
      }],
      'get_lms_link': [{
        role: 'basic-user'
      }]
  };
};
