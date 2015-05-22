var plugin = 'cd-users-elasticsearch';

function Elasticsearch() {
  var seneca = this;

  seneca.add({role: plugin, cmd: 'search'}, cmd_search);
}

function cmd_search(args, done) {
  var seneca = this;

  if(!args.type){
    args.type = 'sys_user';
  }
  seneca.act('role:search,cmd:search', args, function(err, result) {
    if(err) {
      return done(err);
    }
    return done(null, result.hits);
  });
}

module.exports = Elasticsearch;

