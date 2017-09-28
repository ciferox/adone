export const state = {
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
    Task: ["./task", (mod) => mod.Task],
    TaskObserver: ["./task", (mod) => mod.TaskObserver],
    Manager: "./manager"
}, adone.asNamespace(exports), require);

// predicates
adone.definePredicate("task", "TASK");
