const {
    is,
    error,
    fs,
    crypto: { crc32 },
    compressor: { deflate },
    std: { stream: { Transform, PassThrough } },
    event
} = adone;

const writeToOutputStream = (self, buffer) => {
    self.outputStream.write(buffer);
    self.outputStreamCursor += buffer.length;
};

class ByteCounter extends Transform {
    constructor(options) {
        super(options);
        this.byteCount = 0;
    }

    _transform(chunk, encoding, cb) {
        this.byteCount += chunk.length;
        cb(null, chunk);
    }
}

class Crc32Watcher extends Transform {
    constructor(options) {
        super(options);
        this.crc32 = 0;
    }

    _transform(chunk, encoding, cb) {
        this.crc32 = crc32.unsigned(chunk, this.crc32);
        cb(null, chunk);
    }
}

const ZIP64_END_OF_CENTRAL_DIRECTORY_RECORD_SIZE = 56;
const ZIP64_END_OF_CENTRAL_DIRECTORY_LOCATOR_SIZE = 20;
const END_OF_CENTRAL_DIRECTORY_RECORD_SIZE = 22;
const LOCAL_FILE_HEADER_FIXED_SIZE = 30;
const VERSION_NEEDED_TO_EXTRACT_UTF8 = 20;
const VERSION_NEEDED_TO_EXTRACT_ZIP64 = 45;
// 3 = unix. 63 = spec version 6.3
const VERSION_MADE_BY = (3 << 8) | 63;
const FILE_NAME_IS_UTF8 = 1 << 11;
const UNKNOWN_CRC32_AND_FILE_SIZES = 1 << 3;
const DATA_DESCRIPTOR_SIZE = 16;
const ZIP64_DATA_DESCRIPTOR_SIZE = 24;
const CENTRAL_DIRECTORY_RECORD_FIXED_SIZE = 46;
const ZIP64_EXTENDED_INFORMATION_EXTRA_FIELD_SIZE = 28;

const defaultFileMode = 0o100664;
const defaultDirectoryMode = 0o40775;


const writeUInt64LE = (buffer, n, offset) => {
    const high = Math.floor(n / 0x100000000);
    const low = n % 0x100000000;
    buffer.writeUInt32LE(low, offset);
    buffer.writeUInt32LE(high, offset + 4);
};

