module.exports = class Sub2 extends adone.app.Subsystem {
    configure() {
        console.log("sub2 configure");
    }

    initialize() {
        console.log("sub2 init");
    }

    uninitialize() {
        console.log("sub2 uninit");
    }
};
