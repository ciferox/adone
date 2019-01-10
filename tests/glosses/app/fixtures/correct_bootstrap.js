class TestApp extends adone.app.Application {
    constructor() {
        super();

        this.status = "non configured";
    }

    configure() {
        this.status = "configured";
        console.log(this.status);
    }

    initialize() {
        this.status = "initialized";
        console.log(this.status);
    }

    main() {
        this.status = "run";
        console.log(this.status);
        return 0;
    }

    uninitialize() {
        this.status = "uninitialized";
        console.log(this.status);
    }
}

adone.app.run(TestApp);
