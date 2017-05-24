const { std: { http, crypto, querystring } } = adone;

class OAuthServer {
    constructor(options) {
        this.options = options || {};
        this.users = {};
        this.tokens = {};

        this.options.port = Number(this.options.port) || 3080;
        this.options.expiresIn = Number(this.options.expiresIn) || 3600;
    }

    addUser(username, refreshToken) {
        const user = {
            username,
            refreshToken: refreshToken || crypto.randomBytes(10).toString("base64")
        };

        this.users[username] = user;
        this.tokens[user.refreshToken] = username;

        return this.generateAccessToken(user.refreshToken);
    }

    generateAccessToken(refreshToken) {
        const username = this.tokens[refreshToken];
        const accessToken = crypto.randomBytes(10).toString("base64");

        if (!username) {
            return {
                error: "Invalid refresh token"
            };
        }

        this.users[username].accessToken = accessToken;
        this.users[username].expiresIn = Date.now + this.options.expiresIn * 1000;

        if (this.options.onUpdate) {
            this.options.onUpdate(username, accessToken);
        }

        return {
            access_token: accessToken,
            expires_in: this.options.expiresIn,
            token_type: "Bearer"
        };
    }

    validateAccessToken(username, accessToken) {
        if (!this.users[username] ||
            this.users[username].accessToken !== accessToken ||
            this.users[username].expiresIn < Date.now()) {

            return false;
        }
        return true;

    }

    start(callback) {
        this.server = http.createServer((req, res) => {
            let data = [],
                datalen = 0;
            req.on("data", (chunk) => {
                if (!chunk || !chunk.length) {
                    return;
                }

                data.push(chunk);
                datalen += chunk.length;
            });
            req.on("end", () => {
                const query = querystring.parse(Buffer.concat(data, datalen).toString());
                const response = this.generateAccessToken(query.refresh_token);

                res.writeHead(!response.error ? 200 : 401, {
                    "Content-Type": "application/json"
                });

                res.end(JSON.stringify(response));
            });
        });

        this.server.listen(this.options.port, callback);
    }

    stop(callback) {
        this.server.close(callback);
    }
}

export default (options) => new OAuthServer(options);
