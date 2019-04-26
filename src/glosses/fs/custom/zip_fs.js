import MemoryFileSystem from "./memory_fs";
import { isBuffer } from "../../../common";
import { inflateRawSync } from "zlib";

/**
 * Maps CompressionMethod => function that decompresses.
 */
const decompressionMethods = {};


/**
 * 4.4.2.2: Indicates the compatibiltiy of a file's external attributes.
 */
const ExternalFileAttributeType = {};
ExternalFileAttributeType[ExternalFileAttributeType.MSDOS = 0] = "MSDOS";
ExternalFileAttributeType[ExternalFileAttributeType.AMIGA = 1] = "AMIGA";
ExternalFileAttributeType[ExternalFileAttributeType.OPENVMS = 2] = "OPENVMS";
ExternalFileAttributeType[ExternalFileAttributeType.UNIX = 3] = "UNIX";
ExternalFileAttributeType[ExternalFileAttributeType.VM_CMS = 4] = "VM_CMS";
ExternalFileAttributeType[ExternalFileAttributeType.ATARI_ST = 5] = "ATARI_ST";
ExternalFileAttributeType[ExternalFileAttributeType.OS2_HPFS = 6] = "OS2_HPFS";
ExternalFileAttributeType[ExternalFileAttributeType.MAC = 7] = "MAC";
ExternalFileAttributeType[ExternalFileAttributeType.Z_SYSTEM = 8] = "Z_SYSTEM";
ExternalFileAttributeType[ExternalFileAttributeType.CP_M = 9] = "CP_M";
ExternalFileAttributeType[ExternalFileAttributeType.NTFS = 10] = "NTFS";
ExternalFileAttributeType[ExternalFileAttributeType.MVS = 11] = "MVS";
ExternalFileAttributeType[ExternalFileAttributeType.VSE = 12] = "VSE";
ExternalFileAttributeType[ExternalFileAttributeType.ACORN_RISC = 13] = "ACORN_RISC";
ExternalFileAttributeType[ExternalFileAttributeType.VFAT = 14] = "VFAT";
ExternalFileAttributeType[ExternalFileAttributeType.ALT_MVS = 15] = "ALT_MVS";
ExternalFileAttributeType[ExternalFileAttributeType.BEOS = 16] = "BEOS";
ExternalFileAttributeType[ExternalFileAttributeType.TANDEM = 17] = "TANDEM";
ExternalFileAttributeType[ExternalFileAttributeType.OS_400 = 18] = "OS_400";
ExternalFileAttributeType[ExternalFileAttributeType.OSX = 19] = "OSX";

/**
 * 4.4.5
 */
const CompressionMethod = {};
CompressionMethod[CompressionMethod.STORED = 0] = "STORED";
CompressionMethod[CompressionMethod.SHRUNK = 1] = "SHRUNK";
CompressionMethod[CompressionMethod.REDUCED_1 = 2] = "REDUCED_1";
CompressionMethod[CompressionMethod.REDUCED_2 = 3] = "REDUCED_2";
CompressionMethod[CompressionMethod.REDUCED_3 = 4] = "REDUCED_3";
CompressionMethod[CompressionMethod.REDUCED_4 = 5] = "REDUCED_4";
CompressionMethod[CompressionMethod.IMPLODE = 6] = "IMPLODE";
CompressionMethod[CompressionMethod.DEFLATE = 8] = "DEFLATE";
CompressionMethod[CompressionMethod.DEFLATE64 = 9] = "DEFLATE64";
CompressionMethod[CompressionMethod.TERSE_OLD = 10] = "TERSE_OLD";
CompressionMethod[CompressionMethod.BZIP2 = 12] = "BZIP2";
CompressionMethod[CompressionMethod.LZMA = 14] = "LZMA";
CompressionMethod[CompressionMethod.TERSE_NEW = 18] = "TERSE_NEW";
CompressionMethod[CompressionMethod.LZ77 = 19] = "LZ77";
CompressionMethod[CompressionMethod.WAVPACK = 97] = "WAVPACK";
CompressionMethod[CompressionMethod.PPMD = 98] = "PPMD"; // PPMd version I, Rev 1

