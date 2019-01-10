module.exports = class Sub0 extends adone.app.Subsystem {
    configure() {
        console.log("sub0 configure");
    }

    initialize() {
        console.log("sub0 init");
    }

    uninitialize() {
        console.log("sub0 uninit");
    }
};
