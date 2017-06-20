const { is } = adone;
const toError = require("./utils").toError;
const Define = require("./metadata");
const shallowClone = require("./utils").shallowClone;
const assign = require("./utils").assign;
const authenticate = require("./authenticate");
const { metadata } = Define;
const { classMethod } = metadata;

// Get write concern
const writeConcern = function (options, db) {
    options = shallowClone(options);

    // If options already contain write concerns return it
    if (options.w || options.wtimeout || options.j || options.fsync) {
        return options;
    }

    // Set db write concern if available
    if (db.writeConcern) {
        if (options.w) {
            options.w = db.writeConcern.w;
        }
        if (options.wtimeout) {
            options.wtimeout = db.writeConcern.wtimeout;
        }
        if (options.j) {
            options.j = db.writeConcern.j;
        }
        if (options.fsync) {
            options.fsync = db.writeConcern.fsync;
        }
    }

    // Return modified options
    return options;
};

@metadata("Admin")
class Admin {
    constructor(db, topology, promiseLibrary) {
        // Internal state
        this.s = {
            db,
            topology,
            promiseLibrary
        };
    }

    @classMethod({ callback: true, promise: true })
    command(command, ...args) {
        const self = this;
        const callback = args.pop();
        if (!is.function(callback)) {
            args.push(callback);
        }
        const options = args.length ? args.shift() : {};

        if (is.function(callback)) {
            return this.s.db.executeDbAdminCommand(command, options, callback);
        }

        return new this.s.promiseLibrary((resolve, reject) => {
            self.s.db.executeDbAdminCommand(command, options, (err, doc) => {
                if (err) {
                    return reject(err);
                }
                resolve(doc);
            });
        });
    }

