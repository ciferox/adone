module.exports = class Sub1 extends adone.app.Subsystem {
    configure() {
        adone.log("sub1 configure");
    }

    initialize() {
        adone.log("sub1 init");
    }

    uninitialize() {
        adone.log("sub1 uninit");
    }
};
