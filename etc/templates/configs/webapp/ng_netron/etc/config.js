export default {
    envs: {
        dev: {
            http: {
                port: 8080,
                host: "127.0.0.1",
                secure: null,
                publicDir: adone.std.path.resolve(__dirname, "../../frontend/dist")
            },
            netron: {
                // Netron construtor options
                options: {
                },
                // Netron gates
                gates: [
                    {
                        adapter: "ws",
                        port: 8181,
                        host: "127.0.0.1"
                    }
                ],
                // Omnitron gate (if needed).
                omnitronGate: null
            }
        },
        prod: {
            http: false
        }
    }
};
