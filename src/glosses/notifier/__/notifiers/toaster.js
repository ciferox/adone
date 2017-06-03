const { is, EventEmitter, notifier: { __ }, lazify, std: { path } } = adone;

const lazy = lazify({
    notifier: () => path.resolve(adone.appinstance.adoneEtcPath, "glosses", "notifier", "snoreToast", "SnoreToast.exe")
});

const timeoutMessage = "the toast has timed out";
const successMessage = "user clicked on the toast";

export default class WindowsToaster extends EventEmitter {
    constructor(options = {}) {
        super();
        this.options = adone.util.clone(options);
        lazify({
            fallback: () => new __.notifiers.Balloon(this.options)
        }, this);
    }

    async notify(options) {
        options = adone.util.clone(options || {});

        if (is.string(options)) {
            options = { title: "", message: options };
        }

        options.title = options.title || "Node Notification:";
        if (is.undefined(options.message) && is.undefined(options.close)) {
            throw new Error("Message or ID to close is required.");
        }

        if (!__.util.isWin8() && Boolean(this.options.withFallback)) {
            return this.fallback.notify(options);
        }

        options = __.util.mapToWin8(options);
        const argsList = __.util.constructArgumentList(options, {
            explicitTrue: true,
            wrapper: "",
            keepNewlines: true,
            noEscape: true
        });
        return __.util.actionJackerDecorator(this, options, (data) => {
            if (data && data.includes(successMessage)) {
                return "click";
            }
            if (data && data.includes(timeoutMessage)) {
                return "timeout";
            }
            return false;
        }, () => {
            try {
                return __.util.fileCommand(this.options.customPath || lazy.notifier, argsList);
            } catch (err) {
                if (err.stdout.includes(timeoutMessage)) {
                    return err.stdout;
                }
                throw err;
            }
        });
    }
}
