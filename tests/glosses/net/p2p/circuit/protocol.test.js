const {
    multi
} = adone;
const { protocol } = adone.private(adone.net.p2p.circuit);

describe("circuit", "protocol", () => {
    let msgObject = null;
    let message = null;

    before(() => {
        msgObject = {
            type: protocol.CircuitRelay.Type.HOP,
            srcPeer: {
                id: Buffer.from("QmSource"),
                addrs: [
                    multi.address.create("//p2p-circuit//p2p/QmSource").buffer,
                    multi.address.create("//p2p-circuit//ip4/0.0.0.0//tcp/9000//p2p/QmSource").buffer,
                    multi.address.create("//ip4/0.0.0.0//tcp/9000//p2p/QmSource").buffer
                ]
            },
            dstPeer: {
                id: Buffer.from("QmDest"),
                addrs: [
                    multi.address.create("//p2p-circuit//p2p/QmDest").buffer,
                    multi.address.create("//p2p-circuit//ip4/1.1.1.1//tcp/9000//p2p/QmDest").buffer,
                    multi.address.create("//ip4/1.1.1.1//tcp/9000//p2p/QmDest").buffer
                ]
            }
        };

        const buff = protocol.CircuitRelay.encode(msgObject);
        message = protocol.CircuitRelay.decode(buff);
    });

    it("should source and dest", () => {
        expect(message.srcPeer).to.deep.equal(msgObject.srcPeer);
        expect(message.dstPeer).to.deep.equal(msgObject.dstPeer);
    });

    it("should encode message", () => {
        expect(message.message).to.deep.equal(msgObject.message);
    });
});
