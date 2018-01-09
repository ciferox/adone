// todo: support more functions...

export default function hashMeta(md) {
    switch (md.toLowerCase()) {
        case "md5": {
            return {
                digestLength: 16,
                blockLength: 64
            };
        }
        case "sha1": {
            return {
                digestLength: 20,
                blockLength: 64
            };
        }
        case "sha256": {
            return {
                digestLength: 32,
                blockLength: 64
            };
        }
        case "sha512": {
            return {
                digestLength: 64,
                blockLength: 128
            };
        }
        case "sha224":
        case "sha512/224": {
            return {
                digestLength: 28,
                blockLength: 128
            };
        }
        case "sha512/256": {
            return {
                digestLength: 32,
                blockLength: 128
            };
        }
        case "sha384":
        case "sha512/384": {
            return {
                digestLength: 48,
                blockLength: 128
            };
        }
        default: {
            return null;
        }
    }
}
