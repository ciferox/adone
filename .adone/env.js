const {
    std: { path: { join } }
} = adone;

const ROOT_PATH = join(__dirname, "..");
const RUNTIME_PATH = join(ROOT_PATH, "run");
const VAR_PATH = join(ROOT_PATH, "var");
const ETC_PATH = join(ROOT_PATH, "etc");
const omnitronVarPath = join(VAR_PATH, "omnitron");
const omnitronDataPath = join(omnitronVarPath, "data");
const LOGS_PATH = join(VAR_PATH, "logs");
const omnitronLogsPath = join(LOGS_PATH, "omnitron");

export default {
    ROOT_PATH,
    RUNTIME_PATH,
    ETC_PATH,
    ETC_ADONE_PATH: join(ETC_PATH, "adone"),
    OPT_PATH: join(ROOT_PATH, "opt"),
    VAR_PATH,
    SHARE_PATH: join(ROOT_PATH, "share"),
    LOGS_PATH,
    KEYS_PATH: join(ROOT_PATH, "keys"),
    PACKAGES_PATH: join(ROOT_PATH, "packages"),
    LOCKFILE_PATH: join(ROOT_PATH, "realm.lock"),

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
