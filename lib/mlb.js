// Load modules

var Xml2Js = require('xml2js');
var Wreck = require('wreck');
var Hoek = require('hoek');
var Insync = require('insync');

// Declare internals

var internals = {};


internals.mlb = require('./mlb.json');
internals.baseUrl = internals.mlb.protocol + '://' + internals.mlb.host + internals.mlb.basepath + '/';


internals.get = function (options, callback) {

    Hoek.assert(callback, 'Callback is required');

    if (!options.path) {
        return callback(new Error('Path is required'));
    }

    var url = internals.baseUrl + options.path + internals.mlb.files[options.which];
    Wreck.get(url, { timeout: 10000, json: true }, function (err, response, payload) {

        return callback(err, payload);
    });
};

internals.getScoreboard = function (options, callback) {

    options = options || {};
    options.which = 'scoreboard';

    return internals.get(options, callback);
};


internals.getIds = function (options, callback) {

    var url = internals.baseUrl + options.path + 'gid_' + options.game + '/' + options.which + '/';
    Wreck.get(url, { timeout: 10000 }, function (err, response, payload) {

        if (err) {
            return callback(err);
        }

        var ids = [];
        var regex = /<li><a href="([0-9]+)\.xml/g;

        var id = null;
        while (id = regex.exec(payload)) {
            ids.push(id[1]);
        }

        return callback(null, ids);
    });
}


internals.getPlayer = function (options, callback) {

    var url = internals.baseUrl + options.path + 'gid_' + options.game + '/' + options.which + '/' + options.player + '.xml';
    Wreck.get(url, { timeout: 10000 }, function (err, response, payload) {

        if (err) {
            return callback(err);
        }

        var parser = Xml2Js.parseString;
        parser(payload, function (err, result) {

            result = internals.convertResult(result);
            result.options = options;
            return callback(err, result);
        });
    });
};


internals.convertResult = function (result) {

    if (!result || typeof result === 'string') {
        return result;
    }

    if (result.$) {
        var details = result.$;
        delete result.$;

        Hoek.merge(result, details);
    }

    if (result.length) {
        for (var i = 0, il = result.length; i < il; ++i) {
            result[i] = internals.convertResult(result[i]);
        }
        return result;
    }

    for (var property in result) {
        if (result.hasOwnProperty(property)) {
            result[property] = internals.convertResult(result[property]);
        }
    }

    return result;
};


module.exports = internals.Players = function (options) {

    this.options = options;
    this.players = [];
};


internals.Players.prototype.get = function (callback) {

    var self = this;

    var getScoreboard = function (next) {

        var data = {
            path: self.options.path,
            games: [],
            ids: {
                pitcher: [],
                batter: []
            },
            players: []
        };

        internals.getScoreboard(self.options, function (err, scoreboard) {

            var games = Hoek.reach(scoreboard, 'data.games.game') || [];

            for (var i = 0, il = games.length; i < il; ++i) {
                data.games.push(games[i].gameday);
            }

            return next(err, data);
        });
    };

    var getIds = function (options, callback) {

        internals.getIds(options, function (err, ids) {

            return callback(err, ids);
        });
    };

    var getPitcherIds = function (data, game) {

        return function (ids, next) {

            var options = {
                path: data.path,
                game: game,
                which: 'pitchers'
            };

            getIds(options, function (err, pitcherIds) {

                ids.pitchers = pitcherIds;
                return next(err, ids);
            });
        };
    };

    var getBatterIds = function (data, game) {

        return function (ids, next) {

            var options = {
                path: data.path,
                game: game,
                which: 'batters'
            };

            getIds(options, function (err, batterIds) {

                ids.batters = batterIds;
                return next(err, ids);
            });
        };
    };

    var getPlayer = function (data, game, which) {

        return function (id, next) {

            var options = {
                path: data.path,
                which: which,
                game: game,
                player: id
            };

            internals.getPlayer(options, function (err, player) {

                return next(err, player);
            });
        };
    };

    var getPitchers = function (data, game) {

        return function (ids, next) {

            Insync.mapSeries(ids.pitchers, getPlayer(data, game, 'pitchers'), function (err, players) {

                data.players = data.players.concat(players);
                return next(err, ids);
            });
        };
    };

    var getBatters = function (data, game) {

        return function (ids, next) {

            Insync.mapSeries(ids.batters, getPlayer(data, game, 'batters'), function (err, players) {

                data.players = data.players.concat(players);
                return next(err, ids);
            });
        };
    };

    var initIds = function (next) {

        var ids = {
            batters: [],
            pitchers: []
        };

        return next(null, ids);
    };

    var getPlayers = function (data, next) {

        var processGame = function (game, next) {

            Insync.waterfall([
                initIds,
                getPitcherIds(data, game),
                getBatterIds(data, game),
                getPitchers(data, game),
                getBatters(data, game)
            ], function (err) {

                return next(err);
            });
        };

        Insync.mapSeries(data.games, processGame, function (err) {

            return next(err, data);
        });
    };


    Insync.waterfall([
        getScoreboard,
        getPlayers
    ], function (err, data) {

        return callback(err, data.players);
    });
};
