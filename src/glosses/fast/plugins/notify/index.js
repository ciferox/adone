import report from "./report";

const { is, util } = adone;

const notify = function (options = {}) {
    let reporter;
    let lastFile = null;

    const templateOptions = options.templateOptions || {};

    if (options.notifier) {
        reporter = options.notifier;
    } else {
        let n = adone.notifier;
        if (options.host || options.appName || options.port) {
            n = new adone.notifier.Notification({
                host: options.host || "localhost",
                appName: options.appName || "notify",
                port: options.port || "23053"
            });
        }
        reporter = n.notify.bind(n);
    }

    let filter;
    if (options.filter && is.function(options.filter)) {
        ({ filter } = options);
    } else {
        filter = adone.truly;
    }

    if (!options.onLast) {
        let _report = report;
        if (options.debounce) {
            _report = util.debounce(_report, options.debounce.timeout, options.debounce);
        }
        return this.throughAsync(async function (file) {
            if (await filter(file)) {
                let _message = file;
                let _options = options;
                if (options.debounce && _report.ignored > 0) {
                    const cnt = _report.ignored + 1; // ignored + current call
                    _message = {
                        message: `${cnt} files were changed`
                    };
                    _options = {
                        ..._options,
                        message: undefined // do not use custom formatter
                    };
                }
                await _report(reporter, _message, _options, templateOptions).catch((err) => {
                    if (options.emitError) {
                        throw err;
                    }
                });
            }
            this.push(file);
        });
    }

    // Only send notification on the last file.
    return this.throughSync(function (file) {
        lastFile = file;
        this.push(file);
    }, async () => {
        if (!lastFile) {
            return;
        }
        await report(reporter, lastFile, options, templateOptions).catch((err) => {
            if (options.emitError) {
                throw err;
            }
        });
        lastFile = null;
    });
};

export const onError = (options = {}, callback) => {
    let reporter;
    const templateOptions = options.templateOptions || {};

    if (options.notifier) {
        reporter = options.notifier;
    } else {
        let n = adone.notifier;
        if (options.host || options.appName || options.port) {
            n = new adone.notifier.Notification({
                host: options.host || "localhost",
                appName: options.appName || "notify",
                port: options.port || "23053"
            });
        }
        reporter = n.notify.bind(n);
    }

    return function (error) {
        report(reporter, error, options, templateOptions).then(callback, callback).then(() => {
            if (options.endStream) {
                this.emit && this.emit("end");
            }
        });
    };
};

export const notifyError = function (options, callback) {
    return this.on("error", onError(options, callback));
};

export default function plugin(key) {
    switch (key) {
        case "notifyError": {
            return notifyError;
        }
        case "notify": {
            return notify;
        }
    }
}
