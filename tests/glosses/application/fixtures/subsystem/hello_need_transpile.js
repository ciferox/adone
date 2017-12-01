export default class Hello extends adone.application.Subsystem {
    configure() {
        adone.log("hello configure");
    }

    @adone.noop
    initialize() {
        adone.log("hello init");
    }

    uninitialize() {
        adone.log("hello uninit");
    }
}