const uint8Array2Buffer = (u8) => {
    return (u8 instanceof Buffer) 
        ? u8
        : (u8.byteOffset === 0 && u8.byteLength === u8.buffer.byteLength)
            ? Buffer.from(u8.buffer)
            : Buffer.from(u8.buffer, u8.byteOffset, u8.byteLength);
};

const emptyBuffer = Buffer.allocUnsafe(0);

decompressionMethods[CompressionMethod.DEFLATE] = (data, compressedSize, uncompressedSize) => inflateRawSync(data.slice(0, compressedSize), { chunkSize: Math.max(64, uncompressedSize) });

decompressionMethods[CompressionMethod.STORED] = (data, compressedSize, uncompressedSize) => {
    if (uncompressedSize < 0 || uncompressedSize > data.length) {
        throw new TypeError(`Invalid slice bounds on buffer of length ${data.length}: [0, ${uncompressedSize}]`);
    }
    if (data.length === 0) {
        // Avoid s0 corner case in ArrayBuffer case.
        return emptyBuffer;
    }

    const u8 = (data instanceof Uint8Array)
        ? data
        : new Uint8Array(data);
    const s0 = data[0];
    const newS0 = (s0 + 1) % 0xFF;
    data[0] = newS0;
    if (u8[0] === newS0) {
        // Same memory. Revert & copy.
        u8[0] = s0;
        return uint8Array2Buffer(u8.slice(0, uncompressedSize));
    }

    // Revert.
    data[0] = s0;
    return uint8Array2Buffer(u8.subarray(0, uncompressedSize));
};

/**
 * Converts the input time and date in MS-DOS format into a JavaScript Date object.
 */
const msdos2date = (time, date) => {
    // MS-DOS Date
    // |0 0 0 0  0|0 0 0  0|0 0 0  0 0 0 0
    //   D (1-31)  M (1-23)  Y (from 1980)
    const day = date & 0x1F;
    // JS date is 0-indexed, DOS is 1-indexed.
    const month = ((date >> 5) & 0xF) - 1;
    const year = (date >> 9) + 1980;
    // MS DOS Time
    // |0 0 0 0  0|0 0 0  0 0 0|0  0 0 0 0
    //    Second      Minute       Hour
    const second = time & 0x1F;
    const minute = (time >> 5) & 0x3F;
    const hour = time >> 11;
    return new Date(year, month, day, hour, minute, second);
};

/**
 * Safely returns the string from the buffer, even if it is 0 bytes long.
 * (Normally, calling toString() on a buffer with start === end causes an
 * exception).
 */
const safeToString = (buff, start, length) => (length === 0)
    ? ""
    : buff.toString("utf8", start, start + length);

/**
 * 4.3.6 Overall .ZIP file format:
 *
 * [local file header 1]
 * [encryption header 1]
 * [file data 1]
 * [data descriptor 1]
 * .
 * .
 * .
 * [local file header n]
 * [encryption header n]
 * [file data n]
 * [data descriptor n]
 * [archive decryption header]
 * [archive extra data record]
 * [central directory header 1]
 * .
 * .
 * .
 * [central directory header n]
 * [zip64 end of central directory record]
 * [zip64 end of central directory locator]
 * [end of central directory record]
 */

/**
 * 4.3.7  Local file header:
 *
 *     local file header signature     4 bytes  (0x04034b50)
 *     version needed to extract       2 bytes
 *     general purpose bit flag        2 bytes
 *     compression method              2 bytes
 *    last mod file time              2 bytes
 *    last mod file date              2 bytes
 *    crc-32                          4 bytes
 *    compressed size                 4 bytes
 *    uncompressed size               4 bytes
 *    file name length                2 bytes
 *    extra field length              2 bytes
 *
 *    file name (variable size)
 *    extra field (variable size)
 */
export class FileHeader {
    constructor(data) {
        this.data = data;
        if (data.readUInt32LE(0) !== 0x04034b50) {
            throw new Error(`Invalid local file header signature: ${this.data.readUInt32LE(0)}`);
        }
    }

    versionNeeded() {
        return this.data.readUInt16LE(4);
    }

