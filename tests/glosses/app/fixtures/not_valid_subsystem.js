Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = class AppSubsystem {
    configure() {
        adone.log("configure");
    }

    initialize() {
        adone.log("initialize");
    }

    uninitialize() {
        adone.log("uninitialize");
    }
};
