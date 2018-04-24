adone.app.run({
    status: "non configured",
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
        adone.log("adone compact application");
        return 0;
    },

    uninitialize() {
        this.status = "uninitialized";
        adone.log(this.status);
    }
});
