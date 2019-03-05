const {
    is
} = adone;

const create = require("./");

module.exports = function (test, cb) {
    const run = function (seed, cb) {
        const async = create(seed, cb);
        test(async);
    };

    const seed = Number(process.env.INTLVS);
    if (!isNaN(seed)) {
        return run(seed, (err, result) => {
            if (cb) {
                return cb(err, result);
            } else if (err) {
                //DO NOT allow anything to swallow this error.
                console.error(err.stack);
                // process.exit(1);
            }
        });
    }

    const total = process.env.INTLVR || 100;
    let n = total; const results = [];


    const done = function () {
        if (--n) {
            return;
        }

        const stats = {
            passes: 0,
            total: results.length,
            failures: 0,
            errors: 0
        };
        let err = null; let seed;

        //collect the most common error messages
        const messages = {};

        results.forEach((e) => {
            const error = e.error;
            if ((!e.error) && e.calls === 1) {
                stats.passes++;
            } else {
                if (is.nil(seed)) {
                    seed = e.seed;
                }
                if (is.nil(err)) {
                    err = e.error;
                }
                stats.failures++;
            }
            const outcome = error ? error.message : "passed";
            if (!messages[outcome]) {
                messages[outcome] = [e];
            } else {
                messages[outcome].push(e);
            }

            if (e.calls > 1) {
                stats.errors++;
            }
        });

        if (stats.failures) {
            const message =
                `(interleavings: failed ${stats.failures
                } out of ${stats.total
                }, first failing seed: ${seed})`;

            if (!err) {
                err = new Error(message);
            }
            err.message = `${err.message}\n  ${message}`;
        }
        if (cb) {
            cb(err, results, stats);
        } else if (err) {
            //DO NOT allow anything to swallow this error.
            console.error(err.stack);
            // process.exit(1);
        }
    };

    for (let i = 0; i < total; i++) {
        (function (i) {

            run(i, (err, result) => {
                if (err) {
                    result.error = err;
                }
                results[i] = result;
                done();
            });

        })(i);
    }

};

