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
                await this.engine.unmountFromFilesystem();
                break;
            } catch (err) {
                adone.error("could not unmount");
                adone.error(err);
                await adone.promise.delay(1000);
            }
        }
    },
    async main() {
        this.engine = new engine.FuseEngine("mnt");

        this.engine.add((ctx) => ({
            "{a..z}": {
                "{1..5}": {
                    a: ctx.file("hello")
                }
            },
            0: ctx.symlink("a")
        }));

        await this.engine.mountToFilesystem((engine) => {
            for (const [key, orig] of Object.entries(engine)) {
                engine[key] = function (...args) {
                    console.log(key, args.slice(0, -1));
                    return orig.apply(this, args);
                };
            }
            return engine;
        });
    }
});