const getEndOfCentralDirectoryRecord = (self, actuallyJustTellMeHowLongItWouldBe) => {
    let needZip64Format = false;
    let normalEntriesLength = self.entries.length;
    if (self.forceZip64Eocd || self.entries.length >= 0xffff) {
        normalEntriesLength = 0xffff;
        needZip64Format = true;
    }
    const sizeOfCentralDirectory = self.outputStreamCursor - self.offsetOfStartOfCentralDirectory;
    let normalSizeOfCentralDirectory = sizeOfCentralDirectory;
    if (self.forceZip64Eocd || sizeOfCentralDirectory >= 0xffffffff) {
        normalSizeOfCentralDirectory = 0xffffffff;
        needZip64Format = true;
    }
    let normalOffsetOfStartOfCentralDirectory = self.offsetOfStartOfCentralDirectory;
    if (self.forceZip64Eocd || self.offsetOfStartOfCentralDirectory >= 0xffffffff) {
        normalOffsetOfStartOfCentralDirectory = 0xffffffff;
        needZip64Format = true;
    }
    if (actuallyJustTellMeHowLongItWouldBe) {
        if (needZip64Format) {
            return (
                ZIP64_END_OF_CENTRAL_DIRECTORY_RECORD_SIZE +
                ZIP64_END_OF_CENTRAL_DIRECTORY_LOCATOR_SIZE +
                END_OF_CENTRAL_DIRECTORY_RECORD_SIZE
            );
        }
        return END_OF_CENTRAL_DIRECTORY_RECORD_SIZE;
    }

    const eocdrBuffer = Buffer.allocUnsafe(END_OF_CENTRAL_DIRECTORY_RECORD_SIZE + self.comment.length);
    // end of central dir signature                       4 bytes  (0x06054b50)
    eocdrBuffer.writeUInt32LE(0x06054b50, 0);
    // number of this disk                                2 bytes
    eocdrBuffer.writeUInt16LE(0, 4);
    // number of the disk with the start of the central directory  2 bytes
    eocdrBuffer.writeUInt16LE(0, 6);
    // total number of entries in the central directory on this disk  2 bytes
    eocdrBuffer.writeUInt16LE(normalEntriesLength, 8);
    // total number of entries in the central directory   2 bytes
    eocdrBuffer.writeUInt16LE(normalEntriesLength, 10);
    // size of the central directory                      4 bytes
    eocdrBuffer.writeUInt32LE(normalSizeOfCentralDirectory, 12);
    // offset of start of central directory with respect to the starting disk number  4 bytes
    eocdrBuffer.writeUInt32LE(normalOffsetOfStartOfCentralDirectory, 16);
    // .ZIP file comment length                           2 bytes
    eocdrBuffer.writeUInt16LE(self.comment.length, 20);
    // .ZIP file comment                                  (variable size)
    self.comment.copy(eocdrBuffer, 22);

    if (!needZip64Format) {
        return eocdrBuffer;
    }

    // ZIP64 format
    // ZIP64 End of Central Directory Record
    const zip64EocdrBuffer = Buffer.allocUnsafe(ZIP64_END_OF_CENTRAL_DIRECTORY_RECORD_SIZE);
    // zip64 end of central dir signature                                             4 bytes  (0x06064b50)
    zip64EocdrBuffer.writeUInt32LE(0x06064b50, 0);
    // size of zip64 end of central directory record                                  8 bytes
    writeUInt64LE(zip64EocdrBuffer, ZIP64_END_OF_CENTRAL_DIRECTORY_RECORD_SIZE - 12, 4);
    // version made by                                                                2 bytes
    zip64EocdrBuffer.writeUInt16LE(VERSION_MADE_BY, 12);
    // version needed to extract                                                      2 bytes
    zip64EocdrBuffer.writeUInt16LE(VERSION_NEEDED_TO_EXTRACT_ZIP64, 14);
    // number of this disk                                                            4 bytes
    zip64EocdrBuffer.writeUInt32LE(0, 16);
    // number of the disk with the start of the central directory                     4 bytes
    zip64EocdrBuffer.writeUInt32LE(0, 20);
    // total number of entries in the central directory on this disk                  8 bytes
    writeUInt64LE(zip64EocdrBuffer, self.entries.length, 24);
    // total number of entries in the central directory                               8 bytes
    writeUInt64LE(zip64EocdrBuffer, self.entries.length, 32);
    // size of the central directory                                                  8 bytes
    writeUInt64LE(zip64EocdrBuffer, sizeOfCentralDirectory, 40);
    // offset of start of central directory with respect to the starting disk number  8 bytes
    writeUInt64LE(zip64EocdrBuffer, self.offsetOfStartOfCentralDirectory, 48);
    // zip64 extensible data sector                                                   (variable size)
    // nothing in the zip64 extensible data sector


    // ZIP64 End of Central Directory Locator
    const zip64EocdlBuffer = Buffer.allocUnsafe(ZIP64_END_OF_CENTRAL_DIRECTORY_LOCATOR_SIZE);
    // zip64 end of central dir locator signature                               4 bytes  (0x07064b50)
    zip64EocdlBuffer.writeUInt32LE(0x07064b50, 0);
    // number of the disk with the start of the zip64 end of central directory  4 bytes
    zip64EocdlBuffer.writeUInt32LE(0, 4);
    // relative offset of the zip64 end of central directory record             8 bytes
    writeUInt64LE(zip64EocdlBuffer, self.outputStreamCursor, 8);
    // total number of disks                                                    4 bytes
    zip64EocdlBuffer.writeUInt32LE(1, 16);


    return Buffer.concat([
        zip64EocdrBuffer,
        zip64EocdlBuffer,
        eocdrBuffer
    ]);
};

