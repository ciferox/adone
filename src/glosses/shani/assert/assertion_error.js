function exclude() {
    const excludes = [].slice.call(arguments);

    function excludeProps(res, obj) {
        Object.keys(obj).forEach(function (key) {
            if (!~excludes.indexOf(key)) res[key] = obj[key];
        });
    }

    return function extendExclude() {
        const args = [].slice.call(arguments);
        let i = 0;
        const res = {};

        for (; i < args.length; i++) {
            excludeProps(res, args[i]);
        }

        return res;
    };
}


export default class AssertionError extends Error {
    constructor(message, _props, ssf) {
        super();
        const extend = exclude("name", "message", "stack", "constructor", "toJSON");
        const props = extend(_props || {});
        // default values
        this.message = message || "Unspecified AssertionError";
        this.showDiff = false;

        for (const key in props) {
            this[key] = props[key];
        }

        // capture stack trace
        ssf = ssf || this.constructor;
        Error.captureStackTrace(this, ssf);
    }
}

AssertionError.prototype.name = "AssertionError";
