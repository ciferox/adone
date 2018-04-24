
const {
    net: { http: { server: { helper: { status: { isEmptyBody } } } } },
    pretty,
    is,
    app: { Logger }
} = adone;

class Counter extends adone.std.stream.Transform {
    constructor(options) {
        super(options);
        this.length = 0;
    }

    _transform(chunk, encoding, callback) {
        this.length += chunk.length;
        callback(null, chunk);
    }
}

const defaultTimestampFormat = "DD.MM.YYYY HH:mm:ss";

export default function (options = {}) {
    const loggerOpts = {};
    if (options.timestamp) {
        const format = is.string(options.timestamp) ? options.timestamp : defaultTimestampFormat;
        loggerOpts.bindArgs = [
            () => adone.datetime().format(format)
        ];
    }
    const logger = new Logger(loggerOpts);

    if (adone.is.propertyDefined(options, "sinks")) {
        logger.toSinks(options.sinks);
    } else {
        const opts = {
            argsSchema: [
                {
                    style: {
                        xxx: "{red-fg}",
                        "-x-": "{yellow-fg}",
                        "---": "{gray-fg}"
                    }
                }, // upstream
                { style: "{bold}" }, // method
                { style: "{white-fg}" }, // path
                { // status code
                    format: "%s",
                    styleArgTransform: (arg) => arg !== "-" ? Math.floor(arg / 100) : 0,
                    style: ["", "{green-fg}", "{green-fg}", "{cyan-fg}", "{yellow-fg}", "{red-fg}"]
                },
                { style: "{gray-fg}" }, // time
                { style: "{gray-fg}" } // response size
            ]
        };
        if (options.timestamp) {
            opts.argsSchema.unshift({
                format: "%s",
                style: "{grey-fg}",
                brackets: true
            });
        }
        logger.toStdout(opts);
    }

    const middleware = (ctx, next) => {
        const start = new Date();
        return next().then(() => {
            const { body, res } = ctx;
            let { length } = ctx;

            let counter = null;
            if (is.nil(length) && is.stream(body)) {
                counter = new Counter();
                ctx.body = body.pipe(counter).on("error", ctx.onerror);
            }

            const done = (event) => {
                let upstream;
                if (event === "close") {
                    upstream = "-x-";
                    res.removeListener("finish", onfinish); // eslint-disable-line no-use-before-define
                } else {
                    upstream = "---";
                    res.removeListener("close", onclose); // eslint-disable-line no-use-before-define
                }
                length = counter ? counter.length : length;

                const { status } = ctx;

                if (isEmptyBody(status)) {
                    length = "";
                } else if (is.nil(length)) {
                    length = "-";
                } else {
                    length = pretty.size(length, "");
                }
                logger.log(upstream, ctx.method, ctx.originalUrl, status, pretty.time(new Date() - start), length);
            };

            const onfinish = () => done("finish");
            const onclose = () => done("close");

            res.once("finish", onfinish);
            res.once("close", onclose);
        }, (err) => {
            logger.log("xxx", ctx.method, ctx.originalUrl, "-", pretty.time(new Date() - start), "-");
            return Promise.reject(err);
        });
    };

    return middleware;
}
