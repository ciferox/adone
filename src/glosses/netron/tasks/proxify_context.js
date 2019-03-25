export default class ProxifyContextTask extends adone.task.Task {
    main({ netron, peer, args }) {
        const [ctxId, def] = args;
        const iCtx = netron.interfaceFactory.create(def, peer);
        const stub = netron.stubManager.createRemoteStub(iCtx);
        const defId = netron._attachContext(ctxId, stub);
        peer._ownDefIds.push(defId);
        def.$remote = true;
        def.$proxyDef = stub.definition;
        peer._updateDefinitions({ "": def });
        return defId;
    }
}
