const {
    app,
    is,
    std,
    cli,
    realm
} = adone;

const {
    SubsystemMeta
} = app;

const subCommand = (name) => std.path.join(__dirname, "commands", name);

@SubsystemMeta({
    commandsGroups: [
        {
            name: "local",
            description: "Local commands"
        },
        {
            name: "global",
            description: "Global commands"
        }
    ],
    subsystems: [
        {
            name: "create",
            group: "global",
            description: "Create new realm",
            subsystem: subCommand("create")
        },
        {
            name: "fork",
            group: "global",
            description: "Fork realm",
            subsystem: subCommand("fork")
        },
        {
            name: "createFile",
            group: "global",
            description: "Create adone/project/web/... artifact",
            subsystem: subCommand("create_file")
        },
        {
            name: "dev",
            group: "global",
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
            group: "global",
            description: "Show realm information",
            subsystem: subCommand("info")
        },
        {
            name: "clean",
            group: "global",
            description: "Clean realm build files",
            subsystem: subCommand("clean")
        },
        {
            name: "build",
            group: "global",
            description: "Build realm sources",
            subsystem: subCommand("build")
        },
        {
            name: "rebuild",
            group: "global",
            description: "Rebuild realm sources",
            subsystem: subCommand("rebuild")
        },
        {
            name: "config",
            group: "global",
            description: "Configure realm",
            subsystem: subCommand("config")
        },
        {
            name: "nbuild",
            group: "global",
            description: "Build C++ addons",
            subsystem: subCommand("nbuild")
        },
        {
            name: "nclean",
            group: "global",
            description: "Clean builded C++ addons",
            subsystem: subCommand("nclean")
        },
        {
            name: "incver",
            group: "global",
            description: "Increase realm version",
            subsystem: subCommand("incver")
        },
        {
            name: "deps",
            group: "global",
            description: "Show dependencies for a particular source file or adone namespace",
            subsystem: subCommand("deps")
        }
    ]
})
export default class extends app.Subsystem {
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
            manager = new realm.Manager({ cwd });
        } else {
            manager = realm.rootRealm;
        }
        await manager.connect();
        progress && await cli.observe("progress", manager);
        return manager;
    }
}
