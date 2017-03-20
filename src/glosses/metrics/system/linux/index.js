
import LinuxProcess from "./process";
import LinuxFS from "./file_system";
const { is } = adone;

export default class LinuxOS extends adone.metrics.OS {
    constructor() {
        super();
        this.versionId = null;
        this.codeName = null;
        this.manufacturer = "GNU/Linux";

        let got = this._readOsRelease();
        if (!got) {
            got = this._readLsbRelease();
        }
        if (is.null(this.codeName)) {
            this.codeName = "";
        }

        this.version = this.versionId;
        if (this.codeName.length > 0) {
            this.version += ` (${this.codeName})`;
        }

        try {
            const procVersion = adone.fs.readLinesSync("/proc/version");
            if (!is.null(procVersion) && procVersion.length > 0) {
                const parts = procVersion[0].split(/\s+/g);
                for (const s of parts) {
                    if (s !== "Linux" && s !== "version") {
                        this.buildNumber = s;
                        break;
                    }
                }
            }
        } catch (err) {
            this.buildNumber = "";
        }
        if (this.buildNumber.length > 0) {
            this.version += ` build ${this.buildNumber}`;
        }
    
        try {
            this.pageSize = parseInt(adone.metrics.native.system.getPageSize());
        } catch (err) {
            this.pageSize = 4096; // default
        }
        
        // static initializations of all subsystems
        LinuxProcess._initialize();
    }

    getFileSystem() {
        return new LinuxFS();
    }

    getProcesses(limit = Number.MAX_SAFE_INTEGER, sort = adone.metrics.OS.SORT_OLDEST) {
        const procs = [];
        const pids = LinuxProcess.getPids();
        for (const pid of pids) {
            const process = this.getProcess(Number.parseInt(pid, 10));
            if (!is.null(process)) {
                procs.push(process);
            }
        }
        return procs;
    }

    getProcess(pid) {
        try {
            if (!is.number(pid)) {
                return null;
            }
            const parts = adone.fs.readWordsSync(adone.sprintf("/proc/%d/stat", pid));
            if (is.null(parts) || parts.length < 24) return null;
            const path = adone.std.fs.readlinkSync(adone.sprintf("/proc/%d/exe", pid));
            const io = this._readKeyValues(adone.sprintf("/proc/%d/io", pid), ":");

            return new LinuxProcess(
                parts[1].replace(/\(/, "").replace(")", ""), // name
                path, // path
                parts[2].charAt(0), // state
                pid, // pid
                Number.parseInt(parts[3]), // parent pid
                Number.parseInt(parts[19]), // thread count
                Number.parseInt(parts[17]), // priority
                Number.parseInt(parts[22]), // virtual size
                Number.parseInt(parts[23]) * this.pageSize, // resident set size
                Number.parseInt(parts[14]), // kernel time
                Number.parseInt(parts[13]), // user time
                Number.parseInt(parts[21]), // start time
                Number.parseInt(io.get("read_bytes") || "0"), // bytes read
                Number.parseInt(io.get("write_bytes") || "0"), // bytes written
                (new Date()).getTime()
            );
        } catch (err) {
            return null;
        }
    }

    getProcessCount() {
        return LinuxProcess.getPids().length;
    }

    getThreadCount() {
        return adone.metrics.native.system.sysinfo().procs;
    }

    _readOsRelease() {
        const lines = adone.fs.readLinesSync("/etc/os-release", true);
        if (!is.null(lines)) {
            const re = /^\"|\"$/g;
            for (let line of lines) {
                if (line.startsWith("VERSION=")) {
                    line = line.replace("VERSION=", "").replace(re, "").trim();
                    let parts = line.split(/[()]/g);
                    if (parts.length <= 1) {
                        parts = line.split(/[, ]/g);
                    }
                    if (parts.length > 0) {
                        this.versionId = parts[0].trim();
                    }
                    if (parts.length > 1) {
                        this.codeName = parts[1].trim();
                    }
                } else if (line.startsWith("NAME=") && is.null(this.family)) {
                    this.family = line.replace("NAME=", "").replace(re, "").trim();
                } else if (line.startsWith("VERSION_ID") && is.null(this.versionId)) {
                    this.versionId = line.replace("VERSION_ID=", "").replace(re, "").trim();
                }
            }
        }
        return !is.null(this.family); 
    }

    _readLsbRelease() {
        const lines = adone.fs.readLinesSync("/etc/lsb-release", true);
        if (!is.null(lines)) {
            const re = /^\"|\"$/g;
            for (let line of lines) {
                if (line.startsWith("DISTRIB_DESCRIPTION=")) {
                    line = line.replace("DISTRIB_DESCRIPTION=", "").replace(re, "").trim();
                    if (line.includes(" release ")) {
                        this.family = this._parseRelease(line, " release ");
                    }
                } else if (line.startsWith("DISTRIB_ID=") && is.null(this.family)) {
                    this.family = line.replace("DISTRIB_ID=", "").replace(re, "").trim();
                } else if (line.startsWith("DISTRIB_RELEASE=") && is.null(this.versionId)) {
                    this.versionId = line.replace("DISTRIB_RELEASE=", "").replace(re, "").trim();
                } else if (line.startsWith("DISTRIB_CODENAME=") && is.null(this.codeName)) {
                    this.codeName = line.replace("DISTRIB_CODENAME=", "").replace(re, "").trim();
                }
            }
        }
        return !is.null(this.family);
    }

    _parseRelease(line, splitter) {
        let parts = line.split(new RegExp(splitter));
        const family = parts[0].trim();
        if (parts.length > 1) {
            parts = parts[1].split(/[()]/g);
            if (parts.length > 0) {
                this.versionId = parts[0].trim();
            }
            if (parts.length > 1) {
                this.codeName = parts[1].trim();
            }
        }
        return family;   
    }

    _readKeyValues(filepath, separator) {
        const map = new Map();
        const lines = adone.fs.readLinesSync(filepath);
        
        for (const line of lines) {
            const parts = line.split(separator);
            if (parts.length === 2) {
                map.set(parts[0], parts[1].trim());
            }
        }
        return map;
    }
}
