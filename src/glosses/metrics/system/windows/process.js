
const { Process } = adone.metrics;

const UNKNOWN = 0;
const OTHER = 1;
const READY = 2;
const RUNNING = 3;
const BLOCKED = 4;
const SUSPENDED_BLOCKED = 5;
const SUSPENDED_READY = 6;
const TERMINATED = 7;
const STOPPED = 8;
const GROWING = 9;

export default class WindowsProcess extends Process {
    constructor(name, path, winState, pid, parentPid, threadCount, priority, virtualSize, residentSetSize, kernelTime, userTime, startTime, bytesRead, bytesWritten, now) {
        super();

        this.name = name;
        this.path = path;
        switch (winState) {
            case READY:
            case SUSPENDED_READY:
                this.state = Process.SLEEPING;
                break;
            case BLOCKED:
            case SUSPENDED_BLOCKED:
                this.state = Process.WAITING;
                break;
            case RUNNING:
                this.state = Process.RUNNING;
                break;
            case GROWING:
                this.state = Process.NEW;
                break;
            case TERMINATED:
                this.state = Process.ZOMBIE;
                break;
            case STOPPED:
                this.state = Process.STOPPED;
                break;
            case UNKNOWN:
            case OTHER:
            default:
                this.state = Process.OTHER;
                break;
        }

        this.pid = pid;
        this.parentPid = parentPid;
        this.threadCount = threadCount;
        this.priority = priority;
        this.virtualSize = virtualSize;
        this.residentSetSize = residentSetSize;
        this.kernelTime = kernelTime;
        this.userTime = userTime;
        this.startTime = startTime;
        this.upTime = now - startTime;
        this.bytesRead = bytesRead;
        this.bytesWritten = bytesWritten;
    }
}
