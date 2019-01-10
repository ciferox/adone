module.exports = class Sub1 extends adone.app.Subsystem {
    configure() {
        console.log("sub1 configure");
    }

    initialize() {
        console.log("sub1 init");
    }

    uninitialize() {
        console.log("sub1 uninit");
    }
};
