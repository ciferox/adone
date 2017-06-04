const { is, text: { pretty }, std } = adone;
const { STATUSES } = adone.omnitron.const;

const runtime = adone.lazify({
    Service: () => {
        const os = process.platform;
        let fileName;
        switch (os) {
            case "win32": fileName = "windows"; break;
            case "linux": fileName = "linux"; break;
            case "darwin": fileName = "macos"; break;
        }
        return require(`../svc/${fileName}`);
    }
});

export default class extends adone.application.Subsystem {
    initialize() {
        this.defineCommand({
            name: ["omnitron", "om", "0"],
            group: "service_cli",
            help: "Omnitron common service",
            options: [
                {
                    name: "--version",
                    help: "show version of omnitron",
                    handler: this.versionOption
                }
            ],
            commands: [
                {
                    name: "ping",
                    help: "ping the omnitron",
                    handler: this.pingCommand
                },
                {
                    name: "uptime",
                    help: "the omnitron's uptime",
                    handler: this.uptimeCommand
                },
                {
                    name: "env",
                    help: "the omnitron's environment",
                    handler: this.environmentCommand
                },
                {
                    name: "envs",
                    help: "the omnitron's environment variables",
                    handler: this.envsCommand
                },
                {
                    name: "shell",
                    help: "run omnitron's shell",
                    handler: this.shellCommand
                },
                {
                    name: "status",
                    help: "show status of service(s)",
                    arguments: [
                        {
                            name: "service",
                            type: String,
                            nargs: "*",
                            default: "",
                            help: "Name of service"
                        }
                    ],
                    handler: this.statusCommand
                },
                {
                    name: "enable",
                    help: "enable service or omnitron (autostart)",
                    arguments: [
                        {
                            name: "service",
                            type: String,
                            default: "omnitron",
                            help: "Name of service"
                        }
                    ],
                    options: [
                        {
                            name: "--deps",
                            help: "Enable dependent services"
                        },
                        {
                            name: "--user",
                            type: String,
                            required: true,
                            help: "User name (omnitron only)"
                        },
                        {
                            name: "--mode",
                            type: String,
                            default: "sysv",
                            choices: ["sysd", "sysv"],
                            help: "Service mode (omnitron only)"
                        }
                    ],
                    handler: this.enableCommand
                },
                {
                    name: "disable",
                    help: "disable service or omnitron (autostart)",
                    arguments: [
                        {
                            name: "service",
                            type: String,
                            default: "omnitron",
                            help: "Name of service"
                        }
                    ],
                    options: [
                        {
                            name: "--mode",
                            type: String,
                            default: "sysv",
                            choices: ["sysd", "sysv"],
                            help: "Service mode (omnitron only)"
                        }
                    ],
                    handler: this.disableCommand
                },
                {
                    name: "start",
                    help: "start omnitron or service",
                    arguments: [
                        {
                            name: "service",
                            type: String,
                            default: "",
                            help: "Name of service"
                        }
                    ],
                    handler: this.startCommand
                },
                {
                    name: "stop",
                    help: "stop omnitron or service",
                    arguments: [
                        {
                            name: "service",
                            type: String,
                            default: "",
                            help: "Name of service"
                        }
                    ],
                    handler: this.stopCommand
                },
                {
                    name: "restart",
                    help: "restart omnitron or service",
                    arguments: [
                        {
                            name: "service",
                            type: String,
                            default: "",
                            help: "Name of service"
                        }
                    ],
                    handler: this.restartCommand
                },
                {
                    name: "list",
                    help: "show services",
                    options: [
                        {
                            name: "--status",
                            help: "status of services",
                            type: String,
                            choices: STATUSES,
                            default: STATUSES[STATUSES.length - 1]
                        }
                    ],
                    handler: this.listCommand
                },
                {
                    name: "gates",
                    help: "show gates",
                    handler: this.gatesCommand
                },
                {
                    name: "pm",
                    help: "process manager",
                    commands: [
                        {
                            name: "list",
                            handler: this.pmList,
                            options: [
                                { name: "--sum" }
                            ]
                        },
                        {
                            name: "start",
                            handler: this.pmStart,
                            arguments: [
                                "id"
                            ],
                            options: [
                                { name: "--name", type: String },
                                { name: "--autorestart" },
                                { name: "--max-restarts", type: Number },
                                { name: "--restart-delay", type: Number },
                                { name: "--normal-start", type: Number },
                                { name: "--mode", choices: ["single", "cluster"] },
                                { name: "--instances", type: Number },
                                { name: "--sourcemaps" },
                                { name: "--no-sourcemaps" },
                                { name: "--cwd", type: String }
                            ]
                        },
                        {
                            name: "stop",
                            handler: this.pmStop,
                            arguments: [
                                "id"
                            ]
                        },
                        {
                            name: "delete",
                            handler: this.pmDelete,
                            arguments: [
                                "id"
                            ]
                        }
                    ]
                },
                {
                    name: "sys",
                    help: "system metrics",
                    commands: [
                        {
                            name: "info",
                            help: "show system information",
                            handler: this.systemInfoCommand
                        },
                        {
                            name: "volumes",
                            help: "show list of volumes",
                            handler: this.systemVolumesCommand
                        },
                        {
                            name: "ps",
                            help: "show list of processes",
                            handler: this.systemPsCommand
                        }
                    ]
                },
                {
                    name: "vault",
                    help: "vault management",
                    commands: [
                        {
                            name: "open",
                            help: "open vault",
                            arguments: [
                                {
                                    name: "name",
                                    type: String,
                                    help: "name of vault"
                                }
                            ],
                            handler: this.vaultOpenCommand
                        },
                        {
                            name: "close",
                            help: "close vault",
                            arguments: [
                                {
                                    name: "name",
                                    type: String,
                                    help: "name of vault"
                                }
                            ],
                            handler: this.vaultCloseCommand
                        },
                        {
                            name: "set",
                            help: "set value of valuable's item",
                            arguments: [
                                {
                                    name: "vault",
                                    type: String,
                                    help: "name of vault"
                                },
                                {
                                    name: "valuable",
                                    type: String,
                                    help: "name of valuable"
                                },
                                {
                                    name: "key",
                                    type: String,
                                    help: "key of item"
                                },
                                {
                                    name: "value",
                                    type: String,
                                    help: "value of item"
                                }
                            ],
                            handler: this.vaultSetCommand
                        },
                        {
                            name: "get",
                            help: "get value of valuable's item",
                            arguments: [
                                {
                                    name: "vault",
                                    type: String,
                                    help: "name of vault"
                                },
                                {
                                    name: "valuable",
                                    type: String,
                                    help: "name of valuable"
                                },
                                {
                                    name: "key",
                                    type: String,
                                    help: "key of item"
                                }
                            ],
                            handler: this.vaultGetCommand
                        },
                        {
                            name: "type",
                            help: "get type of valuable's item",
                            arguments: [
                                {
                                    name: "vault",
                                    type: String,
                                    help: "name of vault"
                                },
                                {
                                    name: "valuable",
                                    type: String,
                                    help: "name of valuable"
                                },
                                {
                                    name: "key",
                                    type: String,
                                    help: "key of item"
                                }
                            ],
                            handler: this.vaultTypeCommand
                        },
                        {
                            name: "del",
                            help: "delete valuable or valuable's item",
                            arguments: [
                                {
                                    name: "vault",
                                    type: String,
                                    help: "name of vault"
                                },
                                {
                                    name: "valuable",
                                    type: String,
                                    help: "name of valuable"
                                },
                                {
                                    name: "key",
                                    type: String,
                                    default: "",
                                    help: "key of item"
                                }
                            ],
                            handler: this.vaultDeleteCommand
                        },
                        {
                            name: "keys",
                            help: "show valuable keys",
                            arguments: [
                                {
                                    name: "vault",
                                    type: String,
                                    help: "name of vault"
                                },
                                {
                                    name: "valuable",
                                    type: String,
                                    help: "name of valuable"
                                }
                            ],
                            handler: this.vaultKeysCommand
                        },
                        {
                            name: "tags",
                            help: "show valuable tags",
                            arguments: [
                                {
                                    name: "vault",
                                    type: String,
                                    help: "name of vault"
                                },
                                {
                                    name: "valuable",
                                    type: String,
                                    help: "name of valuable"
                                }
                            ],
                            handler: this.vaultTagsCommand
                        },
                        {
                            name: "clear",
                            help: "clear valuable",
                            arguments: [
                                {
                                    name: "vault",
                                    type: String,
                                    help: "name of vault"
                                },
                                {
                                    name: "valuable",
                                    type: String,
                                    help: "name of valuable"
                                }
                            ],
                            handler: this.vaultClearCommand
                        }
                    ]
                },
                {
                    name: "hosts",
                    help: "hosts management and statistics",
                    commands: [
                        {
                            name: "add",
                            help: "add new host",
                            arguments: [
                                {
                                    name: "name",
                                    type: String,
                                    help: "host's ip address/domain"
                                }
                            ],
                            options: [
                                {
                                    name: "--aliases",
                                    nargs: "*",
                                    type: String,
                                    help: "host's aliases"
                                },
                                {
                                    name: "--tags",
                                    nargs: "*",
                                    type: String,
                                    help: "host's tags"
                                },
                                {
                                    name: "--ssh-port",
                                    type: Number,
                                    default: 22,
                                    help: "ssh port number"
                                },
                                {
                                    name: "--ssh-username",
                                    type: String,
                                    help: "ssh username"
                                },
                                {
                                    name: "--ssh-password",
                                    type: String,
                                    help: "ssh password"
                                },
                                {
                                    name: "--ssh-private-key",
                                    type: String,
                                    help: "path of ssh private key"
                                },
                                {
                                    name: "--netron-port",
                                    type: Number,
                                    help: "netron port number"
                                },
                                {
                                    name: "--netron-private-key",
                                    type: String,
                                    help: "path of netron private key"
                                }
                            ],
                            handler: this.hostsAddCommand
                        },
                        {
                            name: "set",
                            help: "set parameters of host",
                            arguments: [
                                {
                                    name: "name",
                                    type: String,
                                    help: "ip address/domain of host"
                                }
                            ],
                            options: [
                                {
                                    name: "--aliases",
                                    nargs: "*",
                                    type: String,
                                    help: "host's aliases"
                                },
                                {
                                    name: "--tags",
                                    nargs: "*",
                                    type: String,
                                    help: "host's tags"
                                },
                                {
                                    name: "--ssh-port",
                                    type: Number,
                                    default: 22,
                                    help: "ssh port number"
                                },
                                {
                                    name: "--ssh-username",
                                    type: String,
                                    help: "ssh username"
                                },
                                {
                                    name: "--ssh-password",
                                    type: String,
                                    help: "ssh password"
                                },
                                {
                                    name: "--ssh-private-key",
                                    type: String,
                                    help: "path of ssh private key"
                                },
                                {
                                    name: "--netron-port",
                                    type: Number,
                                    default: adone.netron.DEFAULT_PORT,
                                    help: "netron port number"
                                },
                                {
                                    name: "--netron-private-key",
                                    type: String,
                                    help: "path of netron private key"
                                }
                            ],
                            handler: this.hostsSetCommand
                        },
                        {
                            name: "get",
                            help: "show hosts parameters",
                            arguments: [
                                {
                                    name: "name",
                                    type: String,
                                    help: "ip address/domain/alias of host"
                                }
                            ],
                            options: [
                                {
                                    name: "--id",
                                    help: "return internal host identifier: $id"
                                }
                            ],
                            handler: this.hostsGetCommand
                        },
                        {
                            name: "del",
                            help: "delete host",
                            arguments: [
                                {
                                    name: "name",
                                    type: String,
                                    help: "ip address/domain/alias of host"
                                }
                            ],
                            handler: this.hostsDelCommand
                        },
                        {
                            name: "delkey",
                            help: "delete host property",
                            arguments: [
                                {
                                    name: "host",
                                    type: String,
                                    help: "ip address/domain/alias of host"
                                },
                                {
                                    name: "key",
                                    type: String,
                                    help: "name of property"
                                }
                            ],
                            handler: this.hostsDelKeyCommand
                        },
                        {
                            name: "tags",
                            help: "show all tags",
                            options: [
                                {
                                    name: "--ids",
                                    type: Array,
                                    help: "list of tag's private ids"
                                },
                                {
                                    name: "--private",
                                    help: "return private fields"
                                }
                            ],
                            handler: this.hostsTagsCommand
                        },
                        {
                            name: "addtag",
                            help: "add new tag",
                            arguments: [
                                {
                                    name: "tag",
                                    type: String,
                                    help: "tag name"
                                }
                            ],
                            options: [
                                {
                                    name: ["-p", "--property"],
                                    type: /(\w+)=([\w\s\W]+)/,
                                    nargs: "+",
                                    help: ""
                                }
                            ],
                            handler: this.hostsAddTagCommand
                        },
                        {
                            name: "deltag",
                            help: "delete existing tag",
                            arguments: [
                                {
                                    name: "tag",
                                    type: String,
                                    help: "tag name"
                                }
                            ],
                            handler: this.hostsDelTagCommand
                        },
                        {
                            name: "groups",
                            help: "show groups",
                            handler: this.hostsGroupsCommand
                        },
                        {
                            name: "group",
                            help: "groups management",
                            commands: [
                                {
                                    name: "add",
                                    help: "add host in group",
                                    arguments: [
                                        {
                                            name: "host",
                                            type: String,
                                            help: "ip address/domain/alias of host"
                                        },
                                        {
                                            name: "group",
                                            type: String,
                                            help: "group name"
                                        }
                                    ],
                                    handler: this.hostsGroupAppCommand
                                },
                                {
                                    name: "del",
                                    help: "delete host from group",
                                    arguments: [
                                        {
                                            name: "host",
                                            type: String,
                                            help: "ip address/domain/alias of host"
                                        },
                                        {
                                            name: "group",
                                            type: String,
                                            help: "group name"
                                        }
                                    ],
                                    handler: this.hostsGroupDelCommand
                                }
                            ]
                        }
                    ],
                    handler: this.hostsListCommand
                }
            ]
        });
    }

