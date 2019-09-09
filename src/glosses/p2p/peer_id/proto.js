module.exports = adone.data.protobuf.create(`

message PeerIdProto {
  required bytes id = 1;
  bytes pubKey = 2;
  bytes privKey = 3;
}

`);