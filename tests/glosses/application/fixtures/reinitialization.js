class TestApp extends adone.application.Application {
    constructor(options) {
        super(options);
        adone.log("non configured");
    }

    configure() {
        adone.log("configured");
    }

    initialize() {
        adone.log("initialized");
    }

    main() {
        adone.log("main");
        setTimeout(() => {
            this._reinitialize(process.env.reconfigure === "yes");
        }, 300);
    }

    uninitialize() {
        adone.log("uninitialized");
    }
}

adone.application.run(TestApp);
