const {
    data: { protobuf }
} = adone;

const rpcProto = protobuf.create(require("./rpc.proto.js"));
const topicDescriptorProto = protobuf.create(require("./topic-descriptor.proto.js"));

exports = module.exports;
exports.rpc = rpcProto;
exports.td = topicDescriptorProto;
