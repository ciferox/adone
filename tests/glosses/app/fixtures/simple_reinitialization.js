class TestApp extends adone.app.Application {
    constructor(options) {
        super(options);
        console.log("non configured");
    }

    onConfigure() {
        console.log("configured");
    }

    onInitialize() {
        console.log("initialized");
    }

    async run() {
        console.log("main");
        setTimeout(() => {
            this.reinitialize();
        }, 300);
    }

    onUninitialize() {
        console.log("uninitialized");
    }
}

adone.app.run(TestApp);
