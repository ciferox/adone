// adone-dont-transpile

const { join, resolve } = require("path");

let home;
let environment = "development";
let dirName = ".adone_dev";

if (process.env.ADONE_HOME) {
    home = process.env.ADONE_HOME;
} else {
    if (process.platform === "win32") {
        home = process.env.USERPROFILE;
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

const config = {
    environment,
    dirName,
    home,
    configsPath,
    configFilePath: join(configsPath, "adone.js")
};

module.exports = config;
