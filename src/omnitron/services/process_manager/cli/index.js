const { is, application: { Subsystem }, omnitron } = adone;

// move somewhere else
const serviceCommand = (target, key, descriptor) => {
    const { value: original } = descriptor;
    descriptor.value = async function (...args) {
        if (is.null(this.dispatcher)) {
            this.dispatcher = new omnitron.Dispatcher(this.app);
            await this.dispatcher.connectLocal({}, false);
            this.pm = this.dispatcher.peer.getInterfaceByName("pm");
        }
        return original.apply(this, args);
    };
    return descriptor;
};

export default class ProcessManagerCLI extends Subsystem {
    initialize() {
        this.defineCommand({
            name: "pm",
            help: "process manager",
            group: "service_cli",
            commands: [
                {
                    name: "list",
                    handler: this.list,
                    options: [
                        { name: "--sum" }
                    ]
                },
                {
                    name: "start",
                    handler: this.start,
                    arguments: [
                        "id"
                    ]
                },
                {
                    name: "stop",
                    handler: this.stop,
                    arguments: [
                        "id"
                    ]
                }
            ]
        });
        this.serviceName = "process_manager";
        this.dispatcher = null;
        this.pm = null;
    }

    async uninitialize() {
        if (is.null(this.dispatcher)) {
            return;
        }
        await this.dispatcher.disconnect();
    }

    @serviceCommand
    async start(args, opts) {
        const id = args.get("id");
        if (await this.pm.hasApplication(id)) {
            await this.pm.start(id);
        } else {
            await this.pm.start({ path: id });
        }
        return 0;
    }

    @serviceCommand
    async stop(args) {
        const id = args.get("id");
        await this.pm.stop(id);
        return 0;
    }

    @serviceCommand
    async list(args, opts) {
        const apps = await this.pm.list();
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
}
