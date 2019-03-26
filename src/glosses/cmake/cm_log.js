const {
    app: { runtime: { logger } }
} = adone;

export default class CMLog {
    constructor(options) {
        this.options = options || {};
    }

    get level() {
        if (this.options.noLog) {
            return "verbose";
        }
        return logger.level;
    }

    debug(cat, msg) {
        if (!this.options.noLog) {
            logger.debug(cat, msg);
        }
    }

    verbose(cat, msg) {
        if (!this.options.noLog) {
            logger.verbose(cat, msg);
        }
    }

    info(cat, msg) {
        if (!this.options.noLog) {
            logger.info(cat, msg);
        }
    }

    warn(cat, msg) {
        if (!this.options.noLog) {
            logger.warn(cat, msg);
        }
    }

    http(cat, msg) {
        if (!this.options.noLog) {
            logger.http(cat, msg);
        }
    }

    error(cat, msg) {
        if (!this.options.noLog) {
            logger.error(cat, msg);
        }
    }
}
