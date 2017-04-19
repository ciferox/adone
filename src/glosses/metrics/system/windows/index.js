
import WindowsProcess from "./process";
import WindowsFS from "./file_system";
const { is } = adone;

export default class WindowsOS extends adone.metrics.OS {
    constructor() {
        super();

        this.manufacturer = "Microsoft";
        this.family = "Windows";
        const versionInfo = adone.metrics.native.getVersionInfo();
        this.version = versionInfo.version;
        this.codeName = versionInfo.codeName;
        this.buildNumber = versionInfo.buildNumber;
    }
    
    getFileSystem() {
        return new WindowsFS();
    }

    getProcesses(limit = Number.MAX_SAFE_INTEGER, sort = adone.metrics.OS.SORT_OLDEST) {
        const procs = [];
        const list = adone.metrics.native.getProcesses();
        const now = (new Date()).getTime();

        for (let i = 0; i < list.length; i++) {
            procs.push(this._createProcess(list[i], now));
        }

        return procs;
    }

    getProcess(pid) {
        try {
            if (!is.number(pid)) {
                return null;
            }
            const pi = adone.metrics.native.getProcess(pid);
            return this._createProcess(pi);
        } catch (err) {
            return null;
        }
    }

    getProcessCount() {
        return adone.metrics.native.getProcessCount();
    }

    async getThreadCount() {
        return adone.metrics.native.getThreadCount();
    }

    _createProcess(pi, now = (new Date()).getTime()) {
        return new WindowsProcess(
            pi.name,
            pi.commandLine,
            pi.executionState,
            pi.pid,
            pi.parentPid,
            pi.threadCount,
            pi.priority,
            pi.virtualSize,
            pi.workingSetSize,
            pi.kernelTime / 10000,
            pi.userTime / 10000,
            pi.creationDate,
            pi.bytesRead,
            pi.bytesWritten,
            now);
    }
}
