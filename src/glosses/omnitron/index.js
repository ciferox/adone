// Service statuses
export const STATUS = {
    INVALID: "invalid",
    DISABLED: "disabled",
    INACTIVE: "inactive",
    STARTING: "starting",
    ACTIVE: "active",
    STOPPING: "stopping"
};

// Possible statuses
export const STATUSES = [
    STATUS.INVALID,
    STATUS.DISABLED,
    STATUS.INACTIVE,
    STATUS.STARTING,
    STATUS.ACTIVE,
    STATUS.STOPPING
];  

adone.lazify({
    OmniApplication: "./app",
    Dispatcher: "./dispatcher",
    Service: "./service"
}, adone.asNamespace(exports), require);

const PID_SYMBOL = Symbol();

// As part of the process, the omni-application can only be launched once.
export const run = (OmniApp, options) => {
    if (!adone.is.function(process.send)) {
        console.error("Omni-application cannot be launched directly");
        process.exit(1);
    }

    if (OmniApp[PID_SYMBOL] === process.pid) {
        console.error("Only one omni-application is allowed per process");
        process.exit(2);
    }
    OmniApp[PID_SYMBOL] = process.pid;

    // Set environment info
    process.env.ADONE_OMNIAPP = {
        pid: process.pid
    };
    return adone.app.run(OmniApp, options);
};
