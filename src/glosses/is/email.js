const { is } = adone;

const displayName = /^[a-z\d!#\$%&'\*\+\-\/=\?\^_`{\|}~\.\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+[a-z\d!#\$%&'\*\+\-\/=\?\^_`{\|}~\,\.\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF\s]*<(.+)>$/i;
const emailUserPart = /^[a-z\d!#\$%&'\*\+\-\/=\?\^_`{\|}~]+$/i;
const quotedEmailUser = /^([\s\x01-\x08\x0b\x0c\x0e-\x1f\x7f\x21\x23-\x5b\x5d-\x7e]|(\\[\x01-\x09\x0b\x0c\x0d-\x7f]))*$/i;
const emailUserUtf8Part = /^[a-z\d!#\$%&'\*\+\-\/=\?\^_`{\|}~\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+$/i;
const quotedEmailUserUtf8 = /^([\s\x01-\x08\x0b\x0c\x0e-\x1f\x7f\x21\x23-\x5b\x5d-\x7e\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]|(\\[\x01-\x09\x0b\x0c\x0d-\x7f\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))*$/i;

const isByteLength = (str, max) => {
    const len = encodeURI(str).split(/%..|./).length - 1;
    return len <= max;
};

export default function isEmail(str, options) {
    if (!is.string(str)) {
        return false;
    }
    options = {
        allowDisplayName: false,
        requireDisplayName: false,
        allowUtf8LocalPart: true,
        requireTld: true,
        ...options
    };

    if (options.requireDisplayName || options.allowDisplayName) {
        const displayEmail = str.match(displayName);
        if (displayEmail) {
            str = displayEmail[1];
        } else if (options.requireDisplayName) {
            return false;
        }
    }

    const parts = str.split("@");
    const domain = parts.pop();
    let user = parts.join("@");

    const lowerDomain = domain.toLowerCase();
    if (lowerDomain === "gmail.com" || lowerDomain === "googlemail.com") {
        user = user.replace(/\./g, "").toLowerCase();
    }

    if (!isByteLength(user, 64) || !isByteLength(domain, 254)) {
        return false;
    }

    if (!is.fqdn(domain, { requireTld: options.requireTld })) {
        return false;
    }

    if (user[0] === '"') {
        user = user.slice(1, user.length - 1);
        return options.allowUtf8LocalPart
            ? quotedEmailUserUtf8.test(user)
            : quotedEmailUser.test(user);
    }

    const pattern = options.allowUtf8LocalPart
        ? emailUserUtf8Part
        : emailUserPart;

    const userParts = user.split(".");
    for (let i = 0; i < userParts.length; i++) {
        if (!pattern.test(userParts[i])) {
            return false;
        }
    }

    return true;
}
