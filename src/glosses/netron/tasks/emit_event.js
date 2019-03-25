export default class EmitEventTask extends adone.task.Task {
    main({ peer, args: taskArgs }) {
        const [eventName, ...args] = taskArgs;
        const handlers = peer._remoteEvents.get(eventName);
        if (!adone.is.undefined(handlers)) {
            const promises = [];
            for (const fn of handlers) {
                try {
                    promises.push(fn(peer, ...args));
                } catch (err) {
                    // Nothing to do...
                }
            }
            Promise.all(promises).catch(adone.noop);
        }
    }
}