    uninitialize() {
        return this.dispatcher.disconnect();
    }

    get dispatcher() {
        if (is.undefined(this._dispatcher)) {
            this._dispatcher = new adone.omnitron.Dispatcher(this.app);
        }
        return this._dispatcher;
    }

    async versionOption() {
        adone.log(await this.dispatcher.getVersion());
        return 0;
    }

    async pingCommand() {
        if (await this.dispatcher.ping()) {
            adone.log(adone.ok);
        } else {
            adone.log(adone.bad);
        }
        return 0;
    }

    async uptimeCommand() {
        adone.log(await this.dispatcher.uptime());
        return 0;
    }

    async environmentCommand() {
        adone.log(await this.dispatcher.environment());
        return 0;
    }

    async envsCommand() {
        adone.log(adone.text.pretty.json(await this.dispatcher.envs()));
        return 0;
    }

    async shellCommand() {

    }

    async statusCommand(args) {
        try {
            adone.log(pretty.table(await this.dispatcher.status(args.get("service")), {
                noHeader: true,
                style: {
                    compact: true
                },
                model: [
                    {
                        id: "name",
                        header: "Name",
                        style: "{green-fg}"
                    },
                    {
                        id: "status",
                        header: "Status",
                        style: (val) => {
                            switch (val) {
                                case "disabled": return "{red-bg}{white-fg}";
                                case "enabled": return "{yellow-bg}{black-fg}";
                                case "active": return "{green-bg}{black-fg}";
                                default: return "";
                            }
                        },
                        format: " %s ",
                        align: "right"
                    }
                ]
            }));
        } catch (err) {
            adone.log(err.message);
        }
        return 0;
    }