    @classMethod({ callback: true, promise: true })
    buildInfo(callback) {
        if (is.function(callback)) {
            return this.serverInfo(callback);
        }

        return new this.s.promiseLibrary((resolve, reject) => {
            this.serverInfo((err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    @classMethod({ callback: true, promise: true })
    serverInfo(callback) {
        if (is.function(callback)) {
            return this.s.db.executeDbAdminCommand({ buildinfo: 1 }, (err, doc) => {
                if (err) {
                    return callback(err, null);
                }
                callback(null, doc);
            });
        }

        return new this.s.promiseLibrary((resolve, reject) => {
            this.s.db.executeDbAdminCommand({ buildinfo: 1 }, (err, doc) => {
                if (err) {
                    return reject(err);
                }
                resolve(doc);
            });
        });
    }

    _serverStatus(callback) {
        this.s.db.executeDbAdminCommand({ serverStatus: 1 }, (err, doc) => {
            if (!err && doc.ok === 1) {
                callback(null, doc);
            } else {
                if (err) {
                    return callback(err, false);
                }
                return callback(toError(doc), false);
            }
        });
    }

    @classMethod({ callback: true, promise: true })
    serverStatus(callback) {
        if (is.function(callback)) {
            return this._serverStatus(callback);
        }

        return new this.s.promiseLibrary((resolve, reject) => {
            this._serverStatus((err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    _profilingLevel(callback) {
        this.s.db.executeDbAdminCommand({ profile: -1 }, (err, doc) => {
            if (!err && doc.ok === 1) {
                const was = doc.was;
                if (was === 0) {
                    return callback(null, "off");
                }
                if (was === 1) {
                    return callback(null, "slow_only");
                }
                if (was === 2) {
                    return callback(null, "all");
                }
                return callback(new Error(`Error: illegal profiling level value ${was}`), null);
            }
            err ? callback(err, null) : callback(new Error("Error with profile command"), null);

        });
    }

    @classMethod({ callback: true, promise: true })
    profilingLevel(callback) {
        if (is.function(callback)) {
            return this._profilingLevel(callback);
        }

        return new this.s.promiseLibrary((resolve, reject) => {
            this._profilingLevel((err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    @classMethod({ callback: true, promise: true })
    ping(...args) {
        const callback = args.pop();
        if (!is.function(callback)) {
            args.push(callback);
        }

        if (is.function(callback)) {
            return this.s.db.executeDbAdminCommand({ ping: 1 }, callback);
        }

        // Return a Promise
        return new this.s.promiseLibrary((resolve, reject) => {
            this.s.db.executeDbAdminCommand({ ping: 1 }, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    @classMethod({ callback: true, promise: true })
    authenticate(username, password, options, callback) {
        // console.warn("Admin.prototype.authenticate method will no longer be available in the next major release 3.x as MongoDB 3.6 will only allow auth against users in the admin db and will no longer allow multiple credentials on a socket. Please authenticate using MongoClient.connect with auth credentials.");
        const finalArguments = [this.s.db];
        if (is.string(username)) {
            finalArguments.push(username);
        }
        if (is.string(password)) {
            finalArguments.push(password);
        }
        if (is.function(options)) {
            finalArguments.push({ authdb: "admin" });
            finalArguments.push(options);
        } else {
            finalArguments.push(assign({}, options, { authdb: "admin" }));
        }

        if (is.function(callback)) {
            finalArguments.push(callback);
        }
        return authenticate.apply(this.s.db, finalArguments);
    }

    @classMethod({ callback: true, promise: true })
    logout(callback) {
        if (is.function(callback)) {
            return this.s.db.logout({ dbName: "admin" }, callback);
        }

        return new this.s.promiseLibrary((resolve, reject) => {
            this.s.db.logout({ dbName: "admin" }, (err) => {
                if (err) {
                    return reject(err);
                }
                resolve(true);
            });
        });
    }

    @classMethod({ callback: true, promise: true })
    addUser(username, password, ...args) {
        const callback = args.pop();
        if (!is.function(callback)) {
            args.push(callback);
        }
        let options = args.length ? args.shift() : {};
        options = options || {};
        // Get the options
        options = writeConcern(options, this.s.db);
        // Set the db name to admin
        options.dbName = "admin";

        if (is.function(callback)) {
            return this.s.db.addUser(username, password, options, callback);
        }

        return new this.s.promiseLibrary((resolve, reject) => {
            this.s.db.addUser(username, password, options, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    @classMethod({ callback: true, promise: true })
    removeUser(username, ...args) {
        const callback = args.pop();
        if (!is.function(callback)) {
            args.push(callback);
        }
        let options = args.length ? args.shift() : {};
        options = options || {};
        // Get the options
        options = writeConcern(options, this.s.db);
        // Set the db name
        options.dbName = "admin";

        if (is.function(callback)) {
            return this.s.db.removeUser(username, options, callback);
        }

        return new this.s.promiseLibrary((resolve, reject) => {
            this.s.db.removeUser(username, options, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    _setProfilingLevel(level, callback) {
        const command = {};
        let profile = 0;

        if (level === "off") {
            profile = 0;
        } else if (level === "slow_only") {
            profile = 1;
        } else if (level === "all") {
            profile = 2;
        } else {
            return callback(new Error(`Error: illegal profiling level value ${level}`));
        }

        // Set up the profile number
        command.profile = profile;

        this.s.db.executeDbAdminCommand(command, (err, doc) => {
            if (!err && doc.ok === 1) {
                return callback(null, level);
            }
            return err ? callback(err, null) : callback(new Error("Error with profile command"), null);
        });
    }

    @classMethod({ callback: true, promise: true })
    setProfilingLevel(level, callback) {
        if (is.function(callback)) {
            return this._setProfilingLevel(level, callback);
        }

        return new this.s.promiseLibrary((resolve, reject) => {
            this._setProfilingLevel(level, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    _profilingInfo(callback) {
        try {
            this.s.topology.cursor("admin.system.profile", { find: "system.profile", query: {} }, {}).toArray(callback);
        } catch (err) {
            return callback(err, null);
        }
    }

    @classMethod({ callback: true, promise: true })
    profilingInfo(callback) {
        if (is.function(callback)) {
            return this._profilingInfo(callback);
        }

        return new this.s.promiseLibrary((resolve, reject) => {
            this._profilingInfo((err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    _validateCollection(collectionName, options, callback) {
        const command = { validate: collectionName };
        const keys = Object.keys(options);

        // Decorate command with extra options
        for (let i = 0; i < keys.length; i++) {
            if (options.hasOwnProperty(keys[i])) {
                command[keys[i]] = options[keys[i]];
            }
        }

        this.s.db.command(command, (err, doc) => {
            if (err) {
                return callback(err, null);
            }

            if (doc.ok === 0) {
                return callback(new Error("Error with validate command"), null);
            }
            if (!is.nil(doc.result) && doc.result.constructor !== String) {
                return callback(new Error("Error with validation data"), null);
            }
            if (!is.nil(doc.result) && !is.null(doc.result.match(/exception|corrupt/))) {
                return callback(new Error(`Error: invalid collection ${collectionName}`), null);
            }
            if (!is.nil(doc.valid) && !doc.valid) {
                return callback(new Error(`Error: invalid collection ${collectionName}`), null);
            }

            return callback(null, doc);
        });
    }

    @classMethod({ callback: true, promise: true })
    validateCollection(collectionName, ...args) {
        const callback = args.pop();
        if (!is.function(callback)) {
            args.push(callback);
        }
        let options = args.length ? args.shift() : {};
        options = options || {};

        if (is.function(callback)) {
            return this._validateCollection(collectionName, options, callback);
        }

        return new this.s.promiseLibrary((resolve, reject) => {
            this._validateCollection(collectionName, options, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    @classMethod({ callback: true, promise: true })
    listDatabases(callback) {
        if (is.function(callback)) {
            return this.s.db.executeDbAdminCommand({ listDatabases: 1 }, {}, callback);
        }

        return new this.s.promiseLibrary((resolve, reject) => {
            this.s.db.executeDbAdminCommand({ listDatabases: 1 }, {}, (err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }

    _replSetGetStatus(callback) {
        this.s.db.executeDbAdminCommand({ replSetGetStatus: 1 }, (err, doc) => {
            if (!err && doc.ok === 1) {
                return callback(null, doc);
            }
            if (err) {
                return callback(err, false);
            }
            callback(toError(doc), false);
        });
    }

    @classMethod({ callback: true, promise: true })
    replSetGetStatus(callback) {
        if (is.function(callback)) {
            return this._replSetGetStatus(callback);
        }
        return new this.s.promiseLibrary((resolve, reject) => {
            this._replSetGetStatus((err, r) => {
                if (err) {
                    return reject(err);
                }
                resolve(r);
            });
        });
    }
}

module.exports = Admin;
