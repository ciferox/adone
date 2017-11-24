const { is, vendor: { lodash: _ } } = adone;

const Utils = require("./utils");

/**
 * The transaction object is used to identify a running transaction. It is created by calling `Sequelize.transaction()`.
 *
 * To run a query under a transaction, you should pass the transaction in the options object.
 *
 * @see {@link Sequelize.transaction}
 */
class Transaction {
    /**
     * @param {Sequelize} sequelize A configured sequelize Instance
     * @param {Object} options An object with options
     * @param {Boolean} options.autocommit Sets the autocommit property of the transaction.
     * @param {String} options.type=true Sets the type of the transaction.
     * @param {String} options.isolationLevel=true Sets the isolation level of the transaction.
     * @param {String} options.deferrable Sets the constraints to be deferred or immediately checked.
     */
    constructor(sequelize, options) {
        this.sequelize = sequelize;
        this.savepoints = [];

        // get dialect specific transaction options
        const transactionOptions = sequelize.dialect.supports.transactionOptions || {};
        const generateTransactionId = this.sequelize.dialect.QueryGenerator.generateTransactionId;

        this.options = _.extend({
            autocommit: transactionOptions.autocommit || null,
            type: sequelize.options.transactionType,
            isolationLevel: sequelize.options.isolationLevel,
            readOnly: false
        }, options || {});

        this.parent = this.options.transaction;
        this.id = this.parent ? this.parent.id : generateTransactionId();

        if (this.parent) {
            this.id = this.parent.id;
            this.parent.savepoints.push(this);
            this.name = `${this.id}-savepoint-${this.parent.savepoints.length}`;
        } else {
            this.id = this.name = generateTransactionId();
        }

        delete this.options.transaction;
    }

    /**
     * Commit the transaction
     *
     * @return {Promise}
     */
    async commit() {
        if (this.finished) {
            throw new Error(`Transaction cannot be committed because it has been finished with state: ${this.finished}`);
        }

        try {
            await this.sequelize.getQueryInterface().commitTransaction(this, this.options);
        } finally {
            this.finished = "commit";
            if (!this.parent) {
                await this.cleanup();
            }
        }
    }

    /**
     * Rollback (abort) the transaction
     *
     * @return {Promise}
     */
    async rollback() {

        if (this.finished) {
            throw new Error(`Transaction cannot be rolled back because it has been finished with state: ${this.finished}`);
        }

        try {
            await this.sequelize.getQueryInterface().rollbackTransaction(this, this.options);
        } finally {
            if (!this.parent) {
                await this.cleanup();
            }
        }
    }

    async prepareEnvironment() {
        let connection;

        if (this.parent) {
            connection = this.parent.connection;
        } else {
            const acquireOptions = { uuid: this.id };
            if (this.options.readOnly) {
                acquireOptions.type = "SELECT";
            }
            connection = await this.sequelize.connectionManager.getConnection(acquireOptions);
        }

        this.connection = connection;
        this.connection.uuid = this.id;

        try {
            await this.begin();
            await this.setDeferrable();
            await this.setIsolationLevel();
            await this.setAutocommit();
        } catch (setupErr) {
            await this.rollback().catch(adone.noop); // ignore rollback errors ?
            throw setupErr;
        }
    }

    begin() {
        return this
            .sequelize
            .getQueryInterface()
            .startTransaction(this, this.options);
    }

    setDeferrable() {
        if (this.options.deferrable) {
            return this
                .sequelize
                .getQueryInterface()
                .deferConstraints(this, this.options);
        }
    }

    setAutocommit() {
        return this
            .sequelize
            .getQueryInterface()
            .setAutocommit(this, this.options.autocommit, this.options);
    }

    setIsolationLevel() {
        return this
            .sequelize
            .getQueryInterface()
            .setIsolationLevel(this, this.options.isolationLevel, this.options);
    }

    cleanup() {
        const res = this.sequelize.connectionManager.releaseConnection(this.connection);
        this.connection.uuid = undefined;
        return res;
    }

    /**
     * Types can be set per-transaction by passing `options.type` to `sequelize.transaction`.
     * Default to `DEFERRED` but you can override the default type by passing `options.transactionType` in `new Sequelize`.
     * Sqlite only.
     */
    static get TYPES() {
        return {
            DEFERRED: "DEFERRED",
            IMMEDIATE: "IMMEDIATE",
            EXCLUSIVE: "EXCLUSIVE"
        };
    }

    /**
     * Isolations levels can be set per-transaction by passing `options.isolationLevel` to `sequelize.transaction`.
     * Default to `REPEATABLE_READ` but you can override the default isolation level by passing `options.isolationLevel` in `new Sequelize`.
     */
    static get ISOLATION_LEVELS() {
        return {
            READ_UNCOMMITTED: "READ UNCOMMITTED",
            READ_COMMITTED: "READ COMMITTED",
            REPEATABLE_READ: "REPEATABLE READ",
            SERIALIZABLE: "SERIALIZABLE"
        };
    }


    /**
     * Possible options for row locking. Used in conjunction with `find` calls:
     * UserModel will be locked but TaskModel won't!
     */
    static get LOCK() {
        return {
            UPDATE: "UPDATE",
            SHARE: "SHARE",
            KEY_SHARE: "KEY SHARE",
            NO_KEY_UPDATE: "NO KEY UPDATE"
        };
    }

    get LOCK() {
        return Transaction.LOCK;
    }
}

module.exports = Transaction;
module.exports.Transaction = Transaction;
module.exports.default = Transaction;
