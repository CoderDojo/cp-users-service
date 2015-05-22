module.exports = {
  refreshOnSave : true,
  entities: [{
    base: 'sys',
    name: 'user',
    indexedAttributes: {
      'id': {
        type: 'string',
        index: 'not_analyzed'
      },
      'nick': true,
      'email': true,
      'name': true,
      'username': true,
      'activated': true,
      'level': true,
      'first_name': true,
      'last_name': true,
      'roles':true,
      'active': true,
      'phone': true,
      'mailing_list': true,
      'terms_conditions_accepted': true,
      'when': true,
      'confirmed':true,
      'confirmcode':true,
      'admin' : true,
      'modified' : true,
      'accounts' : true,
      'locale' : true,
      'banned' : true,
      'ban_reason' : true
    }
  }]
};