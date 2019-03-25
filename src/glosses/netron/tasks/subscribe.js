export default class SubscribeTask extends adone.task.Task {
    main({ netron, peer, args }) {
        const [eventName] = args;

        const fn = (...args) => {
            // Ignore event with own contexts 
            // if (this.manager.options.proxifyContexts) {
            //     if (peer._ownDefIds.includes(args[0].defId)) {
            //         return;
            //     }
            // }

            return peer.runTask({
                task: "netronEmitEvent",
                args: [eventName, ...args]
            });
        };

        peer._remoteSubscriptions.set(eventName, fn);
        netron.on(eventName, fn);
    }
}