    async enableCommand(args, opts) {
        try {
            const name = args.get("service");
            if (name === "omnitron") {
                const config = {
                    mode: opts.get("mode")
                };

                if (opts.has("user")) {
                    config.user = opts.get("user");
                }

                const service = new runtime.Service(config);
                await service.install();
            } else {
                await this.dispatcher.enable(name, { enableDeps: opts.has("deps") });
                adone.log(adone.ok);
            }
        } catch (err) {
            adone.log(err.message);
            return 1;
        }
        return 0;
    }

    async disableCommand(args, opts) {
        try {
            const name = args.get("service");
            if (name === "omnitron") {
                const config = {
                    mode: opts.get("mode")
                };

                const service = new runtime.Service(config);
                await service.uninstall();
            } else {
                await this.dispatcher.disable(name);
                adone.log(adone.ok);
            }
        } catch (err) {
            adone.log(err.message);
        }
        return 0;
    }

    async startCommand(args) {
        const serviceName = args.get("service");
        try {
            await this.dispatcher.start(serviceName);
            (serviceName !== "") && adone.log(adone.ok);
        } catch (err) {
            adone.log(err.message);
        }
        return 0;
    }

    async stopCommand(args) {
        const serviceName = args.get("service");
        try {
            await this.dispatcher.stop(serviceName);
            (serviceName !== "") && adone.log(adone.ok);
        } catch (err) {
            adone.error(err.message);
        }
        return 0;
    }

