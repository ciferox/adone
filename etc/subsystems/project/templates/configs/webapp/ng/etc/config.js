export default {
    envs: {
        dev: {
            http: {
                port: 8080,
                host: "127.0.0.1",
                secure: null,
                publicDir: adone.std.path.resolve(__dirname, "../../frontend/dist")
            }
        },
        prod: {
            http: false
        }
    }
};
