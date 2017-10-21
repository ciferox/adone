const {
    join,
    resolve
} = require("path");

let home;
let realm = "dev";
let dirName = ".adone_dev";

if (process.env.ADONE_HOME) {
    home = process.env.ADONE_HOME;
} else {
    if (process.platform === "win32") {
        home = resolve(process.env.USERPROFILE, dirName);
    } else {
        if (process.env.HOME && !process.env.HOMEPATH) {
            home = resolve(process.env.HOME, dirName);
        } else if (process.env.HOME || process.env.HOMEPATH) {
            home = resolve(process.env.HOMEDRIVE, process.env.HOME || process.env.HOMEPATH, dirName);
        } else {
            home = resolve("/etc", dirName);
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

// Set ADONE_DIRNAME
if (process.env.ADONE_DIRNAME) {
    dirName = process.env.ADONE_DIRNAME;
} else {
    process.env.ADONE_DIRNAME = dirName;
}

const runtimePath = join(home, "runtime");
const varPath = join(home, "var");
const configsPath = join(home, "configs");
const omnitronVarPath = join(varPath, "omnitron");
const omnitronServicesPath = join(omnitronVarPath, "services");
const logsPath = join(varPath, "logs");
const omnitronLogsPath = join(logsPath, "omnitron");

const config = {
    realm,
    dirName,
    home,
    runtimePath,
    configsPath,
    varPath,
    logsPath,
    packagesPath: join(home, "packages"),

    omnitron: {
        logsPath: omnitronLogsPath,
        logFilePath: join(omnitronLogsPath, "omnitron.log"),
        errorLogFilePath: join(omnitronLogsPath, "omnitron-err.log"),
        pidFilePath: join(runtimePath, "omnitron.pid"),
        varPath: omnitronVarPath,
        servicesPath: omnitronServicesPath
    }
};

module.exports = config;
