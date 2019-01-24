export default class TaskContext {
    constructor(type, impl, sandbox) {
        this.type = type;
        this.impl = impl;
        this.sandbox = sandbox;
    }
}
adone.tag.add(TaskContext, "TASK_CONTEXT");
