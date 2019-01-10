export default class Sub3 extends adone.app.Subsystem {
    configure() {
        console.log("sub3 configure");
    }

    @adone.noop
    initialize() {
        console.log("sub3 init");
    }

    uninitialize() {
        console.log("sub3 uninit");
    }
}
