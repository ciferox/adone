const pkg = adone.package;

exports = module.exports = () => {
    return {
        "api-path": "/api/v0/",
        "user-agent": `/adone-ipfs/${adone.ipfs.version}/`,
        host: "localhost",
        port: "5001",
        protocol: "http"
    };
};