const EMPTY_BUFFER = Buffer.allocUnsafe(0);

class Entry {
    constructor(metadataPath, isDirectory, options) {
        this.utf8FileName = Buffer.from(metadataPath);
        if (this.utf8FileName.length > 0xffff) {
            throw new error.InvalidArgumentException(`utf8 file name too long. ${this.utf8FileName.length} > ${0xffff}`);
        }
        this.isDirectory = isDirectory;
        this.state = Entry.WAITING_FOR_METADATA;
        this.setLastModDate(!is.nil(options.mtime) ? options.mtime : new Date());
        if (!is.nil(options.mode)) {
            this.setFileAttributesMode(options.mode);
        } else {
            this.setFileAttributesMode(isDirectory ? defaultDirectoryMode : defaultFileMode);
        }
        if (isDirectory) {
            this.crcAndFileSizeKnown = true;
            this.crc32 = 0;
            this.uncompressedSize = 0;
            this.compressedSize = 0;
        } else {
            // unknown so far
            this.crcAndFileSizeKnown = false;
            this.crc32 = null;
            this.uncompressedSize = null;
            this.compressedSize = null;
            if (!is.nil(options.size)) {
                this.uncompressedSize = options.size;
            }
        }
        if (isDirectory) {
            this.compress = false;
        } else {
            this.compress = true; // default
            if (!is.nil(options.compress)) {
                this.compress = Boolean(options.compress);
            }
        }
        this.forceZip64Format = Boolean(options.forceZip64Format);
        if (options.fileComment) {
            if (is.string(options.fileComment)) {
                this.fileComment = Buffer.from(options.fileComment, "utf-8");
            } else {
                // It should be a Buffer
                this.fileComment = options.fileComment;
            }
            if (this.fileComment.length > 0xffff) {
                throw new Error("fileComment is too large");
            }
        } else {
            // no comment.
            this.fileComment = EMPTY_BUFFER;
        }
    }

    setLastModDate(date) {
        const dosDateTime = adone.datetime(date).toDOS();
        this.lastModFileTime = dosDateTime.time;
        this.lastModFileDate = dosDateTime.date;
    }

    setFileAttributesMode(mode) {
        if ((mode & 0xffff) !== mode) {
            throw new error.InvalidArgumentException(`invalid mode. expected: 0 <= ${mode} <= ${0xffff}`);
        }
        // http://unix.stackexchange.com/questions/14705/the-zip-formats-external-file-attribute/14727#14727
        this.externalFileAttributes = (mode << 16) >>> 0;
    }

    setFileDataPumpFunction(doFileDataPump) {
        this.doFileDataPump = doFileDataPump;
        this.state = Entry.READY_TO_PUMP_FILE_DATA;
    }

    useZip64Format() {
        return (
            this.forceZip64Format ||
            (!is.nil(this.uncompressedSize) && this.uncompressedSize > 0xfffffffe) ||
            (!is.nil(this.compressedSize) && this.compressedSize > 0xfffffffe) ||
            (
                !is.nil(this.relativeOffsetOfLocalHeader) &&
                this.relativeOffsetOfLocalHeader > 0xfffffffe
            )
        );
    }

