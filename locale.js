'use strict';

var methods = {};
var po2json = require('po2json');
var path = require('path');
var Jed = require('jed');
var _ = require('lodash');
var fs = require('fs');

var getTranslator = function(locale) {
  var translators = {};
  if (!translators[locale]) {
    var podata = po2json.parseFileSync(path.join(__dirname, './locale', locale, 'messages.po'), {
      format: 'jed',
      domain: 'coder-dojo-platform'
    });
    translators[locale] = new Jed(podata);
  }

  return translators[locale];
}

methods.getTranslator = getTranslator;

module.exports = methods;