    async restartCommand(args) {
        const serviceName = args.get("service");
        try {
            await this.dispatcher.restart(serviceName);
            (serviceName !== "") && adone.log(adone.ok);
        } catch (err) {
            adone.log(err.message);
        }
        return 0;
    }

    async listCommand(args, opts) {
        const status = opts.get("status");
        try {
            adone.log(pretty.table(await this.dispatcher.list(status), {
                style: {
                    head: ["gray"],
                    compact: true
                },
                model: [
                    {
                        id: "name",
                        header: "Name",
                        style: "{green-fg}"
                    },
                    {
                        id: "contexts",
                        header: "Contexts",
                        format: (contexts) => {
                            return contexts.map((c) => {
                                if (c.default === true) {
                                    return `{bold}{white-fg}${c.id}{/}`;
                                }
                                return `${c.id}`;
                            }).join(", ");
                        }
                    },
                    {
                        id: "description",
                        header: "Description"
                    },
                    {
                        id: "status",
                        header: "Status",
                        style: (val) => {
                            switch (val) {
                                case "disabled": return "{red-bg}{white-fg}";
                                case "enabled": return "{yellow-bg}{black-fg}";
                                case "active": return "{green-bg}{black-fg}";
                                default: return "";
                            }
                        },
                        format: " %s ",
                        align: "right"
                    },
                    {
                        id: "path",
                        header: "Path"
                    }
                ]
            }));
        } catch (err) {
            adone.error(err.message);
        }
        return 0;
    }

