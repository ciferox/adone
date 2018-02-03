export default class ContextDetachTask extends adone.task.Task {
    run(peer, ctxId, releaseOriginated) {
        const defId = this.manager.detachContext(ctxId, releaseOriginated);
        peer._defs.delete(defId);
        const index = peer._ownDefIds.indexOf(defId);
        if (index >= 0) {
            peer._ownDefIds.splice(index, 1);
        }
        return defId;
    }
}
