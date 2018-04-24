class TestApp extends adone.app.Application {
    constructor() {
        super();

        this.status = "non configured";
    }

    configure() {
        this.status = "configured";
        adone.log(this.status);
    }

    initialize() {
        this.status = "initialized";
        adone.log(this.status);
    }

    main() {
        this.status = "run";
        adone.log(this.status);
        return 0;
    }

    uninitialize() {
        this.status = "uninitialized";
        adone.log(this.status);
    }
}

adone.app.run(TestApp);
