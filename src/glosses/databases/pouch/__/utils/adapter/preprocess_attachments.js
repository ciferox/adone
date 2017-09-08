const {
    database: { pouch }
} = adone;

const {
    x: {
        createError,
        BAD_ARG
    }
} = pouch;

const {
    util: {
        binary: {
            atob,
            btoa,
            binaryStringToBuffer,
            bufferToBinaryString,
            bufferToBase64
        },
        md5: { binary: binaryMd5 }
    }
} = adone.private(pouch);

const parseBase64 = (data) => {
    try {
        return atob(data);
    } catch (e) {
        const err = createError(BAD_ARG,
            "Attachment is not a valid base64 string");
        return { error: err };
    }
};

const preprocessString = (att, blobType, callback) => {
    const asBinary = parseBase64(att.data);
    if (asBinary.error) {
        return callback(asBinary.error);
    }

    att.length = asBinary.length;
    if (blobType === "blob") {
        att.data = binaryStringToBuffer(asBinary, att.content_type);
    } else if (blobType === "base64") {
        att.data = btoa(asBinary);
    } else { // binary
        att.data = asBinary;
    }
    binaryMd5(asBinary, (result) => {
        att.digest = `md5-${result}`;
        callback();
    });
};

const preprocessBlob = (att, blobType, callback) => {
    binaryMd5(att.data, (md5) => {
        att.digest = `md5-${md5}`;
        // size is for blobs (browser), length is for buffers (node)
        att.length = att.data.size || att.data.length || 0;
        if (blobType === "binary") {
            bufferToBinaryString(att.data, (binString) => {
                att.data = binString;
                callback();
            });
        } else if (blobType === "base64") {
            bufferToBase64(att.data, (b64) => {
                att.data = b64;
                callback();
            });
        } else {
            callback();
        }
    });
};

const preprocessAttachment = (att, blobType, callback) => {
    if (att.stub) {
        return callback();
    }
    if (is.string(att.data)) { // input is a base64 string
        preprocessString(att, blobType, callback);
    } else { // input is a blob
        preprocessBlob(att, blobType, callback);
    }
};

const preprocessAttachments = (docInfos, blobType, callback) => {

    if (!docInfos.length) {
        return callback();
    }

    let docv = 0;
    let overallErr;

    docInfos.forEach((docInfo) => {
        const attachments = docInfo.data && docInfo.data._attachments ?
            Object.keys(docInfo.data._attachments) : [];
        let recv = 0;


        const done = () => {
            docv++;
            if (docInfos.length === docv) {
                if (overallErr) {
                    callback(overallErr);
                } else {
                    callback();
                }
            }
        };

        if (!attachments.length) {
            return done();
        }

        const processedAttachment = (err) => {
            overallErr = err;
            recv++;
            if (recv === attachments.length) {
                done();
            }
        };

        for (const key in docInfo.data._attachments) {
            if (docInfo.data._attachments.hasOwnProperty(key)) {
                preprocessAttachment(docInfo.data._attachments[key],
                    blobType, processedAttachment);
            }
        }
    });
};

export default preprocessAttachments;
