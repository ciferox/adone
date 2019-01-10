const {
    app,
    fs
} = adone;

const subsystemCode = (index) => `
module.exports = class Hello extends adone.app.Subsystem {
    configure() {
        console.log("hello${index} configure");
    }

    initialize() {
        console.log("hello${index} init");
    }

    uninitialize() {
        console.log("hello${index} uninit");
    }
}`;

class TestApp extends app.Application {
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
        console.log("main");
        await this.unloadSubsystem("hello");
        console.log("has", this.hasSubsystem("hello"));
        console.log("cached", adone.require.cache.has(this.tmpfile.path()));
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

app.run(TestApp);
