'use strict';

module.exports = function (seneca) {
  seneca.listen()
  .client({type: 'web', port: 10304, pin: {role: 'cd-salesforce', cmd: '*'}})
  .client({type: 'web', port: 10301, pin: {role: 'cd-dojos', cmd: '*'}})
  .client({type: 'web', port: 10305, pin: {role: 'cd-badges', cmd: '*'}});
};
