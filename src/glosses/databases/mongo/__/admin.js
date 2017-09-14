const {
    is,
    database: { mongo }
} = adone;
const __ = adone.private(mongo);
const {
    utils: {
        shallowClone,
        toError
    }
} = __;

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

export default class Admin {
    constructor(db, topology) {
        this.s = { db, topology };
    }

    async command(command, options = {}) {
        return this.s.db.executeDbAdminCommand(command, options);
    }

    async buildInfo() {
        return this.serverInfo();
    }

    async serverInfo() {
        return this.s.db.executeDbAdminCommand({ buildinfo: 1 });
    }

    async serverStatus() {
        const doc = await this.s.db.executeDbAdminCommand({ serverStatus: 1 });
        if (!doc.ok) {
            throw toError(doc);
        }
        return doc;
    }

    async profilingLevel() {
        const doc = await this.s.db.executeDbAdminCommand({ profile: -1 });
        if (!doc.ok) {
            throw toError("Error with profile command");
        }
        const { was } = doc;
        if (was === 0) {
            return "off";
        }
        if (was === 1) {
            return "slow_only";
        }
        if (was === 2) {
            return "all";
        }
        throw toError(`Error: illegal profiling level value ${was}`);
    }

    async ping() {
        return this.s.db.executeDbAdminCommand({ ping: 1 });
    }

    async authenticate(username, password, options = {}) {
        const args = [this.s.db];
        if (is.string(username)) {
            args.push(username);
        }
        if (is.string(password)) {
            args.push(password);
        }
        args.push({ ...options, authdb: "admin" });

        return __.authenticate.apply(this.s.db, args);
    }

    async logout() {
        return this.s.db.logout({ dbName: "admin" });
    }

    async addUser(username, password, options = {}) {
        options = writeConcern(options, this.s.db);
        options.dbName = "admin";
        return this.s.db.addUser(username, password, options);
    }

    async removeUser(username, options = {}) {
        options = writeConcern(options, this.s.db);
        options.dbName = "admin";
        return this.s.db.removeUser(username, options);
    }

    async setProfilingLevel(level) {
        const command = {};
        let profile = 0;

        if (level === "off") {
            profile = 0;
        } else if (level === "slow_only") {
            profile = 1;
        } else if (level === "all") {
            profile = 2;
        } else {
            throw toError(`Error: illegal profiling level value ${level}`);
        }

        // Set up the profile number
        command.profile = profile;

        const doc = await this.s.db.executeDbAdminCommand(command);
        if (doc.ok === 1) {
            return level;
        }
        throw toError("Error with profile command");
    }

    async profilingInfo() {
        return new Promise((resolve, reject) => {
            this.s.topology.cursor("admin.system.profile", { find: "system.profile", query: {} }, {})
                .toArray((err, result) => {
                    err ? reject(err) : resolve(result);
                });
        });
    }

    async validateCollection(collectionName, options = {}) {
        const command = { validate: collectionName };
        const keys = Object.keys(options);
        // Decorate command with extra options
        for (let i = 0; i < keys.length; i++) {
            if (options.hasOwnProperty(keys[i])) {
                command[keys[i]] = options[keys[i]];
            }
        }
        const doc = await this.s.db.command(command);
        if (doc.ok === 0) {
            throw toError("Error with validate command");
        }
        if (!is.nil(doc.result) && doc.result.constructor !== String) {
            throw toError("Error with validation data");
        }
        if (!is.nil(doc.result) && !is.null(doc.result.match(/exception|corrupt/))) {
            return toError(`Error: invalid collection ${collectionName}`);
        }
        if (!is.nil(doc.valid) && !doc.valid) {
            return toError(`Error: invalid collection ${collectionName}`);
        }
        return doc;
    }

    async listDatabases() {
        return this.s.db.executeDbAdminCommand({ listDatabases: 1 }, {});
    }

    async replSetGetStatus() {
        const doc = await this.s.db.executeDbAdminCommand({ replSetGetStatus: 1 });
        if (!doc.ok) {
            throw toError(doc);
        }
        return doc;
    }
}
