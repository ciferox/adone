const {
    database: {
        mysql: { Connection }
    }
} = adone;

export default class PoolConnection extends Connection {
    constructor(pool, options) {
        super(options);
        this._pool = pool;

        // When a fatal error occurs the connection's protocol ends, which will cause
        // the connection to end as well, thus we only need to watch for the end event
        // and we will be notified of disconnects.
        this.on("end", () => {
            this._removeFromPool();
        });
        this.on("error", () => {
            this._removeFromPool();
        });
    }

    release() {
        if (!this._pool || this._pool._closed) {
            return;
        }
        this._pool.releaseConnection(this);
    }

    destroy(...args) {
        this._removeFromPool();
        return super.destroy(...args);
    }

    _removeFromPool() {
        if (!this._pool || this._pool._closed) {
            return;
        }

        const pool = this._pool;
        this._pool = null;
        pool._removeConnection(this);
    }

}
