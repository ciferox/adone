const {
    stream: { pull }
} = adone;
const { protocolBuffers } = pull;

const srcPath = (...args) => adone.path.join(adone.ROOT_PATH, "lib", "glosses", "streams", "pull", ...args);
const protostream_pull = require(srcPath("protocol_buffers", "pull"));

const pb = require("protocol-buffers");
const testmsg = pb("message Test { string content = 1 ; }").Test;
const testdata = ["hello", "world", "randomnonsense⅜£¤⅜£ŁŦŁŊẞ€Ŋ", "hello world!!!1"].map((content) => {
    return {
        content
    };
});

describe("stream", "pull", "protocolBuffers", () => {
    describe("lp", () => {
        it("should decode and encode", () => {
            pull(
                pull.values(testdata.slice(0)),
                protocolBuffers.encode(testmsg),
                protocolBuffers.decode(testmsg),
                pull.collect((err, data) => {
                    expect(err).to.not.exist();
                    assert.deepEqual(data, testdata, "invalid data returned");
                })
            );
        });
    });

    const outdata = [testmsg.encode(testdata[3])];

    describe("single", () => {
        it("should encode a single element", () => {
            pull(
                pull.values(testdata.slice(3)),
                protostream_pull.encode(testmsg),
                pull.collect((err, data) => {
                    expect(err).to.not.exist();
                    assert.deepEqual(data, outdata, "invalid data returned");
                })
            );
        });

        it("should decode a single element", () => {
            pull(
                pull.values(outdata.slice(0)),
                protostream_pull.decode(testmsg),
                pull.collect((err, data) => {
                    expect(err).to.not.exist();
                    assert.deepEqual(data, testdata.slice(3), "invalid data returned");
                })
            );
        });
    });
});
