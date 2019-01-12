const {
    crypto: { Identity },
    net: { p2p: { PeerInfo } },
    netron: { Definition, Definitions, Reference }
} = adone;

const s = new adone.data.mpak.Serializer();
adone.data.mpak.registerCommonTypesFor(s);

// Netron specific encoders/decoders
s.register(109, Definition, (obj, buf) => {
    buf.writeUInt32BE(obj.id);
    buf.writeUInt32BE(obj.parentId);
    s.encode(obj.name, buf);
    s.encode(obj.description, buf);
    s.encode(obj.$, buf);
    s.encode(obj.twin, buf);
}, (buf) => {
    const def = new Definition();
    def.id = buf.readUInt32BE();
    def.parentId = buf.readUInt32BE();
    def.name = s.decode(buf);
    def.description = s.decode(buf);
    def.$ = s.decode(buf);
    def.twin = s.decode(buf);
    return def;
}).register(108, Reference, (obj, buf) => {
    buf.writeUInt32BE(obj.defId);
}, (buf) => {
    const ref = new Reference();
    ref.defId = buf.readUInt32BE();
    return ref;
}).register(107, Definitions, (obj, buf) => {
    const len = obj.length;
    buf.writeUInt32BE(len);
    for (let i = 0; i < obj.length; i++) {
        const def = obj.get(i);
        s.encode(def, buf);
    }
}, (buf) => {
    const defs = new Definitions();
    const len = buf.readUInt32BE();
    for (let i = 0; i < len; i++) {
        const def = s.decode(buf);
        defs.push(def);
    }
    return defs;
});
// TODO
// .register(106, PeerInfo, (obj, buf) => {

// }, (buf) => {

// }).register(106, Identity, (obj, buf) => {

// }, (buf) => {

// });

export default s;
