Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = class AppSubsystem extends adone.app.Subsystem {
    configure() {
        console.log("configure");
    }

    initialize() {
        console.log("initialize");
    }

    uninitialize() {
        console.log("uninitialize");
    }
};
