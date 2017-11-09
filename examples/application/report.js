const {
    application: {
        runCli,
        CliApplication
    }
} = adone;

const {
    Command
} = CliApplication;

class App extends CliApplication {
    configure() {
        this.enableReport({
            directory: adone.std.os.tmpdir()
        });
    }

    @Command()
    exception() {
        setTimeout(() => {
            throw new Error("hello");
        }, 500);
    }

    @Command()
    loop() {
        adone.log(`kill -12 ${process.pid}`);
        for ( ; ; ) {
            // ha
        }
    }
}

runCli(App);
