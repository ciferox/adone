import "adone";

const {
    is,
    application,
    configuration,
    netron,
    std,
    x
} = adone;

class ServiceApplication extends application.Application {
    async configure() {
        this.netron = null;
        this.peer = null;
        this.omnitronPort = process.env.OMNITRON_PORT;
        this.group = process.env.OMNITRON_SERVICE_GROUP;
        this.servicePaths = process.env.OMNITRON_SERVICES.split(";");

        this.netron = new netron.Netron();
        this.peer = await this.netron.connect({
            port: this.omnitronPort
        });

        for (const path of this.servicePaths) {
            // eslint-disable-next-line
            const adoneConf = await configuration.load("adone.conf.js", null, {
                base: path,
                transpile: true
            });
    
            if (adoneConf.project.type !== "service") {
                throw new x.NotValid("Not a service");
            }
    
            const ServiceSubsystem = require(std.path.join(path, adoneConf.project.main)).default;
            if (!is.class(ServiceSubsystem)) {
                throw new x.NotValid("Not valid service export");
            }
    
            // eslint-disable-next-line
            await this.addSubsystem({
                name: adoneConf.name,
                description: adoneConf.description,
                group: this.group,
                subsystem: new ServiceSubsystem(),
                configureArgs: [this.peer]                
            });
        }
    }

    async initialize() {
        this.exitOnSignal("SIGTERM");
    }

    main() {
        
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
