const { std: { crypto: { randomBytes } }, is } = adone;

const timer = Symbol("timer");

class Store {
    constructor() {
        this.sessions = new Map();
        this[timer] = new Map();
    }

    getID(length) {
        return randomBytes(length).toString("hex");
    }

    get(sid) {
        if (!this.sessions.has(sid)) {
            return undefined;
        }
        return JSON.parse(this.sessions.get(sid));
    }

    set(session, { sid = this.getID(24), maxAge } = {}) {
        if (this.sessions.has(sid) && this[timer].has(sid)) {
            const timeout = this[timer].get(sid);
            if (timeout) {
                clearTimeout(timeout);
            }
        }

        if (maxAge) {
            this[timer].set(sid, setTimeout(() => this.destroy(sid), maxAge));
        }
        try {
            this.sessions.set(sid, JSON.stringify(session));
        } catch (err) {
            adone.logError(`Set session error: ${err.message}`);
        }

        return sid;
    }

    destroy(sid) {
        this.sessions.delete(sid);
        this[timer].delete(sid);
    }
}

export default function session(opts = {}) {
    const { key = "session", store = new Store() } = opts;

    return async (ctx, next) => {
        const id = ctx.cookies.get(key, opts);

        if (!id) {
            ctx.session = {};
        } else {
            ctx.session = await store.get(id, ctx);
            if (!is.object(ctx.session) || is.null(ctx.session)) {
                ctx.session = {};
            }
        }

        const old = JSON.stringify(ctx.session);

        await next();

        // if not changed
        if (old === JSON.stringify(ctx.session)) {
            return;
        }

        // if is an empty object
        if (ctx.session instanceof Object && !Object.keys(ctx.session).length) {
            ctx.session = null;
        }

        if (id && !ctx.session) {
            await store.destroy(id, ctx);
            return;
        }

        if (!is.emptyObject(ctx.session)) {
            const sid = await store.set(ctx.session, Object.assign({}, opts, { sid: id }), ctx);
            ctx.cookies.set(key, sid, opts);
        }
    };
}

session.Store = Store;