    flags() {
        return this.data.readUInt16LE(6);
    }

    compressionMethod() {
        return this.data.readUInt16LE(8);
    }

    lastModFileTime() {
        // Time and date is in MS-DOS format.
        return msdos2date(this.data.readUInt16LE(10), this.data.readUInt16LE(12));
    }

    rawLastModFileTime() {
        return this.data.readUInt32LE(10);
    }

    crc32() {
        return this.data.readUInt32LE(14);
    }

    /**
     * These two values are COMPLETELY USELESS.
     *
     * Section 4.4.9:
     *   If bit 3 of the general purpose bit flag is set,
     *   these fields are set to zero in the local header and the
     *   correct values are put in the data descriptor and
     *   in the central directory.
     *
     * So we'll just use the central directory's values.
     */
    // public compressedSize(): number { return this.data.readUInt32LE(18); }
    // public uncompressedSize(): number { return this.data.readUInt32LE(22); }
    fileNameLength() {
        return this.data.readUInt16LE(26);
    }

    extraFieldLength() {
        return this.data.readUInt16LE(28);
    }

    fileName() {
        return safeToString(this.data, 30, this.fileNameLength());
    }

    extraField() {
        const start = 30 + this.fileNameLength();
        return this.data.slice(start, start + this.extraFieldLength());
    }

    totalSize() {
        return 30 + this.fileNameLength() + this.extraFieldLength();
    }
}

/**
 * 4.3.8  File data
 *
 *   Immediately following the local header for a file
 *   SHOULD be placed the compressed or stored data for the file.
 *   If the file is encrypted, the encryption header for the file
 *   SHOULD be placed after the local header and before the file
 *   data. The series of [local file header][encryption header]
 *   [file data][data descriptor] repeats for each file in the
 *   .ZIP archive.
 *
 *   Zero-byte files, directories, and other file types that
 *   contain no content MUST not include file data.
 */
export class FileData {
    constructor(header, record, data) {
        this.header = header;
        this.record = record;
        this.data = data;
    }

    decompress() {
        // Check the compression
        const compressionMethod = this.header.compressionMethod();
        const fcn = decompressionMethods[compressionMethod];
        if (fcn) {
            return fcn(this.data, this.record.compressedSize(), this.record.uncompressedSize(), this.record.flag());
        }
        let name = CompressionMethod[compressionMethod];
        if (!name) {
            name = `Unknown: ${compressionMethod}`;
        }
        throw new Error(`Invalid compression method on file '${this.header.fileName()}': ${name}`);
    }

    getHeader() {
        return this.header;
    }

    getRecord() {
        return this.record;
    }

    getRawData() {
        return this.data;
    }
}

/**
 * 4.3.9  Data descriptor:
 *
 *    crc-32                          4 bytes
 *    compressed size                 4 bytes
 *    uncompressed size               4 bytes
 */
export class DataDescriptor {
    constructor(data) {
        this.data = data;
    }

    crc32() {
        return this.data.readUInt32LE(0);
    }

    compressedSize() {
        return this.data.readUInt32LE(4);
    }

    uncompressedSize() {
        return this.data.readUInt32LE(8);
    }
}
/**
 * ` 4.3.10  Archive decryption header:
 *
 * 4.3.10.1 The Archive Decryption Header is introduced in version 6.2
 * of the ZIP format specification.  This record exists in support
 * of the Central Directory Encryption Feature implemented as part of
 * the Strong Encryption Specification as described in this document.
 * When the Central Directory Structure is encrypted, this decryption
 * header MUST precede the encrypted data segment.
 */

/**
 * 4.3.11  Archive extra data record:
 *
 *      archive extra data signature    4 bytes  (0x08064b50)
 *      extra field length              4 bytes
 *      extra field data                (variable size)
 *
 *    4.3.11.1 The Archive Extra Data Record is introduced in version 6.2
 *    of the ZIP format specification.  This record MAY be used in support
 *    of the Central Directory Encryption Feature implemented as part of
 *    the Strong Encryption Specification as described in this document.
 *    When present, this record MUST immediately precede the central
 *    directory data structure.
 */
