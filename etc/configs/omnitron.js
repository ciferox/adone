// adone-dont-transpile

const { join } = require("path");

const home = process.env.ADONE_HOME;

// Below are configurable options

module.exports = {
    logFilePath: join(home, "omnitron.log"),
    errorLogFilePath: join(home, "omnitron-err.log"),
    pidFilePath: join(home, "omnitron.pid"),
    servicesPath: join(home, "services"),
    getServicePath(serviceName, dirName) {
        let fullPath;
        if (typeof (dirType) === "string") {
            fullPath = join(this.servicesPath, serviceName, dirName);
        } else {
            fullPath = join(this.servicesPath, serviceName);
        }

        return adone.fs.mkdir(fullPath).then(() => fullPath);
    }
};
