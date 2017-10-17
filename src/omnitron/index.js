// Service statuses
export const STATUS = {
    DISABLED: "disabled",
    INACTIVE: "inactive",
    ACTIVE: "active"
};

// Possible statuses
export const STATUSES = [
    STATUS.DISABLED,
    STATUS.INACTIVE,
    STATUS.ACTIVE,
    "all"];

adone.lazify({
    Configuration: "./configuration",
    Omnitron: "./omnitron",
    Dispatcher: "./dispatcher"
}, adone.asNamespace(exports), require);
