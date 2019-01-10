class TestApp extends adone.app.Application {
    constructor(options) {
        super(options);
        console.log("non configured");
    }

    configure() {
        console.log("configured");
    }

    initialize() {
        console.log("initialized");
    }

    main() {
        console.log("main");
        setTimeout(() => {
            this._reinitialize();
        }, 300);
    }

    uninitialize() {
        console.log("uninitialized");
    }
}

adone.app.run(TestApp);
