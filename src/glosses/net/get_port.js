const {
    is,
    net: { checkPort }
} = adone;

const portCheckSequence = function* (ports) {
    if (ports) {
        yield* ports;
    }

    yield 0; // Fall back to 0 if anything else failed
};

export default async ({ exclude, range, ...options } = {}) => {
    let ports = null;

    if (options) {
        ports = is.number(options.port)
            ? [options.port]
            : options.port;
    }

    let from;
    let to;
    if (!ports) {
        if (is.array(range)) {
            if (range.length !== 2) {
                throw new RangeError(`Range should be [from, to]. Got ${range}`);
            }
            from = range[0];
            to = range[1];

            if (from < 1024 || from > 65535) {
                throw new RangeError(`Invalid value of 'from': ${from}. Must be between 1024 and 65535`);
            }

            if (to < 1024 || to > 65536) {
                throw new RangeError(`Invalid value of 'to': ${from}. Must be between 1024 and 65535`);
            }

            if (to < from) {
                throw new RangeError(`'to' must be greater than or equal to 'from'. Got: [${from}, ${to}]`);
            }
        } else {
            from = 1024;
            to = 65535;
        }

        ports = (function* (from, to) {
            for (let port = from; port <= to; port++) {
                yield port;
            }
        })(from, to);
    }

    const isExcluded = is.array(exclude) ? (port) => exclude.includes(port) : adone.falsely;

    for (const port of portCheckSequence(ports)) {
        if (isExcluded(port)) {
            continue;
        }
        try {
            // eslint-disable-next-line no-await-in-loop
            return await checkPort({
                ...options,
                port
            }, true);
        } catch (err) {
            if (err.code !== "EADDRINUSE") {
                throw err;
            }
        }
    }
    throw new adone.error.NotFoundException("No available ports found");
};
