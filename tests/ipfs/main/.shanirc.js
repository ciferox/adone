// const IPFSFactory = require("ipfsd-ctl");
// const parallel = require("async/parallel");
const MockPreloadNode = require(adone.std.path.join(__dirname, "./utils/mock_preload_node"));

// const ipfsdServer = IPFSFactory.createServer();
const preloadNode = MockPreloadNode.createNode();

export default async (ctx) => {
    ctx.timeout(10000);
    ctx.before((done) => {
        preloadNode.start(done);
    });

    ctx.after((done) => {
        preloadNode.stop(done);
    });
};


// module.exports = {
//     webpack: {
//         resolve: {
//             mainFields: ["browser", "main"]
//         }
//     },
//     karma: {
//         files: [{
//             pattern: "node_modules/interface-ipfs-core/js/test/fixtures/**/*",
//             watched: false,
//             served: true,
//             included: false
//         }],
//         browserNoActivityTimeout: 100 * 1000,
//         singleRun: true
//     },
//     hooks: {
//         node: {
//             pre: (cb) => preloadNode.start(cb),
//             post: (cb) => preloadNode.stop(cb)
//         },
//         browser: {
//             pre: (cb) => {
//                 parallel([
//                     (cb) => {
//                         ipfsdServer.start();
//                         cb();
//                     },
//                     (cb) => preloadNode.start(cb)
//                 ], cb);
//             },
//             post: (cb) => {
//                 parallel([
//                     (cb) => {
//                         ipfsdServer.stop();
//                         cb();
//                     },
//                     (cb) => preloadNode.stop(cb)
//                 ], cb);
//             }
//         }
//     }
// };
