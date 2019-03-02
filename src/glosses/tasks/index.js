export const STATE = {
    IDLE: 0,
    STARTING: 1,
    RUNNING: 2,
    SUSPENDED: 3,
    CANCELLING: 4,
    CANCELLED: 5,
    FAILED: 6,
    COMPLETED: 7
};

adone.lazify({
    Manager: "./manager",
    Task: ["./task", (mod) => mod.Task],
    TaskObserver: ["./task", (mod) => mod.TaskObserver],
    Flow: "./flow",
    flow: "./flows"
}, adone.asNamespace(exports), require);

adone.lazifyPrivate({
    MANAGER_SYMBOL: () => Symbol(),
    OBSERVER_SYMBOL: () => Symbol()
}, exports, require);
