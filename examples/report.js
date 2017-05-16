adone.run({
    initialize() {
        this.defineArguments({
            commands: [
                { name: "exception", handler: this.exception },
                { name: "loop", handler: this.loop }
            ]
        });
        this.enableReport({
            directory: adone.std.os.tmpdir()
        });
    },
    loop() {
        adone.log(`kill -12 ${process.pid}`);
        for ( ; ; ) {
            // ha
        }
    },
    exception() {
        setTimeout(() => {
            throw new Error("hello");
        }, 500);
    }
});
