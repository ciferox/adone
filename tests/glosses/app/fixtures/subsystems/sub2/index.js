module.exports = class Sub2 extends adone.app.Subsystem {
    onConfigure() {
        console.log("sub2 configure");
    }

    onInitialize() {
        console.log("sub2 init");
    }

    onUninitialize() {
        console.log("sub2 uninit");
    }
};
