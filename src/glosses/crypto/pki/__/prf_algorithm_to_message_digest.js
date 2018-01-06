const forge = require("node-forge");

export default function prfAlgorithmToMessageDigest(prfAlgorithm) {
    let factory = forge.md;
    switch (prfAlgorithm) {
        case "hmacWithSHA224":
            factory = forge.md.sha512;
        case "hmacWithSHA1":
        case "hmacWithSHA256":
        case "hmacWithSHA384":
        case "hmacWithSHA512":
            prfAlgorithm = prfAlgorithm.substr(8).toLowerCase();
            break;
        default: {
            const error = new Error("Unsupported PRF algorithm.");
            error.algorithm = prfAlgorithm;
            error.supported = ["hmacWithSHA1", "hmacWithSHA224", "hmacWithSHA256", "hmacWithSHA384", "hmacWithSHA512"];
            throw error;
        }
    }
    if (!factory || !(prfAlgorithm in factory)) {
        throw new Error(`Unknown hash algorithm: ${prfAlgorithm}`);
    }
    return factory[prfAlgorithm].create();
}
