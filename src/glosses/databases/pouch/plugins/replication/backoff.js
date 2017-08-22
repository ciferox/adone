const { is, database: { pouch: { __: { util: { defaultBackOff } } } } } = adone;

const STARTING_BACK_OFF = 0;

export default function backOff(opts, returnValue, error, callback) {
    if (opts.retry === false) {
        returnValue.emit("error", error);
        returnValue.removeAllListeners();
        return;
    }
    if (!is.function(opts.back_off_function)) {
        opts.back_off_function = defaultBackOff;
    }
    returnValue.emit("requestError", error);
    if (returnValue.state === "active" || returnValue.state === "pending") {
        returnValue.emit("paused", error);
        returnValue.state = "stopped";
        const backOffSet = () => {
            opts.current_back_off = STARTING_BACK_OFF;
        };
        const removeBackOffSetter = () => {
            returnValue.removeListener("active", backOffSet);
        };
        returnValue.once("paused", removeBackOffSetter);
        returnValue.once("active", backOffSet);
    }

    opts.current_back_off = opts.current_back_off || STARTING_BACK_OFF;
    opts.current_back_off = opts.back_off_function(opts.current_back_off);
    setTimeout(callback, opts.current_back_off);
}
