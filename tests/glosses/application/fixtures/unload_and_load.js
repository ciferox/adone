const {
    application,
    fs
} = adone;

const subsystemCode = (index) => `
module.exports = class Hello extends adone.application.Subsystem {
    configure() {
        adone.log("hello${index} configure");
    }

    initialize() {
        adone.log("hello${index} init");
    }

    uninitialize() {
        adone.log("hello${index} uninit");
    }
}`;

class TestApp extends application.Application {
    async configure() {
        this.tmpdir = await fs.Directory.createTmp();
        this.tmpfile = await this.tmpdir.addFile("test.js", {
            contents: subsystemCode(1)
        });

        this.addSubsystem({
            name: "hello",
            subsystem: this.tmpfile.path()
        });
    }

    async uninitialize() {
        await this.tmpdir.unlink();
    }

    async main() {
        adone.log("main");
        await this.unloadSubsystem("hello");
        adone.log("has", this.hasSubsystem("hello"));
        adone.log("cached", adone.require.cache.has(this.tmpfile.path()));
        await this.tmpfile.write(subsystemCode(2));
        await this.loadSubsystem(this.tmpfile.path(), {
            name: "hello"
        });
        await this.unloadSubsystem("hello");
        await this.tmpfile.write(subsystemCode(3));
        await this.loadSubsystem(this.tmpfile.path(), {
            name: "hello"
        });
        return 0;
    }
}

application.run(TestApp);
