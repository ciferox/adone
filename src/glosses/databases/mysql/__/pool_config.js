const {
    is,
    database: { mysql }
} = adone;

const __ = adone.private(mysql);

export default class PoolConfig {
    constructor(options) {
        if (is.string(options)) {
            options = __.ConnectionConfig.parseUrl(options);
        }
        this.connectionConfig = new __.ConnectionConfig(options);
        if (is.undefined(options.waitForConnections)) {
            this.waitForConnections = true;
        } else {
            this.waitForConnections = Boolean(options.waitForConnections);
        }
        if (is.undefined(options.connectionLimit)) {
            this.connectionLimit = 10;
        } else {
            this.connectionLimit = Number(options.connectionLimit);
        }
        if (is.undefined(options.queueLimit)) {
            this.queueLimit = 0;
        } else {
            this.queueLimit = Number(options.queueLimit);
        }
    }
}
