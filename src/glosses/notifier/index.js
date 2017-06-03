const { lazify, std: { os } } = adone;

const notifier = lazify({
    __: "./__",
    Notification: () => {
        const { __ } = notifier;

        switch (os.type()) {
            case "Linux": {
                return __.notifiers.NotifySend;
            }
            case "Darwin": {
                return __.notifiers.NotificationCenter;
            }
            case "Windows_NT": {
                if (__.util.isLessThanWin8()) {
                    return __.notifiers.WindowsBalloon;
                }
                return __.notifiers.WindowsToaster;

            }
            default: {
                if (os.type().match(/BSD$/)) {
                    return __.notifiers.NotifySend;
                }
                return __.notifiers.Growl;

            }
        }
    },
    instance: () => new notifier.Notification({ withFallback: true })
}, exports, require);

export const notify = (...args) => notifier.instance.notify(...args);

export const on = (event, listener) => notifier.instance.on(event, listener);

export const once = (event, listener) => notifier.instance.once(event, listener);

export const removeListener = (event, listener) => notifier.instance.removeListener(event, listener);

export const removeAllListeners = (event) => notifier.instance.removeAllListeners(event);

export const listeners = (event) => notifier.instance.listeners(event);

