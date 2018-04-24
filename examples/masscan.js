class ScanApp extends adone.app.Application {
    async main() {
        const scanner = new adone.netscan.MasscanScanner({
            ports: "22",
            range: ["37.112.0.0/15"],
            exclude: [
                "0.0.0.0/8", // RFC1122: "This host on this network"
                "10.0.0.0/8", // RFC1918: Private-Use
                "100.64.0.0/10", // RFC6598: Shared Address Space
                "127.0.0.0/8", // RFC1122: Loopback
                "169.254.0.0/16", // RFC3927: Link Local
                "172.16.0.0/12", // RFC1918: Private-Use
                "192.0.0.0/24", // RFC6890: IETF Protocol Assignments
                "192.0.2.0/24", // RFC5737: Documentation (TEST-NET-1)
                "192.88.99.0/24", // RFC3068: 6to4 Relay Anycast
                "192.168.0.0/16", // RFC1918: Private-Use
                "198.18.0.0/15", // RFC2544: Benchmarking
                "198.51.100.0/24", // RFC5737: Documentation (TEST-NET-2)
                "203.0.113.0/24", // RFC5737: Documentation (TEST-NET-3)
                "240.0.0.0/4", // RFC1112: Reserved
                "255.255.255.255/32", // RFC0919: Limited Broadcast
                "224.0.0.0/4" // RFC5771: Multicast/Reserved
            ],
            maxRate: 10
        });
        scanner.on("stats", (stats) => {
            adone.log(stats);
        });

        scanner.on("detect", (info) => {
            if (info.status === "open") {
                adone.log(info);
            }
        });
        scanner.initialize();
        const p = scanner.start();
        setTimeout(() => {
            scanner.stop();
        }, 60000);
        await p;
        adone.log("DONE!!!");
        return 0;
    }
}

adone.app.run(ScanApp, true);
