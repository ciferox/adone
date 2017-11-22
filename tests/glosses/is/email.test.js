import { test } from "./helpers";

describe("is", "email", () => {
    it("should validate email addresses", () => {
        test("email", {
            valid: [
                "foo@bar.com",
                "x@x.au",
                "foo@bar.com.au",
                "foo+bar@bar.com",
                "hans.m端ller@test.com",
                "hans@m端ller.com",
                "test|123@m端ller.com",
                "test+ext@gmail.com",
                "some.name.midd.leNa.me.+extension@GoogleMail.com",
                "gmail...ignores...dots...@gmail.com",
                '"foobar"@example.com',
                '"  foo  m端ller "@example.com',
                '"foo\\@bar"@example.com',
                `${"a".repeat(64)}@${"a".repeat(250)}.com`
            ],
            invalid: [
                "invalidemail@",
                "invalid.com",
                "@invalid.com",
                "foo@bar.com.",
                "somename@ｇｍａｉｌ.com",
                "foo@bar.co.uk.",
                "z@co.c",
                "ｇｍａｉｌｇｍａｉｌｇｍａｉｌｇｍａｉｌｇｍａｉｌ@gmail.com",
                `${"a".repeat(64)}@${"a".repeat(251)}.com`,
                `${"a".repeat(65)}@${"a".repeat(250)}.com`,
                "test1@invalid.co m",
                "test2@invalid.co m",
                "test3@invalid.co m",
                "test4@invalid.co m",
                "test5@invalid.co m",
                "test6@invalid.co m",
                "test7@invalid.co m",
                "test8@invalid.co m",
                "test9@invalid.co m",
                "test10@invalid.co m",
                "test11@invalid.co m",
                "test12@invalid.co　m",
                "test13@invalid.co　m"
            ]
        });
    });

    it("should validate email addresses without UTF8 characters in local part", () => {
        test("email", {
            args: [{ allowUtf8LocalPart: false }],
            valid: [
                "foo@bar.com",
                "x@x.au",
                "foo@bar.com.au",
                "foo+bar@bar.com",
                "hans@m端ller.com",
                "test|123@m端ller.com",
                "test+ext@gmail.com",
                "some.name.midd.leNa.me.+extension@GoogleMail.com",
                '"foobar"@example.com',
                '"foo\\@bar"@example.com',
                '"  foo  bar  "@example.com'
            ],
            invalid: [
                "invalidemail@",
                "invalid.com",
                "@invalid.com",
                "foo@bar.com.",
                "foo@bar.co.uk.",
                "somename@ｇｍａｉｌ.com",
                "hans.m端ller@test.com",
                "z@co.c",
                "tüst@invalid.com"
            ]
        });
    });

    it("should validate email addresses with display names", () => {
        test("email", {
            args: [{ allowDisplayName: true }],
            valid: [
                "foo@bar.com",
                "x@x.au",
                "foo@bar.com.au",
                "foo+bar@bar.com",
                "hans.m端ller@test.com",
                "hans@m端ller.com",
                "test|123@m端ller.com",
                "test+ext@gmail.com",
                "some.name.midd.leNa.me.+extension@GoogleMail.com",
                "Some Name <foo@bar.com>",
                "Some Name <x@x.au>",
                "Some Name <foo@bar.com.au>",
                "Some Name <foo+bar@bar.com>",
                "Some Name <hans.m端ller@test.com>",
                "Some Name <hans@m端ller.com>",
                "Some Name <test|123@m端ller.com>",
                "Some Name <test+ext@gmail.com>",
                "'Foo Bar, Esq'<foo@bar.com>",
                "Some Name <some.name.midd.leNa.me.+extension@GoogleMail.com>",
                "Some Middle Name <some.name.midd.leNa.me.+extension@GoogleMail.com>",
                "Name <some.name.midd.leNa.me.+extension@GoogleMail.com>",
                "Name<some.name.midd.leNa.me.+extension@GoogleMail.com>"
            ],
            invalid: [
                "invalidemail@",
                "invalid.com",
                "@invalid.com",
                "foo@bar.com.",
                "foo@bar.co.uk.",
                "Some Name <invalidemail@>",
                "Some Name <invalid.com>",
                "Some Name <@invalid.com>",
                "Some Name <foo@bar.com.>",
                "Some Name <foo@bar.co.uk.>",
                "Some Name foo@bar.co.uk.>",
                "Some Name <foo@bar.co.uk.",
                "Some Name < foo@bar.co.uk >",
                "Name foo@bar.co.uk"
            ]
        });
    });

    it("should validate email addresses with required display names", () => {
        test("email", {
            args: [{ requireDisplayName: true }],
            valid: [
                "Some Name <foo@bar.com>",
                "Some Name <x@x.au>",
                "Some Name <foo@bar.com.au>",
                "Some Name <foo+bar@bar.com>",
                "Some Name <hans.m端ller@test.com>",
                "Some Name <hans@m端ller.com>",
                "Some Name <test|123@m端ller.com>",
                "Some Name <test+ext@gmail.com>",
                "Some Name <some.name.midd.leNa.me.+extension@GoogleMail.com>",
                "Some Middle Name <some.name.midd.leNa.me.+extension@GoogleMail.com>",
                "Name <some.name.midd.leNa.me.+extension@GoogleMail.com>",
                "Name<some.name.midd.leNa.me.+extension@GoogleMail.com>"
            ],
            invalid: [
                "some.name.midd.leNa.me.+extension@GoogleMail.com",
                "foo@bar.com",
                "x@x.au",
                "foo@bar.com.au",
                "foo+bar@bar.com",
                "hans.m端ller@test.com",
                "hans@m端ller.com",
                "test|123@m端ller.com",
                "test+ext@gmail.com",
                "invalidemail@",
                "invalid.com",
                "@invalid.com",
                "foo@bar.com.",
                "foo@bar.co.uk.",
                "Some Name <invalidemail@>",
                "Some Name <invalid.com>",
                "Some Name <@invalid.com>",
                "Some Name <foo@bar.com.>",
                "Some Name <foo@bar.co.uk.>",
                "Some Name foo@bar.co.uk.>",
                "Some Name <foo@bar.co.uk.",
                "Some Name < foo@bar.co.uk >",
                "Name foo@bar.co.uk"
            ]
        });
    });
});