    getLocalFileHeader() {
        let crc32 = 0;
        let compressedSize = 0;
        let uncompressedSize = 0;
        if (this.crcAndFileSizeKnown) {
            crc32 = this.crc32;
            compressedSize = this.compressedSize;
            uncompressedSize = this.uncompressedSize;
        }

        const fixedSizeStuff = Buffer.allocUnsafe(LOCAL_FILE_HEADER_FIXED_SIZE);
        let generalPurposeBitFlag = FILE_NAME_IS_UTF8;
        if (!this.crcAndFileSizeKnown) {
            generalPurposeBitFlag |= UNKNOWN_CRC32_AND_FILE_SIZES;
        }

        // local file header signature     4 bytes  (0x04034b50)
        fixedSizeStuff.writeUInt32LE(0x04034b50, 0);
        // version needed to extract       2 bytes
        fixedSizeStuff.writeUInt16LE(VERSION_NEEDED_TO_EXTRACT_UTF8, 4);
        // general purpose bit flag        2 bytes
        fixedSizeStuff.writeUInt16LE(generalPurposeBitFlag, 6);
        // compression method              2 bytes
        fixedSizeStuff.writeUInt16LE(this.getCompressionMethod(), 8);
        // last mod file time              2 bytes
        fixedSizeStuff.writeUInt16LE(this.lastModFileTime, 10);
        // last mod file date              2 bytes
        fixedSizeStuff.writeUInt16LE(this.lastModFileDate, 12);
        // crc-32                          4 bytes
        fixedSizeStuff.writeUInt32LE(crc32, 14);
        // compressed size                 4 bytes
        fixedSizeStuff.writeUInt32LE(compressedSize, 18);
        // uncompressed size               4 bytes
        fixedSizeStuff.writeUInt32LE(uncompressedSize, 22);
        // file name length                2 bytes
        fixedSizeStuff.writeUInt16LE(this.utf8FileName.length, 26);
        // extra field length              2 bytes
        fixedSizeStuff.writeUInt16LE(0, 28);
        return Buffer.concat([
            fixedSizeStuff,
            // file name (variable size)
            this.utf8FileName
            // extra field (variable size)
            // no extra fields
        ]);
    }

    getDataDescriptor() {
        if (this.crcAndFileSizeKnown) {
            // the Mac Archive Utility requires this not be present unless we set general purpose bit 3
            return Buffer.allocUnsafe(0);
        }
        if (!this.useZip64Format()) {
            const buffer = Buffer.allocUnsafe(DATA_DESCRIPTOR_SIZE);
            // optional signature (required according to Archive Utility)
            buffer.writeUInt32LE(0x08074b50, 0);
            // crc-32                          4 bytes
            buffer.writeUInt32LE(this.crc32, 4);
            // compressed size                 4 bytes
            buffer.writeUInt32LE(this.compressedSize, 8);
            // uncompressed size               4 bytes
            buffer.writeUInt32LE(this.uncompressedSize, 12);
            return buffer;
        }
        // ZIP64 format
        const buffer = Buffer.allocUnsafe(ZIP64_DATA_DESCRIPTOR_SIZE);
        // optional signature (unknown if anyone cares about this)
        buffer.writeUInt32LE(0x08074b50, 0);
        // crc-32                          4 bytes
        buffer.writeUInt32LE(this.crc32, 4);
        // compressed size                 8 bytes
        writeUInt64LE(buffer, this.compressedSize, 8);
        // uncompressed size               8 bytes
        writeUInt64LE(buffer, this.uncompressedSize, 16);
        return buffer;
    }

