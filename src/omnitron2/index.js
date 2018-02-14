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

lazify({
    Service: "./service",
    Omnitron: "./omnitron",
    DB: "./omnitron/db",
    Dispatcher: "./dispatcher",
    dispatcher: () => new adone.omnitron.Dispatcher(),
    port: () => (is.windows ? `\\\\.\\pipe\\${adone.realm.config.realm}\\omnitron.sock` : adone.std.path.join(adone.realm.config.runtimePath, "omnitron.sock"))
}, adone.asNamespace(exports), require);
