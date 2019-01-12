export default class UnsubscribeTask extends adone.task.Task {
    run(peer, eventName) {
        const fn = peer._remoteSubscriptions.get(eventName);
        if (!adone.is.undefined(fn)) {
            this.manager.removeListener(eventName, fn);
            peer._remoteSubscriptions.delete(eventName);
        }
    }
}