    async gatesCommand() {
        try {
            adone.log(pretty.table(await this.dispatcher.gates(), {
                style: {
                    head: ["gray"],
                    compact: true
                },
                model: [
                    {
                        id: "id",
                        header: "ID",
                        style: "{green-fg}"
                    },
                    {
                        id: "port",
                        header: "Address",
                        style: "{bold}"
                    },
                    {
                        id: "type",
                        header: "Type"
                    },
                    {
                        id: "status",
                        header: "Status",
                        style: (val) => {
                            switch (val) {
                                case "disabled": return "{red-bg}{white-bg}";
                                case "enabled": return "{yellow-bg}{black-fg}";
                                case "active": return "{green-bg}{black-fg}";
                                default: return "";
                            }
                        },
                        format: " %s ",
                        align: "right"
                    }
                ]
            }));
        } catch (err) {
            adone.log(err.message);
        }
        return 0;
    }

    async pmStart(args, opts) {
        const id = args.get("id");
        const pm = await this.dispatcher.context("pm");

        const config = {};

        if (opts.has("name")) {
            config.name = opts.get("name");
        }

        if (opts.has("autorestart")) {
            config.autorestart = opts.get("autorestart");
        }

        if (opts.has("max-restarts")) {
            config.restarts = opts.get("max-restarts");
        }

        if (opts.has("restart-delay")) {
            config.restartDelay = opts.get("restart-delay");
        }

        if (opts.has("normal-start")) {
            config.normalStart = opts.get("normal-start");
        }

        if (opts.has("mode")) {
            config.mode = opts.get("mode");
        }

        if (opts.has("instances")) {
            config.instances = opts.get("instances");
        }

        if (opts.has("sourcemaps")) {
            config.sourcemaps = true;
        }

        if (opts.has("no-sourcemaps")) {
            config.sourcemaps = false;
        }

        if (opts.has("cwd")) {
            config.cwd = std.path.resolve(opts.get("cwd"));
        }

        if (await pm.hasApplication(id, { checkID: false })) {
            // todo: change app name using --name
            config.name = id;
        } else if (await pm.hasApplication(Number(id), { checkID: true })) {
            config.id = Number(id);
        } else {
            config.path = std.path.resolve(id);
        }

        await pm.start(config);

        return 0;
    }

    async pmStop(args) {
        const pm = await this.dispatcher.context("pm");
        const id = args.get("id");
        await pm.stop(id);
        return 0;
    }

