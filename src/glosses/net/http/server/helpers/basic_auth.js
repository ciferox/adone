const {
    is,
    exception,
    data
} = adone;

const CREDENTIALS_REGEXP = /^ *(?:[Bb][Aa][Ss][Ii][Cc]) +([A-Za-z0-9._~+/-]+=*) *$/;
const USER_PASS_REGEXP = /^([^:]*):(.*)$/;


class Credentials {
    constructor(name, pass) {
        this.name = name;
        this.pass = pass;
    }
}

export const parse = (string) => {
    if (!is.string(string)) {
        return null;
    }

    const match = CREDENTIALS_REGEXP.exec(string);

    if (!match) {
        return null;
    }

    const userPass = USER_PASS_REGEXP.exec(data.base64.decode(match[1]));

    if (!userPass) {
        return null;
    }

    return new Credentials(userPass[1], userPass[2]);
};

const getAuthorization = (req) => {
    if (!req.headers || !is.object(req.headers)) {
        throw new exception.InvalidArgument("required to have headers property");
    }

    return req.headers.authorization;
};

export const from = (req) => {
    if (!req) {
        throw new exception.InvalidArgument("req is required");
    }
    if (!is.object(req)) {
        throw new exception.InvalidArgument("req must be an object");
    }

    const header = getAuthorization(req.req || req);
    return parse(header);
};
