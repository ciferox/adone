const { exception } = adone;

export default class Schema {
    constructor(bson) {
        this.bson = bson;
        this.authStore = [];
    }

    auth(/* server, connections, db, username, password, callback */) {
        throw new exception.NotImplemented();
    }

    logout(dbName) {
        this.authStore = this.authStore.filter((x) => x.db !== dbName);
    }

    reauthenticate(server, connections, callback) {
        const authStore = this.authStore.slice(0);
        let count = authStore.length;
        if (count === 0) {
            return callback(null, null);
        }
        // Iterate over all the auth details stored
        const handler = (err) => {
            count = count - 1;
            // Done re-authenticating
            if (count === 0) {
                callback(err, null);
            }
        };
        for (const sess of authStore) {
            this.auth(server, connections, sess.db, sess.username, sess.password, handler);
        }
    }
}
