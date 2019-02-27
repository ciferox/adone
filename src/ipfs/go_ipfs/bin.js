const {
    app: {
        Application,
        MainCommandMeta
    }
} = adone;

const { download } = require("./");

const goenv = require("go-platform");

class App extends Application {
    @MainCommandMeta({
        arguments: [
            {
                name: "version",
                type: String,
                default: adone.ipfs.go.defaultVersion,
                help: "Version of go-ipfs"
            },
            {
                name: "platform",
                type: String,
                default: goenv.GOOS,
                help: "Platform"
            },
            {
                name: "arch",
                type: String,
                default: goenv.GOARCH,
                help: "Architecture"
            }
        ]
    })
    async main(argv) {
        try {    
            const output = await download(`v${argv.get("version")}`, argv.get("platform"), argv.get("arch"));

            process.stdout.write(`Downloaded ${output.fileName}\n`);
            process.stdout.write(`Installed go-${output.fileName.replace(".tar.gz", "").replace(".zip", "").replace(/_/g, " ")} to ${output.installPath}\n`);
            process.exit(0);
        } catch (err) {
            process.stdout.write(`${err}\n`);
            process.stdout.write("Download failed!\n\n");
            process.exit(1);
        }
    }
}

adone.app.run(App, {
    useArgs: true
});
