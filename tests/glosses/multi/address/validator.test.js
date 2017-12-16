const {
    multi: { address: { validator } }
} = adone;

describe("multi", "address", "validator", () => {
    const goodDNS = [
        "/dns/ipfs.io",
        "/dns4/ipfs.io",
        "/dns4/libp2p.io",
        "/dns6/protocol.ai",
        "/dns4/protocol.ai/tcp/80",
        "/dns6/protocol.ai/tcp/80",
        "/dns/protocol.ai/tcp/80"
    ];

    const badDNS = [
        "/ip4/127.0.0.1"
    ];

    const goodIP = [
        "/ip4/0.0.0.0",
        "/ip6/fc00::"
    ];

    const badIP = [
        "/ip4/0.0.0.0/tcp/555",
        "/udp/789/ip6/fc00::"
    ];

    const goodTCP = [
        "/ip4/0.0.7.6/tcp/1234",
        "/ip6/::/tcp/0"
    ];

    const badTCP = [
        "/tcp/12345",
        "/ip6/fc00::/udp/5523/tcp/9543"
    ];

    const goodUDP = [
        "/ip4/0.0.7.6/udp/1234",
        "/ip6/::/udp/0"
    ];

    const badUDP = [
        "/udp/12345",
        "/ip6/fc00::/tcp/5523/udp/9543"
    ];

    const goodUTP = [
        "/ip4/1.2.3.4/udp/3456/utp",
        "/ip6/::/udp/0/utp"
    ];

    const badUTP = [
        "/ip4/0.0.0.0/tcp/12345/utp",
        "/ip6/::/ip4/0.0.0.0/udp/1234/utp"
    ];

    const goodWS = [
        "/dns/ipfs.io/ws",
        "/ip4/1.2.3.4/tcp/3456/ws",
        "/ip6/::/tcp/0/ws"
    ];

    const goodWSS = [
        "/dns/ipfs.io/wss",
        "/ip4/1.2.3.4/tcp/3456/wss",
        "/ip6/::/tcp/0/wss"
    ];

    const goodWebRTCStar = [
        "/ip4/1.2.3.4/tcp/3456/ws/p2p-webrtc-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSoooo4",
        "/dns/ipfs.io/ws/p2p-webrtc-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSoooo4",
        "/dns/ipfs.io/wss/p2p-webrtc-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSoooo4",
        "/ip6/::/tcp/0/ws/p2p-webrtc-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSoooo5",
        "/dns4/wrtc-star.discovery.libp2p.io/tcp/443/wss/p2p-webrtc-star/ipfs/QmTysQQiTGMdfRsDQp516oZ9bR3FiSCDnicUnqny2q1d79"
    ];

    const goodWebRTCDirect = [
        "/ip4/1.2.3.4/tcp/3456/http/p2p-webrtc-direct",
        "/ip6/::/tcp/0/http/p2p-webrtc-direct"
    ];

    const goodWebSocketStar = [
        "/ip4/1.2.3.4/tcp/3456/ws/p2p-websocket-star",
        "/ip6/::/tcp/0/ws/p2p-websocket-star",
        "/dns/localhost/ws/p2p-websocket-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSoooo4",
        "/ip4/1.2.3.4/tcp/3456/ws/p2p-websocket-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSoooo4",
        "/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star/ipfs/Qma3uqwymdqwXtC4uvmqqwwMhTDHD7xp9FzM75tQB5qRM3"
    ];

    const badWS = [
        "/ip4/0.0.0.0/tcp/12345/udp/2222/ws",
        "/ip6/::/ip4/0.0.0.0/udp/1234/ws",
        "/ip4/127.0.0.1/tcp/24642/ws/p2p-webrtc-star"
    ];

    const badWSS = [
        "/ip4/0.0.0.0/tcp/12345/udp/2222/wss",
        "/ip6/::/ip4/0.0.0.0/udp/1234/wss"
    ];

    const goodCircuit = [
        "/p2p-circuit",
        "/p2p-circuit/ipfs/QmUjNmr8TgJCn1Ao7DvMy4cjoZU15b9bwSCBLE3vwXiwgj",
        "/p2p-circuit/ip4/127.0.0.1/tcp/20008/ws/ipfs/QmUjNmr8TgJCn1Ao7DvMy4cjoZU15b9bwSCBLE3vwXiwgj",
        "/p2p-circuit/ip4/1.2.3.4/tcp/3456/ws/p2p-webrtc-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSoooo4",
        "/p2p-circuit/ip4/1.2.3.4/tcp/3456/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSoooo4",
        "/p2p-circuit/ip4/127.0.0.1/tcp/4002/ipfs/QmddWMcQX6orJGHpETYMyPgXrCXCtYANMFVDCvhKoDwLqA",
        "/p2p-circuit/ipfs/QmddWMcQX6orJGHpETYMyPgXrCXCtYANMFVDCvhKoDwLqA",
        "/p2p-circuit/ip4/127.0.0.1/tcp/20008/ws/ipfs/QmUjNmr8TgJCn1Ao7DvMy4cjoZU15b9bwSCBLE3vwXiwgj/" +
        "p2p-circuit/ipfs/QmUjNmr8TgJCn1Ao7DvMy4cjoZU15b9bwSCBLE3vwXiwgj"
    ];

    const badCircuit = [
        "/ip4/0.0.0.0/tcp/12345/udp/2222/wss",
        "/ip4/0.0.7.6/udp/1234",
        "/ip6/::/udp/0/utp",
        "/dns/ipfs.io/ws",
        "/ip4/1.2.3.4/tcp/3456/http/p2p-webrtc-star"
    ];

    const goodIPFS = [
        "/ip4/127.0.0.1/tcp/20008/ws/ipfs/QmUjNmr8TgJCn1Ao7DvMy4cjoZU15b9bwSCBLE3vwXiwgj",
        "/ip4/1.2.3.4/tcp/3456/ws/p2p-webrtc-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSoooo4",
        "/ip4/1.2.3.4/tcp/3456/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSoooo4",
        "/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSoooo4/p2p-circuit",
        "/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSoooo4/p2p-circuit/ipfs/QmUjNmr8TgJCn1Ao7DvMy4cjoZU15b9bwSCBLE3vwXiwgj"
    ].concat(goodCircuit);

    const assertMatches = function (p) {
        const tests = Array.from(arguments).slice(1);
        tests.forEach((test) => {
            test.forEach((testcase) => {
                expect(p.matches(testcase)).to.be.eql(true)
            });
        });
    };

    const assertMismatches = function (p) {
        const tests = Array.from(arguments).slice(1);
        tests.forEach((test) => {
            test.forEach((testcase) => {
                expect(p.matches(testcase)).to.be.eql(false)
            });
        });
    }

    it("DNS validation", () => {
        assertMatches(validator.DNS, goodDNS);
        assertMismatches(validator.DNS, badDNS, badIP, goodTCP);
    });

    it("IP validation", () => {
        assertMatches(validator.IP, goodIP);
        assertMismatches(validator.IP, badIP, goodTCP);
    });

    it("TCP validation", () => {
        assertMatches(validator.TCP, goodTCP);
        assertMismatches(validator.TCP, badTCP, goodIP);
    });

    it("UDP validation", () => {
        assertMatches(validator.UDP, goodUDP);
        assertMismatches(validator.UDP, badUDP, goodIP, goodTCP, goodUTP);
    });

    it("UTP validation", () => {
        assertMatches(validator.UTP, goodUTP);
        assertMismatches(validator.UTP, badUTP, goodIP, goodTCP, goodUDP);
    });

    it("Reliable validation", () => {
        assertMatches(validator.Reliable, goodUTP, goodTCP);
        assertMismatches(validator.Reliable, goodIP, goodUDP);
    });

    it("WebSocket validation", () => {
        assertMatches(validator.WebSocket, goodWS);
        assertMismatches(validator.WebSocket, goodIP, goodUDP, badWS);
    });

    it("WebSocketSecure validation", () => {
        assertMatches(validator.WebSocketSecure, goodWSS);
        assertMismatches(validator.WebSocketSecure, goodIP, badWSS, goodUDP, badWS);
    });

    it("WebSocketStar validation", () => {
        assertMatches(validator.WebSocketStar, goodWebSocketStar);
        assertMismatches(validator.WebSocketStar, goodIP, goodUDP, badWS);
    });

    it("WebRTCStar validation", () => {
        assertMatches(validator.WebRTCStar, goodWebRTCStar);
        assertMismatches(validator.WebRTCStar, goodIP, goodUDP, badWS);
    });

    it("WebRTCDirect validation", () => {
        assertMatches(validator.WebRTCDirect, goodWebRTCDirect);
        assertMismatches(validator.WebRTCDirect, goodIP, goodUDP, badWS);
    });

    it("Circuit validation", () => {
        assertMatches(validator.Circuit, goodCircuit);
        assertMismatches(validator.Circuit, badCircuit);
    });

    it("IPFS validation", () => {
        assertMatches(validator.IPFS, goodIPFS);
    });
});
