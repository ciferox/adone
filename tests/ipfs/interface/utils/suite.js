const {
    is
} = adone;

const isObject = (o) => Object.prototype.toString.call(o) === "[object Object]";

const createSuite = function (tests, parent) {
    const suite = (createCommon, options) => {
        Object.keys(tests).forEach((t) => {
            const opts = Object.assign({}, options);
            const suiteName = parent ? `${parent}.${t}` : t;

            if (is.array(opts.skip)) {
                const skip = opts.skip
                    .map((s) => isObject(s) ? s : { name: s })
                    .find((s) => s.name === suiteName);

                if (skip) {
                    opts.skip = skip;
                }
            }

            if (is.array(opts.only)) {
                if (opts.only.includes(suiteName)) {
                    opts.only = true;
                }
            }

            tests[t](createCommon, opts);
        });
    };

    return Object.assign(suite, tests);
}

module.exports.createSuite = createSuite;
