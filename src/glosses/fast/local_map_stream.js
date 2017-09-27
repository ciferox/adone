const {
    is,
    std,
    util
} = adone;

const {
    helper
} = adone.private(adone.fast);

export class FastLocalMapStream extends adone.fast.LocalStream {
    constructor(source, mappings, options) {
        super(source, options);
        this._mappings = mappings;
        this._matchers = mappings.map((x) => (y) => util.matchPath(x.from, y, { dot: options.dot }));
    }

    dest(options) {
        const cwd = options.cwd || this._cwd;
        return super.dest((file) => {
            let match = null;
            const sourcePath = file.history[0];
            for (let i = 0; i < this._matchers.length; ++i) {
                if (this._matchers[i](sourcePath)) {
                    if (!is.null(match)) {
                        throw new adone.x.Exception(`Ambiguity. This file "${sourcePath}" has more than one possible source: "${this._mappings[match].from}" or "${this._mappings[i].from}"`);
                    }
                    match = i;
                }
            }
            if (is.null(match)) {
                throw new adone.x.Exception(`Invalid file: "${sourcePath}". There is no matching source`);
            }

            return std.path.resolve(cwd, this._mappings[match].to);
        }, options);
    }
}
adone.tag.define("FAST_LOCAL_MAP_STREAM", "fastLocalMapStream");
adone.tag.set(FastLocalMapStream, adone.tag.FAST_LOCAL_MAP_STREAM);

export const map = (mappings, {
    cwd = process.cwd(),
    base = null,
    read = true,
    buffer = true,
    stream = false,
    dot = true
} = {}) => {
    mappings = util.arrify(mappings).map(({ from, to }) => {
        return { from: helper.resolveGlob(from, cwd), to };
    });
    const source = helper.globSource(mappings.map((x) => x.from), { cwd, base, dot });
    const fast = new FastLocalMapStream(source, mappings, { read, buffer, stream, cwd, dot });
    fast.once("end", () => source.end({ force: true }));
    return fast;
};

export const watchMap = (mappings, {
    cwd = process.cwd(),
    base = null,
    read = true,
    buffer = true,
    stream = false,
    dot = true,
    resume = true,
    ...watcherOptions
} = {}) => {
    mappings = util.arrify(mappings).map(({ from, to }) => {
        return { from: helper.resolveGlob(from, cwd), to };
    });
    const source = adone.fast.watchSource(mappings.map((x) => x.from), { cwd, base, dot, ...watcherOptions });
    const fast = new FastLocalMapStream(source, mappings, { read, buffer, stream, cwd, dot });
    fast.once("end", () => source.end({ force: true }));
    if (resume) {
        process.nextTick(() => fast.resume());
    }
    return fast;
};
