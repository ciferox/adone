const {
    is,
    ipfs: { ipld: { dagPb } }
} = adone;

const { promisify } = require("es6-promisify");
const { DAGNode, DAGLink } = dagPb;

module.exports.calculateCid = promisify((node, cb) => {
    dagPb.util.cid(node, cb);
});

module.exports.createDAGNode = promisify((data, links, cb) => {
    DAGNode.create(data, links, cb);
});

module.exports.addLinkToDAGNode = promisify((parent, link, cb) => {
    DAGNode.addLink(parent, link, cb);
});

module.exports.asDAGLink = promisify((node, name, cb) => {
    if (is.function(name)) {
        cb = name;
        name = "";
    }

    dagPb.util.cid(node, (err, nodeCid) => {
        if (err) {
            return cb(err);
        }

        DAGLink.create(name, node.size, nodeCid, cb);
    });
});
