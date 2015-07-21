'use strict';

module.exports = [
  {
    label: 'Hide Dojos',
    allowedUserTypes: ['attendee-o13', 'mentor'],
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
    allowedUserTypes: ['attendee-o13', 'mentor'],
    name: 'hideLinkedinCheckbox',
    modelName: 'linkedin'
  },
  {
    label: 'Hide Twitter',
    allowedUserTypes: ['attendee-o13', 'mentor'],
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
  },
  {
    label: 'Hide Languages Spoken',
    allowedUserTypes: ['champion', 'mentor'],
    name: 'hideLanguagesSpokenCheckbox',
    modelName: 'languagesSpoken'
  },
  {
    label: 'Hide Programming Languages',
    allowedUserTypes: ['mentor'],
    name: 'hideProgrammingLanguagesCheckbox',
    modelName: 'programmingLanguages'
  }
];