    async pmList(args, opts) {
        const pm = await this.dispatcher.context("pm");
        const apps = await pm.list();
        if (!apps.length) {
            adone.info("No applications");
            return 0;
        }
        apps.sort((a, b) => a.id - b.id);
        const table = new adone.text.table.Table({
            head: ["ID", "Name", "Mode", "State", "PID", "CPU", "Memory", "Uptime", "Restarts"],
            style: {
                head: ["cyan"]
            }
        });
        const colorizeState = (x) => {
            let color = {
                running: "green",
                restarting: "blue",
                scaling: "blue",
                stopped: "red",
                started: "yellow",
                starting: "blue",
                failed: "red",
                waiting_for_restart: "blue"
            }[x];
            if (!color) {
                color = "white";
            }
            return adone.terminal.parse(`{${color}-fg}${x}{/${color}-fg}`);
        };
        const sum = opts.get("sum");
        for (const app of apps) {
            if (!app.workers || !sum) {
                table.push([
                    app.id,
                    app.name,
                    app.mode,
                    colorizeState(app.state),
                    app.pid,
                    app.alive ? `${app.usage.main.cpu.toFixed(2)}%` : null,
                    app.alive ? adone.util.humanizeSize(app.usage.main.memory) : null,
                    app.alive ? adone.util.humanizeTime(app.uptime.main) : null,
                    app.alive ? app.restarts : null
                ]);
            } else {
                const cpu = app.workers.reduce((x, y, i) => {
                    return x + app.usage.workers[i].cpu;
                }, app.usage.workers[0].cpu);
                const memory = app.workers.reduce((x, y, i) => {
                    return x + app.usage.workers[i].memory;
                }, app.usage.workers[0].memory);
                const states = new adone.DefaultMap(() => 0);
                for (const w of app.workers) {
                    states.set(w.state, states.get(w.state) + 1);
                }
                let state = [colorizeState(app.state)];
                for (const [s, n] of states.entries()) {
                    state.push(`${colorizeState(s)} ${n}/${app.workers.length}`);
                }
                state = state.join("\n");
                table.push([
                    app.id,
                    app.name,
                    app.mode,
                    state,
                    app.pid,
                    `${cpu.toFixed(2)}%`,
                    adone.util.humanizeSize(memory),
                    adone.util.humanizeTime(app.uptime.main)
                ]);
            }
            if (app.workers && !sum) {
                for (let i = 0, n = app.workers.length; i < n; ++i) {
                    const worker = app.workers[i];
                    table.push([
                        `${app.id}:${worker.id}`,
                        app.name,
                        "worker",
                        colorizeState(worker.state),
                        worker.pid,
                        worker.alive ? `${app.usage.workers[i].cpu.toFixed(2)}%` : null,
                        worker.alive ? adone.util.humanizeSize(app.usage.workers[i].memory) : null,
                        worker.alive ? adone.util.humanizeTime(app.uptime.workers[i]) : null,
                        worker.alive ? worker.restarts : null
                    ]);
                }
            }
        }
        adone.log(table.toString());
        return 0;
    }

    async pmDelete(args) {
        const pm = await this.dispatcher.context("pm");
        const id = args.get("id");
        await pm.delete(id);
        return 0;
    }

    async systemInfoCommand() {
        const system = await this.dispatcher.context("system");
        adone.log((await system.info()).full);
        return 0;
    }

    async systemVolumesCommand(args, opts) {
        const system = await this.dispatcher.context("system");
        adone.log(pretty.table(await system.volumes(), {
            style: {
                head: ["gray"],
                compact: true
            },
            model: [
                {
                    id: "mount",
                    header: "Mount",
                    style: "{green-fg}"
                },
                {
                    id: "fsType",
                    header: "Type"
                },
                {
                    id: "freeSpace",
                    header: "Free space",
                    format: (space) => adone.util.humanizeSize(space)
                },
                {
                    id: "totalSpace",
                    header: "Total space",
                    format: (space) => adone.util.humanizeSize(space)
                }
            ]
        }));

        return 0;
    }

    async systemPsCommand() {
        const system = await this.dispatcher.context("system");
        adone.log(pretty.table(await system.processes(), {
            style: {
                head: ["gray"],
                compact: true
            },
            model: [
                {
                    id: "name",
                    header: "Name",
                    style: "{green-fg}"
                },
                {
                    id: "pid",
                    header: "PID"
                },
                {
                    id: "ppid",
                    header: "PPID"
                },
                {
                    id: "state",
                    header: "State",
                    format: (state) => adone.metrics.Process.humanState(state)
                },
                {
                    id: "vsize",
                    header: "VSIZE",
                    format: (vsize) => adone.util.humanizeSize(vsize)
                },
                {
                    id: "rss",
                    header: "RSS",
                    format: (rss) => adone.util.humanizeSize(rss)
                },
                {
                    id: "upTime",
                    header: "Uptime",
                    format: (uptime) => adone.util.humanizeTime(uptime)
                }
            ]
        }));

        return 0;
    }

