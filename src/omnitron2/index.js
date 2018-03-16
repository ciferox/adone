const {
    is,
    lazify
} = adone;

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

adone.definePredicates({
    omnitron2Service: "OMNITRON2_SERVICE"
});

const __ = lazify({
    Configuration: "./configuration",
    Service: "./service",
    Omnitron: "./omnitron",
    DB: "./omnitron/db",
    Dispatcher: "./dispatcher",
    dispatcher: () => new __.Dispatcher(),
    defaultAddress: () => ({
        path: (is.windows ? `\\\\.\\pipe\\${adone.runtime.realm.identity.id}\\omnitron.sock` : adone.std.path.join(adone.runtime.realm.config.RUNTIME_PATH, "omnitron.sock"))
    })
}, adone.asNamespace(exports), require);
