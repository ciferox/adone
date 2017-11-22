import SignStream from "./sign_stream";
import VerifyStream from "./verify_stream";

export const ALGORITHMS = [
    "HS256", "HS384", "HS512",
    "RS256", "RS384", "RS512",
    "ES256", "ES384", "ES512"
];

export const sign = SignStream.sign;
export const verify = VerifyStream.verify;
export const decode = VerifyStream.decode;
export const isValid = VerifyStream.isValid;
export const createSign = (opts) => new SignStream(opts);
export const createVerify = (opts) => new VerifyStream(opts);
