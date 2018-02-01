
const { is } = adone;

export default class OS {
    constructor() {
        this.manufacturer = null;
        this.family = null;
        this.codeName = null;
        this.buildNumber = null;
        this.version = null;
    }

    toString() {
        return [this.manufacturer, this.family, this.version, this.buildNumber].join(" ");
    }

    getFileSystem() {
        throw new adone.exception.NotImplemented("getFileSystem()");
    }

    getProcesses(limit, sort) {
        throw new adone.exception.NotImplemented("getProcesses()");
    }

    getProcess(pid) {
        throw new adone.exception.NotImplemented("getProcess()");
    }

    getProcessCount() {
        throw new adone.exception.NotImplemented("getProcessCount()");
    }

    getThreadCount() {
        throw new adone.exception.NotImplemented("getThreadCount()");
    }

    sortProcesses(procs, limit, sortType) {
        if (is.number(sortType)) {
            switch (sortType) {
                case OS.SORT_CPU: break;
                case OS.SORT_MEMORY: break;
                case OS.SORT_OLDEST: break;
                case OS.SORT_NEWEST: break;
                case OS.SORT_PID: break;
                case OS.SORT_PARENTPID: break;
                case OS.SORT_NAME: break;
            }
        }

        let maxProcs = procs.length;
        if (limit > 0 && maxProcs > limit) {
            maxProcs = limit;
        }
        return procs.slice(0, maxProcs);
    }
}
OS.SORT_CPU = 1;
OS.SORT_MEMORY = 2;
OS.SORT_OLDEST = 3;
OS.SORT_NEWEST = 4;
OS.SORT_PID = 5;
OS.SORT_PARENTPID = 6;
OS.SORT_NAME = 7;
