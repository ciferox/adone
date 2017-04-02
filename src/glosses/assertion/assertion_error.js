const excludeKeys = new Set(["name", "message", "stack", "constructor", "toJSON"]);

export default class AssertionError extends Error {
    constructor(message, props = {}, ssf) {
        super();
        this.message = message || "Unspecified AssertionError";
        this.showDiff = false;

        for (const key in props) {
            if (excludeKeys.has(key)) {
                continue;
            }
            this[key] = props[key];
        }

        // capture stack trace
        ssf = ssf || this.constructor;
        Error.captureStackTrace(this, ssf);
    }
}

AssertionError.prototype.name = "AssertionError";
