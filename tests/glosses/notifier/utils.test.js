describe("notifier", "utils", () => {
    const { std: { fs, path }, notifier: { __: { util } } } = adone;

    describe("mapping", () => {
        it("should map icon for notify-send", () => {
            const expected = { title: "Foo", message: "Bar", icon: "foobar" };

            expect(
                util.mapToNotifySend({ title: "Foo", message: "Bar", appIcon: "foobar" })
            ).to.be.deep.equal(expected);

            expect(
                util.mapToNotifySend({ title: "Foo", message: "Bar", i: "foobar" })
            ).to.be.deep.equal(expected);
        });

        it("should map short hand for notify-sned", () => {
            const expected = {
                urgency: "a",
                "expire-time": "b",
                category: "c",
                icon: "d",
                hint: "e"
            };

            expect(
                util.mapToNotifySend({ u: "a", e: "b", c: "c", i: "d", h: "e" })
            ).to.be.deep.equal(expected);
        });

        it("should map icon for notification center", () => {
            const expected = {
                title: "Foo",
                message: "Bar",
                appIcon: "foobar",
                timeout: 10,
                json: true
            };

            expect(
                util.mapToMac({ title: "Foo", message: "Bar", icon: "foobar" })
            ).to.be.deep.equal(expected);

            expect(
                util.mapToMac({ title: "Foo", message: "Bar", i: "foobar" })
            ).to.be.deep.equal(expected);
        });

        it("should map icon for growl", () => {
            const icon = path.resolve(__dirname, "fixtures", "coulson.jpg");
            const iconRead = fs.readFileSync(icon);

            const expected = { title: "Foo", message: "Bar", icon: iconRead };

            let obj = util.mapToGrowl({ title: "Foo", message: "Bar", icon });
            expect(obj).to.be.deep.equal(expected);

            expect(obj.icon).to.be.ok();
            expect(obj.icon).to.be.instanceOf(Buffer);

            obj = util.mapToGrowl({ title: "Foo", message: "Bar", appIcon: icon });

            expect(obj.icon).to.be.instanceOf(Buffer);
        });

        it("should not map icon url for growl", () => {
            const icon = "http://hostname.com/logo.png";

            const expected = { title: "Foo", message: "Bar", icon };

            expect(
                util.mapToGrowl({ title: "Foo", message: "Bar", icon })
            ).to.be.deep.equal(expected);

            expect(
                util.mapToGrowl({ title: "Foo", message: "Bar", appIcon: icon })
            ).to.be.deep.equal(expected);
        });
    });
});
