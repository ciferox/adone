adone.lazify({
    OS: "./system/operating_system",
    HAL: "./hardware/hal",
    FileSystem: "./system/file_system",
    FileStore: "./system/file_store",
    Process: "./system/process",
    // LinuxUtils: "./glosses/shi/system/linux/utils",
    // LinuxFS: "./glosses/shi/system/linux/file_system",
    // LinuxProcess: "./glosses/shi/system/linux/process",
    // WindowsFS: "./glosses/shi/system/windows/file_system",
    // WindowsProcess: "./glosses/shi/system/windows/process",
    // WindowsHAL: "./glosses/shi/hardware/windows",
    // FreebsdProcess: "./glosses/shi/system/freebsd/process",
    // FreebsdHAL: "./glosses/shi/hardware/freebsd"

    sloc: "./sloc",
    system: () => {
        let OperatingSystem;
        switch (process.platform) {
            case "linux": OperatingSystem = require("./system/linux").default; break;
            case "win32": OperatingSystem = require("./system/windows").default; break;
            case "freebsd": OperatingSystem = require("./system/freebsd").default; break;
            case "darwin": OperatingSystem = require("./system/darwin").default; break;
            case "sunos": OperatingSystem = require("./system/sunos").default; break;
            default: throw new adone.x.NotSupported(`Unsupported operating system: ${process.platform}`);
        }
        return new OperatingSystem();
    },
    hardware: () => {
        let Hardware;
        switch (process.platform) {
            case "linux": Hardware = require("./hardware/linux").default; break;
            case "win32": Hardware = require("./hardware/windows").default; break;
            case "freebsd": Hardware = require("./hardware/freebsd").default; break;
            case "darwin": Hardware = require("./hardware/darwin").default; break;
            case "sunos": Hardware = require("./hardware/sunos").default; break;
            default: throw new adone.x.NotSupported(`Unsupported operating system: ${Hardware.platform}`);
        }
        return new Hardware();
    }
}, exports, require);
