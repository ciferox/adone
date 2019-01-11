const {
    app
} = adone;

const {
    CommandMeta
} = app;

class App extends app.Application {
    configure() {
        this.enableReport({
            directory: adone.std.os.tmpdir()
        });
    }

    @CommandMeta()
    error() {
        setTimeout(() => {
            throw new Error("hello");
        }, 500);
    }

    @CommandMeta()
    loop() {
        console.log(`kill -12 ${process.pid}`);
        for ( ; ; ) {
            // ha
        }
    }
}

app.run(App, {
    useArgs: true
});
