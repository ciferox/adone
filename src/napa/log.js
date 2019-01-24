const binding = require("./binding");

const {
    is
} = adone;

// export interface LogFunction {
//     (message): void;
//     (section, message): void;
//     (section, traceId, message): void;
// }

// export interface Log extends LogFunction {
//     err(message): void;
//     err(section, message): void;
//     err(section, traceId, message): void;

//     warn(message): void;
//     warn(section, message): void;
//     warn(section, traceId, message): void;

//     info(message): void;
//     info(section, message): void;
//     info(section, traceId, message): void;

//     debug(message): void;
//     debug(section, message): void;
//     debug(section, traceId, message): void;
// }

const LogLevel = {};
LogLevel[LogLevel.Error = 0] = "Error";
LogLevel[LogLevel.Warning = 1] = "Warning";
LogLevel[LogLevel.Info = 2] = "Info";
LogLevel[LogLevel.Debug = 3] = "Debug";

const dispatchLog = function (level, arg1, arg2, arg3) {
    if (!is.nil(arg3)) {
        binding.log(level, arg1, arg2, arg3);
    } else if (!is.nil(arg2)) {
        binding.log(level, arg1, undefined, arg2);
    } else {
        binding.log(level, undefined, undefined, arg1);
    }
};

const createLogObject = function () {
    // napa.log()
    const logObj = function (arg1, arg2, arg3) {
        dispatchLog(LogLevel.Info, arg1, arg2, arg3);
    };

    // napa.log.err()
    logObj.err = function (arg1, arg2, arg3) {
        dispatchLog(LogLevel.Error, arg1, arg2, arg3);
    };

    // napa.log.warn()
    logObj.warn = function (arg1, arg2, arg3) {
        dispatchLog(LogLevel.Warning, arg1, arg2, arg3);
    };

    // napa.log.info()
    logObj.info = function (arg1, arg2, arg3) {
        dispatchLog(LogLevel.Info, arg1, arg2, arg3);
    };

    // napa.log.debug()
    logObj.debug = function (arg1, arg2, arg3) {
        dispatchLog(LogLevel.Debug, arg1, arg2, arg3);
    };

    return logObj;
};

export const log = createLogObject();
