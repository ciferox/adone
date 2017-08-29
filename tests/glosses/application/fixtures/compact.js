const adone = require(process.env.ADONE_ROOT_PATH).adone;

adone.application.run({
    status: "non configured",
    _: {
        title: "adone compact application"
    },

    configure() {
        adone.log(this.status);
        this.status = "configured";
        adone.log(this.status);
    },

    initialize() {
        this.status = "initialized";
        adone.log(this.status);
    },

    main() {
        this.status = "run";
        adone.log(this.status);
        adone.log(this._.title);
        return 0;
    },

    uninitialize() {
        this.status = "uninitialized";
        adone.log(this.status);
    }
});
