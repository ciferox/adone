export default class AuthSession {
    constructor(db, username, password, options) {
        this.db = db;
        this.username = username;
        this.password = password;
        this.options = options;
    }

    equal(session) {
        return session.db === this.db &&
            session.username === this.username &&
            session.password === this.password;
    }

    static add(authStore, session) {
        let found = false;

        for (const sess of authStore) {
            if (sess.equal(session)) {
                found = true;
                break;
            }
        }

        if (!found) {
            authStore.push(session);
        }
    }
}