    async vaultOpenCommand(args, opts) {
        try {
            await (await this.dispatcher.context("vaults")).open(args.get("name"));
            adone.log(adone.ok);
        } catch (err) {
            adone.error(err.message);
            return 1;
        }
        return 0;
    }

    async vaultCloseCommand(args, opts) {
        try {
            await (await this.dispatcher.context("vaults")).close(args.get("name"));
            adone.log(adone.ok);
        } catch (err) {
            adone.error(err.message);
            return 1;
        }
        return 0;
    }

    async vaultSetCommand(args, opts) {
        try {
            const iVault = await (await this.dispatcher.context("vaults")).get(args.get("vault"));
            const iValuable = await iVault.get(args.get("valuable"));
            await iValuable.set(args.get("key"), args.get("value"));
            adone.log(adone.ok);
        } catch (err) {
            adone.error(err.message);
            return 1;
        }
        return 0;
    }

    async vaultGetCommand(args, opts) {
        try {
            const iVault = await (await this.dispatcher.context("vaults")).get(args.get("vault"));
            const iValuable = await iVault.getOrCreate(args.get("valuable"));
            adone.log(await iValuable.get(args.get("key")));
        } catch (err) {
            adone.error(err.message);
            return 1;
        }
        return 0;
    }

    async vaultTypeCommand(args, opts) {
        try {
            const iVault = await (await this.dispatcher.context("vaults")).get(args.get("vault"));
            const iValuable = await iVault.get(args.get("valuable"));
            adone.log(await iValuable.type(args.get("key")));
        } catch (err) {
            adone.error(err.message);
            return 1;
        }
        return 0;
    }

    async vaultDeleteCommand(args, opts) {
        try {
            const iVault = await (await this.dispatcher.context("vaults")).get(args.get("vault"));
            const key = args.get("key");
            const valuable = args.get("valuable");
            if (key === "") {
                await iVault.delete(valuable);
            } else {
                const iValuable = await iVault.get(valuable);
                await iValuable.delete(key);
            }
            adone.log(adone.ok);
        } catch (err) {
            adone.error(err.message);
            return 1;
        }
        return 0;
    }

    async vaultKeysCommand(args, opts) {
        try {
            const iVault = await (await this.dispatcher.context("vaults")).get(args.get("vault"));
            const iValuable = await iVault.get(args.get("valuable"));
            adone.log(adone.text.pretty.json(await iValuable.keys()));
        } catch (err) {
            adone.error(err.message);
            return 1;
        }
        return 0;
    }

    async vaultTagsCommand(args, opts) {
        try {
            const iVault = await (await this.dispatcher.context("vaults")).get(args.get("vault"));
            const iValuable = await iVault.get(args.get("valuable"));
            adone.log(adone.text.pretty.json(await iValuable.tags()));
        } catch (err) {
            adone.error(err.message);
            return 1;
        }
        return 0;
    }


    async vaultClearCommand(args, opts) {
        try {
            const iVault = await (await this.dispatcher.context("vaults")).get(args.get("vault"));
            const iValuable = await iVault.get(args.get("valuable"));
            await iValuable.clear();
            adone.log(adone.ok);
        } catch (err) {
            adone.error(err.message);
            return 1;
        }
        return 0;
    }

    async hostsListCommand(args, opts) {
        try {
            const iHosts = await this.dispatcher.context("hosts");
            adone.log(adone.text.pretty.json(await iHosts.list()));
        } catch (err) {
            adone.error(err.message);
            return 1;
        }
        return 0;
    }

    async hostsAddCommand(args, opts) {
        try {
            const iHosts = await this.dispatcher.context("hosts");
            const iHost = await iHosts.add(args.get("name"));
            const params = opts.getAll(true);
            if (is.array(params.tags)) {
                const tags = params.tags;
                delete params.tags;
                await iHost.addTag(tags);
            }
            await iHost.setMulti(params);
            adone.log(adone.ok);
        } catch (err) {
            adone.error(err.message);
            return 1;
        }
        return 0;
    }

