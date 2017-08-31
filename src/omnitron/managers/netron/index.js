const {
    application,
    is,
    netron
} = adone;

export default class NetronManager extends application.Subsystem {
    configure() {
        this.netron = null;
    }

    async initialize() {
        // Initialize netron and bind its gates.
        this.netron = new netron.Netron({
            isSuper: true
        });

        this.netron.registerAdapter("ws", adone.netron.ws.Adapter);

        this.netron.on("peer online", (peer) => {
            adone.info(`Peer '${peer.getRemoteAddress().full}' (uid: ${peer.uid}) connected`);
        }).on("peer offline", (peer) => {
            adone.info(`Peer '${peer.getRemoteAddress().full}' (uid: ${peer.uid}) disconnected`);
        });

        // Bind all gates.
        for (const gate of this.app.config.gates) {
            await this.netron.bind(gate); // eslint-disable-line
        }
    }

    async unintialize() {
        try {
            if (!is.null(this.netron)) {
                await this.netron.disconnect();
                await this.netron.unbind();

                // Let netron gracefully complete all disconnects
                await adone.promise.delay(500);
            }
        } catch (err) {
            adone.error(err);
        } finally {
            this.netron = null;
        }
    }
}
