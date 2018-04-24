module.exports = class Sub0 extends adone.app.Subsystem {
    configure() {
        adone.log("sub0 configure");
    }

    initialize() {
        adone.log("sub0 init");
    }

    uninitialize() {
        adone.log("sub0 uninit");
    }
};
