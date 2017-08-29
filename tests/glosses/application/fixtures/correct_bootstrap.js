const adone = require(process.env.ADONE_ROOT_PATH).adone;

class TestApp extends adone.application.Application {
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

adone.application.run(TestApp);