    getCentralDirectoryRecord() {
        const fixedSizeStuff = Buffer.allocUnsafe(CENTRAL_DIRECTORY_RECORD_FIXED_SIZE);
        let generalPurposeBitFlag = FILE_NAME_IS_UTF8;
        if (!this.crcAndFileSizeKnown) {
            generalPurposeBitFlag |= UNKNOWN_CRC32_AND_FILE_SIZES;
        }

        let normalCompressedSize = this.compressedSize;
        let normalUncompressedSize = this.uncompressedSize;
        let normalRelativeOffsetOfLocalHeader = this.relativeOffsetOfLocalHeader;
        let versionNeededToExtract;
        let zeiefBuffer;
        if (this.useZip64Format()) {
            normalCompressedSize = 0xffffffff;
            normalUncompressedSize = 0xffffffff;
            normalRelativeOffsetOfLocalHeader = 0xffffffff;
            versionNeededToExtract = VERSION_NEEDED_TO_EXTRACT_ZIP64;

            // ZIP64 extended information extra field
            zeiefBuffer = Buffer.allocUnsafe(ZIP64_EXTENDED_INFORMATION_EXTRA_FIELD_SIZE);
            // 0x0001                  2 bytes    Tag for this "extra" block type
            zeiefBuffer.writeUInt16LE(0x0001, 0);
            // Size                    2 bytes    Size of this "extra" block
            zeiefBuffer.writeUInt16LE(ZIP64_EXTENDED_INFORMATION_EXTRA_FIELD_SIZE - 4, 2);
            // Original Size           8 bytes    Original uncompressed file size
            writeUInt64LE(zeiefBuffer, this.uncompressedSize, 4);
            // Compressed Size         8 bytes    Size of compressed data
            writeUInt64LE(zeiefBuffer, this.compressedSize, 12);
            // Relative Header Offset  8 bytes    Offset of local header record
            writeUInt64LE(zeiefBuffer, this.relativeOffsetOfLocalHeader, 20);
            // Disk Start Number       4 bytes    Number of the disk on which this file starts
            // (omit)
        } else {
            versionNeededToExtract = VERSION_NEEDED_TO_EXTRACT_UTF8;
            zeiefBuffer = Buffer.allocUnsafe(0);
        }

        // central file header signature   4 bytes  (0x02014b50)
        fixedSizeStuff.writeUInt32LE(0x02014b50, 0);
        // version made by                 2 bytes
        fixedSizeStuff.writeUInt16LE(VERSION_MADE_BY, 4);
        // version needed to extract       2 bytes
        fixedSizeStuff.writeUInt16LE(versionNeededToExtract, 6);
        // general purpose bit flag        2 bytes
        fixedSizeStuff.writeUInt16LE(generalPurposeBitFlag, 8);
        // compression method              2 bytes
        fixedSizeStuff.writeUInt16LE(this.getCompressionMethod(), 10);
        // last mod file time              2 bytes
        fixedSizeStuff.writeUInt16LE(this.lastModFileTime, 12);
        // last mod file date              2 bytes
        fixedSizeStuff.writeUInt16LE(this.lastModFileDate, 14);
        // crc-32                          4 bytes
        fixedSizeStuff.writeUInt32LE(this.crc32, 16);
        // compressed size                 4 bytes
        fixedSizeStuff.writeUInt32LE(normalCompressedSize, 20);
        // uncompressed size               4 bytes
        fixedSizeStuff.writeUInt32LE(normalUncompressedSize, 24);
        // file name length                2 bytes
        fixedSizeStuff.writeUInt16LE(this.utf8FileName.length, 28);
        // extra field length              2 bytes
        fixedSizeStuff.writeUInt16LE(zeiefBuffer.length, 30);
        // file comment length             2 bytes
        fixedSizeStuff.writeUInt16LE(this.fileComment.length, 32);
        // disk number start               2 bytes
        fixedSizeStuff.writeUInt16LE(0, 34);
        // internal file attributes        2 bytes
        fixedSizeStuff.writeUInt16LE(0, 36);
        // external file attributes        4 bytes
        fixedSizeStuff.writeUInt32LE(this.externalFileAttributes, 38);
        // relative offset of local header 4 bytes
        fixedSizeStuff.writeUInt32LE(normalRelativeOffsetOfLocalHeader, 42);

        return Buffer.concat([
            fixedSizeStuff,
            // file name (variable size)
            this.utf8FileName,
            // extra field (variable size)
            zeiefBuffer,
            // file comment (variable size)
            this.fileComment
        ]);
    }

    getCompressionMethod() {
        const NO_COMPRESSION = 0;
        const DEFLATE_COMPRESSION = 8;
        return this.compress ? DEFLATE_COMPRESSION : NO_COMPRESSION;
    }
}
Entry.WAITING_FOR_METADATA = 0;
Entry.READY_TO_PUMP_FILE_DATA = 1;
Entry.FILE_DATA_IN_PROGRESS = 2;
Entry.FILE_DATA_DONE = 3;

