import adone from "adone";
import { Task, Worker } from "./basetasks";

export default function (taskManager) {
    return adone.o({
        setTimeout, clearTimeout,
        setInterval, clearInterval,
        setImmediate, clearImmediate,
        Buffer,
        Promise,
        adone,
        Task,
        Worker,
        $instances: { },
        $taskManager: taskManager,
        $netron: taskManager.netron,
        $omnitron: taskManager.omnitron
    });
}
