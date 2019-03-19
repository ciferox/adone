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
    TaskObserver: "./task_observer",
    Task: "./task",
    IsomorphicTask: "./isomorphic_task",
    FlowTask: "./flow_task",
    ParallelFlowTask: "./parallel_flow_task",
    RaceFlowTask: "./race_flow_task",
    SeriesFlowTask: "./series_flow_task",
    TryFlowTask: "./try_flow_task",
    WaterfallFlowTask: "./waterfall_flow_task"
}, adone.asNamespace(exports), require);

adone.lazifyPrivate({
    MANAGER_SYMBOL: () => Symbol(),
    OBSERVER_SYMBOL: () => Symbol()
}, exports, require);

/**
 * Runs task in series.
 * 
 * @param {adone.task.Manager} manager
 * @param {array} tasks array of task names
 */
export const runSeries = (manager, tasks, ...args) => manager.runOnce(adone.task.SeriesFlowTask, { args, tasks });

/**
 * Runs tasks in parallel.
 * 
 * @param {adone.task.Manager} manager
 * @param {array} tasks array of tasks
 */
export const runParallel = (manager, tasks, ...args) => manager.runOnce(adone.task.ParallelFlowTask, { args, tasks });
