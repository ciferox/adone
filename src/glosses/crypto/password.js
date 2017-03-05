import adone from "adone";
const is = adone.is;
const crypto = adone.std.crypto;

const iterations = 10000;

export default function (password) {
    return {
        hash(salt) {
            if (!is.string(password) || password === "") {
                throw new adone.x.NotValid("'password' must be a non empty string");
            }

            if (is.string(salt)) {
                salt = new Buffer(salt, "hex");
            }

            return new Promise((resolve, reject) => {
                const calcHash = () => {
                    crypto.pbkdf2(password, salt, iterations, 64, "sha1", (err, key) => {
                        if (err) return reject(err);
                        const res = "pbkdf2$" + iterations + "$" + key.toString("hex") + "$" + salt.toString("hex");
                        resolve(res);
                    });
                };

                if (!salt) {
                    crypto.randomBytes(64, (err, gensalt) => {
                        if (err) return reject(err);
                        salt = gensalt;
                        calcHash();
                    });
                } else {
                    calcHash();
                }
            });
        },
        verifyAgainst(hashedPassword) {
            return new Promise((resolve, reject) => {
                if (!is.string(hashedPassword) || hashedPassword === "" || !is.string(password) || password === "") {
                    return resolve(false);
                }

                const key = hashedPassword.split("$");
                if (key.length !== 4 || !key[2] || !key[3]) {
                    throw new adone.x.NotValid("Hash not formatted correctly");
                }
                if (key[0] !== "pbkdf2" || key[1] !== iterations.toString()) {
                    throw new adone.x.NotValid("Wrong algorithm and/or iterations");
                }

                return this.hash(key[3]).catch(reject).then((newHash) => {
                    resolve(newHash === hashedPassword);
                });
            });
        }
    };
}