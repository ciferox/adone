const {
    is,
    event: { EventEmitter },
    lazify,
    notifier: { __ },
    std: { path }
} = adone;

const FAILSAFE_TIMEOUT = 30 * 1000;

const errorMessageOsX = "You need Mac OS X 10.8 or above to use NotificationCenter, or use Growl fallback with constructor option {withFallback: true}.";

const lazy = lazify({
    notifier: () => path.resolve(
        adone.application.instance.adoneEtcPath,
        "glosses",
        "notifier",
        "terminal-notifier"
    )
});

let activeId;

export default class NotificationCenter extends EventEmitter {
    constructor(options = {}) {
        super();
        this.options = adone.util.clone(options);
        lazify({
            fallback: () => new __.notifiers.Growl(this.options)
        }, this);
    }

    async notify(options) {
        const id = { _ref: "val" };
        options = adone.util.clone(options || {});
        activeId = id;

        if (is.string(options)) {
            options = { title: "", message: options };
        }

        options = __.util.mapToMac(options);

        if (!options.message && !options.group && !options.list && !options.remove) {
            throw new Error("Message, group, remove or list property is required");
        }

        const argsList = __.util.constructArgumentList(options);
        if (__.util.isMountainLion()) {
            return __.util.actionJackerDecorator(this, options, (data) => {
                if (activeId !== id) {
                    return false;
                }

                if (data === "activate") {
                    return "click";
                }
                if (data === "timeout") {
                    return "timeout";
                }
                if (data === "replied") {
                    return "replied";
                }
                return false;
            }, () => {
                return __.util.fileCommandJson(this.options.customPath || lazy.notifier, argsList, {
                    timeout: FAILSAFE_TIMEOUT
                });
            });
        }

        if (this.options.withFallback) {
            return this.fallback.notify(options);
        }

        throw new Error(errorMessageOsX);
    }
}
