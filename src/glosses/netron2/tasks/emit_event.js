export default class EmitEventTask extends adone.task.Task {
    run(peer, eventName, ...args) {
        const handlers = this._remoteEvents.get(eventName);
        if (!adone.is.undefined(handlers)) {
            const promises = [];
            for (const fn of handlers) {
                promises.push(Promise.resolve(fn(peer, ...args)));
            }
        }
    }
}
