const { is, x, math, std: { crypto } } = adone;

const iterations = 10000;

export const hash = (password, salt) => {
    if (!is.string(password) || password === "") {
        throw new x.NotValid("'password' must be a non empty string");
    }

    if (is.string(salt)) {
        salt = Buffer.from(salt, "hex");
    }

    return new Promise((resolve, reject) => {
        const calcHash = () => {
            crypto.pbkdf2(password, salt, iterations, 64, "sha1", (err, key) => {
                if (err) {
                    return reject(err);
                }
                const res = `pbkdf2$${iterations}$${key.toString("hex")}$${salt.toString("hex")}`;
                resolve(res);
            });
        };

        if (!salt) {
            crypto.randomBytes(64, (err, gensalt) => {
                if (err) {
                    return reject(err);
                }
                salt = gensalt;
                calcHash();
            });
        } else {
            calcHash();
        }
    });
};

export const verify = (password, hashedPassword) => {
    return new Promise((resolve, reject) => {
        if (!is.string(hashedPassword) || hashedPassword === "" || !is.string(password) || password === "") {
            return resolve(false);
        }

        const key = hashedPassword.split("$");
        if (key.length !== 4 || !key[2] || !key[3]) {
            throw new x.NotValid("Hash not formatted correctly");
        }
        if (key[0] !== "pbkdf2" || key[1] !== iterations.toString()) {
            throw new x.NotValid("Wrong algorithm and/or iterations");
        }

        return hash(password, key[3]).catch(reject).then((newHash) => {
            resolve(newHash === hashedPassword);
        });
    });
};

const vowel = /[aeiou]$/i;
const consonant = /[bcdfghjklmnpqrstvwxyz]$/i;

export const generate = (length = 10, memorable = true, pattern = /\w/, prefix = "") => {
    let char = "";
    let i;
    const validChars = [];

    if (!memorable) {
        for (i = 33; i < 126; i++) {
            char = String.fromCharCode(i);
            if (char.match(pattern)) {
                validChars.push(char);
            }
        }

        if (!validChars.length) {
            throw new x.NotValid(`Could not find characters that match the pattern: ${pattern.toString()}`);
        }
    }

    while (prefix.length < length) {
        if (memorable) {
            if (prefix.match(consonant)) {
                pattern = vowel;
            } else {
                pattern = consonant;
            }
            char = String.fromCharCode(math.random(33, 126));
        } else {
            char = validChars[math.random(0, validChars.length)];
        }

        if (memorable) {
            char = char.toLowerCase();
        }
        if (char.match(pattern)) {
            prefix = String(prefix) + char;
        }
    }
    return prefix;
};
