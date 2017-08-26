const notifier = "notify-send";
let hasNotifier = void 0;

const {
    is,
    x,
    event: { EventEmitter },
    notifier: { __ },
    std: { os }
} = adone;

const allowedArguments = ["urgency", "expire-time", "icon", "category", "hint"];

const doNotification = (options) => {
    options = __.util.mapToNotifySend(options);
    options.title = options.title || "Node Notification";

    const initial = [options.title, options.message];
    delete options.title;
    delete options.message;

    const argsList = __.util.constructArgumentList(options, {
        initial,
        keyExtra: "-",
        allowedArguments
    });

    return __.util.command(notifier, argsList);
};


export default class NotifySend extends EventEmitter {
    constructor(options) {
        super();
        this.options = adone.util.clone(options);
    }

    async notify(options) {
        options = adone.util.clone(options || {});

        if (is.string(options)) {
            options = { title: "", message: options };
        }

        if (!options.message) {
            throw new x.InvalidArgument("Message is required");
        }

        if (os.type() !== "Linux" && !os.type().match(/BSD$/)) {
            throw new x.NotSupported("Only supported on Linux and *BSD systems");
        }

        if (hasNotifier === false) {
            throw new x.NotSupported("notify-send must be installed on the system");
        }

        if (hasNotifier || Boolean(this.options.suppressOsdCheck)) {
            return doNotification(options);
        }
        try {
            hasNotifier = Boolean(adone.fs.whichSync(notifier));
            return doNotification(options);
        } catch (err) {
            hasNotifier = false;
            throw err;
        }
    }
}
