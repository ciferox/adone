module.exports.Memory = require("./memory");
module.exports.LevelUp = require("./levelup");
module.exports.Redis = require("./redis");
module.exports.Mongo = require("./mongo");
module.exports.util = require("./utils");

const factories = {};
Object.keys(module.exports).forEach((type) => {
    factories[type.toLowerCase()] = module.exports[type];
});

module.exports.getFactory = function (name) {
    return factories[name.toLowerCase()];
};
