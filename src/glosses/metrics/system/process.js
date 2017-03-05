const STATES = ["NEW", "RUNNING", "SLEEPING", "WAITING", "ZOMBIE", "STOPPED", "OTHER"];

export default class Process {
    constructor() {
        this.name = undefined;
        this.path = undefined;
        this.state = undefined;
        this.pid = undefined;
        this.parentPid = undefined;
        this.threadCount = undefined;
        this.priority = undefined;
        this.virtualSize = undefined;
        this.residentSetSize = undefined;
        this.kernelTime = undefined;
        this.userTime = undefined;
        this.startTime = undefined;
        this.upTime = undefined;
        this.bytesRead = undefined;
        this.bytesWritten = undefined;
    }

    // Returns the name of the process.
    getName() {
        return this.name;
    }

    // @return Returns the full path of the executing process.
    getPath() {
        return this.path;
    }

    // Returns the execution state of the process.
    getState() {
        return this.state;
    }

    // Returns the processID.
    getPID() {
        return this.pid;
    }

    // Returns the parentProcessID, if any; 0 otherwise.
    getParentPID() {
        return this.parentPid;
    }

    // Returns the number of threads in this process.
    getThreadCount() {
        return this.threadCount;
    }

    // Returns the priority of this process.
    //   For Linux, priority is a value in the range -20 to 19 (20 on some systems). The default priority is 0; lower priorities cause more favorable scheduling.
    //
    //   For Windows, priority values can range from 0 (lowest priority) to 31 (highest priority).
    //
    //   Mac OS X has 128 priority levels, ranging from 0 (lowest priority) to 127 (highest priority). They are divided into several major bands: 0 through 51 are the normal levels; the
    //   default priority is 31. 52 through 79 are the highest priority regular threads; 80 through 95 are for kernel mode threads; and
    //   96 through 127 correspond to real-time threads, which are treated differently than other threads by the scheduler.
    getPriority() {
        return this.priority;
    }

    // Returns the Virtual Memory Size (VSZ). It includes all memory that the process can access, including memory that is swapped out and memory that is from shared libraries.
    getVirtualSize() {
        return this.virtualSize;
    }

    // Returns the Resident Set Size (RSS). It is used to show how much memory is allocated to that process and is in RAM. It does not
    // include memory that is swapped out. It does include memory from shared libraries as long as the pages from those libraries are
    // actually in memory. It does include all stack and heap memory.
    getResidentSetSize() {
        return this.residentSetSize;
    }

    // Returns the number of milliseconds the process has executed in kernel mode.
    getKernelTime() {
        return this.kernelTime;
    }

    // Returns the number of milliseconds the process has executed in user mode.
    getUserTime() {
        return this.userTime;
    }

    // Returns the number of milliseconds since the process started.
    getUpTime() {
        return this.upTime;
    }

    // Returns the start time of the process in number of milliseconds since January 1, 1970.
    getStartTime() {
        return this.startTime;
    }

    // Returns the number of bytes the process has read from disk.
    getBytesRead() {
        return this.bytesRead;
    }

    // Returns the number of bytes the process has written to disk.
    getBytesWritten() {
        return this.bytesWritten;
    }

    static humanState(state) {
        return STATES[state];
    }
}

Process.NEW = 0; // Intermediate state in process creation
Process.RUNNING = 1; // Actively executing process
Process.SLEEPING = 2; // Interruptible sleep state
Process.WAITING = 3; // Blocked, uninterruptible sleep state
Process.ZOMBIE = 4; // Intermediate state in process termination
Process.STOPPED = 5; // Stopped by the user, such as for debugging
Process.OTHER = 6; // Other or unknown state
