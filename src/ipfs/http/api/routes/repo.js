

const resources = require("../resources");

module.exports = [
    {
        method: "*",
        path: "/api/v0/repo/version",
        handler: resources.repo.version
    },
    {
        method: "*",
        path: "/api/v0/repo/stat",
        handler: resources.repo.stat
    }
    // TODO: implement the missing spec https://github.com/ipfs/interface-ipfs-core/blob/master/SPEC/REPO.md
];
