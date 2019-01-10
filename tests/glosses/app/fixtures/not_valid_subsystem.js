Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = class AppSubsystem {
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
