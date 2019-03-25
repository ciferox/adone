export default class Sub3 extends adone.app.Subsystem {
    onConfigure() {
        console.log("sub3 configure");
    }

    @adone.noop
    onInitialize() {
        console.log("sub3 init");
    }

    onUninitialize() {
        console.log("sub3 uninit");
    }
}
