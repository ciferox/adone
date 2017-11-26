module.exports = class Hello extends adone.application.Subsystem {
    configure() {
        adone.log("hello configure");
    }

    initialize() {
        adone.log("hello init");
    }

    uninitialize() {
        adone.log("hello uninit");
    }
};
