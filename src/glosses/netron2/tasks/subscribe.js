export default class SubscribeTask extends adone.task.Task {
    run(peer, eventName) {
        const fn = (...args) => {
            // Ignore event with own contexts 
            if (this.manager.options.proxyContexts) {
                if (peer._ownDefIds.includes(args[0].defId)) {
                    return;
                }
            }

            return peer.runTask({
                task: "emitEvent",
                args: [eventName, ...args]
            });
        };

        peer._remoteSubscriptions.set(eventName, fn);
        this.manager.on(eventName, fn);        
    }
}
