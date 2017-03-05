import adone from "adone";
const { Process } = adone.metrics;

export default class FreebsdProcess extends Process {
    constructor(name, path, state, pid, parentPid, threadCount, priority, virtualSize, residentSetSize, kernelTime, userTime, elapsedTime, bytesRead, bytesWritten, now) {
        super();
        
        this.name = name;
        this.path = path;
        this.state = state;
        this.pid = pid;
        this.parentPid = parentPid;
        this.threadCount = threadCount;
        this.priority = priority;
        this.virtualSize = virtualSize;
        this.residentSetSize = residentSetSize;
        this.kernelTime = kernelTime;
        this.userTime = userTime;
        this.upTime = elapsedTime;
        this.startTime = now - this.upTime;
        this.bytesRead = bytesRead;
        this.bytesWritten = bytesWritten;
    }
}
