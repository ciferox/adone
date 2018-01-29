const {
    multi,
    net: { p2p: { PeerInfo, PeerId, transport: { TCP } } },
    std: { os }
} = adone;

const tcp = new TCP();

const queryLAN = (mdns, serviceTag, interval) => {
    return setInterval(() => {
        mdns.query({
            questions: [{
                name: serviceTag,
                type: "PTR"
            }]
        });
    }, interval);
};

const gotResponse = (rsp, peerInfo, serviceTag, callback) => {
    if (!rsp.answers) {
        return;
    }

    const answers = {
        ptr: {},
        srv: {},
        txt: {},
        a: [],
        aaaa: []
    };

    rsp.answers.forEach((answer) => {
        switch (answer.type) {
            case "PTR": answers.ptr = answer; break;
            case "SRV": answers.srv = answer; break;
            case "TXT": answers.txt = answer; break;
            case "A": answers.a.push(answer); break;
            case "AAAA": answers.aaaa.push(answer); break;
            default: break;
        }
    });

    if (answers.ptr.name !== serviceTag) {
        return;
    }

    const b58Id = answers.txt.data.toString();
    const port = answers.srv.data.port;
    const multiaddrs = [];

    answers.a.forEach((a) => {
        multiaddrs.push(new multi.address.Multiaddr(`/ip4/${a.data}/tcp/${port}`));
    });

    // TODO Create multiaddrs from AAAA (IPv6) records as well

    if (peerInfo.id.asBase58() === b58Id) {
        return; // replied to myself, ignore
    }

    const peerId = PeerId.createFromBase58(b58Id);

    try {
        const peerFound = PeerInfo.create(peerId);
        multiaddrs.forEach((addr) => peerFound.multiaddrs.add(addr));
        callback(null, peerFound);
    } catch (err) {
        callback(err);
        return adone.error("Error creating PeerInfo from new found peer", err);
    }
};

const gotQuery = (qry, mdns, peerInfo, serviceTag, broadcast) => {
    if (!broadcast) {
        return;
    }

    const multiaddrs = tcp.filter(peerInfo.multiaddrs.toArray());
    // Only announce TCP for now
    if (multiaddrs.length === 0) {
        return;
    }

    if (qry.questions[0] && qry.questions[0].name === serviceTag) {
        const answers = [];

        answers.push({
            name: serviceTag,
            type: "PTR",
            class: "IN",
            ttl: 120,
            data: `${peerInfo.id.asBase58()}.${serviceTag}`
        });

        // Only announce TCP multiaddrs for now
        const port = multiaddrs[0].toString().split("/")[4];

        answers.push({
            name: `${peerInfo.id.asBase58()}.${serviceTag}`,
            type: "SRV",
            class: "IN",
            ttl: 120,
            data: {
                priority: 10,
                weight: 1,
                port,
                target: os.hostname()
            }
        });

        answers.push({
            name: `${peerInfo.id.asBase58()}.${serviceTag}`,
            type: "TXT",
            class: "IN",
            ttl: 120,
            data: peerInfo.id.asBase58()
        });

        multiaddrs.forEach((ma) => {
            if (ma.protoNames()[0] === "ip4") {
                answers.push({
                    name: os.hostname(),
                    type: "A",
                    class: "IN",
                    ttl: 120,
                    data: ma.toString().split("/")[2]
                });
                return;
            }
            if (ma.protoNames()[0] === "ip6") {
                answers.push({
                    name: os.hostname(),
                    type: "AAAA",
                    class: "IN",
                    ttl: 120,
                    data: ma.toString().split("/")[2]
                });
            }
        });

        mdns.respond(answers);
    }
};

export default class MulticastDNS extends adone.event.Emitter {
    constructor(peerInfo, options) {
        super();
        options = options || {};

        this.broadcast = options.broadcast !== false;
        this.interval = options.interval || (1e3 * 10);
        this.serviceTag = options.serviceTag || "_ipfs-discovery._udp";
        this.port = options.port || 5353;
        this.peerInfo = peerInfo;
        this._queryInterval = null;
    }

    start(callback) {
        const self = this;
        const mdns = adone.net.dns.multicast({ port: this.port });

        this.mdns = mdns;

        this._queryInterval = queryLAN(this.mdns, this.serviceTag, this.interval);

        mdns.on("response", (event) => {
            gotResponse(event, this.peerInfo, this.serviceTag, (err, foundPeer) => {
                if (err) {
                    return adone.error("Error processing peer response", err);
                }

                self.emit("peer", foundPeer);
            });
        });

        mdns.on("query", (event) => {
            gotQuery(event, this.mdns, this.peerInfo, this.serviceTag, this.broadcast);
        });

        setImmediate(() => callback());
    }

    stop(callback) {
        if (!this.mdns) {
            callback(new Error("MulticastDNS service had not started yet"));
        } else {
            clearInterval(this._queryInterval);
            this._queryInterval = null;
            this.mdns.destroy(callback);
            this.mdns = undefined;
        }
    }
}

/* for reference

   [ { name: 'discovery.ipfs.io.local',
       type: 'PTR',
       class: "IN",
       ttl: 120,
       data: 'QmbBHw1Xx9pUpAbrVZUKTPL5Rsph5Q9GQhRvcWVBPFgGtC.discovery.ipfs.io.local' },

     { name: 'QmbBHw1Xx9pUpAbrVZUKTPL5Rsph5Q9GQhRvcWVBPFgGtC.discovery.ipfs.io.local',
       type: 'SRV',
       class: "IN",
       ttl: 120,
       data: { priority: 10, weight: 1, port: 4001, target: 'lorien.local' } },

     { name: 'lorien.local',
       type: 'A',
       class: "IN",
       ttl: 120,
       data: '127.0.0.1' },

     { name: 'lorien.local',
       type: 'A',
       class: "IN",
       ttl: 120,
       data: '127.94.0.1' },

     { name: 'lorien.local',
       type: 'A',
       class: "IN",
       ttl: 120,
       data: '172.16.38.224' },

     { name: 'QmbBHw1Xx9pUpAbrVZUKTPL5Rsph5Q9GQhRvcWVBPFgGtC.discovery.ipfs.io.local',
       type: 'TXT',
       class: "IN",
       ttl: 120,
       data: 'QmbBHw1Xx9pUpAbrVZUKTPL5Rsph5Q9GQhRvcWVBPFgGtC' } ],

*/
