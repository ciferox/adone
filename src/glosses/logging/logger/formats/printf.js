const {
    logging: { logger: { MESSAGE } }
} = adone;

class Printf {
    constructor(templateFn) {
        this.template = templateFn;
    }

    transform(info) {
        info[MESSAGE] = this.template(info);
        return info;
    }
}

/**
 * function printf (templateFn)
 * Returns a new instance of the printf Format that creates an
 * intermediate prototype to store the template string-based formatter
 * function.
 */
export default (opts) => new Printf(opts);
