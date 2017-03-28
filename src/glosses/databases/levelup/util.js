const LevelUPError = require("level-errors").LevelUPError;
const format = require("util").format;
const defaultOptions = {
    createIfMissing: true,
    errorIfExists: false,
    keyEncoding: "utf8",
    valueEncoding: "utf8",
    compression: true
};
let leveldown = null;

function getOptions(options) {
    if (typeof options === "string") {
        options = { valueEncoding: options };
    }
    if (typeof options !== "object") {
        options = {};
    }
    return options;
}

function getLevelDOWN() {
    if (leveldown === null) {
        leveldown = adone.database.leveldown;        
    }
    return leveldown;
}

function requireError(e) {
    const template = "Failed to require LevelDOWN (%s). Try `npm install leveldown` if it's missing";
    return new LevelUPError(format(template, e.message));
}

function dispatchError(db, error, callback) {
    typeof callback === "function" ? callback(error) : db.emit("error", error);
}

function isDefined(v) {
    return typeof v !== "undefined";
}

module.exports = {
    defaultOptions
    , getOptions
    , getLevelDOWN
    , dispatchError
    , isDefined
};