const calculateFinalSize = (self) => {
    let pretendOutputCursor = 0;
    let centralDirectorySize = 0;
    for (const entry of self.entries) {
        // compression is too hard to predict
        if (entry.compress) {
            return -1;
        }
        if (entry.state >= Entry.READY_TO_PUMP_FILE_DATA) {
            // if addReadStream was called without providing the size, we can't predict the final size
            if (is.nil(entry.uncompressedSize)) {
                return -1;
            }
        } else {
            // if we're still waiting for fs.stat, we might learn the size someday
            if (is.nil(entry.uncompressedSize)) {
                return null;
            }
        }
        // we know this for sure, and this is important to know if we need ZIP64 format.
        entry.relativeOffsetOfLocalHeader = pretendOutputCursor;
        const useZip64Format = entry.useZip64Format();

        pretendOutputCursor += LOCAL_FILE_HEADER_FIXED_SIZE + entry.utf8FileName.length;
        pretendOutputCursor += entry.uncompressedSize;
        if (!entry.crcAndFileSizeKnown) {
            // use a data descriptor
            if (useZip64Format) {
                pretendOutputCursor += ZIP64_DATA_DESCRIPTOR_SIZE;
            } else {
                pretendOutputCursor += DATA_DESCRIPTOR_SIZE;
            }
        }

        centralDirectorySize += CENTRAL_DIRECTORY_RECORD_FIXED_SIZE + entry.utf8FileName.length + entry.fileComment.length;
        if (useZip64Format) {
            centralDirectorySize += ZIP64_EXTENDED_INFORMATION_EXTRA_FIELD_SIZE;
        }
    }

    let endOfCentralDirectorySize = 0;
    if (self.forceZip64Eocd ||
        self.entries.length >= 0xffff ||
        centralDirectorySize >= 0xffff ||
        pretendOutputCursor >= 0xffffffff) {
        // use zip64 end of central directory stuff
        endOfCentralDirectorySize += ZIP64_END_OF_CENTRAL_DIRECTORY_RECORD_SIZE +
            ZIP64_END_OF_CENTRAL_DIRECTORY_LOCATOR_SIZE;
    }
    endOfCentralDirectorySize += END_OF_CENTRAL_DIRECTORY_RECORD_SIZE + self.comment.length;
    return pretendOutputCursor + centralDirectorySize + endOfCentralDirectorySize;
};

const pumpEntries = (self) => {
    if (self.allDone) {
        return;
    }
    // first check if finalSize is finally known
    if (self.ended && !is.nil(self.finalSizeCallback)) {
        const finalSize = calculateFinalSize(self);
        if (!is.nil(finalSize)) {
            // we have an answer
            self.finalSizeCallback(finalSize);
            self.finalSizeCallback = null;
        }
    }

    // pump entries
    let entry = null;
    for (const e of self.entries) {
        if (e.state < Entry.FILE_DATA_DONE) {
            entry = e;
            break;
        }
    }
    if (!is.null(entry)) {
        // this entry is not done yet
        if (entry.state < Entry.READY_TO_PUMP_FILE_DATA) {
            return;
        } // input file not open yet
        if (entry.state === Entry.FILE_DATA_IN_PROGRESS) {
            return;
        } // we'll get there
        // start with local file header
        entry.relativeOffsetOfLocalHeader = self.outputStreamCursor;
        const localFileHeader = entry.getLocalFileHeader();
        writeToOutputStream(self, localFileHeader);
        entry.doFileDataPump();
    } else {
        // all cought up on writing entries
        if (self.ended) {
            // head for the exit
            self.offsetOfStartOfCentralDirectory = self.outputStreamCursor;
            self.entries.forEach((entry) => {
                const centralDirectoryRecord = entry.getCentralDirectoryRecord();
                writeToOutputStream(self, centralDirectoryRecord);
            });
            writeToOutputStream(self, getEndOfCentralDirectoryRecord(self));
            self.outputStream.end();
            self.allDone = true;
        }
    }
};

