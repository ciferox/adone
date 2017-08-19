const native = adone.bind("git.node");

const {
    promise: { promisifyAll }
} = adone;

const Config = native.Config;

Config.LEVEL = {
    PROGRAMDATA: 1,
    SYSTEM: 2,
    XDG: 3,
    GLOBAL: 4,
    LOCAL: 5,
    APP: 6,
    HIGHEST_LEVEL: -1
};

Config.findProgramdata = promisifyAll(Config.findProgramdata);
Config.prototype.getStringBuf = promisifyAll(Config.prototype.getStringBuf);
Config.openDefault = promisifyAll(Config.openDefault);
Config.prototype.setString = promisifyAll(Config.prototype.setString);
Config.prototype.snapshot = promisifyAll(Config.prototype.snapshot);

// Backwards compatibility.
Config.prototype.getString = function () {
    return this.getStringBuf.apply(this, arguments);
};

export default Config;
