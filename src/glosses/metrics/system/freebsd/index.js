
import FreebsdProcess from "./process";

export default class FreebsdOS extends adone.metrics.OS {
    constructor() {
        super();

        this.manufacturer = "Unix/BSD";
        this.family = adone.metrics.native.system.sysctl("kern.ostype");
        this.version = adone.metrics.native.system.sysctl("kern.osrelease");
        const versionInfo = adone.metrics.native.system.sysctl("kern.version");
        this.buildNumber = versionInfo.split(":")[0].replace(this.family, "").replace(this.version, "").trim();
        this.codeName = "";
    }
    
    getProcesses(limit = Number.MAX_SAFE_INTEGER, sort = adone.metrics.OS.SORT_OLDEST) {
        const result = [];
        const now = (new Date()).getTime();

        const procs = adone.metrics.native.system.getProcesses();

        for (let i = 0; i < procs.length; i++) {
            result.push(this._createProcess(procs[i], now));
        }

        return result;
    }
    
    getProcess(pid) {
        return this._createProcess(adone.metrics.native.system.getProcess(pid));
    }
    
    getProcessCount() {
        return adone.metrics.native.system.getProcessCount();
    }
    
    getThreadCount() {
        return adone.metrics.native.system.getThreadCount();
    }
    
    _createProcess(pi, now = (new Date()).getTime()) {
        return new FreebsdProcess(
            pi.name,
            pi.path,
            pi.state,
            pi.pid,
            pi.parentPid,
            pi.threadCount,
            pi.priority,
            pi.virtualSize,
            pi.residentSetSize,
            pi.kernelTime,
            pi.userTime,
            pi.elapsedTime,
            0,
            0,
            now);
    }
}