const pumpFileDataReadStream = (self, entry, readStream) => {
    const crc32Watcher = new Crc32Watcher();
    const uncompressedSizeCounter = new ByteCounter();
    const compressor = entry.compress ? deflate.rawCompressStream() : new PassThrough();
    const compressedSizeCounter = new ByteCounter();
    readStream.pipe(crc32Watcher)
        .pipe(uncompressedSizeCounter)
        .pipe(compressor)
        .pipe(compressedSizeCounter)
        .pipe(self.outputStream, { end: false });
    compressedSizeCounter.once("end", () => {
        entry.crc32 = crc32Watcher.crc32;
        if (is.nil(entry.uncompressedSize)) {
            entry.uncompressedSize = uncompressedSizeCounter.byteCount;
        } else {
            if (entry.uncompressedSize !== uncompressedSizeCounter.byteCount) {
                return self.emit("error", new Error("file data stream has unexpected number of bytes"));
            }
        }
        entry.compressedSize = compressedSizeCounter.byteCount;
        self.outputStreamCursor += entry.compressedSize;
        writeToOutputStream(self, entry.getDataDescriptor());
        entry.state = Entry.FILE_DATA_DONE;
        pumpEntries(self);
    });
};

const validateMetadataPath = (metadataPath, isDirectory) => {
    if (metadataPath === "") {
        throw new error.IllegalStateException("empty metadataPath");
    }
    metadataPath = metadataPath.replace(/\\/g, "/");
    if (/^[a-zA-Z]:/.test(metadataPath) || /^\//.test(metadataPath)) {
        throw new error.IllegalStateException(`absolute path: ${metadataPath}`);
    }
    if (metadataPath.split("/").indexOf("..") !== -1) {
        throw new error.IllegalStateException(`invalid relative path: ${metadataPath}`);
    }
    const looksLikeDirectory = /\/$/.test(metadataPath);
    if (isDirectory) {
        // append a trailing '/' if necessary.
        if (!looksLikeDirectory) {
            metadataPath += "/";
        }
    } else {
        if (looksLikeDirectory) {
            throw new error.IllegalStateException(`file path cannot end with '/': ${metadataPath}`);
        }
    }
    return metadataPath;
};

const cp437 = '\u0000☺☻♥♦♣♠•◘○◙♂♀♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼ !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~⌂ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ';
if (cp437.length !== 256) {
    throw new Error("assertion failure");
}
let reverseCp437 = null;

const encodeCp437 = function (string) {
    if (/^[\x20-\x7e]*$/.test(string)) {
        // CP437, ASCII, and UTF-8 overlap in this range.
        return Buffer.from(string, "utf-8");
    }

    // This is the slow path.
    if (is.nil(reverseCp437)) {
        // cache this once
        reverseCp437 = {};
        for (let i = 0; i < cp437.length; i++) {
            reverseCp437[cp437[i]] = i;
        }
    }

    const result = Buffer.allocUnsafe(string.length);
    for (let i = 0; i < string.length; i++) {
        const b = reverseCp437[string[i]];
        if (is.nil(b)) {
            throw new Error(`character not encodable in CP437: ${JSON.stringify(string[i])}`);
        }
        result[i] = b;
    }

    return result;
};

const eocdrSignatureBuffer = Buffer.from([0x50, 0x4b, 0x05, 0x06]);

export class ZipFile extends event.Emitter {
    constructor() {
        super();
        this.outputStream = new PassThrough();
        this.entries = [];
        this.outputStreamCursor = 0;
        this.ended = false; // .end() sets this
        this.allDone = false; // set when we've written the last bytes
        this.forceZip64Eocd = false; // configurable in .end()
    }

    addFile(realPath, metadataPath, options = {}) {
        metadataPath = validateMetadataPath(metadataPath, false);

        const entry = new Entry(metadataPath, false, options);
        this.entries.push(entry);

        fs.stat(realPath).then((stats) => {
            if (!stats.isFile()) {
                return this.emit("error", new error.IllegalStateException(`not a file: ${realPath}`));
            }
            entry.uncompressedSize = stats.size;
            if (is.nil(options.mtime)) {
                entry.setLastModDate(stats.mtime);
            }
            if (is.nil(options.mode)) {
                entry.setFileAttributesMode(stats.mode);
            }
            entry.setFileDataPumpFunction(() => {
                const readStream = fs.createReadStream(realPath);
                entry.state = Entry.FILE_DATA_IN_PROGRESS;
                readStream.on("error", (err) => {
                    this.emit("error", err);
                });
                pumpFileDataReadStream(this, entry, readStream);
            });
            pumpEntries(this);
        }, (err) => {
            this.emit("error", err);
        });

        return this;
    }

