import defaults from "./defaults";

const {
    is,
    assert,
    path
} = adone;


const rmkidsSync = (p, options) => {
    assert(p);
    assert(options);
    options.readdirSync(p).forEach((f) => rimrafSync(path.join(p, f), options));

    if (is.windows) {
        // We only end up here once we got ENOTEMPTY at least once, and
        // at this point, we are guaranteed to have removed all the kids.
        // So, we know that it won't be ENOENT or ENOTDIR or anything else.
        // try really hard to delete stuff on windows, because it has a
        // PROFOUNDLY annoying habit of not closing handles promptly when
        // files are deleted, resulting in spurious ENOTEMPTY errors.
        const startTime = Date.now();
        do {
            try {
                const ret = options.rmdirSync(p, options);
                return ret;
            } catch (er) {
                //
            }
        } while (Date.now() - startTime < 500); // give up after 500ms
    } else {
        const ret = options.rmdirSync(p, options);
        return ret;
    }
};

const rmdirSync = (p, options, originalEr) => {
    assert(p);
    assert(options);
    if (originalEr) {
        assert(originalEr instanceof Error);
    }

    try {
        options.rmdirSync(p);
    } catch (er) {
        if (er.code === "ENOTDIR") {
            throw originalEr;
        } else if (er.code === "ENOTEMPTY" || er.code === "EEXIST" || er.code === "EPERM") {
            rmkidsSync(p, options);
        } else if (er.code !== "ENOENT") {
            throw er;
        }
    }
};

const fixWinEPERMSync = (p, options, er) => {
    let stats;

    assert(p);
    assert(options);
    if (er) {
        assert(er instanceof Error);
    }

    try {
        options.chmodSync(p, 0o666);
    } catch (er2) {
        if (er2.code === "ENOENT") {
            return;
        }
        throw er;

    }

    try {
        stats = options.statSync(p);
    } catch (er3) {
        if (er3.code === "ENOENT") {
            return;
        }
        throw er;

    }

    if (stats.isDirectory()) {
        rmdirSync(p, options, er);
    } else {
        options.unlinkSync(p);
    }
};

// this looks simpler, and is strictly *faster*, but will
// tie up the JavaScript thread and fail on excessively
// deep directory trees.
const rimrafSync = (p, options) => {
    let st;

    options = options || {};
    defaults(options);

    assert(p, "fs.remove: missing path");
    assert.strictEqual(typeof p, "string", "fs.remove: path should be a string");
    assert(options, "fs.remove: missing options");
    assert.strictEqual(typeof options, "object", "fs.remove: options should be object");

    try {
        st = options.lstatSync(p);
    } catch (er) {
        if (er.code === "ENOENT") {
            return;
        }

        // Windows can EPERM on stat.  Life is suffering.
        if (er.code === "EPERM" && is.windows) {
            fixWinEPERMSync(p, options, er);
        }
    }

    try {
        // sunos lets the root user unlink directories, which is... weird.
        if (st && st.isDirectory()) {
            rmdirSync(p, options, null);
        } else {
            options.unlinkSync(p);
        }
    } catch (er) {
        if (er.code === "ENOENT") {
            return;
        } else if (er.code === "EPERM") {
            return is.windows ? fixWinEPERMSync(p, options, er) : rmdirSync(p, options, er);
        } else if (er.code !== "EISDIR") {
            throw er;
        }
        rmdirSync(p, options, er);
    }
};

export default rimrafSync;
