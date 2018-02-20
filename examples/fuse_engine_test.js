const {
    fs: { engine }
} = adone;

adone.application.run({
    configure() {
        this.exitOnSignal("SIGINT");
    },
    async uninitialize() {
        if (!this.engine) {
            return;
        }
        for ( ; ; ) {
            try {
                await this.engine.uninitialize();
                break;
            } catch (err) {
                adone.logError("could not unmount");
                adone.logError(err);
                await adone.promise.delay(1000);
            }
        }
    },
    async main() {
        this.engine = new engine.FuseEngine("mnt");

        this.engine.add((ctx) => ({
            "{a..z}/{1..5}": {
                a: ctx.file("hello")
            },
            0: ctx.symlink("a")
        }));

        await this.engine.decorate((engine) => {
            for (const [key, orig] of Object.entries(engine)) {
                engine[key] = function (...args) {
                    console.log(key, args.slice(0, -1));
                    return orig.apply(this, args);
                };
            }
            return engine;
        });

        await this.engine.initialize();
    }
});
