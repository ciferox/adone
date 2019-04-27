const {
    is,
    error,
    fs,
    path,
    std: { childProcess, url, os, net }
} = adone;

const escapeQuotes = function (str) {
    if (is.string(str)) {
        return str.replace(/(["$`\\])/g, "\\$1");
    }
    return str;

};

const notifySendFlags = {
    u: "urgency",
    urgency: "urgency",
    t: "expire-time",
    time: "expire-time",
    timeout: "expire-time",
    e: "expire-time",
    expire: "expire-time",
    "expire-time": "expire-time",
    i: "icon",
    icon: "icon",
    c: "category",
    category: "category",
    subtitle: "category",
    h: "hint",
    hint: "hint"
};

const shellwordsEscape = function (str) {
    if (is.nil(str)) {
        str = "";
    }
    return str.replace(/([^A-Za-z0-9_\-.,:\/@\n])/g, "\\$1").replace(/\n/g, "'\n'");
};

export const command = (notifier, options) => {
    notifier = shellwordsEscape(notifier);

    return new Promise((resolve, reject) => {
        childProcess.exec(
            `${notifier} ${options.join(" ")}`,
            (error, stdout, stderr) => {
                if (error || stderr) {
                    error = error || new Error();
                    error.stdout = stdout;
                    error.stderr = stderr;
                    return reject(error);
                }
                if (stderr) {
                    error = new Error();
                    error.stdout = stdout;
                    error.stderr = stderr;
                    return reject(error);
                }
                resolve(stdout);
            }
        );
    });

};

export const fileCommand = (notifier, options) => new Promise((resolve, reject) => {
    childProcess.execFile(notifier, options, (error, stdout, stderr) => {
        if (error || stderr) {
            error = error || new Error();
            error.stdout = stdout;
            error.stderr = stderr;
            return reject(error);
        }
        resolve(stdout);
    });
});

export const fileCommandJson = (notifier, options, { timeout } = {}) => new Promise((resolve, reject) => {
    let timer = null;
    const p = childProcess.execFile(notifier, options, (error, stdout, stderr) => {
        clearTimeout(timer);
        if (error || stderr) {
            error = error || new Error();
            error.stdout = stdout || {};
            error.stderr = stderr;
            return reject(error);
        }
        if (!stdout) {
            resolve({});
        }

        try {
            resolve(JSON.parse(stdout));
        } catch (e) {
            e.stdout = stdout;
            e.stderr = null;
            resolve(e);
        }
    });
    if (timeout) {
        timer = setTimeout(() => {
            p.kill("SIGTERM");
        }, timeout);
    }
});

const notifierExists = async (notifier) => {
    try {
        const stat = adone.fs.stat(notifier);
        return stat.isFile();
    } catch (err) {
        //
    }
    // Check if Windows alias
    if (path.extname(notifier)) {
        // Has extentioon, no need to check more
        return false;
    }
    try {
        const stat = adone.fs.stat(`${notifier}.exe`);
        return stat.isFile();
    } catch (err) {
        return false;
    }
};

export const immediateFileCommand = async (notifier, options) => {
    const exists = await notifierExists(notifier);
    if (!exists) {
        throw new error.NotExistsException(`Notifier (${notifier}) not found on system`);
    }
    childProcess.execFile(notifier, options);
};

const mapAppIcon = (options) => {
    if (options.appIcon) {
        options.icon = options.appIcon;
        delete options.appIcon;
    }

    return options;
};

const mapText = (options) => {
    if (options.text) {
        options.message = options.text;
        delete options.text;
    }

    return options;
};

const mapIconShorthand = (options) => {
    if (options.i) {
        options.icon = options.i;
        delete options.i;
    }

    return options;
};

export const mapToNotifySend = (options) => {
    options = mapAppIcon(options);
    options = mapText(options);

    for (const key in options) {
        if (key === "message" || key === "title") {
            continue;
        }
        if (options.hasOwnProperty(key) && notifySendFlags[key] !== key) {
            options[notifySendFlags[key]] = options[key];
            delete options[key];
        }
    }

    return options;
};

export const mapToGrowl = (options) => {
    options = mapAppIcon(options);
    options = mapIconShorthand(options);
    options = mapText(options);

    if (options.icon && !is.buffer(options.icon)) {
        try {
            options.icon = fs.readFileSync(options.icon);
        } catch (ex) {
            //
        }
    }

    return options;
};

export const mapToMac = (options) => {
    options = mapIconShorthand(options);
    options = mapText(options);

    if (options.icon) {
        options.appIcon = options.icon;
        delete options.icon;
    }

    if (options.sound === true) {
        options.sound = "Bottle";
    }

    if (options.sound === false) {
        delete options.sound;
    }

    if (options.sound && options.sound.indexOf("Notification.") === 0) {
        options.sound = "Bottle";
    }

    if (options.wait === true) {
        if (!options.timeout) {
            options.timeout = 5;
        }
        delete options.wait;
    }

    if (!options.wait && !options.timeout) {
        options.timeout = 10;
    }

    options.json = true;
    return options;
};

export const actionJackerDecorator = async (emitter, options, mapper, fn) => {
    options = adone.util.clone(options);

    let resultantData = await fn();

    let metadata = {};
    // Allow for extra data if resultantData is an object
    if (resultantData && is.plainObject(resultantData)) {
        metadata = resultantData;
        resultantData = resultantData.activationType;
    }

    // Sanitize the data
    if (resultantData) {
        resultantData = resultantData.toLowerCase().trim();
        if (resultantData.match(/^activate|clicked$/)) {
            resultantData = "activate";
        }
    }

    if (mapper && resultantData) {
        const key = mapper(resultantData);
        if (key) {
            emitter.emit(key, emitter, options, metadata);
        }
    }
    return resultantData; // metadata?
};

const removeNewLines = (str) => {
    const excapedNewline = is.windows ? "\\r\\n" : "\\n";
    return str.replace(/\r?\n/g, excapedNewline);
};

export const constructArgumentList = (options, extra = {}) => {
    const args = [];

    // Massive ugly setup. Default args
    const initial = extra.initial || [];
    const keyExtra = extra.keyExtra || "";
    const allowedArguments = extra.allowedArguments || [];
    const noEscape = !is.undefined(extra.noEscape);
    const checkForAllowed = !is.undefined(extra.allowedArguments);
    const explicitTrue = Boolean(extra.explicitTrue);
    const keepNewlines = Boolean(extra.keepNewlines);
    const wrapper = is.undefined(extra.wrapper) ? '"' : extra.wrapper;

    const escapeFn = function (arg) {
        if (is.array(arg)) {
            return removeNewLines(arg.join(","));
        }

        if (!is.string(arg)) {
            arg = `${arg}`;
        }

        if (!noEscape) {
            arg = escapeQuotes(arg);
        }
        arg = arg.replace(/\0/g, ""); // remove null chars that break sh
        if (is.string(arg) && !keepNewlines) {
            arg = removeNewLines(arg);
        }
        return wrapper + arg + wrapper;
    };

    initial.forEach((val) => {
        args.push(escapeFn(val));
    });
    for (const key in options) {
        if (
            options.hasOwnProperty(key) &&
            (!checkForAllowed || allowedArguments.includes(key))
        ) {
            if (explicitTrue && options[key] === true) {
                args.push(`-${keyExtra}${key}`);
            } else if (explicitTrue && options[key] === false) {
                continue;
            } else {
                args.push(`-${keyExtra}${key}`, escapeFn(options[key]));
            }
        }
    }
    return args;
};

/**
 * ---- Options ----
 * [-t] <title string>     | Displayed on the first line of the toast.
 * [-m] <message string>   | Displayed on the remaining lines, wrapped.
 * [-p] <image URI>        | Display toast with an image, local files only.
 * [-w]                    | Wait for toast to expire or activate.
 * [-id] <id>              | sets the id for a notification to be able to close it later.
 * [-s] <sound URI>        | Sets the sound of the notifications, for possible values see http://msdn.microsoft.com/en-us/library/windows/apps/hh761492.aspx.
 * [-silent]               | Don't play a sound file when showing the notifications.
 * [-appID] <App.ID>       | Don't create a shortcut but use the provided app id.
 * -close <id>             | Closes a currently displayed notification, in order to be able to close a notification the parameter -w must be used to create the notification.
 */
const allowedToasterFlags = [
    "t",
    "m",
    "p",
    "w",
    "id",
    "s",
    "silent",
    "appID",
    "close",
    "install"
];
const toasterSoundPrefix = "Notification.";
const toasterDefaultSound = "Notification.Default";
export const mapToWin8 = (options) => {
    options = mapAppIcon(options);
    options = mapText(options);

    if (options.icon) {
        if (/^file:\/+/.test(options.icon)) {
            // should parse file protocol URL to path
            options.p = new url.URL(options.icon).pathname
                .replace(/^\/(\w:\/)/, "$1")
                .replace(/\//g, "\\");
        } else {
            options.p = options.icon;
        }
        delete options.icon;
    }

    if (options.message) {
        // Remove escape char to debug "HRESULT : 0xC00CE508" error
        options.m = options.message.replace(/\x1b/g, "");
        delete options.message;
    }

    if (options.title) {
        options.t = options.title;
        delete options.title;
    }

    if (options.appName) {
        options.appID = options.appName;
        delete options.appName;
    }

    if (!is.undefined(options.remove)) {
        options.close = options.remove;
        delete options.remove;
    }

    if (options.quiet || options.silent) {
        options.silent = options.quiet || options.silent;
        delete options.quiet;
    }

    if (!is.undefined(options.sound)) {
        options.s = options.sound;
        delete options.sound;
    }

    if (options.s === false) {
        options.silent = true;
        delete options.s;
    }

    // Silent takes precedence. Remove sound.
    if (options.s && options.silent) {
        delete options.s;
    }

    if (options.s === true) {
        options.s = toasterDefaultSound;
    }

    if (options.s && options.s.indexOf(toasterSoundPrefix) !== 0) {
        options.s = toasterDefaultSound;
    }

    if (options.wait) {
        options.w = options.wait;
        delete options.wait;
    }

    for (const key in options) {
        // Check if is allowed. If not, delete!
        if (options.hasOwnProperty(key) && allowedToasterFlags.indexOf(key) === -1) {
            delete options[key];
        }
    }

    return options;
};

const sanitizeNotifuTypeArgument = (type) => {
    if (is.string(type)) {
        type = type.toLowerCase();
        if (type === "info") {
            return "info";
        }
        if (type === "warn") {
            return "warn";
        }
        if (type === "error") {
            return "error";
        }
    }

    return "info";
};

export const mapToNotifu = (options) => {
    options = mapAppIcon(options);
    options = mapText(options);

    if (options.icon) {
        options.i = options.icon;
        delete options.icon;
    }

    if (options.message) {
        options.m = options.message;
        delete options.message;
    }

    if (options.title) {
        options.p = options.title;
        delete options.title;
    }

    if (options.time) {
        options.d = options.time;
        delete options.time;
    }

    if (options.q !== false) {
        options.q = true;
    } else {
        delete options.q;
    }

    if (options.quiet === false) {
        delete options.q;
        delete options.quiet;
    }

    if (options.sound) {
        delete options.q;
        delete options.sound;
    }

    if (options.t) {
        options.d = options.t;
        delete options.t;
    }

    if (options.type) {
        options.t = sanitizeNotifuTypeArgument(options.type);
        delete options.type;
    }

    return options;
};

export const isMac = () => os.type() === "Darwin";

const garanteeSemverFormat = (version) => {
    if (version.split(".").length === 2) {
        version += ".0";
    }
    return version;
};

export const isMountainLion = () => {
    return os.type() === "Darwin" && adone.semver.satisfies(garanteeSemverFormat(os.release()), ">=12.0.0");
};

export const isWin8 = () => {
    return os.type() === "Windows_NT" && adone.semver.satisfies(garanteeSemverFormat(os.release()), ">=6.2.9200");
};

export const isLessThanWin8 = () => {
    return os.type() === "Windows_NT" && adone.semver.satisfies(garanteeSemverFormat(os.release()), "<6.2.9200");
};

let hasGrowl = false;

export const checkGrowl = async (growlConfig = {}) => {
    if (hasGrowl) {
        return hasGrowl;
    }
    const port = growlConfig.port || 23053;
    const host = growlConfig.host || "localhost";
    const socket = net.connect(port, host);
    socket.setTimeout(100);

    return hasGrowl = await new Promise((resolve) => {
        socket.on("connect", () => {
            socket.end();
            resolve(true);
        });

        socket.on("error", () => {
            socket.end();
            resolve(false);
        });
    });
};

export const isWsl = () => {
    if (process.platform !== "linux") {
        return false;
    }

    if (os.release().includes("Microsoft")) {
        return true;
    }

    try {
        return adone.fs.readFileSync("/proc/version", "utf8").includes("Microsoft");
    } catch (_) {
        return false;
    }
};
