'use strict';

var lab = exports.lab = require('lab').script();
var chai = require('chai');
var expect = chai.expect;
chai.use(require('sinon-chai'));
var sinon = require('sinon');
var aliasGen = require(__dirname + '/../lib/profiles/alias-generator');

lab.experiment('Alias Generator', { timeout: 5000}, function () {
    var sandbox;
    var senecaStub;
    var aliasGenerator;

    lab.beforeEach(function (done) {
        sandbox = sinon.sandbox.create();
        senecaStub = {
            act: sandbox.stub(),
            make: sandbox.stub()
        };
        aliasGenerator = aliasGen.bind(senecaStub);
        done();
    });

    lab.afterEach(function (done) {
        sandbox.restore();
        done();
    });

    lab.test('should create a nick with the next available number if it does not exist and the nick is not taken', function (done) {
        // ARRANGE
        var userWithNoNick = {
            firstName: 'Foo'
        };
        var profileWithNoAlias = {};
        var userEntityMock = {
            list$: sandbox.stub()
        };
        var firstNameCounterEntityMock = {
            list$: sandbox.stub(),
            save$: sandbox.stub()
        };
        senecaStub.make.withArgs('cd_first_name_counter').returns(firstNameCounterEntityMock);
        firstNameCounterEntityMock.list$.callsFake(function (query, cb) {
            expect(query).to.deep.equal({
                firstName: userWithNoNick.firstName.toLowerCase()
            });
            cb(null, [{
                id: 'abc',
                firstName: 'foo',
                userCount: 5
            }]);
        });
        firstNameCounterEntityMock.save$.callsFake(function (ent, cb) {
            cb(null, ent);
        });
        senecaStub.make.withArgs('sys/user').returns(userEntityMock);
        userEntityMock.list$.callsFake(function (query, cb) {
            expect(query).to.deep.equal({
                nick: 'Foo6'
            });
            cb(null, []);
        });

        aliasGenerator(userWithNoNick, profileWithNoAlias, function () {
            expect(userWithNoNick.nick).to.equal('Foo6');
            expect(profileWithNoAlias.alias).to.equal('Foo6');
            expect(firstNameCounterEntityMock.save$).to.have.been.calledOnce;
            expect(firstNameCounterEntityMock.save$).to.have.been.calledWith({
                id: 'abc',
                firstName: 'foo',
                userCount: 6
            });
            done();
        });
    });

    lab.test('should keep incrementing the number for nick until it finds an unused nick', function (done) {
        // ARRANGE
        var userWithNoNick = {
            firstName: 'Foo'
        };
        var profileWithNoAlias = {};
        var userEntityMock = {
            list$: sandbox.stub()
        };
        var firstNameCounterEntityMock = {
            list$: sandbox.stub(),
            save$: sandbox.stub()
        };
        senecaStub.make.withArgs('cd_first_name_counter').returns(firstNameCounterEntityMock);
        firstNameCounterEntityMock.list$.callsFake(function (query, done) {
            expect(query).to.deep.equal({
                firstName: userWithNoNick.firstName.toLowerCase()
            });
            done(null, [{
                id: 'abc',
                firstName: 'foo',
                userCount: 5
            }]);
        });
        firstNameCounterEntityMock.save$.callsFake(function (ent, cb) {
            cb(null, ent);
        });
        senecaStub.make.withArgs('sys/user').returns(userEntityMock);
        userEntityMock.list$.callsFake(function (query, done) {
            if (query.nick === 'Foo6') {
                done(null, [{
                    nick: 'Foo6'
                }]);
            } else if (query.nick === 'Foo7') {
                done(null, [{
                    nick: 'Foo7'
                }]);
            } else {
                done(null, []);
            }
        });

        aliasGenerator(userWithNoNick, profileWithNoAlias, function () {
            expect(userWithNoNick.nick).to.equal('Foo8');
            expect(profileWithNoAlias.alias).to.equal('Foo8');
            expect(firstNameCounterEntityMock.save$).to.have.been.calledOnce;
            expect(firstNameCounterEntityMock.save$).to.have.been.calledWith({
                id: 'abc',
                firstName: 'foo',
                userCount: 8
            });
            done();
        });
    });

    lab.test('should create a new row in cd_first_name_counter if it doesnt exist yet', function (done) {
        // ARRANGE
        var userWithNoNick = {
            firstName: 'Foo'
        };
        var profileWithNoAlias = {};
        var userEntityMock = {
            list$: sandbox.stub()
        };
        var firstNameCounterEntityMock = {
            list$: sandbox.stub(),
            save$: sandbox.stub()
        };
        senecaStub.make.withArgs('cd_first_name_counter').returns(firstNameCounterEntityMock);
        firstNameCounterEntityMock.list$.callsFake(function (query, done) {
            expect(query).to.deep.equal({
                firstName: userWithNoNick.firstName.toLowerCase()
            });
            done(null, []);
        });
        firstNameCounterEntityMock.save$.callsFake(function (ent, cb) {
            cb(null, ent);
        });
        senecaStub.make.withArgs('sys/user').returns(userEntityMock);
        userEntityMock.list$.callsFake(function (query, done) {
            expect(query).to.deep.equal({
                nick: 'Foo1'
            });
            done(null, []);
        });

        aliasGenerator(userWithNoNick, profileWithNoAlias, function () {
            expect(userWithNoNick.nick).to.equal('Foo1');
            expect(profileWithNoAlias.alias).to.equal('Foo1');
            expect(firstNameCounterEntityMock.save$).to.have.been.calledOnce;
            expect(firstNameCounterEntityMock.save$).to.have.been.calledWith({
                firstName: 'foo',
                userCount: 1
            });
            done();
        });
    });

    lab.test('should do nothing if nick is provided', function (done) {
        // ARRANGE
        var userMock = {
            firstName: 'Foo',
            nick: 'Foo1'
        };
        var profileMock = {
            alias: 'Foo1'
        };

        aliasGenerator(userMock, profileMock, function () {
            // Check userMock.nick & profileMock.alias have not been mutated
            expect(userMock.nick).to.equal('Foo1');
            expect(profileMock.alias).to.equal('Foo1');
            done();
        });
    });


    lab.test('should call callback with error if listing count for first name fails', function (done) {
        // ARRANGE
        var userWithNoNick = {
            firstName: 'Foo'
        };
        var firstNameCounterEntityMock = {
            list$: sandbox.stub()
        };
        senecaStub.make.withArgs('cd_first_name_counter').returns(firstNameCounterEntityMock);
        firstNameCounterEntityMock.list$.callsFake(function (query, cb) {
            cb('Could not connect');
        });

        aliasGenerator(userWithNoNick, {}, function (err) {
            expect(err).to.equal('Could not connect');
            done();
        });
    });

    lab.test('should call callback with error if saving count for first name fails', function (done) {
        // ARRANGE
        var userWithNoNick = {
            firstName: 'Foo'
        };
        var userEntityMock = {
            list$: sandbox.stub()
        };
        var firstNameCounterEntityMock = {
            list$: sandbox.stub(),
            save$: sandbox.stub()
        };
        senecaStub.make.withArgs('cd_first_name_counter').returns(firstNameCounterEntityMock);
        firstNameCounterEntityMock.list$.callsFake(function (query, cb) {
            cb(null, [{
                id: 'abc',
                firstName: 'foo',
                userCount: 5
            }]);
        });
        firstNameCounterEntityMock.save$.callsFake(function (ent, cb) {
            cb('Could not connect');
        });
        senecaStub.make.withArgs('sys/user').returns(userEntityMock);
        userEntityMock.list$.callsFake(function (query, cb) {
            cb(null, []);
        });

        aliasGenerator(userWithNoNick, {}, function (err) {
            expect(err).to.equal('Could not connect');
            done();
        });
    });

    lab.test('should call callback with error if listing users by nick fails', function (done) {
        // ARRANGE
        var userWithNoNick = {
            firstName: 'Foo'
        };
        var userEntityMock = {
            list$: sandbox.stub()
        };
        var firstNameCounterEntityMock = {
            list$: sandbox.stub(),
            save$: sandbox.stub()
        };
        senecaStub.make.withArgs('cd_first_name_counter').returns(firstNameCounterEntityMock);
        firstNameCounterEntityMock.list$.callsFake(function (query, cb) {
            cb(null, [{
                id: 'abc',
                firstName: 'foo',
                userCount: 5
            }]);
        });
        senecaStub.make.withArgs('sys/user').returns(userEntityMock);
        userEntityMock.list$.callsFake(function (query, cb) {
            cb('Could not connect');
        });

        aliasGenerator(userWithNoNick, {}, function (err) {
            expect(err).to.equal('Could not connect');
            done();
        });
    });
});