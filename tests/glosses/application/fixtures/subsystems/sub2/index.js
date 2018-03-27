module.exports = class Sub2 extends adone.application.Subsystem {
    configure() {
        adone.log("sub2 configure");
    }

    initialize() {
        adone.log("sub2 init");
    }

    uninitialize() {
        adone.log("sub2 uninit");
    }
};
