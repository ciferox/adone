const {
    application,
    runtime
} = adone;

const NAME = "Netron subsystem";

export default class extends application.Subsystem {
    async configure() {
        runtime.netron2.on("peer:connect", (peer) => {
            adone.logInfo(`Peer ${peer.id}) connected`);
        }).on("peer:disconnect", (peer) => {
            adone.logInfo(`Peer '${peer.id}' disconnected`);
        });

        // redefine 'inhost' netcore config
        this.root.config.raw.netCores.inhost = {
            addrs: adone.omnitron2.DEFAULT_ADDRESS            
        };

        for (const [netId, netCoreConfig] of Object.entries(this.root.config.raw.netCores)) {
            runtime.netron2.createNetCore(netId, netCoreConfig);
            adone.logInfo(`Netcore '${netId}' created`);
        }

        adone.logInfo(`${NAME} configured`);
    }

    async initialize() {
        await runtime.netron2.attachContext(this.root, "omnitron");
        adone.logInfo("Omnitron context attached");

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
}

// export default class Gates extends application.Subsystem {

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
