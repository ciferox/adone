const {
    is,
    metrics: {
        system
    },
    netron: {
        decorator: {
            Type,
        Contextable,
        Description
        }
    }
} = adone;

@Contextable
@Description("System metrics")
class System {
    constructor() {
        this.fs = null;
    }
    @Description("Returns operating system description")
    @Type(Object)
    info() {
        return {
            manufacturer: system.manufacturer,
            family: system.family,
            version: system.version,
            codeName: system.codeName,
            buildNumber: system.buildNumber,
            full: system.toString()
        };
    }

    @Description("Returns list of processes")
    @Type(Array)
    async processes() {
        return (await system.getProcesses()).map((p) => ({
            name: p.getName(),
            pid: p.getPID(),
            ppid: p.getParentPID(),
            state: p.getState(),
            priority: p.getPriority(),
            vsize: p.getVirtualSize(),
            rss: p.getResidentSetSize(),
            upTime: p.getUpTime(),
            kernelTime: p.getKernelTime(),
            userTime: p.getUserTime(),
            bytesRead: p.getBytesRead(),
            bytesWritten: p.getBytesWritten()
        }));
    }

    @Description("Returns process information by PID")
    @Type(Object)
    getProcess(pid) {
        return system.getProcess(pid);
    }

    @Description("Returns number processes currently running")
    @Type(Number)
    processCount() {
        return system.getProcessCount();
    }

    @Description("Returns number threads currently running")
    @Type(Number)
    threadCount() {
        return system.getThreadCount();
    }

    @Description("Returns list of system volumes")
    @Type(Array)
    volumes() {
        return this._getFs().getFileStores();
    }

    _getFs() {
        if (is.null(this.fs)) {
            this.fs = system.getFileSystem();
        }
        return this.fs;
    }
}

export default System; // code generator fails when export + class decorator, todo: fix
