import rawCodes from "./codes";
import adone from "adone";
const { is, x, util } = adone;

export const codes = new Map(util.entries(rawCodes).map(([code, message]) => {
    return [Number(code), message];
}));
export const messages = new Map(util.entries(rawCodes).map(([code, message]) => {
    return [message.toLowerCase(), Number(code)];
}));

export const getMessageByCode = (code) => {
    if (!codes.has(code)) {
        throw new x.InvalidArgument(`invalid status code: ${code}`);
    }
    return codes.get(code);
};

export const getCodeByMessage = (message) => {
    message = message.toLowerCase();
    if (!messages.has(message)) {
        throw new x.InvalidArgument(`invalid status message: ${message}`);
    }
    return messages.get(message);
};

export const isEmptyBody = (code) => code === 204 || code === 205 || code === 304;

export const isRedirect = (code) => is.number(code) && code >= 300 && code <= 308 && code !== 306 && code !== 304;

export const isRetry = (code) => code === 502 || code === 503 || code === 504;

