const {
    application,
    runtime
} = adone;

export default class NetronManager extends application.Subsystem {
    configure() {
        runtime.netron.options.isSuper = true;

        runtime.netron.registerAdapter("ws", adone.netron.ws.Adapter);

        runtime.netron.on("peer online", (peer) => {
            adone.info(`Peer '${peer.getRemoteAddress().full}' (uid: ${peer.uid}) connected`);
        }).on("peer offline", (peer) => {
            adone.info(`Peer '${peer.getRemoteAddress().full}' (uid: ${peer.uid}) disconnected`);
        });
    }

    async initialize() {
        // Bind all gates.
        for (const gate of this.parent.config.gates) {
            await runtime.netron.bind(gate); // eslint-disable-line
        }

        this.servicePort = this.parent.config.gates[0].port;
    }

    async unintialize() {
        try {
            await runtime.netron.disconnect();
            await runtime.netron.unbind();

            // // Let netron gracefully complete all disconnects
            // await adone.promise.delay(500);
        } catch (err) {
            adone.error(err);
        }
    }

    getServicePort() {
        return this.servicePort;
    }
}