    async hostsSetCommand(args, opts) {
        try {
            let params = opts.getAll(true);
            if (Object.keys(params).length === 0) {
                adone.log("Nothing to set");
                return 0;
            }

            const iHosts = await this.dispatcher.context("hosts");

            // Checking aliases
            let isOk = true;
            let alias;
            if (is.array(params.aliases)) {
                for (alias of params.aliases) {
                    try {
                        await iHosts.get(alias);
                        isOk = false;
                        break;
                    } catch (err) {
                        /* ok */
                    }
                }
            }
            if (!isOk) {
                throw new adone.x.Exists(`Host '${alias}' already exists. Use another alias`);
            }

            const hostName = args.get("name");
            let iHost;
            try {
                iHost = await iHosts.get(hostName);
            } catch (err) {
                if (err instanceof adone.x.NotExists) {
                    iHost = await iHosts.add(hostName);
                    params = opts.getAll(true);
                } else {
                    throw err;
                }
            }

            if (is.array(params.tags)) {
                const tags = params.tags;
                delete params.tags;
                await iHost.addTag(tags);
            }
            await iHost.setMulti(params);
            adone.log(adone.ok);
        } catch (err) {
            adone.error(err.message);
            return 1;
        }
        return 0;
    }

    async hostsGetCommand(args, opts) {
        try {
            const iHosts = await this.dispatcher.context("hosts");
            const host = args.get("name");
            const iHost = await iHosts.get(host);
            const entries = await iHost.entries();

            entries.name = await iHost.name();

            if (opts.has("id")) {
                entries.$id = await iHost.internalId();
            }

            const tags = await iHost.tags();
            if (tags.length > 0) {
                entries.tags = tags.map((t) => t.name).join(", ");
            }
            adone.log(adone.text.pretty.json(entries));
        } catch (err) {
            adone.error(err.message);
            return 1;
        }
        return 0;
    }

    async hostsDelCommand(args) {
        try {
            const iHosts = await this.dispatcher.context("hosts");
            await iHosts.delete(args.get("name"));
            adone.log(adone.ok);
        } catch (err) {
            adone.error(err.message);
            return 1;
        }
        return 0;
    }

    async hostsDelKeyCommand(args) {
        try {
            const key = args.get("key");
            if (key === "aliases") {
                throw new adone.x.NotAllowed("Deletion of 'aliases' key is not allowed");
            }
            const iHosts = await this.dispatcher.context("hosts");
            const iHost = await iHosts.get(args.get("host"));
            await iHost.delete(args.get("key"));
            adone.log(adone.ok);
        } catch (err) {
            adone.error(err.message);
            return 1;
        }
        return 0;
    }

    async hostsTagsCommand(args, opts) {
        try {
            const privateProps = opts.has("private");
            let ids = null;
            if (opts.has("ids")) {
                ids = opts.get("ids");
            }
            const iHosts = await this.dispatcher.context("hosts");
            adone.log(adone.text.pretty.json(await iHosts.tags(ids, { privateProps })));
        } catch (err) {
            adone.error(err.message);
            return 1;
        }
        return 0;
    }

    async hostsAddTagCommand(args, opts) {
        try {
            const iHosts = await this.dispatcher.context("hosts");
            let tag;
            if (!opts.has("property")) {
                tag = args.get("tag");
            } else {
                tag = {
                    name: args.get("tag")
                };

                for (const prop of opts.get("property")) {
                    tag[prop[1]] = prop[2];
                }
            }
            await iHosts.addTag(tag);
            adone.log(adone.ok);
        } catch (err) {
            adone.error(err.message);
            return 1;
        }
        return 0;
    }

    async hostsDelTagCommand(args) {
        try {
            const iHosts = await this.dispatcher.context("hosts");
            await iHosts.deleteTag(args.get("tag"));
            adone.log(adone.ok);
        } catch (err) {
            adone.error(err.message);
            return 1;
        }
        return 0;
    }

    async hostsGroupsCommand() {
        try {
            const iHosts = await this.dispatcher.context("hosts");
            adone.log(adone.text.pretty.json(await iHosts.listGroups()));
        } catch (err) {
            adone.error(err.message);
            return 1;
        }
        return 0;
    }

    async hostsGroupAppCommand(args) {
        try {
            const iHosts = await this.dispatcher.context("hosts");
            const iHost = await iHosts.get(args.get("host"));
            await iHost.addTag(args.get("group"));
            adone.log(adone.ok);
        } catch (err) {
            adone.error(err.message);
            return 1;
        }
        return 0;
    }

    async hostsGroupDelCommand(args) {
        try {
            const iHosts = await this.dispatcher.context("hosts");
            const iHost = await iHosts.get(args.get("host"));
            await iHost.deleteTag(args.get("group"));
            adone.log(adone.ok);
        } catch (err) {
            adone.error(err.message);
            return 1;
        }
        return 0;
    }
}
