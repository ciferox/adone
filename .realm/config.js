const {
    join
} = require("path");

const HOME = join(__dirname, "..");
const RUNTIME_PATH = join(HOME, "runtime");
const VAR_PATH = join(HOME, "var");
const CONFIGS_PATH = join(HOME, "configs");
const omnitronVarPath = join(VAR_PATH, "omnitron");
const omnitronDataPath = join(omnitronVarPath, "data");
const LOGS_PATH = join(VAR_PATH, "logs");
const omnitronLogsPath = join(LOGS_PATH, "omnitron");

const config = {
    HOME,
    RUNTIME_PATH,
    CONFIGS_PATH,
    VAR_PATH,
    LOGS_PATH,
    PACKAGES_PATH: join(HOME, "packages"),
    LOCKFILE_PATH: join(RUNTIME_PATH, "realm"),
    devmntPath: join(CONFIGS_PATH, "devmnt.json"),

    omnitron: {
        LOGS_PATH: omnitronLogsPath,
        LOGFILE_PATH: join(omnitronLogsPath, "omnitron.log"),
        ERRORLOGFILE_PATH: join(omnitronLogsPath, "omnitron-err.log"),
        PIDFILE_PATH: join(RUNTIME_PATH, "omnitron.pid"),
        VAR_PATH: omnitronVarPath,
        DATA_PATH: omnitronDataPath,
        SERVICES_PATH: join(omnitronVarPath, "services"),
        DB_PATH: join(omnitronVarPath, "db")
    }
};

module.exports = config;
