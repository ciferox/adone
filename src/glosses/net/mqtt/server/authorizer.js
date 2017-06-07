const { is } = adone;
const hasher = require("pbkdf2-password")();
const minimatch = require("minimatch");
const defaultGlob = "**";

export default class Authorizer {
    constructor(users) {
        this.users = users || {};
    }

    get authenticate() {
        const that = this;
        return function (client, user, pass, cb) {
            that._authenticate(client, user, pass, cb);
        };
    }

    get authorizePublish() {
        const that = this;
        return function (client, topic, payload, cb) {
            cb(null, minimatch(topic, that.users[client.user].authorizePublish || defaultGlob));
        };
    }

    get authorizeSubscribe() {
        const that = this;
        return function (client, topic, cb) {
            cb(null, minimatch(topic, that.users[client.user].authorizeSubscribe || defaultGlob));
        };
    }

    _authenticate(client, user, pass, cb) {
        const missingUser = !user || !pass || !this.users[user];

        if (missingUser) {
            cb(null, false);
            return;
        }

        user = user.toString();

        client.user = user;
        user = this.users[user];

        hasher({
            password: pass.toString(),
            salt: user.salt
        }, (err, pass, salt, hash) => {
            if (err) {
                cb(err);
                return;
            }

            const success = (user.hash === hash);
            cb(null, success);
        });
    }

    addUser(user, pass, authorizePublish,
        authorizeSubscribe, cb) {
        const that = this;

        if (is.function(authorizePublish)) {
            cb = authorizePublish;
            authorizePublish = null;
            authorizeSubscribe = null;
        } else if (is.function(authorizeSubscribe)) {
            cb = authorizeSubscribe;
            authorizeSubscribe = null;
        }

        if (!authorizePublish) {
            authorizePublish = defaultGlob;
        }

        if (!authorizeSubscribe) {
            authorizeSubscribe = defaultGlob;
        }

        hasher({
            password: pass.toString()
        }, (err, pass, salt, hash) => {
            if (!err) {
                that.users[user] = {
                    salt,
                    hash,
                    authorizePublish,
                    authorizeSubscribe
                };
            }
            cb(err);
        });
        return this;
    }

    rmUser(user, cb) {
        delete this.users[user];
        cb();
        return this;
    }
}
