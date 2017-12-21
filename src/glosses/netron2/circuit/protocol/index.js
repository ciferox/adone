const {
    data: { protobuf }
} = adone;
module.exports = protobuf.create(require("./proto.js"));
