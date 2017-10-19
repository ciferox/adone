import "adone";

const {
    is,
    application,
    runtime,
    std
} = adone;

class ServiceApplication extends application.Application {
    async configure() {
        this.omnitronPort = process.env.OMNITRON_PORT;
        this.group = process.env.OMNITRON_SERVICE_GROUP;
        this.servicePaths = process.env.OMNITRON_SERVICES.split(";");

        this.peer = await runtime.netron.connect({
            port: this.omnitronPort
        });

        for (const path of this.servicePaths) {
            // eslint-disable-next-line
            const adoneConf = await adone.project.Configuration.load({
                cwd: path
            });

            // eslint-disable-next-line
            await this.addSubsystem({
                name: adoneConf.name,
                description: adoneConf.description,
                group: this.group,
                subsystem: std.path.join(path, adoneConf.getMainPath()),
                configureArgs: [this.peer, adoneConf]
            });
        }

        // Waiting for omnitron context is available.
        return new Promise((resolve) => {
            if (this.peer.hasContext("omnitron")) {
                resolve();
            } else {
                this.peer.onContextAttach((ctxData) => {
                    if (ctxData.id === "omnitron") {
                        resolve();
                    }
                });
            }
        });
    }

    async initialize() {
        this.exitOnSignal("SIGTERM");        
    }

    async uninitialize() {
        // Uninitialize subsystems first
        await this.uninitializeSubsystems();

        if (!is.null(this.peer)) {
            await this.peer.disconnect();
        }
    }
}

application.run(ServiceApplication, true);
