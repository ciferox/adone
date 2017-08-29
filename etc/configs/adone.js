const { join, resolve } = require("path");

let home;
let environment = "development";
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

// Set ADONE_ENV
if (process.env.ADONE_ENV) {
    environment = process.env.ADONE_ENV;
} else {
    process.env.ADONE_ENV = environment;
}

// Set ADONE_DIRNAME
if (process.env.ADONE_DIRNAME) {
    dirName = process.env.ADONE_DIRNAME;
} else {
    process.env.ADONE_DIRNAME = dirName;
}

const configsPath = join(home, "configs");
const extensionsPath = join(home, "extensions");
const cliExtsPath = join(extensionsPath, "cli");
const cliSubsystemsPath = join(cliExtsPath, "subsystems");
const omnitronExtsPath = join(extensionsPath, "omnitron");
const omnitronServicesPath = join(omnitronExtsPath, "services");

const config = {
    environment,
    dirName,
    home,
    configsPath,
    varPath: join(home, "var"),

    cli: {
        extsPath: cliExtsPath,
        subsystemsPath: cliSubsystemsPath
    },

    omnitron: {
        logFilePath: join(home, "omnitron.log"),
        errorLogFilePath: join(home, "omnitron-err.log"),
        pidFilePath: join(home, "omnitron.pid"),
        extsPath: omnitronExtsPath,
        servicesPath: omnitronServicesPath
    }
};

module.exports = config;
