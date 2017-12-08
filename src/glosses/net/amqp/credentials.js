// Different kind of credentials that can be supplied when opening a
// connection, corresponding to SASL mechanisms There's only two
// useful mechanisms that RabbitMQ implements:
//  * PLAIN (send username and password in the plain)
//  * EXTERNAL (assume the server will figure out who you are from
//    context, i.e., your SSL certificate)
export const plain = (user, passwd) => {
    return {
        mechanism: "PLAIN",
        response() {
            return Buffer.from(["", user, passwd].join(String.fromCharCode(0)));
        },
        username: user,
        password: passwd
    };
};

export const external = () => {
    return {
        mechanism: "EXTERNAL",
        response() {
            return Buffer.from("");
        }
    };
};
