Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = class AppSubsystem extends adone.app.Subsystem {
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