    addReadStream(readStream, metadataPath, options = {}) {
        metadataPath = validateMetadataPath(metadataPath, false);
        const entry = new Entry(metadataPath, false, options);
        this.entries.push(entry);
        entry.setFileDataPumpFunction(() => {
            entry.state = Entry.FILE_DATA_IN_PROGRESS;
            pumpFileDataReadStream(this, entry, readStream);
        });
        pumpEntries(this);
        return this;
    }

    addBuffer(buffer, metadataPath, options = {}) {
        metadataPath = validateMetadataPath(metadataPath, false);
        if (buffer.length > 0x3fffffff) {
            throw new error.InvalidArgumentException(`buffer too large: ${buffer.length} > ${0x3fffffff}`);
        }
        if (!is.nil(options.size)) {
            throw new error.InvalidArgumentException("options.size not allowed");
        }
        const entry = new Entry(metadataPath, false, options);
        entry.uncompressedSize = buffer.length;
        entry.crc32 = crc32.unsigned(buffer);
        entry.crcAndFileSizeKnown = true;
        this.entries.push(entry);
        const setCompressedBuffer = (compressedBuffer) => {
            entry.compressedSize = compressedBuffer.length;
            entry.setFileDataPumpFunction(() => {
                writeToOutputStream(this, compressedBuffer);
                writeToOutputStream(this, entry.getDataDescriptor());
                entry.state = Entry.FILE_DATA_DONE;

                // don't call pumpEntries() recursively.
                // (also, don't call process.nextTick recursively.)
                setImmediate(() => {
                    pumpEntries(this);
                });
            });
            pumpEntries(this);
        };
        if (!entry.compress) {
            setCompressedBuffer(buffer);
        } else {
            deflate.rawCompress(buffer).then((compressedBuffer) => {
                setCompressedBuffer(compressedBuffer);
            }, (err) => {
                this.emit("error", err);
            });
        }
        return this;
    }

    addEmptyDirectory(metadataPath, options = {}) {
        metadataPath = validateMetadataPath(metadataPath, true);
        if (!is.nil(options.size)) {
            throw new error.InvalidArgumentException("options.size not allowed");
        }
        if (!is.nil(options.compress)) {
            throw new error.InvalidArgumentException("options.compress not allowed");
        }
        const entry = new Entry(metadataPath, true, options);
        this.entries.push(entry);
        entry.setFileDataPumpFunction(() => {
            writeToOutputStream(this, entry.getDataDescriptor());
            entry.state = Entry.FILE_DATA_DONE;
            pumpEntries(this);
        });
        pumpEntries(this);
        return this;
    }

    async end(options) {
        if (is.nil(options)) {
            options = {};
        }
        if (this.ended) {
            return;
        }
        this.ended = true;
        const promise = new Promise((resolve) => {
            this.finalSizeCallback = resolve;
        });
        this.forceZip64Eocd = Boolean(options.forceZip64Format);
        if (options.comment) {
            if (is.string(options.comment)) {
                this.comment = encodeCp437(options.comment);
            } else {
                // It should be a Buffer
                this.comment = options.comment;
            }
            if (this.comment.length > 0xffff) {
                throw new Error("comment is too large");
            }
            // gotta check for this, because the zipfile format is actually ambiguous.
            if (this.comment.includes(eocdrSignatureBuffer)) {
                throw new Error("comment contains end of central directory record signature");
            }
        } else {
            // no comment.
            this.comment = EMPTY_BUFFER;
        }
        pumpEntries(this);
        return promise;
    }
}
