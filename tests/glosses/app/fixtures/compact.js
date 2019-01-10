adone.app.run({
    status: "non configured",
    configure() {
        console.log(this.status);
        this.status = "configured";
        console.log(this.status);
    },

    initialize() {
        this.status = "initialized";
        console.log(this.status);
    },

    main() {
        this.status = "run";
        console.log(this.status);
        console.log("adone compact application");
        return 0;
    },

    uninitialize() {
        this.status = "uninitialized";
        console.log(this.status);
    }
});
