// @flow


import notifier from "node-notifier";
import report from "./report";

const { fast: { Fast } } = adone;

export default function notify(options = {}) {
    let reporter;
    let lastFile = null;

    const templateOptions = options.templateOptions || {};

    if (options.notifier) {
        reporter = options.notifier;
    } else {
        let n = notifier;
        if (options.host || options.appName || options.port) {
            n = new notifier.Notification({
                host: options.host || "localhost",
                appName: options.appName || "notify",
                port: options.port || "23053"
            });
        }
        reporter = n.notify.bind(n);
    }

    if (!options.onLast) {
        return new Fast(null, {
            async transform(file) {
                await report(reporter, file, options, templateOptions).catch((err) => {
                    if (options.emitError) {
                        throw err;
                    }
                });
                this.push(file);
            }
        });
    }

    // Only send notification on the last file.
    return new Fast(null, {
        transform(file) {
            lastFile = file;
            this.push(file);
        },
        async flush() {
            if (!lastFile) {
                return;
            }
            await report(reporter, lastFile, options, templateOptions).catch((err) => {
                if (options.emitError) {
                    throw err;
                }
            });
            lastFile = null;
        }
    });
}

notify.onError = function (options = {}, callback) {
    let reporter;
    const templateOptions = options.templateOptions || {};

    if (options.notifier) {
        reporter = options.notifier;
    } else {
        let n = notifier;
        if (options.host || options.appName || options.port) {
            n = new notifier.Notification({
                host: options.host || "localhost",
                appName: options.appName || "notify",
                port: options.port || "23053"
            });
        }
        reporter = n.notify.bind(n);
    }
    return function (error) {
        return report(reporter, error, options, templateOptions).then(callback, callback).then(() => {
            if (options.endStream) {
                this.emit && this.emit("end");
            }
        });
    };
};
