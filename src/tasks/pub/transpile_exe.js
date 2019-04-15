import TranspileTask from "./transpile";

@adone.task.task("transpileExe")
export default class TranspileExeTask extends TranspileTask {
    transform(stream, params) {
        return super.transform(stream, params).chmod({
            owner: { read: true, write: true, execute: true },
            group: { read: true, write: false, execute: true },
            others: { read: true, write: false, execute: true }
        });
    }
}
