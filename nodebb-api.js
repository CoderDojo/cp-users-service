'use strict';

var querystring = require('querystring');
var http = require('http');
var _ = require('lodash');
var util = require('util');

module.exports = function(options){
  var seneca = this;
  var plugin = 'cd-nodebb-api';

  this.add({role: plugin, cmd: 'map_id'}, cmd_map_id);
  this.add({role: plugin, cmd: 'update'}, cmd_update);
  this.add({role: plugin, cmd: 'gen_token'}, cmd_gen_token);
  this.add({role: plugin, cmd: 'get_tokens'}, cmd_get_tokens);


  // FOR REF SEE:
  // https://github.com/NodeBB/nodebb-plugin-write-api
  // https://github.com/NodeBB/nodebb-plugin-write-api/blob/master/routes/v1/readme.md
  // http://localhost:4567/admin/plugins/write-api

  var host = options.host || 'localhost';
  var port = options.port || 4567;
  var master_token = options.apiToken;
  var base_path = '/api/v1/';

  function cmd_map_id(args, done) {
    if (!args.user) return handleErr(new Error('no user specified'), done);
    var target_user = args.user
    var querying_user = target_user; // at the moment there is no difference because we use master token for all
    
    var qs = querystring.stringify({
      _uid: querying_user,
      app: 'CoderDojo'
    });

    sendReq({
      path: base_path + 'users/' + target_user + '/external?' + qs,
    }, function(err, res){
      if (err) return handleErr(err, done);
      if (!res.payload.uid) return handleErr(new Error('user not found: ' + target_user), done)
      done(null, res.payload.uid);
    });
  }

  function cmd_update(args, done) {
    if (!args.user) return handleErr(new Error('no user specified'), done);
    var target_user = args.user.userId;
    var data = args.user;
    cmd_map_id({ user: target_user }, function(err, uid){
      if (uid.error) return handleErr(uid.error, done);
      target_user = uid;
      var querying_user = target_user; // at the moment there is no difference because we use master token for all
      // e.g.
      // var data = {
      //   username: 'admin2',
      //   email: 'admin2@example.com'
      // });

      data = querystring.stringify(data);

      sendReq({
        path: base_path + 'users/' + target_user + '?_uid=' + querying_user,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(data)
        },
        data: data
      }, function(err, res){
        if (err) return handleErr(err, done);
        if (res.message) return handleErr(res.message, done);
        done(null, args.user);
      });
    });
  }

  function cmd_get_tokens(args, done) {
    if (!args.user) return handleErr(new Error('no user specified'), done);
    var target_user = args.user;
    cmd_map_id({ user: target_user }, function(err, uid){
      if (uid.error) return handleErr(uid.error, done);
      target_user = uid;
      var querying_user = target_user; // at the moment there is no difference because we use master token for all
      sendReq({
        path: base_path + 'users/' + target_user + '/tokens?_uid=' + querying_user,
      }, function(err, res){
        if (err) return handleErr(err, done);
        done(null, res.payload.tokens);
      });
    });
  }

  // at some stage we may want to ensure there is only one token
  // *currently not used as master token is used for all
  function cmd_gen_token(args, done) {
    if (!args.user) return handleErr(new Error('no user specified'), done);
    var target_user = args.user;
    cmd_map_id({ user: target_user }, function(err, uid){
      if (uid.error) return handleErr(uid.error, done);
      target_user = uid;
      var querying_user = target_user; // at the moment there is no difference because we use master token for all
      sendReq({
        path: base_path + 'users/' + target_user + '/tokens?_uid=' + querying_user,
        method: 'POST'
      }, function(err, res){
        if (err) return handleErr(err, done);
        done(null, res.payload.token);
      });
    });
  }

  function sendReq(options, done) {
    // Note: not-authorised occurs usually when
    // authorization: 'Bearer dc729193-f80c-4c5f-b75c-7a70f16b6e7e'
    // is missing from the header
    // also take note of difference between user token and master token
    // or possibly wrong combination of querying_user and target_user
    // it also takes place sometimes simply because plugin source code is just bad:
    //    in there, validations in users.js often end up being false because 1 !== '1'

    var options = prepReq(options);

    var req = http.request(options, function(response) {
      var str = '';
      response.on('data', function (chunk) {
        str += chunk;
      });
      response.on('end', function () {
        var res;
        try {
          res = JSON.parse(str);
        } catch(e){
          return done(new Error('response parsing err: ' + e + ' in "' + str + '"'))
        }
        if (res.code === 'not-authorised') return done(res.code + ', ' + res.message + ' Probably due to invalid master token')
        done(null, res);
      });
    });
    req.on('error', function(err) {
      return done(err + ' while accessing ' + util.inspect(options));
    });

    if (options.data) req.write(options.data);
    req.end();
  }

  function prepReq(args) {
    var options = {
      host: host,
      port: port,
      headers: {
        authorization: 'Bearer ' + master_token, // ideally we want each user to use their own token and use master only to generate new tokens, right?
      }
    };

    // merge base options with args
     return _.merge(options, args);
  }

  function handleErr(err, cb){
    return cb(null, { error: err });
  }

  return {
    name: plugin
  };
}