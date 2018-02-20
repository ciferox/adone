import {
    assertEqualModuloDefaults
} from "./support";
import * as amqp from "./data";

const { is, std: { assert, stream } } = adone;

const {
    defs,
    frame: {
        HEARTBEAT
    },
    connect: { Connection: Frames }
} = adone.private(adone.net.amqp);

const PassThrough = stream.PassThrough;

// We'll need to supply a stream which we manipulate ourselves

const inputs = () => {
    // don't coalesce buffers, since that could mess up properties
    // (e.g., encoded frame size)
    return new PassThrough({ objectMode: true });
};

const HB = Buffer.from([defs.constants.FRAME_HEARTBEAT,
    0, 0, // channel 0
    0, 0, 0, 0, // zero size
    defs.constants.FRAME_END]);

// Now for a bit more fun.

const claire = require("claire");
const choice = claire.choice;
const forAll = claire.forAll;
const repeat = claire.repeat;
const label = claire.label;
const sequence = claire.sequence;
const transform = claire.transform;
const sized = claire.sized;

const Trace = label("frame trace", repeat(choice.apply(choice, amqp.methods)));

describe("net", "amqp", () => {
    describe("Explicit parsing", () => {
        it("Parse heartbeat", () => {
            const input = inputs();
            const frames = new Frames(input);
            input.write(HB);
            assert(frames.recvFrame() === HEARTBEAT);
            assert(!frames.recvFrame());
        });

        it("Parse partitioned", () => {
            const input = inputs();
            const frames = new Frames(input);
            input.write(HB.slice(0, 3));
            assert(!frames.recvFrame());
            input.write(HB.slice(3));
            assert(frames.recvFrame() === HEARTBEAT);
            assert(!frames.recvFrame());
        });

        const testBogusFrame = (name, bytes) => {
            it(name, (done) => {
                const input = inputs();
                const frames = new Frames(input);
                frames.frameMax = 5; //for the max frame test
                input.write(Buffer.from(bytes));
                frames.step((err, frame) => {
                    if (!is.nil(err)) {
                        done();
                    } else {
                        done(new Error("Was a bogus frame!"));
                    }
                });
            });
        };

        testBogusFrame("Wrong sized frame",
            [defs.constants.FRAME_BODY,
                0, 0, 0, 0, 0, 0, // zero length
                65, // but a byte!
                defs.constants.FRAME_END]);

        testBogusFrame("Unknown method frame",
            [defs.constants.FRAME_METHOD,
                0, 0, 0, 0, 0, 4,
                0, 0, 0, 0, // garbage ID
                defs.constants.FRAME_END]);

        testBogusFrame("> max frame",
            [defs.constants.FRAME_BODY,
                0, 0, 0, 0, 0, 6, // too big!
                65, 66, 67, 68, 69, 70,
                defs.constants.FRAME_END]);

    });

    describe("Parsing", () => {

        function testPartitioning(partition) {
            return forAll(Trace).satisfy((t) => {
                const bufs = [];
                const input = inputs();
                const frames = new Frames(input);
                let i = 0, ex;
                frames.accept = function (f) {
                    // A minor hack to make sure we get the assertion error;
                    // otherwise, it's just a test that we reached the line
                    // incrementing `i` for each frame.
                    try {
                        assertEqualModuloDefaults(t[i], f.fields);
                    } catch (e) {
                        ex = e;
                    }
                    i++;
                };

                t.forEach((f) => {
                    f.channel = 0;
                    bufs.push(defs.encodeMethod(f.id, 0, f.fields));
                });

                partition(bufs).forEach(input.write.bind(input));
                frames.acceptLoop();
                if (ex) {
                    throw ex;
                }
                return i === t.length;
            }).asTest({ times: 20 });
        }

        it("Parse trace of methods",
            testPartitioning((bufs) => {
                return bufs;
            }));

        it("Parse concat'd methods",
            testPartitioning((bufs) => {
                return [Buffer.concat(bufs)];
            }));

        it("Parse partitioned methods",
            testPartitioning((bufs) => {
                const full = Buffer.concat(bufs);
                const onethird = Math.floor(full.length / 3);
                const twothirds = 2 * onethird;
                return [
                    full.slice(0, onethird),
                    full.slice(onethird, twothirds),
                    full.slice(twothirds)
                ];
            }));
    });

    const FRAME_MAX_MAX = 4096 * 4;
    const FRAME_MAX_MIN = 4096;

    const FrameMax = amqp.rangeInt("frame max",
        FRAME_MAX_MIN,
        FRAME_MAX_MAX);

    const Body = sized((_n) => {
        return Math.floor(Math.random() * FRAME_MAX_MAX);
    }, repeat(amqp.Octet));

    const Content = transform((args) => {
        return {
            method: args[0].fields,
            header: args[1].fields,
            body: Buffer.from(args[2])
        };
    }, sequence(amqp.methods.BasicDeliver,
        amqp.properties.BasicProperties, Body));

    describe("Content framing", () => {
        it("Adhere to frame max",
            forAll(Content, FrameMax).satisfy((content, max) => {
                const input = inputs();
                const frames = new Frames(input);
                frames.frameMax = max;
                frames.sendMessage(
                    0,
                    defs.BasicDeliver, content.method,
                    defs.BasicProperties, content.header,
                    content.body);
                let f, i = 0, largest = 0;
                while (f = input.read()) {
                    i++;
                    if (f.length > largest) {
                        largest = f.length;
                    }
                    if (f.length > max) {
                        return false;
                    }
                }
                // The ratio of frames to 'contents' should always be >= 2
                // (one properties frame and at least one content frame); > 2
                // indicates fragmentation. The largest is always, of course <= frame max
                //console.log('Frames: %d; frames per message: %d; largest frame %d', i, i / t.length, largest);
                return true;
            }).asTest());
    });
});
