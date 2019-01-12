export default class ProxifyContextTask extends adone.task.Task {
    run(peer, ctxId, def) {
        const iCtx = this.manager.interfaceFactory.create(def, peer);
        const stub = new adone.netron.RemoteStub(this.manager, iCtx);
        const defId = this.manager._attachContext(ctxId, stub);
        peer._ownDefIds.push(defId);
        def.$remote = true;
        def.$proxyDef = stub.definition;
        peer._updateDefinitions({ "": def });
        return defId;
    }
}
