const {
    data: { protobuf }
} = adone;

const rpcProto = protobuf.create(require("./rpc.proto.js"));
const RPC = rpcProto.RPC;
const topicDescriptorProto = protobuf.create(require("./topic-descriptor.proto.js"));

exports = module.exports;
exports.rpc = rpcProto;
exports.td = topicDescriptorProto;
exports.RPC = RPC;
exports.Message = RPC.Message;
exports.SubOpts = RPC.SubOpts;
