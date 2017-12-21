const {
    join,
    resolve
} = require("path");

let home;
let realm = ".adone_dev";

if (process.env.ADONE_HOME) {
    home = process.env.ADONE_HOME;
} else {
    if (process.platform === "win32") {
        home = resolve(process.env.USERPROFILE, realm);
    } else {
        if (process.env.HOME && !process.env.HOMEPATH) {
            home = resolve(process.env.HOME, realm);
        } else if (process.env.HOME || process.env.HOMEPATH) {
            home = resolve(process.env.HOMEDRIVE, process.env.HOME || process.env.HOMEPATH, realm);
        } else {
            home = resolve("/etc", realm);
        }
    }
    
    // Set ADONE_HOME
    process.env.ADONE_HOME = home;
}

// Set ADONE_REALM
if (process.env.ADONE_REALM) {
    realm = process.env.ADONE_REALM;
} else {
    process.env.ADONE_REALM = realm;
}


const runtimePath = join(home, "runtime");
const varPath = join(home, "var");
const configsPath = join(home, "configs");
const omnitronVarPath = join(varPath, "omnitron");
const omnitronDataPath = join(omnitronVarPath, "data");
const logsPath = join(varPath, "logs");
const omnitronLogsPath = join(logsPath, "omnitron");

const config = {
    realm,
    home,
    runtimePath,
    configsPath,
    varPath,
    logsPath,
    packagesPath: join(home, "packages"),
    lockFilePath: join(runtimePath, "realm"),
    devmntPath: join(configsPath, "devmnt.json"),

    omnitron: {
        logsPath: omnitronLogsPath,
        logFilePath: join(omnitronLogsPath, "omnitron.log"),
        errorLogFilePath: join(omnitronLogsPath, "omnitron-err.log"),
        pidFilePath: join(runtimePath, "omnitron.pid"),
        varPath: omnitronVarPath,
        dataPath: omnitronDataPath,
        servicesPath: join(omnitronVarPath, "services"),
        dbPath: join(omnitronVarPath, "db")
    }
};

module.exports = config;
