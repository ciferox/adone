class TestApp extends adone.app.Application {
    constructor() {
        super();

        this.status = "non configured";
    }

    onConfigure() {
        this.status = "configured";
        console.log(this.status);
    }

    onInitialize() {
        this.status = "initialized";
        console.log(this.status);
    }

    run() {
        this.status = "run";
        console.log(this.status);
        return 0;
    }

    onUninitialize() {
        this.status = "uninitialized";
        console.log(this.status);
    }
}

adone.app.run(TestApp);