export class ArchiveExtraDataRecord {
    constructor(data) {
        this.data = data;
        if (this.data.readUInt32LE(0) !== 0x08064b50) {
            throw new Error(`Invalid archive extra data record signature: ${this.data.readUInt32LE(0)}`);
        }
    }

    length() {
        return this.data.readUInt32LE(4);
    }

    extraFieldData() {
        return this.data.slice(8, 8 + this.length());
    }
}

/**
 * 4.3.13 Digital signature:
 *
 *      header signature                4 bytes  (0x05054b50)
 *      size of data                    2 bytes
 *      signature data (variable size)
 *
 *    With the introduction of the Central Directory Encryption
 *    feature in version 6.2 of this specification, the Central
 *    Directory Structure MAY be stored both compressed and encrypted.
 *    Although not required, it is assumed when encrypting the
 *    Central Directory Structure, that it will be compressed
 *    for greater storage efficiency.  Information on the
 *    Central Directory Encryption feature can be found in the section
 *    describing the Strong Encryption Specification. The Digital
 *    Signature record will be neither compressed nor encrypted.
 */
export class DigitalSignature {
    constructor(data) {
        this.data = data;
        if (this.data.readUInt32LE(0) !== 0x05054b50) {
            throw new Error(`Invalid signature of digital signature: ${this.data.readUInt32LE(0)}`);
        }
    }

    size() {
        return this.data.readUInt16LE(4);
    }

    signatureData() {
        return this.data.slice(6, 6 + this.size());
    }
}

/**
 * 4.3.12  Central directory structure:
 *
 *  central file header signature   4 bytes  (0x02014b50)
 *  version made by                 2 bytes
 *  version needed to extract       2 bytes
 *  general purpose bit flag        2 bytes
 *  compression method              2 bytes
 *  last mod file time              2 bytes
 *  last mod file date              2 bytes
 *  crc-32                          4 bytes
 *  compressed size                 4 bytes
 *  uncompressed size               4 bytes
 *  file name length                2 bytes
 *  extra field length              2 bytes
 *  file comment length             2 bytes
 *  disk number start               2 bytes
 *  internal file attributes        2 bytes
 *  external file attributes        4 bytes
 *  relative offset of local header 4 bytes
 *
 *  file name (variable size)
 *  extra field (variable size)
 *  file comment (variable size)
 */
export class CentralDirectory {
    constructor(zipData, data) {
        this.zipData = zipData;
        this.data = data;
        // Sanity check.
        if (this.data.readUInt32LE(0) !== 0x02014b50) {
            throw new Error(`Invalid central directory record signature: ${this.data.readUInt32LE(0)}`);
        }
        this._filename = this.produceFilename();
    }

    versionMadeBy() {
        return this.data.readUInt16LE(4);
    }

    versionNeeded() {
        return this.data.readUInt16LE(6);
    }

    flag() {
        return this.data.readUInt16LE(8);
    }

    compressionMethod() {
        return this.data.readUInt16LE(10);
    }

    lastModFileTime() {
        // Time and date is in MS-DOS format.
        return msdos2date(this.data.readUInt16LE(12), this.data.readUInt16LE(14));
    }

    rawLastModFileTime() {
        return this.data.readUInt32LE(12);
    }

    crc32() {
        return this.data.readUInt32LE(16);
    }

    compressedSize() {
        return this.data.readUInt32LE(20);
    }

    uncompressedSize() {
        return this.data.readUInt32LE(24);
    }

    fileNameLength() {
        return this.data.readUInt16LE(28);
    }

    extraFieldLength() {
        return this.data.readUInt16LE(30);
    }

    fileCommentLength() {
        return this.data.readUInt16LE(32);
    }

    diskNumberStart() {
        return this.data.readUInt16LE(34);
    }

    internalAttributes() {
        return this.data.readUInt16LE(36);
    }

    externalAttributes() {
        return this.data.readUInt32LE(38);
    }

    headerRelativeOffset() {
        return this.data.readUInt32LE(42);
    }

