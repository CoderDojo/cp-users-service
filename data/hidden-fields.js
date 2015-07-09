'use strict';

module.exports = [
  {
    label: 'Hide Dojos',
    allowedUserTypes: ['attendee-o13'],
    name: 'hideDojosCheckbox',
    modelName: 'dojos',
  },
  {
    label: 'Hide Badges',
    allowedUserTypes: ['attendee-o13'],
    name: 'hideBadgesCheckbox',
    modelName: 'badges'
  },
  {
    label: 'Hide Linkedin',
    allowedUserTypes: ['attendee-o13'],
    name: 'hideLinkedinCheckbox',
    modelName: 'linkedin'
  },
  {
    label: 'Hide Twitter',
    allowedUserTypes: ['attendee-o13'],
    name: 'hideTwitterCheckbox',
    modelName: 'twitter'
  },
  {
    label: 'Hide Notes',
    allowedUserTypes: ['champion'],
    name: 'hideNotesCheckbox',
    modelName: 'notes'
  },
  {
    label: 'Hide Projects',
    allowedUserTypes: ['champion'],
    name: 'hideProjectsCheckbox',
    modelName: 'projects'
  }
];