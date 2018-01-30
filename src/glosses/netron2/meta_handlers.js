const {
    is
} = adone;

/**
 * All handlers have same signature:
 * 
 *  handler(netron, peer, request);
 * 
 *  netron - local instance of Netron
 *  peer - instance of Peer from which metadata is requested
 *  request - whole request object (especially for handler).
 */


export const ability = (netron, peer) => {
    if (peer === netron.peer) {
        return netron.options;
    }

    return {
        proxyContexts: netron.options.proxyContexts
    };
};

export const contexts = (netron, peer) => {
    const isOwnPeer = peer === netron.peer;
    let allowedContexts = null;

    // const gateName = peer.options.gateName;
    // if (is.string(gateName)) {
    //     const gate = this.gates.get(gateName);
    //     if (is.array(gate.contexts) && gate.contexts.length > 0) {
    //         allowedContexts = gate.contexts;
    //     }
    // }

    const defs = {};
    for (const [name, stub] of netron.contexts.entries()) {
        if (is.null(allowedContexts) || allowedContexts.includes(name)) {
            defs[name] = stub.definition;
        }
    }

    return defs;
};
