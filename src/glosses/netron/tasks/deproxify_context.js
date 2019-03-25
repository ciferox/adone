export default class DeproxifyContextTask extends adone.task.Task {
    main({ netron, peer, args }) {
        const [ctxId, releaseOriginated] = args;
        const defId = netron.detachContext(ctxId, releaseOriginated);
        peer._defs.delete(defId);
        const index = peer._ownDefIds.indexOf(defId);
        if (index >= 0) {
            peer._ownDefIds.splice(index, 1);
        }
        return defId;
    }
}
