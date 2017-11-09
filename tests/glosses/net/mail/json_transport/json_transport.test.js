describe("net", "mail", "JSON Transport Tests", () => {
    const { net: { mail }, std: { path, fs }, stream } = adone;

    const NODE_TLS_REJECT_UNAUTHORIZED = process.env.NODE_TLS_REJECT_UNAUTHORIZED;

    before(() => {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    });


    after(() => {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = NODE_TLS_REJECT_UNAUTHORIZED;
    });

    it("should return an JSON string", (done) => {

        const transport = mail.createTransport({
            jsonTransport: true
        });

        const messageObject = {
            from: "Andris Reinman <andris.reinman@gmail.com>",
            to: "Andris Kreata <andris@kreata.ee>, andris@nodemailer.com",
            cc: "info@nodemailer.com",
            subject: "Awesome!",
            messageId: "<fede478a-aab9-af02-789c-ad93a76a3548@gmail.com>",
            html: fs.createReadStream(path.resolve(__dirname, "fixtures", "body.html")).pipe(stream.replace("\r\n", "\n")),
            text: "hello world",
            attachments: [{
                filename: "img.png",
                path: path.resolve(__dirname, "fixtures", "image.png")
            }, {
                path: path.resolve(__dirname, "fixtures", "image.png")
            }]
        };

        transport.sendMail(messageObject, (err, info) => {
            expect(err).to.not.exist;
            expect(info).to.exist;
            expect(JSON.parse(info.message)).to.deep.equal({
                from: {
                    address: "andris.reinman@gmail.com",
                    name: "Andris Reinman"
                },
                to: [
                    //
                    {
                        address: "andris@kreata.ee",
                        name: "Andris Kreata"
                    },
                    {
                        address: "andris@nodemailer.com",
                        name: ""
                    }
                ],
                cc: [{
                    address: "info@nodemailer.com",
                    name: ""
                }],
                subject: "Awesome!",
                html: "<h1>Message</h1>\n\n<p>\n    Body\n</p>\n",
                text: "hello world",
                attachments: [{
                    content: "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAQMAAAAlPW0iAAAABlBMVEUAAAD///+l2Z/dAAAAM0lEQVR4nGP4/5/h/1+G/58ZDrAz3D/McH8yw83NDDeNGe4Ug9C9zwz3gVLMDA/A6P9/AFGGFyjOXZtQAAAAAElFTkSuQmCC",
                    filename: "img.png",
                    contentType: "image/png",
                    encoding: "base64"
                }, {
                    content: "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAQMAAAAlPW0iAAAABlBMVEUAAAD///+l2Z/dAAAAM0lEQVR4nGP4/5/h/1+G/58ZDrAz3D/McH8yw83NDDeNGe4Ug9C9zwz3gVLMDA/A6P9/AFGGFyjOXZtQAAAAAElFTkSuQmCC",
                    filename: "image.png",
                    contentType: "image/png",
                    encoding: "base64"
                }],
                headers: {},
                messageId: "<fede478a-aab9-af02-789c-ad93a76a3548@gmail.com>"
            });
            done();
        });

    });

    it("should return an JSON string for calendar event", (done) => {

        const transport = mail.createTransport({
            jsonTransport: true
        });

        const messageObject = {
            from: "Andris Reinman <andris.reinman@gmail.com>",
            to: "Andris Kreata <andris@kreata.ee>, andris@nodemailer.com",
            cc: "info@nodemailer.com",
            subject: "Awesome!",
            messageId: "<fede478a-aab9-af02-789c-ad93a76a3548@gmail.com>",
            html: "<p>hello world!</p>",
            text: "hello world",
            icalEvent: {
                method: "request",
                content: fs.createReadStream(path.resolve(__dirname, "fixtures", "event.ics")).pipe(stream.replace("\r\n", "\n"))
            }
        };

        transport.sendMail(messageObject, (err, info) => {
            expect(err).to.not.exist;
            expect(info).to.exist;
            expect(JSON.parse(info.message)).to.deep.equal({
                from: {
                    address: "andris.reinman@gmail.com",
                    name: "Andris Reinman"
                },
                to: [
                    //
                    {
                        address: "andris@kreata.ee",
                        name: "Andris Kreata"
                    },
                    {
                        address: "andris@nodemailer.com",
                        name: ""
                    }
                ],
                cc: [{
                    address: "info@nodemailer.com",
                    name: ""
                }],
                subject: "Awesome!",
                text: "hello world",

                html: "<p>hello world!</p>",
                icalEvent: {
                    content: "QkVHSU46VkNBTEVOREFSClZFUlNJT046Mi4wClBST0RJRDotLy9oYWNrc3cvaGFuZGNhbC8vTk9OU0dNTCB2MS4wLy9FTgpCRUdJTjpWRVZFTlQKVUlEOnVpZDFAZXhhbXBsZS5jb20KRFRTVEFNUDoxOTk3MDcxNFQxNzAwMDBaCk9SR0FOSVpFUjtDTj1Kb2huIERvZTpNQUlMVE86am9obi5kb2VAZXhhbXBsZS5jb20KRFRTVEFSVDoxOTk3MDcxNFQxNzAwMDBaCkRURU5EOjE5OTcwNzE1VDAzNTk1OVoKU1VNTUFSWTpCYXN0aWxsZSBEYXkgUGFydHkKRU5EOlZFVkVOVApFTkQ6VkNBTEVOREFSCg==",
                    encoding: "base64",
                    method: "request"
                },

                headers: {},
                messageId: "<fede478a-aab9-af02-789c-ad93a76a3548@gmail.com>"
            });
            done();
        });

    });

});
