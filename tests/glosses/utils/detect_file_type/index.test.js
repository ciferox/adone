const {
    std: { path, fs, stream },
    util: { detectFileType }
} = adone;

import readChunk from "read-chunk";

const check = (ext, name) => {
    const file = path.join(__dirname, "fixture", `${(name || "fixture")}.${ext}`);
    const fileInfo = detectFileType(readChunk.sync(file, 0, 4 + 4096)) || {};
    return fileInfo.ext;
};

const types = [
    "jpg",
    "png",
    "gif",
    "webp",
    "flif",
    "cr2",
    "tif",
    "bmp",
    "jxr",
    "psd",
    "zip",
    "tar",
    "rar",
    "gz",
    "bz2",
    "7z",
    "dmg",
    "mp4",
    "mid",
    "mkv",
    "webm",
    "mov",
    "avi",
    "wmv",
    "mpg",
    "mp2",
    "mp3",
    "m4a",
    "oga",
    "ogg",
    "ogv",
    "opus",
    "flac",
    "wav",
    "spx",
    "amr",
    "pdf",
    "epub",
    "exe",
    "swf",
    "rtf",
    "wasm",
    "woff",
    "woff2",
    "eot",
    "ttf",
    "otf",
    "ico",
    "flv",
    "ps",
    "xz",
    "sqlite",
    "nes",
    "crx",
    "xpi",
    "cab",
    "deb",
    "ar",
    "rpm",
    "Z",
    "lz",
    "msi",
    "mxf",
    "mts",
    "blend",
    "bpg",
    "docx",
    "pptx",
    "xlsx",
    "3gp",
    "jp2",
    "jpm",
    "jpx",
    "mj2",
    "aif",
    "qcp",
    "odt",
    "ods",
    "odp",
    "xml",
    "mobi",
    "heic",
    "cur",
    "ktx",
    "ape",
    "wv",
    "wmv",
    "wma",
    "dcm",
    "ics",
    "glb",
    "pcap"
];

// Define an entry here only if the fixture has a different
// name than `fixture` or if you want multiple fixtures
const names = {
    "3gp": [
        "fixture",
        "fixture2"
    ],
    woff2: [
        "fixture",
        "fixture-otto"
    ],
    woff: [
        "fixture",
        "fixture-otto"
    ],
    eot: [
        "fixture",
        "fixture-0x20001"
    ],
    mov: [
        "fixture",
        "fixture-mjpeg",
        "fixture-moov"
    ],
    mp2: [
        "fixture",
        "fixture-mpa",
        "fixture-faac-adts"
    ],
    mp3: [
        "fixture",
        "fixture-offset1-id3",
        "fixture-offset1",
        "fixture-mp2l3",
        "fixture-ffe3"
    ],
    mp4: [
        "fixture-imovie",
        "fixture-isom",
        "fixture-isomv2",
        "fixture-mp4v2",
        "fixture-m4v",
        "fixture-dash",
        "fixture-aac-adts"
    ],
    tif: [
        "fixture-big-endian",
        "fixture-little-endian"
    ],
    gz: [
        "fixture.tar"
    ],
    xz: [
        "fixture.tar"
    ],
    lz: [
        "fixture.tar"
    ],
    Z: [
        "fixture.tar"
    ],
    mkv: [
        "fixture",
        "fixture2"
    ],
    mpg: [
        "fixture",
        "fixture2"
    ],
    heic: [
        "fixture-mif1",
        "fixture-msf1",
        "fixture-heic"
    ],
    ape: [
        "fixture-monkeysaudio"
    ],
    mpc: [
        "fixture-sv7",
        "fixture-sv8"
    ],
    pcap: [
        "fixture-big-endian",
        "fixture-little-endian"
    ]
};

const testFile = (type, name) => {
    assert.equal(check(type, name), type);
};

const testFileFromStream = async (ext, name) => {
    const file = path.join(__dirname, "fixture", `${(name || "fixture")}.${ext}`);
    const readableStream = await detectFileType.stream(fs.createReadStream(file));

    assert.deepEqual(readableStream.fileType, detectFileType(readChunk.sync(file, 0, detectFileType.minimumBytes)));
};

const testStream = async (ext, name) => {
    const file = path.join(__dirname, "fixture", `${(name || "fixture")}.${ext}`);

    const readableStream = await detectFileType.stream(fs.createReadStream(file));
    const fileStream = fs.createReadStream(file);

    const loadEntireFile = async (readable) => {
        const buffer = [];
        readable.on("data", (chunk) => {
            buffer.push(Buffer.from(chunk));
        });

        if (stream.finished) {
            const finished = adone.promise.promisify(stream.finished);
            await finished(readable);
        } else {
            await new Promise((resolve) => readable.on("end", resolve));
        }

        return Buffer.concat(buffer);
    };

    const [bufferA, bufferB] = await Promise.all([loadEntireFile(readableStream), loadEntireFile(fileStream)]);

    assert.isTrue(bufferA.equals(bufferB));
};

describe("util", "detectFileType", () => {

    let i = 0;
    for (const type of types) {
        if (Object.prototype.hasOwnProperty.call(names, type)) {
            for (const name of names[type]) {
                it(`${type} ${i++}`, () => testFile(type, name));
                it(`.stream() method - same fileType - ${type} ${i++}`, () => testFileFromStream(type, name));
                it(`.stream() method - identical streams - ${type} ${i++}`, () => testStream(type, name));
            }
        } else {
            it(`${type} ${i++}`, () => testFile(type));
            it(`.stream() method - same fileType - ${type} ${i++}`, () => testFileFromStream(type));
            it(`.stream() method - identical streams - ${type} ${i++}`, () => testStream(type));
        }
    }

    it(".stream() method - empty stream", async () => {
        const emptyStream = fs.createReadStream("/dev/null");
        await assert.throws(async () => detectFileType.stream(emptyStream), /Expected the `input` argument to be of type `Uint8Array` /);
    });

    it("fileType.minimumBytes", () => {
        assert.isTrue(detectFileType.minimumBytes > 4000);
    });

    it("validate the input argument type", () => {
        assert.throws(() => {
            detectFileType("x");
        }, /Expected the `input` argument to be of type `Uint8Array`/);

        detectFileType(Buffer.from("x"));
        detectFileType(new Uint8Array());
    });
});
