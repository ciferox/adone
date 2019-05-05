const {
    app,
    is,
    cli,
    realm
} = adone;

const {
    subsystem
} = app;

const subCommand = (name) => adone.path.join(__dirname, "commands", name);

@subsystem({
    commandsGroups: [
        {
            name: "own",
            description: "ADONE specific"
        },
        {
            name: "generic",
            description: "Generic commands"
        }
    ],
    subsystems: [
        {
            name: ["create", "new"],
            group: "generic",
            description: "Create new realm",
            subsystem: subCommand("create")
        },
        {
            name: "fork",
            group: "generic",
            description: "Fork realm",
            subsystem: subCommand("fork")
        },
        {
            name: "merge",
            group: "own",
            description: "Merge realm",
            subsystem: subCommand("merge")
        },
        {
            name: "dev",
            group: "generic",
            description: "Start realm development cycle",
            subsystem: subCommand("dev")
        },
        {
            name: "info",
            group: "generic",
            description: "Show realm information",
            subsystem: subCommand("info")
        },
        {
            name: "clean",
            group: "generic",
            description: "Clean realm build files",
            subsystem: subCommand("clean")
        },
        {
            name: "build",
            group: "generic",
            description: "Build realm sources",
            subsystem: subCommand("build")
        }
    ]
})
export default () => class RealmCommand extends app.Subsystem {
    resolvePath(args, opts) {
        let path = args.has("path") ? args.get("path") : null;
        if (is.string(path) && opts.has("re")) {
            path = new RegExp(path);
        }
        return path;
    }

    async connectRealm({ cwd, progress = true } = {}) {
        let manager;
        if (is.string(cwd)) {
            manager = new realm.RealmManager({ cwd });
        } else {
            manager = realm.rootRealm;
        }
        await manager.connect();
        progress && await cli.observe("progress", manager);
        return manager;
    }
};
