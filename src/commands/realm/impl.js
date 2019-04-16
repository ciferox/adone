const {
    app,
    is,
    std,
    cli,
    realm
} = adone;

const {
    subsystem
} = app;

const subCommand = (name) => std.path.join(__dirname, "commands", name);

@subsystem({
    commandsGroups: [
        {
            name: "local",
            description: "Adone realm commands"
        },
        {
            name: "generic",
            description: "Generic realm commands"
        }
    ],
    subsystems: [
        {
            name: "create",
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
            group: "local",
            description: "Merge realm",
            subsystem: subCommand("merge")
        },
        {
            name: "createFile",
            group: "generic",
            description: "Create adone/project/web/... artifact",
            subsystem: subCommand("create_file")
        },
        {
            name: "dev",
            group: "generic",
            description: "Start realm development cycle",
            subsystem: subCommand("dev")
        },
        {
            name: "install",
            group: "local",
            description: "Install adone glosses, extensions, subsystems, applications, etc.",
            subsystem: subCommand("install")
        },
        {
            name: "uninstall",
            group: "local",
            description: "Uninstall adone glosses, extensions, applications, etc.",
            subsystem: subCommand("uninstall")
        },
        {
            name: "list",
            group: "local",
            description: "List installed packages",
            subsystem: subCommand("list")
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
        },
        {
            name: "rebuild",
            group: "generic",
            description: "Rebuild realm sources",
            subsystem: subCommand("rebuild")
        },
        {
            name: "config",
            group: "generic",
            description: "Configure realm",
            subsystem: subCommand("config")
        },
        {
            name: "nbuild",
            group: "generic",
            description: "Build C++ addons",
            subsystem: subCommand("nbuild")
        },
        {
            name: "nclean",
            group: "generic",
            description: "Clean builded C++ addons",
            subsystem: subCommand("nclean")
        },
        {
            name: "incver",
            group: "generic",
            description: "Increase realm version",
            subsystem: subCommand("incver")
        },
        {
            name: "deps",
            group: "generic",
            description: "Show dependencies for a particular source file or adone namespace",
            subsystem: subCommand("deps")
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
