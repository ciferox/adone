const {
    app,
    runtime
} = adone;

const {
    logger
} = runtime;

const NAME = "Netron subsystem";

@app.SubsystemMeta({
    dependencies: [
        "database"
    ]
})
export default class extends app.Subsystem {
    async configure() {
        runtime.netron.options.proxyContexts = true;

        runtime.netron.on("peer:connect", (peer) => {
            logger.info(`Peer '${peer.id}' connected`);
        }).on("peer:disconnect", (peer) => {
            logger.info(`Peer '${peer.id}' disconnected`);
        });
        
        logger.info(`${NAME} configured`);
    }

    async initialize() {
        await runtime.netron.attachContext(this.root, "omnitron");
        logger.info("Omnitron context attached");

        this.networks = await this.root.db.getConfiguration("networks");
        const networks = await this.networks.entries();
        Object.assign(networks, {
            inhost: {
                addrs: adone.omnitron.DEFAULT_ADDRESS            
            }
        });

        for (const [netId, netConfig] of Object.entries(networks)) {
            runtime.netron.createNetCore(netId, netConfig);
            logger.info(`Netcore '${netId}' created`);
        }

        await runtime.netron.start();

        logger.info(`${NAME} initialized`);
    }

    async uninitialize() {
        if (runtime.netron.hasContext("omnitron")) {
            await runtime.netron.detachContext("omnitron");
            logger.info("Omnitron context detached");
        }

        await runtime.netron.stop();

        logger.info(`${NAME} uninitialized`);
    }

    async attachContext(instance, ctxId) {
        await runtime.netron.attachContext(instance, ctxId);
        logger.info(`Attached context '${ctxId}'`);
    }

    async detachContext(ctxId, releaseOriginated) {
        await runtime.netron.detachContext(ctxId, releaseOriginated);
        logger.info(`Detached context ${ctxId}`);
    }
}

// export default class Gates extends app.Subsystem {

//     async initialize() {
//         this.config = await this.root.db.getConfiguration();
//         Object.assign(runtime.netron.options, await this.config.get("netron"));

//         // Bind local gate
//         await runtime.netron.bind({
//             name: "local",
//             port: adone.omnitron.port
//         });

//         // Bind other enabled gates.
//         const gates = await this.config.getGates();
//         for (const gate of gates) {
//             if (gate.startup) {
//                 await runtime.netron.bind(gate); // eslint-disable-line
//             }
//         }

//         logger.info("Gates subsystem initialized");
//     }

//     async uninitialize() {
//         try {
//             await runtime.netron.disconnect();
//             await runtime.netron.unbind();

//             // // Let netron gracefully complete all disconnects
//             // await adone.promise.delay(500);
//         } catch (err) {
//             adone.logError(err);
//         }

//         logger.info("Gates subsystem uninitialized");
//     }

//     addGate(gate) {
//         return this.config.addGate(gate);
//     }

//     deleteGate(name) {
//         if (runtime.netron.gates.has(name)) {
//             throw new adone.error.NotAllowed("Delete active gate is not allowed");
//         }
//         return this.config.deleteGate(name);
//     }

//     async upGate(name) {
//         const gate = await this.config.getGate(name);
//         if (runtime.netron.gates.has(name)) {
//             throw new adone.error.IllegalState(`Gate with name '${name}' already active`);
//         }
//         await runtime.netron.bind(gate);
//     }

//     async downGate(name) {
//         if (name === "local") {
//             throw new adone.error.NotAllowed("Down local gate is not allow");
//         }

//         // This call checks if gate is exist.
//         const gate = await this.config.getGate(name);
//         if (!runtime.netron.gates.has(name)) {
//             throw new adone.error.IllegalState(`Gate with name '${name}' is not active`);
//         }
//         await runtime.netron.unbind(gate.name);
//     }

//     async getGates({ active = false } = {}) {
//         const allGates = await this.config.getGates();

//         const names = runtime.netron.gates.getAll().map((g) => g.name);
//         if (active) {
//             return allGates.filter((g) => names.includes(g.name));
//         }
//         return allGates.map((g) => ({
//             ...g,
//             active: names.includes(g.name)
//         }));
//     }

//     configureGate(name, options) {
//         return this.config.configureGate(name, options);
//     }
// }
