const {
    assertion
} = adone;
assertion.use(assertion.extension.checkmark);

const sinon = require("sinon");
const PeerBook = require("peer-book");
const TCP = require("libp2p-tcp");
const parallel = require("async/parallel");
const pull = require("pull-stream");
const multiplex = require("pull-mplex");
const spdy = require("libp2p-spdy");

const ConnectionFSM = require(adone.getPath("src/glosses/netron/ipc/switch/connection"));
const Switch = require(adone.getPath("src/glosses/netron/ipc/switch"));
const { createInfos } = require("./utils");

describe("ConnectionFSM", () => {
    let spdySwitch;
    let listenerSwitch;
    let dialerSwitch;

    before((done) => {
        createInfos(3, (err, infos) => {
            if (err) {
                return done(err);
            }

            dialerSwitch = new Switch(infos.shift(), new PeerBook());
            dialerSwitch._peerInfo.multiaddrs.add("/ip4/0.0.0.0/tcp/15451");
            dialerSwitch.connection.addStreamMuxer(multiplex);
            dialerSwitch.transport.add("tcp", new TCP());

            listenerSwitch = new Switch(infos.shift(), new PeerBook());
            listenerSwitch._peerInfo.multiaddrs.add("/ip4/0.0.0.0/tcp/15452");
            listenerSwitch.connection.addStreamMuxer(multiplex);
            listenerSwitch.transport.add("tcp", new TCP());

            spdySwitch = new Switch(infos.shift(), new PeerBook());
            spdySwitch._peerInfo.multiaddrs.add("/ip4/0.0.0.0/tcp/15453");
            spdySwitch.connection.addStreamMuxer(spdy);
            spdySwitch.transport.add("tcp", new TCP());

            parallel([
                (cb) => dialerSwitch.start(cb),
                (cb) => listenerSwitch.start(cb),
                (cb) => spdySwitch.start(cb)
            ], (err) => {
                done(err);
            });
        });
    });

    after((done) => {
        parallel([
            (cb) => dialerSwitch.stop(cb),
            (cb) => listenerSwitch.stop(cb),
            (cb) => spdySwitch.stop(cb)
        ], () => {
            done();
        });
    });

    it("should have a default state of disconnected", () => {
        const connection = new ConnectionFSM({
            _switch: dialerSwitch,
            peerInfo: listenerSwitch._peerInfo
        });

        expect(connection.getState()).to.equal("DISCONNECTED");
    });

    it("should emit an error with an invalid transition", (done) => {
        const connection = new ConnectionFSM({
            _switch: dialerSwitch,
            peerInfo: listenerSwitch._peerInfo
        });

        expect(connection.getState()).to.equal("DISCONNECTED");

        connection.once("error", (err) => {
            expect(err).to.have.property("code", "INVALID_STATE_TRANSITION");
            done();
        });
        connection.upgrade();
    });

    it(".dial should create a basic connection", (done) => {
        const connection = new ConnectionFSM({
            _switch: dialerSwitch,
            peerInfo: listenerSwitch._peerInfo
        });

        connection.once("connected", (conn) => {
            expect(conn).to.exist();
            done();
        });

        connection.dial();
    });

    it("should be able to close with an error and not throw", (done) => {
        const connection = new ConnectionFSM({
            _switch: dialerSwitch,
            peerInfo: listenerSwitch._peerInfo
        });

        connection.once("connected", (conn) => {
            expect(conn).to.exist();
            expect(() => connection.close(new Error("shutting down"))).to.not.throw();
            done();
        });

        connection.dial();
    });

    it("should emit warning on dial failed attempt", (done) => {
        const connection = new ConnectionFSM({
            _switch: dialerSwitch,
            peerInfo: listenerSwitch._peerInfo
        });

        const stub = sinon.stub(dialerSwitch.transport, "dial").callsArgWith(2, [
            new Error("address in use")
        ]);

        connection.once("error:connection_attempt_failed", (errors) => {
            expect(errors).to.have.length(1).mark();
            stub.restore();
        });

        connection.once("error", (err) => {
            expect(err).to.exist().mark();
        });

        expect(2).checks(done);

        connection.dial();
    });

    it("should ignore concurrent dials", () => {
        const connection = new ConnectionFSM({
            _switch: dialerSwitch,
            peerInfo: listenerSwitch._peerInfo
        });

        const stub = sinon.stub(connection, "_onDialing");

        connection.dial();
        connection.dial();

        expect(stub.callCount).to.equal(1);
    });

    it("should be able to upgrade an encrypted connection", (done) => {
        const connection = new ConnectionFSM({
            _switch: dialerSwitch,
            peerInfo: listenerSwitch._peerInfo
        });

        connection.once("connected", (conn) => {
            expect(conn).to.exist();
            connection.upgrade();
        });
        connection.once("muxed", (conn) => {
            expect(conn.multicodec).to.equal(multiplex.multicodec);
            done();
        });

        connection.dial();
    });

    it("should fail to upgrade a connection with incompatible muxers", (done) => {
        const connection = new ConnectionFSM({
            _switch: dialerSwitch,
            peerInfo: spdySwitch._peerInfo
        });

        connection.once("connected", (conn) => {
            expect(conn).to.exist();
            connection.upgrade();
        });
        connection.once("error:upgrade_failed", (err) => {
            expect(err).to.exist();
            done();
        });

        connection.dial();
    });

    it("should be able to handshake a protocol over a muxed connection", (done) => {
        const connection = new ConnectionFSM({
            _switch: dialerSwitch,
            peerInfo: listenerSwitch._peerInfo
        });

        listenerSwitch.handle("/muxed-conn-test/1.0.0", (_, conn) => {
            return pull(conn, conn);
        });

        connection.once("connected", (conn) => {
            expect(conn).to.exist();
            connection.upgrade();
        });
        connection.once("muxed", (conn) => {
            expect(conn.multicodec).to.equal(multiplex.multicodec);

            connection.shake("/muxed-conn-test/1.0.0", (err, protocolConn) => {
                expect(err).to.not.exist();
                expect(protocolConn).to.exist();
                done();
            });
        });

        connection.dial();
    });

    it("should not return a connection when handshaking with no protocol", (done) => {
        const connection = new ConnectionFSM({
            _switch: dialerSwitch,
            peerInfo: listenerSwitch._peerInfo
        });

        listenerSwitch.handle("/muxed-conn-test/1.0.0", (_, conn) => {
            return pull(conn, conn);
        });

        connection.once("connected", (conn) => {
            expect(conn).to.exist();
            connection.upgrade();
        });
        connection.once("muxed", (conn) => {
            expect(conn.multicodec).to.equal(multiplex.multicodec);

            connection.shake(null, (err, protocolConn) => {
                expect(err).to.not.exist();
                expect(protocolConn).to.not.exist();
                done();
            });
        });

        connection.dial();
    });

    describe("with no muxers", () => {
        let oldMuxers;
        before(() => {
            oldMuxers = dialerSwitch.muxers;
            dialerSwitch.muxers = {};
        });

        after(() => {
            dialerSwitch.muxers = oldMuxers;
        });

        it("should be able to handshake a protocol over a basic connection", (done) => {
            const connection = new ConnectionFSM({
                _switch: dialerSwitch,
                peerInfo: listenerSwitch._peerInfo
            });

            listenerSwitch.handle("/unmuxed-conn-test/1.0.0", (_, conn) => {
                return pull(conn, conn);
            });

            connection.once("connected", (conn) => {
                expect(conn).to.exist();
                connection.upgrade();
            });
            connection.once("muxed", () => {
                throw new Error("connection shouldnt be muxed");
            });
            connection.once("unmuxed", (conn) => {
                expect(conn).to.exist();

                connection.shake("/unmuxed-conn-test/1.0.0", (err, protocolConn) => {
                    expect(err).to.not.exist();
                    expect(protocolConn).to.exist();
                    done();
                });
            });

            connection.dial();
        });
    });
});