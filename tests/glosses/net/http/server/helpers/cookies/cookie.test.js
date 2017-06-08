describe("net", "http", "helpers", "cookies", "new Cookie(name, value, [options])", () => {
    const { net: { http: { server: { helper: { Cookies: { Cookie } } } } } } = adone;

    it("should have correct constructor", () => {
        const cookie = new Cookie("foo", "bar");
        assert.equal(cookie.constructor, Cookie);
    });

    it("should throw on invalid name", () => {
        assert.throws(() => {
            new Cookie("foo\n", "bar");
        }, /argument name is invalid/);
    });

    it("should throw on invalid value", () => {
        assert.throws(() => {
            new Cookie("foo", "bar\n");
        }, /argument value is invalid/);
    });

    it("should throw on invalid path", () => {
        assert.throws(() => {
            new Cookie("foo", "bar", { path: "/\n" });
        }, /option path is invalid/);
    });

    it("should throw on invalid domain", () => {
        assert.throws(() => {
            new Cookie("foo", "bar", { domain: "example.com\n" });
        }, /option domain is invalid/);
    });

    describe("options", () => {
        describe("maxAge", () => {
            it("should set the .maxAge property", () => {
                const cookie = new Cookie("foo", "bar", { maxAge: 86400 });
                assert.equal(cookie.maxAge, 86400);
            });
        });

        describe("sameSite", () => {
            it("should set the .sameSite property", () => {
                const cookie = new Cookie("foo", "bar", { sameSite: true });
                assert.equal(cookie.sameSite, true);
            });

            it("should default to false", () => {
                const cookie = new Cookie("foo", "bar");
                assert.equal(cookie.sameSite, false);
            });

            it("should throw on invalid value", () => {
                assert.throws(() => {
                    new Cookie("foo", "bar", { sameSite: "foo" });
                }, /option sameSite is invalid/);
            });

            describe('when set to "false"', () => {
                it('should not set "samesite" attribute in header', () => {
                    const cookie = new Cookie("foo", "bar", { sameSite: false });
                    assert.equal(cookie.toHeader(), "foo=bar; path=/; httponly");
                });
            });

            describe('when set to "true"', () => {
                it('should set "samesite=strict" attribute in header', () => {
                    const cookie = new Cookie("foo", "bar", { sameSite: true });
                    assert.equal(cookie.toHeader(), "foo=bar; path=/; samesite=strict; httponly");
                });
            });

            describe('when set to "lax"', () => {
                it('should set "samesite=lax" attribute in header', () => {
                    const cookie = new Cookie("foo", "bar", { sameSite: "lax" });
                    assert.equal(cookie.toHeader(), "foo=bar; path=/; samesite=lax; httponly");
                });
            });

            describe('when set to "strict"', () => {
                it('should set "samesite=strict" attribute in header', () => {
                    const cookie = new Cookie("foo", "bar", { sameSite: "strict" });
                    assert.equal(cookie.toHeader(), "foo=bar; path=/; samesite=strict; httponly");
                });
            });

            describe('when set to "STRICT"', () => {
                it('should set "samesite=strict" attribute in header', () => {
                    const cookie = new Cookie("foo", "bar", { sameSite: "STRICT" });
                    assert.equal(cookie.toHeader(), "foo=bar; path=/; samesite=strict; httponly");
                });
            });
        });
    });
});
