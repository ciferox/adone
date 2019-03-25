module.exports = class Sub0 extends adone.app.Subsystem {
    onConfigure() {
        console.log("sub0 configure");
    }

    onInitialize() {
        console.log("sub0 init");
    }

    onUninitialize() {
        console.log("sub0 uninit");
    }
};
