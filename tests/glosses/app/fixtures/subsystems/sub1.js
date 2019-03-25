module.exports = class Sub1 extends adone.app.Subsystem {
    onConfigure() {
        console.log("sub1 configure");
    }

    onInitialize() {
        console.log("sub1 init");
    }

    onUninitialize() {
        console.log("sub1 uninit");
    }
};
