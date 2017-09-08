// connection mixins
// implementation of http://dev.mysql.com/doc/internals/en/compression.html

const {
    util,
    database: { mysql },
    compressor: { deflate }
} = adone;

const __ = adone.private(mysql);

const MAX_COMPRESSED_LENGTH = 16777210;

const handleCompressedPacket = function (packet) {
    const connection = this;
    const deflatedLength = packet.readInt24();
    const body = packet.readBuffer();

    if (deflatedLength !== 0) {
        connection.inflateQueue(() => {
            return deflate.decompress(body)
                .then((data) => {
                    connection._bumpCompressedSequenceId(packet.numPackets);
                    connection._inflatedPacketsParser.execute(data);
                }, (err) => {
                    connection._handleNetworkError(err);
                });
        });
    } else {
        connection.inflateQueue(() => {
            connection._bumpCompressedSequenceId(packet.numPackets);
            connection._inflatedPacketsParser.execute(body);
        });
    }
};

const writeCompressed = function (buffer) {
    // http://dev.mysql.com/doc/internals/en/example-several-mysql-packets.html
    // note: sending a MySQL Packet of the size 2^24−5 to 2^24−1 via compression
    // leads to at least one extra compressed packet.
    // (this is because "length of the packet before compression" need to fit
    // into 3 byte unsigned int. "length of the packet before compression" includes
    // 4 byte packet header, hence 2^24−5)
    let start;
    if (buffer.length > MAX_COMPRESSED_LENGTH) {
        for (start = 0; start < buffer.length; start += MAX_COMPRESSED_LENGTH) {
            writeCompressed.call(this, buffer.slice(start, start + MAX_COMPRESSED_LENGTH));
        }
        return;
    }

    const connection = this;

    let { length: packetLen } = buffer;
    const compressHeader = Buffer.allocUnsafe(7);


    const { compressedSequenceId: seqId } = connection.compressedSequenceId;
    connection.deflateQueue(() => {
        return deflate.compress(buffer)
            .then((compressed) => {
                let { length: compressedLength } = compressed;

                if (compressedLength < packetLen) {
                    compressHeader.writeUInt8(compressedLength & 0xff, 0);
                    compressHeader.writeUInt16LE(compressedLength >> 8, 1);
                    compressHeader.writeUInt8(seqId, 3);
                    compressHeader.writeUInt8(packetLen & 0xff, 4);
                    compressHeader.writeUInt16LE(packetLen >> 8, 5);
                    connection.writeUncompressed(compressHeader);
                    connection.writeUncompressed(compressed);
                } else {
                    // http://dev.mysql.com/doc/internals/en/uncompressed-payload.html
                    // To send an uncompressed payload:
                    //   - set length of payload before compression to 0
                    //   - the compressed payload contains the uncompressed payload instead.
                    compressedLength = packetLen;
                    packetLen = 0;
                    compressHeader.writeUInt8(compressedLength & 0xff, 0);
                    compressHeader.writeUInt16LE(compressedLength >> 8, 1);
                    compressHeader.writeUInt8(seqId, 3);
                    compressHeader.writeUInt8(packetLen & 0xff, 4);
                    compressHeader.writeUInt16LE(packetLen >> 8, 5);
                    connection.writeUncompressed(compressHeader);
                    connection.writeUncompressed(buffer);
                }
            }, (err) => {
                connection._handleFatalError(err);
            });
    });
    connection._bumpCompressedSequenceId(1);
};

export default function enableCompression(connection) {
    connection._lastWrittenPacketId = 0;
    connection._lastReceivedPacketId = 0;

    connection._handleCompressedPacket = handleCompressedPacket;
    connection._inflatedPacketsParser = new __.PacketParser((p) => {
        connection.handlePacket(p);
    }, 4);
    connection._inflatedPacketsParser._lastPacket = 0;
    connection.packetParser = new __.PacketParser((packet) => {
        connection._handleCompressedPacket(packet);
    }, 7);

    connection.writeUncompressed = connection.write;
    connection.write = writeCompressed;

    connection.inflateQueue = util.throttle({ max: 1 });
    connection.deflateQueue = util.throttle({ max: 1 });
}
