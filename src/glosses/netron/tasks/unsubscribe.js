export default class UnsubscribeTask extends adone.task.Task {
    run({ netron, peer, args }) {
        const [eventName] = args;
        const fn = peer._remoteSubscriptions.get(eventName);
        if (!adone.is.undefined(fn)) {
            netron.removeListener(eventName, fn);
            peer._remoteSubscriptions.delete(eventName);
        }
    }
}
