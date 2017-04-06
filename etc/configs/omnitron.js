// adone-dont-transpile

const { join } = require("path");

const home = process.env.ADONE_HOME;

// Below are configurable options

const storesPath = join(home, "stores");

module.exports = {
    logFilePath: join(home, "omnitron.log"),
    errorLogFilePath: join(home, "omnitron-err.log"),
    pidFilePath: join(home, "omnitron.pid"),
    servicesPath: join(home, "services"),
    storesPath,
    systemDbPath: join(storesPath, "system"),
    hostsDbPath: join(storesPath, "hosts"),
    getServicePath(serviceName, dirName) {
        let fullPath;
        if (typeof(dirType) === "string") {            
            fullPath = join(this.servicesPath, serviceName, dirName);
        } else {
            fullPath = join(this.servicesPath, serviceName);
        }

        return adone.fs.mkdir(fullPath).then(() => fullPath);
    }
};
