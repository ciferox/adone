const RNG = require("rng");
const path = require("path");

const first = function (o) {
    for (const k in o) {
        return k;
    }
};

// const chars = function (n, ch) {
//     let s = "";
//     while (n--) {
//         s += ch;
//     }
//     return s;
// };

//this part handles the callbacks and interleavings.

const create = module.exports = function (seed, cb) {
    const rng = new RNG.MT(seed); const all = {}; const created = []; const called = [];
    const l = 10000;
    let pending = 0;

    const heap = [];
    const not_called = [];
    let result;
    let ended;
    let queued = false;

    const next = function () {
        if (queued) {
            return;
        }
        queued = true;
        if (ended) {
            return;
        }

        const call = function () {
            queued = false;

            const key = first(heap);
            const cb = heap[key];
            delete heap[key];
            if (cb) {
                try {
                    cb();
                } catch (err) {
                    console.error(err); return async.done(err);
                }
                setImmediate(next);
            }
        };

        rng.random() < 0.4 ? setImmediate(call) : setTimeout(call, 10);
    };

    const async = function (cb, name) {
        const m = "cb was not called\n  created at:";
        name = name || new Error(m);

        if (name.stack) {
            //name.message = m

            const line = name.stack.split("\n").filter((line) => {
                return /^\s+at /.test(line);
            })[1].replace(/^\s+at\s/, "");
            name = path.relative(process.cwd(), line);

        }
        all[name] = (all[name] || 0) + 1;
        const id = `${name}(${all[name]})`;
        created.push(id);

        not_called.push(id);

        return function () {
            const args = [].slice.call(arguments);
            const self = this;
            pending++;
            const _cb = function () {
                called.push(id);
                not_called.splice(not_called.indexOf(name), 1);
                //debug('<'+chars(pending*2, '-'), id)
                pending--;
                return cb.apply(self, args);
            };

            if (rng.random() < 0.3) {
                try {
                    return _cb();
                } catch (err) {
                    return async.done(err);
                }
            }

            while (true) {
                const i = rng.range(0, 0xffff);
                if (!heap[i]) {
                    heap[i] = _cb;
                    break;
                }
            }

            next();

        };
    };

    async.through = function (name) {
        name = name || new Error();
        return function (read) {
            return function (abort, cb) {
                async(read, `${name}:read`)(abort, async(cb, `${name}:cb`));
            };
        };
    };

    const forgot = function () {
        not_called.forEach((err) => {
            console.error(err.stack);
        });
        async.done(new Error("never called"));
    };

    process.on("exit", forgot);
    process.setMaxListeners(Infinity);

    async.done = function (err, value) {
        if (ended) {
            return;
        }
        ended = true;
        if (result) {
            result.passed = false;
            result.calls++;
            result.error = result.error || new Error("called done twice");
            return;
        }

        process.removeListener("exit", forgot);

        result = {
            error: err,
            value,
            passed: !err,
            calls: 1,
            seed,
            called
        };

        if (cb) {
            cb(err, result);
        } else if (err) {
            throw err;
        }
    };

    return async;
};

create.test = require("./tester");

if (!module.parent) {

    const async = create(Date.now());

    async(() => {
    })();
    async(() => {
    })();
    async(() => {
    })();
}
