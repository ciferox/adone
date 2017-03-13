const { x: { Exception } } = adone;

export default class ReplyError extends Exception {}
ReplyError.prototype.name = "ReplyError";
