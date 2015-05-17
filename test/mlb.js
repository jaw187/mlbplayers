// Load modules

var Code = require('code');
var Lab = require('lab');

var Mlb = require('../');

// Declare internals

var internals = {};


// Test shortcuts

var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var expect = Code.expect;

describe('Players', function () {

    it('Can get players', function (done) {

        var options = {
            path: 'year_2011/month_07/day_23/'
        };

        var mlb = new Mlb(options);

        mlb.get(function (err, players) {

            expect(err).to.not.exist();
            expect(players).to.exist();
            expect(players.length).to.exist();

            done();
        });
    });
});
