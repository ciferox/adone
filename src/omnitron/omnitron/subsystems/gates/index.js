const {
    application,
    runtime
} = adone;

export default class Gates extends application.Subsystem {
    async configure() {
        Object.assign(runtime.netron.options, this.parent.config.raw.netron);

        await runtime.netron.registerAdapter("ws", adone.netron.ws.Adapter);

        runtime.netron.on("peer online", (peer) => {
            adone.info(`Peer '${peer.getRemoteAddress().full}' (uid: ${peer.uid}) connected`);
        }).on("peer offline", (peer) => {
            adone.info(`Peer '${peer.getRemoteAddress().full}' (uid: ${peer.uid}) disconnected`);
        });

        adone.info("Gates subsystem configured");
    }

    async initialize() {
        this._servicePort = this.parent.config.getLocalGate().port;

        // Bind all gates.
        for (const gate of this.parent.config.getGates()) {
            await runtime.netron.bind(gate); // eslint-disable-line
        }

        adone.info("Gates subsystem initialized");
    }

    async uninitialize() {
        try {
            await runtime.netron.disconnect();
            await runtime.netron.unbind();

            // // Let netron gracefully complete all disconnects
            // await adone.promise.delay(500);
        } catch (err) {
            adone.error(err);
        }

        adone.info("Gates subsystem uninitialized");
    }

    getServicePort() {
        return this._servicePort;
    }

    addGate(gate) {

    }

    deleteGate(name) {

    }

    upGate(name) {

    }

    downGate(name) {
        
    }

    getGates() {
        return this.parent.config.getGates();
    }    
}
