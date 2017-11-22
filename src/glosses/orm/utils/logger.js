/**
 * Sequelize module for debug and deprecation messages.
 * It require a `context` for which messages will be printed.
 *
 * @module logging
 * @private
 */

const { vendor: { lodash: _ } } = adone;

class Logger {
    constructor(config) {

        this.config = _.extend({
            context: "sequelize",
            debug: true
        }, config || {});
    }

    deprecate(message) {
        // TODO
        // adone.warn(`[${this.config.context}][DEPRECATED] ${message}`);
    }

    debug(message) {
        // TODO
        // adone.debug(`[${this.config.context}] ${message}`);
    }

    warn(message) {
        // TODO
        // adone.warn(`(${this.config.context}) Warning: ${message}`);
    }

    debugContext(childContext) {
        if (!childContext) {
            throw new Error("No context supplied to debug");
        }
        return adone.noop; // TODO
    }
}

module.exports = Logger;