    produceFilename() {
        /**
         * 4.4.17.1 claims:
         * All slashes are forward ('/') slashes.
         * Filename doesn't begin with a slash.
         * No drive letters or any nonsense like that.
         * If filename is missing, the input came from standard input.
         *
         * Unfortunately, this isn't true in practice. Some Windows zip utilities use
         * a backslash here, but the correct Unix-style path in file headers.
         *
         * To avoid seeking all over the file to recover the known-good filenames
         * from file headers, we simply convert '/' to '\' here.
         */
        const fileName = safeToString(this.data, 46, this.fileNameLength());
        return fileName.replace(/\\/g, "/");
    }

    fileName() {
        return this._filename;
    }

    rawFileName() {
        return this.data.slice(46, 46 + this.fileNameLength());
    }

    extraField() {
        const start = 44 + this.fileNameLength();
        return this.data.slice(start, start + this.extraFieldLength());
    }

    fileComment() {
        const start = 46 + this.fileNameLength() + this.extraFieldLength();
        return safeToString(this.data, start, this.fileCommentLength());
    }

    rawFileComment() {
        const start = 46 + this.fileNameLength() + this.extraFieldLength();
        return this.data.slice(start, start + this.fileCommentLength());
    }

    totalSize() {
        return 46 + this.fileNameLength() + this.extraFieldLength() + this.fileCommentLength();
    }

    isDirectory() {
        // NOTE: This assumes that the zip file implementation uses the lower byte
        //       of external attributes for DOS attributes for
        //       backwards-compatibility. This is not mandated, but appears to be
        //       commonplace.
        //       According to the spec, the layout of external attributes is
        //       platform-dependent.
        //       If that fails, we also check if the name of the file ends in '/',
        //       which is what Java's ZipFile implementation does.
        const fileName = this.fileName();
        return (this.externalAttributes() & 0x10 ? true : false) || (fileName.charAt(fileName.length - 1) === "/");
    }

    isFile() {
        return !this.isDirectory();
    }

    isEncrypted() {
        return (this.flag() & 0x1) === 0x1;
    }

    getFileData() {
        // Need to grab the header before we can figure out where the actual
        // compressed data starts.
        const start = this.headerRelativeOffset();
        const header = new FileHeader(this.zipData.slice(start));
        return new FileData(header, this, this.zipData.slice(start + header.totalSize()));
    }

    getData() {
        return this.getFileData().decompress();
    }

    getRawData() {
        return this.getFileData().getRawData();
    }

    getStats() {
        return new Stats(FileType.FILE, this.uncompressedSize(), 0x16D, Date.now(), this.lastModFileTime().getTime());
    }
}

/**
 * 4.3.16: end of central directory record
 *  end of central dir signature    4 bytes  (0x06054b50)
 *  number of this disk             2 bytes
 *  number of the disk with the
 *  start of the central directory  2 bytes
 *  total number of entries in the
 *  central directory on this disk  2 bytes
 *  total number of entries in
 *  the central directory           2 bytes
 *  size of the central directory   4 bytes
 *  offset of start of central
 *  directory with respect to
 *  the starting disk number        4 bytes
 *  .ZIP file comment length        2 bytes
 *  .ZIP file comment       (variable size)
 */
class EndOfCentralDirectory {
    constructor(data) {
        this.data = data;
        if (this.data.readUInt32LE(0) !== 0x06054b50) {
            throw new Error(`Invalid end of central directory record signature: ${this.data.readUInt32LE(0)}`);
        }
    }

    // number of this disk
    diskNumber() {
        return this.data.readUInt16LE(4);
    }

    // number of the disk with the start of the central directory
    cdDiskNumber() {
        return this.data.readUInt16LE(6);
    }

    // total number of entries in the central directory on this disk
    cdDiskEntryCount() {
        return this.data.readUInt16LE(8);
    }

    // total number of entries in the central directory 
    cdTotalEntryCount() {
        return this.data.readUInt16LE(10);
    }

    // size of the central directory
    cdSize() {
        return this.data.readUInt32LE(12);
    }

    // offset of start of central directory with respect to the starting disk number
    cdOffset() {
        return this.data.readUInt32LE(16);
    }

    // .ZIP file comment length
    cdZipCommentLength() {
        return this.data.readUInt16LE(20);
    }

