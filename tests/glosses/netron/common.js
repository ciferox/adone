const {
    netron: { Netron }
} = adone;

export const createNetron = (peerInfo, addrs) => {
    const netron = new Netron(peerInfo);
    netron.createNetCore("default", {
        addrs
    });
    return netron;
};
