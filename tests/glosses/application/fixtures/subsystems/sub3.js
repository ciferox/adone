export default class Sub3 extends adone.application.Subsystem {
    configure() {
        adone.log("sub3 configure");
    }

    @adone.noop
    initialize() {
        adone.log("sub3 init");
    }

    uninitialize() {
        adone.log("sub3 uninit");
    }
}
