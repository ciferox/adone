const {
    app,
    runtime
} = adone;

const NAME = "Netron subsystem";

@app.DSubsystem({
    dependencies: [
        "database"
    ]
})
export default class extends app.Subsystem {
    async configure() {
        runtime.netron2.options.proxyContexts = true;

        runtime.netron2.on("peer:connect", (peer) => {
            adone.logInfo(`Peer '${peer.id}' connected`);
        }).on("peer:disconnect", (peer) => {
            adone.logInfo(`Peer '${peer.id}' disconnected`);
        });
        
        adone.logInfo(`${NAME} configured`);
    }

    async initialize() {
        await runtime.netron2.attachContext(this.root, "omnitron");
        adone.logInfo("Omnitron context attached");

        this.networks = await this.root.db.getConfiguration("networks");
        const networks = await this.networks.entries();
        Object.assign(networks, {
            inhost: {
                addrs: adone.omnitron2.DEFAULT_ADDRESS            
            }
        });

        for (const [netId, netConfig] of Object.entries(networks)) {
            runtime.netron2.createNetCore(netId, netConfig);
            adone.logInfo(`Netcore '${netId}' created`);
        }

        await runtime.netron2.start();

        adone.logInfo(`${NAME} initialized`);
    }

    async uninitialize() {
        if (runtime.netron2.hasContext("omnitron")) {
            await runtime.netron2.detachContext("omnitron");
            adone.logInfo("Omnitron context detached");
        }

        await runtime.netron2.stop();

        adone.logInfo(`${NAME} uninitialized`);
    }

    async attachContext(instance, ctxId) {
        await runtime.netron2.attachContext(instance, ctxId);
        adone.logInfo(`Attached context '${ctxId}'`);
    }

    async detachContext(ctxId, releaseOriginated) {
        await runtime.netron2.detachContext(ctxId, releaseOriginated);
        adone.logInfo(`Detached context ${ctxId}`);
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

//         adone.logInfo("Gates subsystem initialized");
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

//         adone.logInfo("Gates subsystem uninitialized");
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
