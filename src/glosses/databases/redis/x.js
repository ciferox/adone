const {
    x: { Exception }
} = adone;

export class ReplyError extends Exception {}
ReplyError.prototype.name = "ReplyError";
