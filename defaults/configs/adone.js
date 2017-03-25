// adone-dont-transpile

const { join, resolve } = require("path");

let home = "";

if (process.env.ADONE_HOME) {
    home = process.env.ADONE_HOME;
} else {
    if (process.platform === "win32") {
        home = process.env.USERPROFILE;
    } else {
        if (process.env.HOME && !process.env.HOMEPATH) {
            home = resolve(process.env.HOME, ".adone");
        } else if (process.env.HOME || process.env.HOMEPATH) {
            home = resolve(process.env.HOMEDRIVE, process.env.HOME || process.env.HOMEPATH, ".adone");
        } else {
            home = resolve("/etc", ".adone");
        }
    }
    
    // Set ADONE_HOME
    process.env.ADONE_HOME = home;
}

const configsPath = join(home, "configs");

const config = {
    home,
    configsPath,
    configFilePath: join(configsPath, "adone.js")
};

module.exports = config;
