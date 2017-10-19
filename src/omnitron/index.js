// Service statuses
export const STATUS = {
    NONEXISTENT: "nonexistent",
    DISABLED: "disabled",
    INACTIVE: "inactive",
    ACTIVE: "active"
};

// Possible statuses
export const STATUSES = [
    STATUS.NONEXISTENT,
    STATUS.DISABLED,
    STATUS.INACTIVE,
    STATUS.ACTIVE,
    "all"];

adone.lazify({
    SystemDB: "./systemdb",
    Configuration: "./configuration",
    Omnitron: "./omnitron",
    Dispatcher: "./dispatcher",
    dispatcher: () => new adone.omnitron.Dispatcher()
}, adone.asNamespace(exports), require);
