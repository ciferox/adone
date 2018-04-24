class TestApp extends adone.app.Application {
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
            this._reinitialize();
        }, 300);
    }

    uninitialize() {
        adone.log("uninitialized");
    }
}

adone.app.run(TestApp);