    // .ZIP file comment
    cdZipComment() {
        // Assuming UTF-8. The specification doesn't specify.
        return safeToString(this.data, true, 22, this.cdZipCommentLength());
    }

    rawCdZipComment() {
        return this.data.slice(22, 22 + this.cdZipCommentLength());
    }
}


const getEOCD = (data) => {
    // Unfortunately, the comment is variable size and up to 64K in size.
    // We assume that the magic signature does not appear in the comment, and
    // in the bytes between the comment and the signature. Other ZIP
    // implementations make this same assumption, since the alternative is to
    // read thread every entry in the file to get to it. :(
    // These are *negative* offsets from the end of the file.
    const startOffset = 22;
    const endOffset = data.length - Math.min(startOffset + 0xFFFF, data.length - 1);
    // There's not even a byte alignment guarantee on the comment so we need to
    // search byte by byte. *grumble grumble*
    for (let i = data.length - startOffset; i >= endOffset; i--) {
        // Magic number: EOCD Signature
        if (data.readUInt32LE(i) === 0x06054b50) {
            return new EndOfCentralDirectory(data.slice(i));
        }
    }
    throw new Error("Could not locate End of Central Directory signature");
};


/**
 * ZIP file system.
 * 
 * Current limitations:
 * * No encryption.
 * * No ZIP64 support.
 * * Read-only.
 */
export default class ZipFileSystem extends MemoryFileSystem {
    constructor(options = {}) {
        super(options);

        if (!isBuffer(options.data)) {
            throw new Error("Invalid zip data");
        }

        const zipData = this.data = options.data;
        const eocd = this._eocd = getEOCD(zipData);

        if (eocd.diskNumber() !== 0) {
            throw new Error("Zip file system does not support multi-disk zip files");
        }
        if (eocd.diskNumber() !== eocd.cdDiskNumber()) {
            throw new Error("Zip file system does not support spanned zip files");
        }
        const commentLength = eocd.cdZipCommentLength();
        const expectedCommentLength = eocd.data.length - 22;
        if (commentLength !== expectedCommentLength) {
            throw new Error(`Invalid comment length. expected: ${expectedCommentLength}. found: ${commentLength}`);
        }

        let cdOffset = eocd.cdOffset();
        if (eocd.cdTotalEntryCount() === 0xffff || cdOffset === 0xFFFFFFFF) { // ZIP64
            throw new Error("Zip file system does not support Zip64");
        }

        const cdEndOffset = cdOffset + eocd.cdSize();
        const cdEntries = this._directoryEntries = [];

        while (cdOffset < cdEndOffset) {
            const cd = new CentralDirectory(zipData, zipData.slice(cdOffset));
            let filename = cd.fileName();
            if (filename.charAt(0) === "/") {
                throw new Error("Unexpectedly encountered an absolute path in a zip file");
            }
            if (filename.charAt(filename.length - 1) === "/") {
                filename = filename.substr(0, filename.length - 1);
            }
            const path = `/${filename}`;
            const isDir = cd.isDirectory();
            const navigated = this._navigate(path, isDir);
            let index;

            const commonStat = {
                uid: this._uid,
                gid: this._gid,
                // mtimeMs: cd.lastModFileTime().getTime()
            };

            if (isDir) {
                [, index] = this._iNodeMgr.createINode(
                    MemoryFileSystem.Directory,
                    {
                        ...commonStat,
                        mode: MemoryFileSystem.applyUmask(MemoryFileSystem.DEFAULT_DIRECTORY_PERM, this._umask),
                        parent: navigated.dir.getEntryIndex(".")
                    }
                );
            } else {
                [/*target*/, index] = this._iNodeMgr.createINode(
                    MemoryFileSystem.File,
                    {
                        ...commonStat,
                        mode: MemoryFileSystem.applyUmask(MemoryFileSystem.DEFAULT_FILE_PERM, this._umask),
                        data: () => cd.getData() // lazy
                    }
                );
            }
            navigated.dir.addEntry(navigated.name, index);

            cdOffset += cd.totalSize();
            cdEntries.push(cd);
        }

        this._directoryEntries = cdEntries;
        this._eocd = eocd;
    }
}
