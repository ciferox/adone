const {
    multi,
    net: { p2p: { transport: { WSStar: { utils: { cleanUrlSIO } } } } }
} = adone;

describe("utils", () => {
    const modernMultiaddrStringDNS = "/dns4/star-signal.cloud.ipfs.team/tcp/443/wss/p2p-websocket-star/ipfs/QmWxLfixekyv6GAzvDEtXfXjj7gb1z3G8i5aQNHLhw1zA1";

    const modernMultiaddrStringDNS2 = "/dns4/star-signal.cloud.ipfs.team/tcp/9999/wss/p2p-websocket-star/ipfs/QmWxLfixekyv6GAzvDEtXfXjj7gb1z3G8i5aQNHLhw1zA1";
    const modernMultiaddrStringDNS3 = "/dns4/star-signal.cloud.ipfs.team/tcp/80/ws/p2p-websocket-star/ipfs/QmWxLfixekyv6GAzvDEtXfXjj7gb1z3G8i5aQNHLhw1zA1";
    const modernMultiaddrStringDNS4 = "/dns4/star-signal.cloud.ipfs.team/tcp/8080/ws/p2p-websocket-star/ipfs/QmWxLfixekyv6GAzvDEtXfXjj7gb1z3G8i5aQNHLhw1zA1";

    const invalidMultiaddrStringDNS = "/dns4/star-signal.cloud.ipfs.team/udp/8080/wss/p2p-websocket-star/ipfs/QmWxLfixekyv6GAzvDEtXfXjj7gb1z3G8i5aQNHLhw1zA1";
    const invalidMultiaddrStringDNS2 = "/dns4/star-signal.cloud.ipfs.team/tcp/8080/p2p-websocket-star/ipfs/QmWxLfixekyv6GAzvDEtXfXjj7gb1z3G8i5aQNHLhw1zA1";
    const invalidMultiaddrStringDNS3 = "/dns4/star-signal.cloud.ipfs.team/ws/p2p-websocket-star/ipfs/QmWxLfixekyv6GAzvDEtXfXjj7gb1z3G8i5aQNHLhw1zA1";

    // Create actual multiaddrs
    const modernMultiaddrDNS = multi.address.create(modernMultiaddrStringDNS);
    const modernMultiaddrDNS2 = multi.address.create(modernMultiaddrStringDNS2);
    const modernMultiaddrDNS3 = multi.address.create(modernMultiaddrStringDNS3);
    const modernMultiaddrDNS4 = multi.address.create(modernMultiaddrStringDNS4);

    const invalidMultiaddrDNS = multi.address.create(invalidMultiaddrStringDNS);
    const invalidMultiaddrDNS2 = multi.address.create(invalidMultiaddrStringDNS2);
    const invalidMultiaddrDNS3 = multi.address.create(invalidMultiaddrStringDNS3);

    it("cleanUrlSIO websocket-star modern", () => {
        const newUrlSIOStringDNS = cleanUrlSIO(modernMultiaddrDNS);
        const newUrlSIOStringDNS2 = cleanUrlSIO(modernMultiaddrDNS2);
        const newUrlSIOStringDNS3 = cleanUrlSIO(modernMultiaddrDNS3);
        const newUrlSIOStringDNS4 = cleanUrlSIO(modernMultiaddrDNS4);

        expect(() => cleanUrlSIO(modernMultiaddrDNS)).to.not.throw();
        expect(() => cleanUrlSIO(invalidMultiaddrDNS)).to.throw(Error, "invalid multiaddr");
        expect(() => cleanUrlSIO(invalidMultiaddrDNS2)).to.throw(Error, "invalid multiaddr");
        expect(() => cleanUrlSIO(invalidMultiaddrDNS3)).to.throw(Error, "invalid multiaddr");

        expect(newUrlSIOStringDNS).to.equal("https://star-signal.cloud.ipfs.team");
        expect(newUrlSIOStringDNS2).to.equal("https://star-signal.cloud.ipfs.team:9999");
        expect(newUrlSIOStringDNS3).to.equal("http://star-signal.cloud.ipfs.team");
        expect(newUrlSIOStringDNS4).to.equal("http://star-signal.cloud.ipfs.team:8080");
    });
});
