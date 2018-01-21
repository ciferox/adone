const support = require("../support");

const {
    data: { protobuf },
    netron2: { PeerId, crypto }
} = adone;

const pbm = protobuf.create(require("./secio.proto"));

// nonceSize is the size of our nonces (in bytes)
const nonceSize = 16;

exports.createProposal = (state) => {
    state.proposal.out = {
        rand: crypto.randomBytes(nonceSize),
        pubkey: state.key.local.public.bytes,
        exchanges: support.exchanges.join(","),
        ciphers: support.ciphers.join(","),
        hashes: support.hashes.join(",")
    };

    state.proposalEncoded.out = pbm.Propose.encode(state.proposal.out);
    return state.proposalEncoded.out;
};

exports.createExchange = (state) => {
    const res = crypto.keys.generateEphemeralKeyPair(state.protocols.local.curveT);
    state.ephemeralKey.local = res.key;
    state.shared.generate = res.genSharedKey;

    // Gather corpus to sign.
    const selectionOut = Buffer.concat([
        state.proposalEncoded.out,
        state.proposalEncoded.in,
        state.ephemeralKey.local
    ]);

    const sig = state.key.local.sign(selectionOut);
    state.exchange.out = {
        epubkey: state.ephemeralKey.local,
        signature: sig
    };

    return pbm.Exchange.encode(state.exchange.out);
};

exports.identify = (state, msg) => {
    adone.log("1.1 identify");

    state.proposalEncoded.in = msg;
    state.proposal.in = pbm.Propose.decode(msg);
    const pubkey = state.proposal.in.pubkey;

    state.key.remote = crypto.keys.unmarshalPublicKey(pubkey);
    const remoteId = PeerId.createFromPubKey(pubkey.toString("base64"));
    // If we know who we are dialing to, double check
    if (state.id.remote) {
        if (state.id.remote.asBase58() !== remoteId.asBase58()) {
            throw new Error("dialed to the wrong peer, Ids do not match");
        }
    } else {
        state.id.remote = remoteId;
    }

    adone.log("1.1 identify - %s - identified remote peer as %s", state.id.local.asBase58(), state.id.remote.asBase58());
};

exports.selectProtocols = (state) => {
    adone.log("1.2 selection");

    const local = {
        pubKeyBytes: state.key.local.public.bytes,
        exchanges: support.exchanges,
        hashes: support.hashes,
        ciphers: support.ciphers,
        nonce: state.proposal.out.rand
    };

    const remote = {
        pubKeyBytes: state.proposal.in.pubkey,
        exchanges: state.proposal.in.exchanges.split(","),
        hashes: state.proposal.in.hashes.split(","),
        ciphers: state.proposal.in.ciphers.split(","),
        nonce: state.proposal.in.rand
    };

    const selected = support.selectBest(local, remote);
    // we use the same params for both directions (must choose same curve)
    // WARNING: if they dont SelectBest the same way, this won't work...
    state.protocols.remote = {
        order: selected.order,
        curveT: selected.curveT,
        cipherT: selected.cipherT,
        hashT: selected.hashT
    };

    state.protocols.local = {
        order: selected.order,
        curveT: selected.curveT,
        cipherT: selected.cipherT,
        hashT: selected.hashT
    };
};

exports.verify = (state, msg) => {
    adone.log("2.1. verify");

    state.exchange.in = pbm.Exchange.decode(msg);
    state.ephemeralKey.remote = state.exchange.in.epubkey;

    const selectionIn = Buffer.concat([
        state.proposalEncoded.in,
        state.proposalEncoded.out,
        state.ephemeralKey.remote
    ]);

    const sigOk = state.key.remote.verify(selectionIn, state.exchange.in.signature);
    if (!sigOk) {
        throw new Error("Bad signature");
    }

    adone.log("2.1. verify - signature verified");
};

exports.generateKeys = (state) => {
    adone.log("2.2. keys");

    const secret = state.shared.generate(state.exchange.in.epubkey);
    state.shared.secret = secret;

    const keys = crypto.keys.keyStretcher(state.protocols.local.cipherT, state.protocols.local.hashT, state.shared.secret);
    // use random nonces to decide order.
    if (state.protocols.local.order > 0) {
        state.protocols.local.keys = keys.k1;
        state.protocols.remote.keys = keys.k2;
    } else if (state.protocols.local.order < 0) {
        // swap
        state.protocols.local.keys = keys.k2;
        state.protocols.remote.keys = keys.k1;
    } else {
        // we should've bailed before state. but if not, bail here.
        throw new Error("you are trying to talk to yourself");
    }

    adone.log("2.3. mac + cipher");

    return [
        support.makeMacAndCipher(state.protocols.local),
        support.makeMacAndCipher(state.protocols.remote)
    ];
};

exports.verifyNonce = (state, n2) => {
    const n1 = state.proposal.out.rand;

    if (!n1.equals(n2)) {
        throw new Error(`Failed to read our encrypted nonce: ${n1.toString("hex")} != ${n2.toString("hex")}`);
    }
};
