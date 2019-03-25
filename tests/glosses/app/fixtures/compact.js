adone.app.run({
    status: "non configured",
    onConfigure() {
        console.log(this.status);
        this.status = "configured";
        console.log(this.status);
    },

    onInitialize() {
        this.status = "initialized";
        console.log(this.status);
    },

    run() {
        this.status = "run";
        console.log(this.status);
        console.log("adone compact application");
        return 0;
    },

    onUninitialize() {
        this.status = "uninitialized";
        console.log(this.status);
    }
});
