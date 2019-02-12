/**
 * Wrapper for the notifu 1.6 (http://www.paralint.com/projects/notifu/)
 *
 * Usage
 * /t <value>      The type of message to display values are:
 * info      The message is an informational message
 * warn      The message is an warning message
 * error     The message is an error message
 * /d <value>      The number of milliseconds to display (omit or 0 for infinit)
 * /p <value>      The title (or prompt) of the ballon
 * /m <value>      The message text
 * /i <value>      Specify an icon to use ("parent" uses the icon of the parent process)
 * /e              Enable ballon tips in the registry (for this user only)
 * /q              Do not play a sound when the tooltip is displayed
 * /w              Show the tooltip even if the user is in the quiet period that follows his very first login (Windows 7 and up)
 * /xp             Use IUserNotification interface event when IUserNotification2 is available
 *
 * // Kill codes:
 * 2 = Timeout
 * 3 = Clicked
 * 4 = Closed or faded out
 */

const {
    is,
    error,
    event,
    lazify,
    std: { path, os },
    notifier: { __ }
} = adone;

const lazy = lazify({
    notifier: () => path.resolve(__dirname, "exe", "notifu", "notifu")
});

const fromErrorCodeToAction = (errorCode) => {
    switch (errorCode) {
        case 2: {
            return "timeout";
        }
        case 3:
        case 6:
        case 7: {
            return "activate";
        }
        case 4: {
            return "close";
        }
        default: {
            return "error";
        }
    }
};

const allowedArguments = ["t", "d", "p", "m", "i", "e", "q", "w", "xp"];

const doNotification = async (options, notifierOptions) => {
    const is64Bit = os.arch() === "x64";
    options = options || {};
    options = __.util.mapToNotifu(options);
    options.p = options.p || "Node Notification:";

    const fullNotifierPath = `${lazy.notifier + (is64Bit ? "64" : "")}.exe`;
    const localNotifier = notifierOptions.customPath || fullNotifierPath;

    if (!options.m) {
        throw new error.InvalidArgumentException("Message is required");
    }

    const argsList = __.util.constructArgumentList(options, {
        wrapper: "",
        noEscape: true,
        explicitTrue: true,
        allowedArguments
    });

    if (options.wait) {
        try {
            await __.util.fileCommand(localNotifier, argsList);
            return "error"; // ?
        } catch (err) {
            const action = fromErrorCodeToAction(err.code);
            if (action === "error") {
                throw err;
            }
            return action;
        }
    }
    return __.util.immediateFileCommand(localNotifier, argsList);
};

let hasGrowl = false;

export default class WindowsBalloon extends event.Emitter {
    constructor(options = {}) {
        super();
        this.options = adone.util.clone(options);
        this.fallback = null;
    }

    async notify(options) {
        const notifierOptions = this.options;
        options = adone.util.clone(options || {});

        if (is.string(options)) {
            options = { title: "", message: options };
        }

        if (this.fallback) {
            return this.fallback.notify(options);
        }

        if (Boolean(this.options.withFallback) && __.util.isWin8()) {
            this.fallback = new __.notifiers.Toaster(notifierOptions);
            return this.fallback.notify(options);
        }

        hasGrowl = await __.util.checkGrowl(notifierOptions);

        if (Boolean(this.options.withFallback) && (!__.utils.isLessThanWin8() || hasGrowl === true)) {
            this.fallback = new __.notifiers.Growl(notifierOptions);
            return this.fallback.notify(options);
        }

        return __.util.actionJackerDecorator(this, options, (data) => {
            if (data === "activate") {
                return "click";
            }
            if (data === "timeout") {
                return "timeout";
            }
            return false;
        }, () => doNotification(options, notifierOptions));
    }
}
