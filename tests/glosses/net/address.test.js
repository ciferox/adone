const { is } = adone;
const IP4 = adone.net.address.IP4;
const IP6 = adone.net.address.IP6;
const v6helpers = adone.net.address.v6helpers;


const valid4 = [
    {
        address: "001.002.003.004",
        conditions: ["incorrect-ipv4"]
    },
    {
        address: "127.0.0.1",
        conditions: ["correct-ipv4"]
    },
    {
        address: "127.0.0.1/02",
        conditions: ["incorrect-ipv4"]
    },
    {
        address: "127.0.0.1/32",
        conditions: ["correct-ipv4"]
    },
    {
        address: "255.255.255.255/32",
        conditions: ["correct-ipv4"]
    }
];

const valid6 = [
    {
        address: "0000:0000:0000:0000:0000:0000:0000:0000/128",
        conditions: ["incorrect", "canonical", "has-subnet"]
    },
    {
        address: "0000:0000:0000:0000:0000:0000:0000:0000",
        conditions: ["incorrect", "canonical"]
    },
    {
        address: "0000:0000:0000:0000:0000:0000:0000:0001",
        conditions: ["incorrect", "canonical"]
    },
    {
        address: "0:0:0:0:0:0:0:0",
        conditions: ["incorrect"]
    },
    {
        address: "0:0:0:0:0:0:0:1",
        conditions: ["incorrect"]
    },
    {
        address: "0:0:0:0:0:0:0::",
        conditions: ["incorrect"]
    },
    {
        address: "0:0:0:0:0:0:13.1.68.3",
        conditions: ["incorrect", "v4-in-v6"]
    },
    {
        address: "0:0:0:0:0:0::",
        conditions: ["incorrect"]
    },
    {
        address: "0:0:0:0:0::",
        conditions: ["incorrect"]
    },
    {
        address: "0:0:0:0:0:FFFF:129.144.52.38",
        conditions: ["incorrect", "v4-in-v6"]
    },
    {
        address: "0:0:0:0:1:0:0:0",
        conditions: ["incorrect"]
    },
    {
        address: "0:0:0:0::",
        conditions: ["incorrect"]
    },
    {
        address: "0:0:0::",
        conditions: ["incorrect"]
    },
    {
        address: "0:0::",
        conditions: ["incorrect"]
    },
    {
        address: "0:1:2:3:4:5:6:7/001",
        conditions: ["incorrect", "has-subnet"]
    },
    {
        address: "0:1:2:3:4:5:6:7/128",
        conditions: ["correct", "has-subnet"]
    },
    {
        address: "0:1:2:3:4:5:6:7",
        conditions: ["correct"]
    },
    {
        address: "0::",
        conditions: ["incorrect"]
    },
    {
        address: "0:a:b:c:d:e:f::",
        conditions: ["incorrect"]
    },
    {
        address: "1080:0:0:0:8:800:200c:417a",
        conditions: ["incorrect"]
    },
    {
        address: "1080::8:800:200c:417a",
        conditions: ["correct"]
    },
    {
        address: "1111:2222:3333:4444:5555:6666:123.123.123.123",
        conditions: ["v4-in-v6"]
    },
    {
        address: "1111:2222:3333:4444:5555:6666:7777:8888",
        conditions: ["correct"]
    },
    {
        address: "1111:2222:3333:4444:5555:6666:7777::",
        conditions: ["incorrect"]
    },
    {
        address: "1111:2222:3333:4444:5555:6666::",
        conditions: ["correct"]
    },
    {
        address: "1111:2222:3333:4444:5555:6666::8888",
        conditions: ["incorrect"]
    },
    {
        address: "1111:2222:3333:4444:5555::",
        conditions: ["correct"]
    },
    {
        address: "1111:2222:3333:4444:5555::123.123.123.123",
        conditions: ["v4-in-v6"]
    },
    {
        address: "1111:2222:3333:4444:5555::7777:8888",
        conditions: ["incorrect"]
    },
    {
        address: "1111:2222:3333:4444:5555::8888",
        conditions: ["correct"]
    },
    {
        address: "1111:2222:3333:4444::",
        conditions: ["correct"]
    },
    {
        address: "1111:2222:3333:4444::123.123.123.123",
        conditions: ["v4-in-v6"]
    },
    {
        address: "1111:2222:3333:4444::6666:123.123.123.123",
        conditions: ["v4-in-v6"]
    },
    {
        address: "1111:2222:3333:4444::6666:7777:8888",
        conditions: ["incorrect"]
    },
    {
        address: "1111:2222:3333:4444::7777:8888",
        conditions: ["correct"]
    },
    {
        address: "1111:2222:3333:4444::8888",
        conditions: ["correct"]
    },
    {
        address: "1111:2222:3333::",
        conditions: ["correct"]
    },
    {
        address: "1111:2222:3333::123.123.123.123",
        conditions: ["v4-in-v6"]
    },
    {
        address: "1111:2222:3333::5555:6666:123.123.123.123",
        conditions: ["v4-in-v6"]
    },
    {
        address: "1111:2222:3333::5555:6666:7777:8888",
        conditions: ["incorrect"]
    },
    {
        address: "1111:2222:3333::6666:123.123.123.123",
        conditions: ["v4-in-v6"]
    },
    {
        address: "1111:2222:3333::6666:7777:8888",
        conditions: ["correct"]
    },
    {
        address: "1111:2222:3333::7777:8888",
        conditions: ["correct"]
    },
    {
        address: "1111:2222:3333::8888",
        conditions: ["correct"]
    },
    {
        address: "1111:2222::",
        conditions: ["correct"]
    },
    {
        address: "1111:2222::123.123.123.123",
        conditions: ["v4-in-v6"]
    },
    {
        address: "1111:2222::4444:5555:6666:123.123.123.123",
        conditions: ["v4-in-v6"]
    },
    {
        address: "1111:2222::4444:5555:6666:7777:8888",
        conditions: ["incorrect"]
    },
    {
        address: "1111:2222::5555:6666:123.123.123.123",
        conditions: ["v4-in-v6"]
    },
    {
        address: "1111:2222::5555:6666:7777:8888",
        conditions: ["correct"]
    },
    {
        address: "1111:2222::6666:123.123.123.123",
        conditions: ["v4-in-v6"]
    },
    {
        address: "1111:2222::6666:7777:8888",
        conditions: ["correct"]
    },
    {
        address: "1111:2222::7777:8888",
        conditions: ["correct"]
    },
    {
        address: "1111:2222::8888",
        conditions: ["correct"]
    },
    {
        address: "1111::",
        conditions: ["correct"]
    },
    {
        address: "1111::123.123.123.123",
        conditions: ["v4-in-v6"]
    },
    {
        address: "1111::3333:4444:5555:6666:123.123.123.123",
        conditions: ["v4-in-v6"]
    },
    {
        address: "1111::3333:4444:5555:6666:7777:8888",
        conditions: ["incorrect"]
    },
    {
        address: "1111::4444:5555:6666:123.123.123.123",
        conditions: ["v4-in-v6"]
    },
    {
        address: "1111::4444:5555:6666:7777:8888",
        conditions: ["correct"]
    },
    {
        address: "1111::5555:6666:123.123.123.123",
        conditions: ["v4-in-v6"]
    },
    {
        address: "1111::5555:6666:7777:8888",
        conditions: ["correct"]
    },
    {
        address: "1111::6666:123.123.123.123",
        conditions: ["v4-in-v6"]
    },
    {
        address: "1111::6666:7777:8888",
        conditions: ["correct"]
    },
    {
        address: "1111::7777:8888",
        conditions: ["correct"]
    },
    {
        address: "1111::8888",
        conditions: ["correct"]
    },
    {
        address: "1:2:3:4:5:6:1.2.3.4",
        conditions: ["v4-in-v6"]
    },
    {
        address: "1:2:3:4:5:6:7:8",
        conditions: ["correct"]
    },
    {
        address: "1:2:3:4:5:6::",
        conditions: ["correct"]
    },
    {
        address: "1:2:3:4:5:6::8",
        conditions: ["incorrect"]
    },
    {
        address: "1:2:3:4:5::",
        conditions: ["correct"]
    },
    {
        address: "1:2:3:4:5::1.2.3.4",
        conditions: ["v4-in-v6"]
    },
    {
        address: "1:2:3:4:5::7:8",
        conditions: ["incorrect"]
    },
    {
        address: "1:2:3:4:5::8",
        conditions: ["correct"]
    },
    {
        address: "1:2:3:4::",
        conditions: ["correct"]
    },
    {
        address: "1:2:3:4::1.2.3.4",
        conditions: ["v4-in-v6"]
    },
    {
        address: "1:2:3:4::5:1.2.3.4",
        conditions: ["v4-in-v6"]
    },
    {
        address: "1:2:3:4::7:8",
        conditions: ["correct"]
    },
    {
        address: "1:2:3:4::8",
        conditions: ["correct"]
    },
    {
        address: "1:2:3::",
        conditions: ["correct"]
    },
    {
        address: "1:2:3::1.2.3.4",
        conditions: ["v4-in-v6"]
    },
    {
        address: "1:2:3::5:1.2.3.4",
        conditions: ["v4-in-v6"]
    },
    {
        address: "1:2:3::7:8",
        conditions: ["correct"]
    },
    {
        address: "1:2:3::8",
        conditions: ["correct"]
    },
    {
        address: "1:2::",
        conditions: ["correct"]
    },
    {
        address: "1:2::1.2.3.4",
        conditions: ["v4-in-v6"]
    },
    {
        address: "1:2::5:1.2.3.4",
        conditions: ["v4-in-v6"]
    },
    {
        address: "1:2::7:8",
        conditions: ["correct"]
    },
    {
        address: "1:2::8",
        conditions: ["correct"]
    },
    {
        address: "1::",
        conditions: ["correct"]
    },
    {
        address: "1::1.2.3.4",
        conditions: ["v4-in-v6"]
    },
    {
        address: "1::2:3",
        conditions: ["correct"]
    },
    {
        address: "1::2:3:4",
        conditions: ["correct"]
    },
    {
        address: "1::2:3:4:5",
        conditions: ["correct"]
    },
    {
        address: "1::2:3:4:5:6",
        conditions: ["correct"]
    },
    {
        address: "1::2:3:4:5:6:7",
        conditions: ["incorrect"]
    },
    {
        address: "1::5:1.2.3.4",
        conditions: ["v4-in-v6"]
    },
    {
        address: "1::5:11.22.33.44",
        conditions: ["v4-in-v6"]
    },
    {
        address: "1::7:8",
        conditions: ["correct"]
    },
    {
        address: "1::8",
        conditions: ["correct"]
    },
    {
        address: "2001:0000:1234:0000:0000:C1C0:ABCD:0876",
        conditions: ["incorrect"]
    },
    {
        address: "2001:0000:4136:e378:8000:63bf:3fff:fdd2",
        conditions: ["canonical"]
    },
    {
        address: "2001:0DB8:0000:CD30:0000:0000:0000:0000/60",
        conditions: ["incorrect", "has-subnet"]
    },
    {
        address: "2001:0DB8:0:CD30::/60",
        conditions: ["incorrect", "has-subnet"]
    },
    {
        address: "2001:0DB8::CD30:0:0:0:0/60",
        conditions: ["incorrect", "has-subnet"]
    },
    {
        address: "2001:0db8:0000:0000:0000:0000:1428:57ab",
        conditions: []
    },
    {
        address: "2001:0db8:0000:0000:0000::1428:57ab",
        conditions: []
    },
    {
        address: "2001:0db8:0:0:0:0:1428:57ab",
        conditions: []
    },
    {
        address: "2001:0db8:0:0::1428:57ab",
        conditions: []
    },
    {
        address: "2001:0db8:1234:0000:0000:0000:0000:0000",
        conditions: []
    },
    {
        address: "2001:0db8:1234::",
        conditions: []
    },
    {
        address: "2001:0db8:1234:ffff:ffff:ffff:ffff:ffff",
        conditions: []
    },
    {
        address: "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
        conditions: []
    },
    {
        address: "2001:0db8::1428:57ab",
        conditions: []
    },
    {
        address: "2001::CE49:7601:2CAD:DFFF:7C94:FFFE",
        conditions: ["incorrect"]
    },
    {
        address: "2001::CE49:7601:E866:EFFF:62C3:FFFE",
        conditions: ["incorrect"]
    },
    {
        address: "2001:DB8:0:0:8:800:200C:417A",
        conditions: ["incorrect"]
    },
    {
        address: "2001:DB8::8:800:200C:417A",
        conditions: ["incorrect"]
    },
    {
        address: "2001:db8:85a3:0:0:8a2e:370:7334",
        conditions: ["incorrect"]
    },
    {
        address: "2001:db8:85a3::8a2e:370:7334",
        conditions: ["correct"]
    },
    {
        address: "2001:db8::",
        conditions: ["correct"]
    },
    {
        address: "2001:db8::1428:57ab",
        conditions: ["correct"]
    },
    {
        address: "2001:db8:a::123",
        conditions: ["correct"]
    },
    {
        address: "2002::",
        conditions: ["correct"]
    },
    {
        address: "2608::3:5",
        conditions: ["correct"]
    },
    {
        address: "2608:af09:30:0:0:0:0:134",
        conditions: []
    },
    {
        address: "2608:af09:30::102a:7b91:c239:baff",
        conditions: []
    },
    {
        address: "2::10",
        conditions: ["correct"]
    },
    {
        address: "3ffe:0b00:0000:0000:0001:0000:0000:000a",
        conditions: ["canonical"]
    },
    {
        address: "7:6:5:4:3:2:1:0",
        conditions: ["correct"]
    },
    {
        address: "::",
        conditions: ["correct"]
    },
    {
        address: "::/128",
        conditions: ["correct", "has-subnet"]
    },
    {
        address: "::0",
        conditions: []
    },
    {
        address: "::0:0",
        conditions: []
    },
    {
        address: "::0:0:0",
        conditions: []
    },
    {
        address: "::0:0:0:0",
        conditions: []
    },
    {
        address: "::0:0:0:0:0",
        conditions: []
    },
    {
        address: "::0:0:0:0:0:0",
        conditions: []
    },
    {
        address: "::0:0:0:0:0:0:0",
        conditions: []
    },
    {
        address: "::0:a:b:c:d:e:f",
        conditions: []
    },
    {
        address: "::1",
        conditions: []
    },
    {
        address: "::1/128",
        conditions: ["correct", "has-subnet"]
    },
    {
        address: "::123.123.123.123",
        conditions: ["v4-in-v6"]
    },
    {
        address: "::13.1.68.3",
        conditions: ["v4-in-v6"]
    },
    {
        address: "::2222:3333:4444:5555:6666:123.123.123.123",
        conditions: ["v4-in-v6"]
    },
    {
        address: "::2222:3333:4444:5555:6666:7777:8888",
        conditions: []
    },
    {
        address: "::2:3",
        conditions: []
    },
    {
        address: "::2:3:4",
        conditions: []
    },
    {
        address: "::2:3:4:5",
        conditions: []
    },
    {
        address: "::2:3:4:5:6",
        conditions: []
    },
    {
        address: "::2:3:4:5:6:7",
        conditions: []
    },
    {
        address: "::2:3:4:5:6:7:8",
        conditions: []
    },
    {
        address: "::3333:4444:5555:6666:7777:8888",
        conditions: []
    },
    {
        address: "::4444:5555:6666:123.123.123.123",
        conditions: ["v4-in-v6"]
    },
    {
        address: "::4444:5555:6666:7777:8888",
        conditions: []
    },
    {
        address: "::5555:6666:123.123.123.123",
        conditions: ["v4-in-v6"]
    },
    {
        address: "::5555:6666:7777:8888",
        conditions: []
    },
    {
        address: "::6666:123.123.123.123",
        conditions: ["v4-in-v6"]
    },
    {
        address: "::6666:7777:8888",
        conditions: []
    },
    {
        address: "::7777:8888",
        conditions: []
    },
    {
        address: "::8",
        conditions: []
    },
    {
        address: "::8888",
        conditions: []
    },
    {
        address: "::FFFF:129.144.52.38",
        conditions: ["v4-in-v6"]
    },
    {
        address: "::ffff:0:0",
        conditions: []
    },
    {
        address: "::ffff:0c22:384e",
        conditions: []
    },
    {
        address: "::ffff:12.34.56.78",
        conditions: ["v4-in-v6"]
    },
    {
        address: "::ffff:192.0.2.128",
        conditions: ["v4-in-v6"]
    },
    {
        address: "::ffff:192.168.1.1",
        conditions: ["v4-in-v6"]
    },
    {
        address: "::ffff:192.168.1.26",
        conditions: ["v4-in-v6"]
    },
    {
        address: "::ffff:c000:280",
        conditions: []
    },
    {
        address: "FE80::/10",
        conditions: ["incorrect", "has-subnet"]
    },
    {
        address: "FEC0::/10",
        conditions: ["incorrect", "has-subnet"]
    },
    {
        address: "FF00::/8",
        conditions: ["incorrect", "has-subnet"]
    },
    {
        address: "FF01:0:0:0:0:0:0:101",
        conditions: ["incorrect"]
    },
    {
        address: "FF01::101",
        conditions: ["incorrect"]
    },
    {
        address: "FF02:0000:0000:0000:0000:0000:0000:0001",
        conditions: ["incorrect"]
    },
    {
        address: "a:b:c:d:e:f:0::",
        conditions: ["incorrect"]
    },
    {
        address: "fe80:0000:0000:0000:0204:61ff:fe9d:f156",
        conditions: ["canonical"]
    },
    {
        address: "fe80:0:0:0:204:61ff:254.157.241.86",
        conditions: ["v4-in-v6"]
    },
    {
        address: "fe80:0:0:0:204:61ff:fe9d:f156",
        conditions: ["incorrect"]
    },
    {
        address: "fe80::",
        conditions: ["correct"]
    },
    {
        address: "fe80::1",
        conditions: ["correct"]
    },
    {
        address: "fe80::204:61ff:254.157.241.86",
        conditions: ["v4-in-v6"]
    },
    {
        address: "fe80::204:61ff:fe9d:f156",
        conditions: []
    },
    {
        address: "fe80::217:f2ff:254.7.237.98",
        conditions: ["v4-in-v6"]
    },
    {
        address: "fe80::217:f2ff:fe07:ed62",
        conditions: ["correct"]
    },
    {
        address: "fedc:ba98:7654:3210:fedc:ba98:7654:3210",
        conditions: ["correct", "canonical"]
    },
    {
        address: "ff02::1",
        conditions: ["correct"]
    },
    {
        address: "ffff::",
        conditions: ["correct"]
    },
    {
        address: "ffff::3:5",
        conditions: ["correct"]
    },
    {
        address: "ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff",
        conditions: ["correct", "canonical"]
    },
    {
        address: "a:0::0:b",
        conditions: ["incorrect"]
    },
    {
        address: "a:0:0::0:b",
        conditions: ["incorrect"]
    },
    {
        address: "a:0::0:0:b",
        conditions: ["incorrect"]
    },
    {
        address: "a::0:0:b",
        conditions: ["incorrect"]
    },
    {
        address: "a::0:b",
        conditions: ["incorrect"]
    },
    {
        address: "a:0::b",
        conditions: ["incorrect"]
    },
    {
        address: "a:0:0::b",
        conditions: ["incorrect"]
    }
];

const invalid4 = [
    {
        address: " 127.0.0.1",
        conditions: []
    },
    {
        address: "127.0.0.1 ",
        conditions: []
    },
    {
        address: "127.0.0.1 127.0.0.1",
        conditions: []
    },
    {
        address: "127.0.0.256",
        conditions: []
    },
    {
        address: "127.0.0.1//1",
        conditions: []
    },
    {
        address: "127.0.0.1/0x1",
        conditions: []
    },
    {
        address: "127.0.0.1/-1",
        conditions: []
    },
    {
        address: "127.0.0.1/ab",
        conditions: []
    },
    {
        address: "127.0.0.1/",
        conditions: []
    },
    {
        address: "127.0.0.256/32",
        conditions: []
    },
    {
        address: "127.0.0.1/33",
        conditions: []
    }
];

const invalid6 = [
    {
        address: "':10.0.0.1",
        conditions: []
    },
    {
        address: "-1",
        conditions: []
    },
    {
        address: "::1 ::1",
        conditions: []
    },
    {
        address: "02001:0000:1234:0000:0000:C1C0:ABCD:0876",
        conditions: []
    },
    {
        address: "1.2.3.4",
        conditions: []
    },
    {
        address: "1.2.3.4:1111:2222:3333:4444::5555",
        conditions: []
    },
    {
        address: "1.2.3.4:1111:2222:3333::5555",
        conditions: []
    },
    {
        address: "1.2.3.4:1111:2222::5555",
        conditions: []
    },
    {
        address: "1.2.3.4:1111::5555",
        conditions: []
    },
    {
        address: "1.2.3.4::",
        conditions: []
    },
    {
        address: "1.2.3.4::5555",
        conditions: []
    },
    {
        address: "1111",
        conditions: []
    },
    {
        address: "11112222:3333:4444:5555:6666:1.2.3.4",
        conditions: []
    },
    {
        address: "11112222:3333:4444:5555:6666:7777:8888",
        conditions: []
    },
    {
        address: "::1//64",
        conditions: []
    },
    {
        address: "::1/0001",
        conditions: []
    },
    {
        address: "1111:",
        conditions: []
    },
    {
        address: "1111:1.2.3.4",
        conditions: []
    },
    {
        address: "1111:2222",
        conditions: []
    },
    {
        address: "1111:22223333:4444:5555:6666:1.2.3.4",
        conditions: []
    },
    {
        address: "1111:22223333:4444:5555:6666:7777:8888",
        conditions: []
    },
    {
        address: "1111:2222:",
        conditions: []
    },
    {
        address: "1111:2222:1.2.3.4",
        conditions: []
    },
    {
        address: "1111:2222:3333",
        conditions: []
    },
    {
        address: "1111:2222:33334444:5555:6666:1.2.3.4",
        conditions: []
    },
    {
        address: "1111:2222:33334444:5555:6666:7777:8888",
        conditions: []
    },
    {
        address: "1111:2222:3333:",
        conditions: []
    },
    {
        address: "1111:2222:3333:1.2.3.4",
        conditions: []
    },
    {
        address: "1111:2222:3333:4444",
        conditions: []
    },
    {
        address: "1111:2222:3333:44445555:6666:1.2.3.4",
        conditions: []
    },
    {
        address: "1111:2222:3333:44445555:6666:7777:8888",
        conditions: []
    },
    {
        address: "1111:2222:3333:4444:",
        conditions: []
    },
    {
        address: "1111:2222:3333:4444:1.2.3.4",
        conditions: []
    },
    {
        address: "1111:2222:3333:4444:5555",
        conditions: []
    },
    {
        address: "1111:2222:3333:4444:55556666:1.2.3.4",
        conditions: []
    },
    {
        address: "1111:2222:3333:4444:55556666:7777:8888",
        conditions: []
    },
    {
        address: "1111:2222:3333:4444:5555:",
        conditions: []
    },
    {
        address: "1111:2222:3333:4444:5555:1.2.3.4",
        conditions: []
    },
    {
        address: "1111:2222:3333:4444:5555:6666",
        conditions: []
    },
    {
        address: "1111:2222:3333:4444:5555:66661.2.3.4",
        conditions: []
    },
    {
        address: "1111:2222:3333:4444:5555:66667777:8888",
        conditions: []
    },
    {
        address: "1111:2222:3333:4444:5555:6666:",
        conditions: []
    },
    {
        address: "1111:2222:3333:4444:5555:6666:00.00.00.00",
        conditions: []
    },
    {
        address: "1111:2222:3333:4444:5555:6666:000.000.000.000",
        conditions: []
    },
    {
        address: "1111:2222:3333:4444:5555:6666:1.2.3.4.5",
        conditions: []
    },
    {
        address: "1111:2222:3333:4444:5555:6666:255.255.255255",
        conditions: []
    },
    {
        address: "1111:2222:3333:4444:5555:6666:255.255255.255",
        conditions: []
    },
    {
        address: "1111:2222:3333:4444:5555:6666:255255.255.255",
        conditions: []
    },
    {
        address: "1111:2222:3333:4444:5555:6666:256.256.256.256",
        conditions: []
    },
    {
        address: "1111:2222:3333:4444:5555:6666:7777",
        conditions: []
    },
    {
        address: "1111:2222:3333:4444:5555:6666:77778888",
        conditions: []
    },
    {
        address: "1111:2222:3333:4444:5555:6666:7777:",
        conditions: []
    },
    {
        address: "1111:2222:3333:4444:5555:6666:7777:1.2.3.4",
        conditions: []
    },
    {
        address: "1111:2222:3333:4444:5555:6666:7777:8888:",
        conditions: []
    },
    {
        address: "1111:2222:3333:4444:5555:6666:7777:8888:1.2.3.4",
        conditions: []
    },
    {
        address: "1111:2222:3333:4444:5555:6666:7777:8888:9999",
        conditions: []
    },
    {
        address: "1111:2222:3333:4444:5555:6666:7777:8888::",
        conditions: []
    },
    {
        address: "1111:2222:3333:4444:5555:6666:7777:::",
        conditions: []
    },
    {
        address: "1111:2222:3333:4444:5555:6666::1.2.3.4",
        conditions: []
    },
    {
        address: "1111:2222:3333:4444:5555:6666::8888:",
        conditions: []
    },
    {
        address: "1111:2222:3333:4444:5555:6666:::",
        conditions: []
    },
    {
        address: "1111:2222:3333:4444:5555:6666:::8888",
        conditions: []
    },
    {
        address: "1111:2222:3333:4444:5555::7777:8888:",
        conditions: []
    },
    {
        address: "1111:2222:3333:4444:5555::7777::",
        conditions: []
    },
    {
        address: "1111:2222:3333:4444:5555::8888:",
        conditions: []
    },
    {
        address: "1111:2222:3333:4444:5555:::",
        conditions: []
    },
    {
        address: "1111:2222:3333:4444:5555:::1.2.3.4",
        conditions: []
    },
    {
        address: "1111:2222:3333:4444:5555:::7777:8888",
        conditions: []
    },
    {
        address: "1111:2222:3333:4444::5555:",
        conditions: []
    },
    {
        address: "1111:2222:3333:4444::6666:7777:8888:",
        conditions: []
    },
    {
        address: "1111:2222:3333:4444::6666:7777::",
        conditions: []
    },
    {
        address: "1111:2222:3333:4444::6666::8888",
        conditions: []
    },
    {
        address: "1111:2222:3333:4444::7777:8888:",
        conditions: []
    },
    {
        address: "1111:2222:3333:4444::8888:",
        conditions: []
    },
    {
        address: "1111:2222:3333:4444:::",
        conditions: []
    },
    {
        address: "1111:2222:3333:4444:::6666:1.2.3.4",
        conditions: []
    },
    {
        address: "1111:2222:3333:4444:::6666:7777:8888",
        conditions: []
    },
    {
        address: "1111:2222:3333::5555:",
        conditions: []
    },
    {
        address: "1111:2222:3333::5555:6666:7777:8888:",
        conditions: []
    },
    {
        address: "1111:2222:3333::5555:6666:7777::",
        conditions: []
    },
    {
        address: "1111:2222:3333::5555:6666::8888",
        conditions: []
    },
    {
        address: "1111:2222:3333::5555::1.2.3.4",
        conditions: []
    },
    {
        address: "1111:2222:3333::5555::7777:8888",
        conditions: []
    },
    {
        address: "1111:2222:3333::6666:7777:8888:",
        conditions: []
    },
    {
        address: "1111:2222:3333::7777:8888:",
        conditions: []
    },
    {
        address: "1111:2222:3333::8888:",
        conditions: []
    },
    {
        address: "1111:2222:3333:::",
        conditions: []
    },
    {
        address: "1111:2222:3333:::5555:6666:1.2.3.4",
        conditions: []
    },
    {
        address: "1111:2222:3333:::5555:6666:7777:8888",
        conditions: []
    },
    {
        address: "1111:2222::4444:5555:6666:7777:8888:",
        conditions: []
    },
    {
        address: "1111:2222::4444:5555:6666:7777::",
        conditions: []
    },
    {
        address: "1111:2222::4444:5555:6666::8888",
        conditions: []
    },
    {
        address: "1111:2222::4444:5555::1.2.3.4",
        conditions: []
    },
    {
        address: "1111:2222::4444:5555::7777:8888",
        conditions: []
    },
    {
        address: "1111:2222::4444::6666:1.2.3.4",
        conditions: []
    },
    {
        address: "1111:2222::4444::6666:7777:8888",
        conditions: []
    },
    {
        address: "1111:2222::5555:",
        conditions: []
    },
    {
        address: "1111:2222::5555:6666:7777:8888:",
        conditions: []
    },
    {
        address: "1111:2222::6666:7777:8888:",
        conditions: []
    },
    {
        address: "1111:2222::7777:8888:",
        conditions: []
    },
    {
        address: "1111:2222::8888:",
        conditions: []
    },
    {
        address: "1111:2222:::",
        conditions: []
    },
    {
        address: "1111:2222:::4444:5555:6666:1.2.3.4",
        conditions: []
    },
    {
        address: "1111:2222:::4444:5555:6666:7777:8888",
        conditions: []
    },
    {
        address: "1111::3333:4444:5555:6666:7777:8888:",
        conditions: []
    },
    {
        address: "1111::3333:4444:5555:6666:7777::",
        conditions: []
    },
    {
        address: "1111::3333:4444:5555:6666::8888",
        conditions: []
    },
    {
        address: "1111::3333:4444:5555::1.2.3.4",
        conditions: []
    },
    {
        address: "1111::3333:4444:5555::7777:8888",
        conditions: []
    },
    {
        address: "1111::3333:4444::6666:1.2.3.4",
        conditions: []
    },
    {
        address: "1111::3333:4444::6666:7777:8888",
        conditions: []
    },
    {
        address: "1111::3333::5555:6666:1.2.3.4",
        conditions: []
    },
    {
        address: "1111::3333::5555:6666:7777:8888",
        conditions: []
    },
    {
        address: "1111::4444:5555:6666:7777:8888:",
        conditions: []
    },
    {
        address: "1111::5555:",
        conditions: []
    },
    {
        address: "1111::5555:6666:7777:8888:",
        conditions: []
    },
    {
        address: "1111::6666:7777:8888:",
        conditions: []
    },
    {
        address: "1111::7777:8888:",
        conditions: []
    },
    {
        address: "1111::8888:",
        conditions: []
    },
    {
        address: "1111:::",
        conditions: []
    },
    {
        address: "1111:::3333:4444:5555:6666:1.2.3.4",
        conditions: []
    },
    {
        address: "1111:::3333:4444:5555:6666:7777:8888",
        conditions: []
    },
    {
        address: "123",
        conditions: []
    },
    {
        address: "12345::6:7:8",
        conditions: []
    },
    {
        address: "124.15.6.89/60",
        conditions: []
    },
    {
        address: "1:2:3:4:5:6:7:8:9",
        conditions: []
    },
    {
        address: "1:2:3::4:5:6:7:8:9",
        conditions: []
    },
    {
        address: "1:2:3::4:5::7:8",
        conditions: []
    },
    {
        address: "1::1.2.256.4",
        conditions: []
    },
    {
        address: "1::1.2.3.256",
        conditions: []
    },
    {
        address: "1::1.2.3.300",
        conditions: []
    },
    {
        address: "1::1.2.3.900",
        conditions: []
    },
    {
        address: "1::1.2.300.4",
        conditions: []
    },
    {
        address: "1::1.2.900.4",
        conditions: []
    },
    {
        address: "1::1.256.3.4",
        conditions: []
    },
    {
        address: "1::1.300.3.4",
        conditions: []
    },
    {
        address: "1::1.900.3.4",
        conditions: []
    },
    {
        address: "1::256.2.3.4",
        conditions: []
    },
    {
        address: "1::260.2.3.4",
        conditions: []
    },
    {
        address: "1::2::3",
        conditions: []
    },
    {
        address: "1::300.2.3.4",
        conditions: []
    },
    {
        address: "1::300.300.300.300",
        conditions: []
    },
    {
        address: "1::3000.30.30.30",
        conditions: []
    },
    {
        address: "1::400.2.3.4",
        conditions: []
    },
    {
        address: "1::5:1.2.256.4",
        conditions: []
    },
    {
        address: "1::5:1.2.3.256",
        conditions: []
    },
    {
        address: "1::5:1.2.3.300",
        conditions: []
    },
    {
        address: "1::5:1.2.3.900",
        conditions: []
    },
    {
        address: "1::5:1.2.300.4",
        conditions: []
    },
    {
        address: "1::5:1.2.900.4",
        conditions: []
    },
    {
        address: "1::5:1.256.3.4",
        conditions: []
    },
    {
        address: "1::5:1.300.3.4",
        conditions: []
    },
    {
        address: "1::5:1.900.3.4",
        conditions: []
    },
    {
        address: "1::5:256.2.3.4",
        conditions: []
    },
    {
        address: "1::5:260.2.3.4",
        conditions: []
    },
    {
        address: "1::5:300.2.3.4",
        conditions: []
    },
    {
        address: "1::5:300.300.300.300",
        conditions: []
    },
    {
        address: "1::5:3000.30.30.30",
        conditions: []
    },
    {
        address: "1::5:400.2.3.4",
        conditions: []
    },
    {
        address: "1::5:900.2.3.4",
        conditions: []
    },
    {
        address: "1::900.2.3.4",
        conditions: []
    },
    {
        address: "1:::3:4:5",
        conditions: []
    },
    {
        address: "2001:0000:1234: 0000:0000:C1C0:ABCD:0876",
        conditions: []
    },
    {
        address: "2001:0000:1234:0000:00001:C1C0:ABCD:0876",
        conditions: []
    },
    {
        address: "2001:0000:1234:0000:0000:C1C0:ABCD:0876  0",
        conditions: []
    },
    {
        address: "2001:1:1:1:1:1:255Z255X255Y255",
        conditions: []
    },
    {
        address: "2001::FFD3::57ab",
        conditions: []
    },
    {
        address: "2001:DB8:0:0:8:800:200C:417A:221",
        conditions: []
    },
    {
        address: "2001:db8:85a3::8a2e:37023:7334",
        conditions: []
    },
    {
        address: "2001:db8:85a3::8a2e:370k:7334",
        conditions: []
    },
    {
        address: "3ffe:0b00:0000:0001:0000:0000:000a",
        conditions: []
    },
    {
        address: "3ffe:b00::1::a",
        conditions: []
    },
    {
        address: ":",
        conditions: []
    },
    {
        address: ":1.2.3.4",
        conditions: []
    },
    {
        address: ":1111:2222:3333:4444:5555:6666:1.2.3.4",
        conditions: []
    },
    {
        address: ":1111:2222:3333:4444:5555:6666:7777:8888",
        conditions: []
    },
    {
        address: ":1111:2222:3333:4444:5555:6666:7777::",
        conditions: []
    },
    {
        address: ":1111:2222:3333:4444:5555:6666::",
        conditions: []
    },
    {
        address: ":1111:2222:3333:4444:5555:6666::8888",
        conditions: []
    },
    {
        address: ":1111:2222:3333:4444:5555::",
        conditions: []
    },
    {
        address: ":1111:2222:3333:4444:5555::1.2.3.4",
        conditions: []
    },
    {
        address: ":1111:2222:3333:4444:5555::7777:8888",
        conditions: []
    },
    {
        address: ":1111:2222:3333:4444:5555::8888",
        conditions: []
    },
    {
        address: ":1111:2222:3333:4444::",
        conditions: []
    },
    {
        address: ":1111:2222:3333:4444::1.2.3.4",
        conditions: []
    },
    {
        address: ":1111:2222:3333:4444::5555",
        conditions: []
    },
    {
        address: ":1111:2222:3333:4444::6666:1.2.3.4",
        conditions: []
    },
    {
        address: ":1111:2222:3333:4444::6666:7777:8888",
        conditions: []
    },
    {
        address: ":1111:2222:3333:4444::7777:8888",
        conditions: []
    },
    {
        address: ":1111:2222:3333:4444::8888",
        conditions: []
    },
    {
        address: ":1111:2222:3333::",
        conditions: []
    },
    {
        address: ":1111:2222:3333::1.2.3.4",
        conditions: []
    },
    {
        address: ":1111:2222:3333::5555",
        conditions: []
    },
    {
        address: ":1111:2222:3333::5555:6666:1.2.3.4",
        conditions: []
    },
    {
        address: ":1111:2222:3333::5555:6666:7777:8888",
        conditions: []
    },
    {
        address: ":1111:2222:3333::6666:1.2.3.4",
        conditions: []
    },
    {
        address: ":1111:2222:3333::6666:7777:8888",
        conditions: []
    },
    {
        address: ":1111:2222:3333::7777:8888",
        conditions: []
    },
    {
        address: ":1111:2222:3333::8888",
        conditions: []
    },
    {
        address: ":1111:2222::",
        conditions: []
    },
    {
        address: ":1111:2222::1.2.3.4",
        conditions: []
    },
    {
        address: ":1111:2222::4444:5555:6666:1.2.3.4",
        conditions: []
    },
    {
        address: ":1111:2222::4444:5555:6666:7777:8888",
        conditions: []
    },
    {
        address: ":1111:2222::5555",
        conditions: []
    },
    {
        address: ":1111:2222::5555:6666:1.2.3.4",
        conditions: []
    },
    {
        address: ":1111:2222::5555:6666:7777:8888",
        conditions: []
    },
    {
        address: ":1111:2222::6666:1.2.3.4",
        conditions: []
    },
    {
        address: ":1111:2222::6666:7777:8888",
        conditions: []
    },
    {
        address: ":1111:2222::7777:8888",
        conditions: []
    },
    {
        address: ":1111:2222::8888",
        conditions: []
    },
    {
        address: ":1111::",
        conditions: []
    },
    {
        address: ":1111::1.2.3.4",
        conditions: []
    },
    {
        address: ":1111::3333:4444:5555:6666:1.2.3.4",
        conditions: []
    },
    {
        address: ":1111::3333:4444:5555:6666:7777:8888",
        conditions: []
    },
    {
        address: ":1111::4444:5555:6666:1.2.3.4",
        conditions: []
    },
    {
        address: ":1111::4444:5555:6666:7777:8888",
        conditions: []
    },
    {
        address: ":1111::5555",
        conditions: []
    },
    {
        address: ":1111::5555:6666:1.2.3.4",
        conditions: []
    },
    {
        address: ":1111::5555:6666:7777:8888",
        conditions: []
    },
    {
        address: ":1111::6666:1.2.3.4",
        conditions: []
    },
    {
        address: ":1111::6666:7777:8888",
        conditions: []
    },
    {
        address: ":1111::7777:8888",
        conditions: []
    },
    {
        address: ":1111::8888",
        conditions: []
    },
    {
        address: ":2222:3333:4444:5555:6666:1.2.3.4",
        conditions: []
    },
    {
        address: ":2222:3333:4444:5555:6666:7777:8888",
        conditions: []
    },
    {
        address: ":3333:4444:5555:6666:1.2.3.4",
        conditions: []
    },
    {
        address: ":3333:4444:5555:6666:7777:8888",
        conditions: []
    },
    {
        address: ":4444:5555:6666:1.2.3.4",
        conditions: []
    },
    {
        address: ":4444:5555:6666:7777:8888",
        conditions: []
    },
    {
        address: ":5555:6666:1.2.3.4",
        conditions: []
    },
    {
        address: ":5555:6666:7777:8888",
        conditions: []
    },
    {
        address: ":6666:1.2.3.4",
        conditions: []
    },
    {
        address: ":6666:7777:8888",
        conditions: []
    },
    {
        address: ":7777:8888",
        conditions: []
    },
    {
        address: ":8888",
        conditions: []
    },
    {
        address: "::-1",
        conditions: []
    },
    {
        address: "::.",
        conditions: []
    },
    {
        address: "::..",
        conditions: []
    },
    {
        address: "::...",
        conditions: []
    },
    {
        address: "::...4",
        conditions: []
    },
    {
        address: "::..3.",
        conditions: []
    },
    {
        address: "::..3.4",
        conditions: []
    },
    {
        address: "::.2..",
        conditions: []
    },
    {
        address: "::.2.3.",
        conditions: []
    },
    {
        address: "::.2.3.4",
        conditions: []
    },
    {
        address: "::1...",
        conditions: []
    },
    {
        address: "::1.2..",
        conditions: []
    },
    {
        address: "::1.2.256.4",
        conditions: []
    },
    {
        address: "::1.2.3.",
        conditions: []
    },
    {
        address: "::1.2.3.256",
        conditions: []
    },
    {
        address: "::1.2.3.300",
        conditions: []
    },
    {
        address: "::1.2.3.900",
        conditions: []
    },
    {
        address: "::1.2.300.4",
        conditions: []
    },
    {
        address: "::1.2.900.4",
        conditions: []
    },
    {
        address: "::1.256.3.4",
        conditions: []
    },
    {
        address: "::1.300.3.4",
        conditions: []
    },
    {
        address: "::1.900.3.4",
        conditions: []
    },
    {
        address: "::1111:2222:3333:4444:5555:6666::",
        conditions: []
    },
    {
        address: "::2222:3333:4444:5555:6666:7777:1.2.3.4",
        conditions: []
    },
    {
        address: "::2222:3333:4444:5555:6666:7777:8888:",
        conditions: []
    },
    {
        address: "::2222:3333:4444:5555:6666:7777:8888:9999",
        conditions: []
    },
    {
        address: "::2222:3333:4444:5555:7777:8888::",
        conditions: []
    },
    {
        address: "::2222:3333:4444:5555:7777::8888",
        conditions: []
    },
    {
        address: "::2222:3333:4444:5555::1.2.3.4",
        conditions: []
    },
    {
        address: "::2222:3333:4444:5555::7777:8888",
        conditions: []
    },
    {
        address: "::2222:3333:4444::6666:1.2.3.4",
        conditions: []
    },
    {
        address: "::2222:3333:4444::6666:7777:8888",
        conditions: []
    },
    {
        address: "::2222:3333::5555:6666:1.2.3.4",
        conditions: []
    },
    {
        address: "::2222:3333::5555:6666:7777:8888",
        conditions: []
    },
    {
        address: "::2222::4444:5555:6666:1.2.3.4",
        conditions: []
    },
    {
        address: "::2222::4444:5555:6666:7777:8888",
        conditions: []
    },
    {
        address: "::256.2.3.4",
        conditions: []
    },
    {
        address: "::260.2.3.4",
        conditions: []
    },
    {
        address: "::300.2.3.4",
        conditions: []
    },
    {
        address: "::300.300.300.300",
        conditions: []
    },
    {
        address: "::3000.30.30.30",
        conditions: []
    },
    {
        address: "::3333:4444:5555:6666:7777:8888:",
        conditions: []
    },
    {
        address: "::400.2.3.4",
        conditions: []
    },
    {
        address: "::4444:5555:6666:7777:8888:",
        conditions: []
    },
    {
        address: "::5555:",
        conditions: []
    },
    {
        address: "::5555:6666:7777:8888:",
        conditions: []
    },
    {
        address: "::6666:7777:8888:",
        conditions: []
    },
    {
        address: "::7777:8888:",
        conditions: []
    },
    {
        address: "::8888:",
        conditions: []
    },
    {
        address: "::900.2.3.4",
        conditions: []
    },
    {
        address: ":::",
        conditions: []
    },
    {
        address: ":::1.2.3.4",
        conditions: []
    },
    {
        address: ":::2222:3333:4444:5555:6666:1.2.3.4",
        conditions: []
    },
    {
        address: ":::2222:3333:4444:5555:6666:7777:8888",
        conditions: []
    },
    {
        address: ":::3333:4444:5555:6666:7777:8888",
        conditions: []
    },
    {
        address: ":::4444:5555:6666:1.2.3.4",
        conditions: []
    },
    {
        address: ":::4444:5555:6666:7777:8888",
        conditions: []
    },
    {
        address: ":::5555",
        conditions: []
    },
    {
        address: ":::5555:6666:1.2.3.4",
        conditions: []
    },
    {
        address: ":::5555:6666:7777:8888",
        conditions: []
    },
    {
        address: ":::6666:1.2.3.4",
        conditions: []
    },
    {
        address: ":::6666:7777:8888",
        conditions: []
    },
    {
        address: ":::7777:8888",
        conditions: []
    },
    {
        address: ":::8888",
        conditions: []
    },
    {
        address: "::ffff:192x168.1.26",
        conditions: []
    },
    {
        address: "::ffff:2.3.4",
        conditions: []
    },
    {
        address: "::ffff:257.1.2.3",
        conditions: []
    },
    {
        address: "FF01::101::2",
        conditions: []
    },
    {
        address: "FF02:0000:0000:0000:0000:0000:0000:0000:0001",
        conditions: []
    },
    {
        address: "XXXX:XXXX:XXXX:XXXX:XXXX:XXXX:1.2.3.4",
        conditions: []
    },
    {
        address: "XXXX:XXXX:XXXX:XXXX:XXXX:XXXX:XXXX:XXXX",
        conditions: []
    },
    {
        address: "a::b::c",
        conditions: []
    },
    {
        address: "a::g",
        conditions: []
    },
    {
        address: "a:a:a:a:a:a:a:a:a",
        conditions: []
    },
    {
        address: "a:aaaaa::",
        conditions: []
    },
    {
        address: "a:b",
        conditions: []
    },
    {
        address: "a:b:c:d:e:f:g:0",
        conditions: []
    },
    {
        address: "fe80:0000:0000:0000:0204:61ff:254.157.241.086",
        conditions: []
    },
    {
        address: "ffff:",
        conditions: []
    },
    {
        address: "ffff::ffff::ffff",
        conditions: []
    },
    {
        address: "ffgg:ffff:ffff:ffff:ffff:ffff:ffff:ffff",
        conditions: []
    },
    {
        address: "ldkfj",
        conditions: []
    },
    {
        address: "::/129",
        conditions: []
    },
    {
        address: "1000:://32",
        conditions: []
    },
    {
        address: "::/",
        conditions: []
    }
];

const addressIs = (addressString, descriptors) => {
    const address4 = new IP4(addressString);
    const address6 = new IP6(addressString);

    describe(addressString, () => {
        descriptors.forEach((descriptor) => {
            if (descriptor === "valid-ipv4") {
                it("is valid", () => {
                    expect(address4).to.be.an("object");

                    expect(address4.parsedAddress).to.be.an.instanceof(Array);
                    expect(address4.parsedAddress.length).to.equal(4);

                    expect(address4.subnetMask).to.be.a("number");

                    expect(address4.subnetMask).to.be.at.least(0);
                    expect(address4.subnetMask).to.be.at.most(128);

                    expect(address4.error).to.not.exist;
                    expect(address4.parseError).to.not.exist;

                    expect(address4.isValid()).to.equal(true);
                });
            }

            if (descriptor === "valid-ipv6") {
                it("is valid", () => {
                    expect(address6).to.be.an("object");

                    expect(address6.zone).to.be.a("string");

                    expect(address6.subnet).to.be.a("string");

                    expect(address6.subnetMask).to.be.a("number");

                    expect(address6.subnetMask).to.be.at.least(0);
                    expect(address6.subnetMask).to.be.at.most(128);

                    expect(address6.parsedAddress).to.be.an.instanceOf(Array);
                    expect(address6.parsedAddress.length).to.equal(8);

                    expect(address6.error).to.not.exist;
                    expect(address6.parseError).to.not.exist;

                    expect(address6.isValid()).to.equal(true);
                });

                const re = address6.regularExpression();
                const reSubstring = address6.regularExpression(true);

                it("matches the correct form via regex", () => {
                    expect(re.test(address6.correctForm())).to.equal(true);
                    expect(reSubstring.test(`abc ${address6.correctForm()} def`)).to.equal(true);
                });

                it("matches the canonical form via regex", () => {
                    expect(re.test(address6.canonicalForm())).to.equal(true);
                    expect(reSubstring.test(`abc ${address6.canonicalForm()} def`)).to.equal(true);
                });

                it("matches the given form via regex", () => {
                    // We can't match addresses like ::192.168.0.1 yet
                    if (address6.is4()) {
                        return;
                    }

                    expect(re.test(addressString)).to.equal(true);
                    expect(reSubstring.test(`abc ${addressString} def`)).to.equal(true);
                });
            }

            if (descriptor === "invalid-ipv4") {
                it("is invalid as parsed by v4", () => {
                    expect(address4.error).to.be.a("string");

                    expect(address4.isValid()).to.equal(false);
                });
            }

            if (descriptor === "invalid-ipv6") {
                it("is invalid as parsed by v6", () => {
                    expect(address6.error).to.be.a("string");

                    expect(address6.isValid()).to.equal(false);
                    expect(address6.correctForm()).to.not.exist;
                });
            }

            if (descriptor === "canonical") {
                it("is canonical", () => {
                    expect(address6.isCanonical()).to.equal(true);

                    expect(address6.addressMinusSuffix.length).to.equal(39);
                });
            }

            if (descriptor === "correct") {
                it("is correct", () => {
                    expect(address6.isCorrect()).to.equal(true);
                });
            }

            if (descriptor === "correct-ipv4") {
                it("is correct", () => {
                    expect(address4.isCorrect()).to.equal(true);
                });
            }

            if (descriptor === "incorrect") {
                it("is incorrect", () => {
                    expect(address6.isCorrect()).to.equal(false);
                });
            }

            if (descriptor === "incorrect-ipv4") {
                it("is incorrect", () => {
                    expect(address4.isCorrect()).to.equal(false);
                });
            }

            if (descriptor === "has-subnet") {
                it("parses the subnet", () => {
                    expect(address6.subnet).to.match(/^\/\d{1,3}/);
                });
            }

            if (descriptor === "v4-in-v6") {
                it("is an ipv4-in-ipv6 address", () => {
                    expect(address6.is4()).to.equal(true);
                });
            }
        });
    });
};

const loadJsonBatch = (addresses, classes, noMerge) => {
    addresses.forEach((address) => {
        if (is.undefined(address.conditions) || !address.conditions.length || noMerge) {
            address.conditions = classes;
        } else {
            address.conditions = address.conditions.concat(classes);
        }
        addressIs(address.address, address.conditions);
    });
};

describe("net", "address", () => {
    describe("Valid IPv4 addresses", () => {
        loadJsonBatch(valid4, ["valid-ipv4"]);
        loadJsonBatch(valid4, ["invalid-ipv6"], true);
    });

    describe("Valid IPv6 addresses", () => {
        loadJsonBatch(valid6, ["valid-ipv6"]);
        loadJsonBatch(valid6, ["invalid-ipv4"], true);
    });

    describe("Invalid IPv4 addresses", () => {
        loadJsonBatch(invalid4, ["invalid-ipv4"]);
    });

    describe("Invalid IPv6 addresses", () => {
        loadJsonBatch(invalid6, ["invalid-ipv6"]);
    });


    describe("Functionality IPv4", () => {
        // A convenience function to convert a list of IPv4 address notations
        // to IP4 instances
        const notationsToAddresseses = (notations) => {
            const addresses = [];

            notations.forEach((notation) => {
                addresses.push(new IP4(notation));
            });

            return addresses;
        };

        describe("v4", () => {
            describe("An invalid address", () => {
                const topic = new IP4("127.0.0");

                it("is invalid", () => {
                    expect(topic.error).to.equal("Invalid IPv4 address.");

                    expect(topic.valid).to.equal(false);

                    expect(topic.isCorrect()).to.equal(false);

                    expect(topic.toBigNumber()).to.equal(null);
                });

            });

            describe("A correct address", () => {
                const topic = new IP4("127.0.0.1");

                it("validates as correct", () => {
                    expect(topic.isCorrect()).to.equal(true);

                    expect(topic.correctForm()).to.equal("127.0.0.1");
                });
            });

            describe("An address with a subnet", () => {
                const topic = new IP4("127.0.0.1/16");

                it("is contained by an identical address with an identical subnet",
                    () => {
                        const same = new IP4("127.0.0.1/16");

                        expect(topic.isInSubnet(same)).to.equal(true);
                    });
            });

            describe("A small subnet", () => {
                const topic = new IP4("127.0.0.1/16");

                it("is contained by larger subnets", () => {
                    for (let i = 15; i > 0; i--) {
                        const larger = new IP4(adone.sprintf("127.0.0.1/%d", i));

                        expect(topic.isInSubnet(larger)).to.equal(true);
                    }
                });
            });

            describe("A large subnet", () => {
                const topic = new IP4("127.0.0.1/8");

                it("is not contained by smaller subnets", () => {
                    for (let i = 9; i <= 32; i++) {
                        const smaller = new IP4(adone.sprintf("127.0.0.1/%d", i));

                        expect(topic.isInSubnet(smaller)).to.equal(false);
                    }
                });
            });

            describe("An integer v4 address", () => {
                const topic = IP4.fromInteger(432432423);

                it("validates", () => {
                    expect(topic.isValid()).to.equal(true);
                });

                it("parses correctly", () => {
                    expect(topic.address).to.equal("25.198.101.39");

                    expect(topic.subnet).to.equal("/32");
                    expect(topic.subnetMask).to.equal(32);
                });

                it("should match an address from its hex representation", () => {
                    const hex = IP4.fromHex("19c66527");

                    expect(hex.address).to.equal("25.198.101.39");

                    expect(hex.subnet).to.equal("/32");
                    expect(hex.subnetMask).to.equal(32);
                });
            });

            describe("An address with a subnet", () => {
                const topic = new IP4("127.0.0.1/16");

                it("validates", () => {
                    expect(topic.isValid()).to.equal(true);
                });

                it("parses the subnet", () => {
                    expect(topic.subnet).to.equal("/16");
                });

                it("has a correct start address", () => {
                    expect(topic.startAddress().correctForm()).to.equal("127.0.0.0");
                });

                it("has a correct end address", () => {
                    expect(topic.endAddress().correctForm()).to.equal("127.0.255.255");
                });

                it("is in its own subnet", () => {
                    expect(topic.isInSubnet(new IP4("127.0.0.1/16"))).to.equal(true);
                });

                it("is not in another subnet", () => {
                    expect(topic.isInSubnet(new IP4("192.168.0.1/16"))).to.equal(false);
                });
            });

            describe("Creating an address from a BigNumber", () => {
                const topic = IP4.fromBigNumber(2130706433);

                it("should parse correctly", () => {
                    expect(topic.isValid()).to.equal(true);
                    expect(topic.correctForm()).to.equal("127.0.0.1");
                });
            });

            describe("Converting an address to a BigNumber", () => {
                const topic = new IP4("127.0.0.1");

                it("should convert properly", () => {
                    expect(topic.toBigNumber().toNumber()).to.equal(2130706433);
                });
            });

            describe("Creating an address from hex", () => {
                const topic = IP4.fromHex("7f:00:00:01");

                it("should parse correctly", () => {
                    expect(topic.isValid()).to.equal(true);
                    expect(topic.correctForm()).to.equal("127.0.0.1");
                });
            });

            describe("Converting an address to hex", () => {
                const topic = new IP4("127.0.0.1");

                it("should convert correctly", () => {
                    expect(topic.toHex()).to.equal("7f:00:00:01");
                });
            });

            describe("Converting an address to an array", () => {
                const topic = new IP4("127.0.0.1");

                it("should convert correctly", () => {
                    const a = topic.toArray();

                    expect(a).to.be.an.instanceOf(Array).and.have.lengthOf(4);

                    expect(a[0]).to.equal(127);
                    expect(a[1]).to.equal(0);
                    expect(a[2]).to.equal(0);
                    expect(a[3]).to.equal(1);
                });
            });

            describe("A different notation of the same address", () => {
                const addresses = notationsToAddresseses([
                    "127.0.0.1/32",
                    "127.0.0.1/032",
                    "127.000.000.001/032",
                    "127.000.000.001/32",
                    "127.0.0.1",
                    "127.000.000.001",
                    "127.000.0.1"
                ]);

                it("is parsed to the same result", () => {
                    addresses.forEach((topic) => {
                        expect(topic.correctForm()).to.equal("127.0.0.1");
                        expect(topic.subnetMask).to.equal(32);
                    });
                });
            });
        });
    });

    describe("Functionality IPv4", () => {
        // A convenience function to convert a list of IPv6 address notations to IP6 instances
        const notationsToAddresseses = (notations) => {
            return notations.map((notation) => {
                return new IP6(notation);
            });
        };

        describe("v6", () => {
            describe("An invalid address", () => {
                const topic = new IP6("a:abcde::");

                it("is invalid", () => {
                    expect(topic.error).to.equal("Address failed regex: abcde");

                    expect(topic.valid).to.equal(false);

                    expect(topic.isCorrect()).to.equal(false);

                    expect(topic.canonicalForm()).to.equal(null);
                    expect(topic.decimal()).to.equal(null);
                    expect(topic.toBigNumber()).to.equal(null);
                    expect(topic.to6to4()).to.equal(null);

                    expect(topic.isTeredo()).to.equal(false);
                });
            });

            describe("a fully ellided /0 address", () => {
                const topic = new IP6("::/0");

                it("gets the correct reverse from", () => {
                    expect(topic.reverseForm({ omitSuffix: true })).to.equal("");
                    expect(topic.reverseForm()).to.equal("ip6.arpa.");
                });
            });

            describe("A link local address", () => {
                const topic = new IP6("fe80::baf6:b1ff:fe15:4885");

                it("gets the correct type", () => {
                    expect(topic.getType()).to.equal("Link-local unicast");

                    expect(topic.isTeredo()).to.equal(false);
                    expect(topic.isLoopback()).to.equal(false);
                    expect(topic.isMulticast()).to.equal(false);
                    expect(topic.isLinkLocal()).to.equal(true);
                });
            });

            describe("A correct address", () => {
                const topic = new IP6("a:b:c:d:e:f:0:1/64");

                it("contains no uppercase letters", () => {
                    expect(/[A-Z]/.test(topic.address)).to.equal(false);
                });

                it("validates as correct", () => {
                    expect(topic.isCorrect()).to.equal(true);

                    expect(topic.correctForm()).to.equal("a:b:c:d:e:f:0:1");
                });

                it("converts to and from a signed byte array", () => {
                    const bytes = topic.toByteArray();
                    const address = IP6.fromByteArray(bytes);

                    expect(address.correctForm()).to.equal(topic.correctForm());
                });

                it("converts to and from an unsigned byte array", () => {
                    const unsignedBytes = topic.toUnsignedByteArray();
                    const address = IP6.fromUnsignedByteArray(unsignedBytes);

                    expect(address.correctForm()).to.equal(topic.correctForm());
                });

                it("gets the correct type", () => {
                    expect(topic.getType()).to.equal("Global unicast");

                    expect(topic.isTeredo()).to.equal(false);
                    expect(topic.isLoopback()).to.equal(false);
                    expect(topic.isMulticast()).to.equal(false);
                    expect(topic.isLinkLocal()).to.equal(false);
                });

                it("gets the correct reverse from", () => {
                    expect(topic.reverseForm({ omitSuffix: true })).to.equal("d.0.0.0.c.0.0.0.b.0.0.0.a.0.0.0");

                    expect(topic.reverseForm()).to.equal("d.0.0.0.c.0.0.0.b.0.0.0.a.0.0.0.ip6.arpa.");
                });

                it("gets the correct scope", () => {
                    expect(topic.getScope()).to.equal("Global");
                });

                it("gets the correct is6to4 information", () => {
                    expect(topic.is6to4()).to.equal(false);
                });

                it("gets the correct microsoft transcription", () => {
                    expect(topic.microsoftTranscription()).to.equal("a-b-c-d-e-f-0-1.ipv6-literal.net");
                });

                it("has correct bit information", () => {
                    expect(topic.getBitsPastSubnet()).to.equal("0000000000001110000000000000111100000000000000000000000000000001");

                    expect(topic.getBitsBase16(0, 64)).to.equal("000a000b000c000d");

                    expect(topic.getBitsBase16(0, 128)).to.equal("000a000b000c000d000e000f00000001");

                    expect(topic.getBitsBase16(0, 127)).to.equal(null);

                    expect(topic.getBitsBase2()).to.equal("00000000000010100000000000001011000000000000110000000000000011010000000000001110000000000000111100000000000000000000000000000001");
                });
            });

            describe("An address with a subnet", () => {
                const topic = new IP6("ffff::/64");

                it("is contained by an identical address with an identical subnet",
                    () => {
                        const same = new IP6("ffff::/64");

                        expect(topic.isInSubnet(same)).to.equal(true);
                    });

                it("has a correct start address", () => {
                    expect(topic.startAddress().correctForm()).to.equal("ffff::");
                });

                it("has a correct end address", () => {
                    expect(topic.endAddress().correctForm()).to.equal("ffff::ffff:ffff:ffff:ffff");
                });

                it("calculates and formats the subnet size", () => {
                    expect(topic.possibleSubnets()).to.equal("18,446,744,073,709,551,616");
                    expect(topic.possibleSubnets(128)).to.equal("18,446,744,073,709,551,616");
                    expect(topic.possibleSubnets(96)).to.equal("4,294,967,296");
                    expect(topic.possibleSubnets(65)).to.equal("2");
                    expect(topic.possibleSubnets(64)).to.equal("1");
                    expect(topic.possibleSubnets(63)).to.equal("0");
                    expect(topic.possibleSubnets(0)).to.equal("0");
                });
            });

            describe("Small subnets", () => {
                const topic = new IP6("ffff::/64");

                it("is contained by larger subnets", () => {
                    for (let i = 63; i > 0; i--) {
                        const larger = new IP6(adone.sprintf("ffff::/%d", i));

                        expect(topic.isInSubnet(larger)).to.equal(true);
                    }
                });
            });

            describe("Large subnets", () => {
                const topic = new IP6("ffff::/8");

                it("is not contained by smaller subnets", () => {
                    for (let i = 9; i <= 128; i++) {
                        const smaller = new IP6(adone.sprintf("ffff::/%d", i));

                        expect(topic.isInSubnet(smaller)).to.equal(false);
                    }
                });
            });

            describe("A canonical address", () => {
                const topic = new IP6("000a:0000:0000:0000:0000:0000:0000:000b");

                it("is 39 characters long", () => {
                    expect(topic.address.length).to.equal(39);
                });

                it("validates as canonical", () => {
                    expect(topic.isCanonical()).to.equal(true);

                    expect(topic.canonicalForm()).to.equal("000a:0000:0000:0000:0000:0000:0000:000b");
                });
            });

            describe("A v4-in-v6 address", () => {
                const topic = new IP6("::192.168.0.1");

                it("validates", () => {
                    expect(topic.isValid()).to.equal(true);
                });

                it("is v4", () => {
                    expect(topic.is4()).to.equal(true);
                });
            });

            describe("An address with a subnet", () => {
                const topic = new IP6("a:b::/48");

                it("validates", () => {
                    expect(topic.isValid()).to.equal(true);
                });

                it("parses the subnet", () => {
                    expect(topic.subnet).to.equal("/48");
                });

                it("is in its own subnet", () => {
                    expect(topic.isInSubnet(new IP6("a:b::/48"))).to.equal(true);
                });

                it("is not in another subnet", () => {
                    expect(topic.isInSubnet(new IP6("a:c::/48"))).to.equal(false);
                });
            });

            describe("An address with a zone", () => {
                const topic = new IP6("a::b%abcdefg");

                it("validates", () => {
                    expect(topic.isValid()).to.equal(true);
                });

                it("parses the zone", () => {
                    expect(topic.zone).to.equal("%abcdefg");
                });
            });

            describe("A teredo address", () => {
                const topic = new IP6("2001:0000:ce49:7601:e866:efff:62c3:fffe");

                it("validates as Teredo", () => {
                    expect(topic.isTeredo()).to.equal(true);
                });

                it("contains valid Teredo information", () => {
                    const teredo = topic.inspectTeredo();

                    expect(teredo.prefix).to.equal("2001:0000");
                    expect(teredo.server4).to.equal("206.73.118.1");
                    expect(teredo.flags).to.equal("1110100001100110");
                    expect(teredo.udpPort).to.equal("4096");
                    expect(teredo.client4).to.equal("157.60.0.1");
                });
            });

            describe("A 6to4 address", () => {
                const topic = new IP6("2002:ce49:7601:1:2de:adff:febe:eeef");

                it("validates as 6to4", () => {
                    expect(topic.is6to4()).to.equal(true);
                });

                it("contains valid 6to4 information", () => {
                    const sixToFourProperties = topic.inspect6to4();

                    expect(sixToFourProperties.prefix).to.equal("2002");
                    expect(sixToFourProperties.gateway).to.equal("206.73.118.1");
                });
            });

            describe("A different notation of the same address", () => {
                const addresses = notationsToAddresseses([
                    "2001:db8:0:0:1:0:0:1/128",
                    "2001:db8:0:0:1:0:0:1/128%eth0",
                    "2001:db8:0:0:1:0:0:1%eth0",
                    "2001:db8:0:0:1:0:0:1",
                    "2001:0db8:0:0:1:0:0:1",
                    "2001:db8::1:0:0:1",
                    "2001:db8::0:1:0:0:1",
                    "2001:0db8::1:0:0:1",
                    "2001:db8:0:0:1::1",
                    "2001:db8:0000:0:1::1",
                    "2001:DB8:0:0:1::1"
                ]);

                it("is parsed to the same result", () => {
                    addresses.forEach((topic) => {
                        expect(topic.correctForm()).to.equal("2001:db8::1:0:0:1");
                        expect(topic.canonicalForm()).to.equal("2001:0db8:0000:0000:0001:0000:0000:0001");
                        expect(topic.to4in6()).to.equal("2001:db8::1:0:0.0.0.1");
                        expect(topic.decimal()).to.equal("08193:03512:00000:00000:00001:00000:00000:00001");
                        expect(topic.binaryZeroPad()).to.equal("00100000000000010000110110111000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000001");
                    });
                });
            });

            describe("to4in6", () => {
                it("to produce a valid 4in6 address", () => {
                    const topic1 = new IP6("1:2:3:4:5:6:7:8");
                    const topic2 = new IP6("1:2:3:4::7:8");

                    expect(topic1.to4in6()).to.equal("1:2:3:4:5:6:0.7.0.8");
                    expect(topic2.to4in6()).to.equal("1:2:3:4::0.7.0.8");
                });
            });

            describe("Address from an IPv4 address", () => {
                const obj = IP6.fromIP4("192.168.0.1");

                it("should parse correctly", () => {
                    expect(obj.valid).to.equal(true);
                    expect(obj.correctForm()).to.equal("::ffff:c0a8:1");
                    expect(obj.to4in6()).to.equal("::ffff:192.168.0.1");
                });

                it("should generate a 6to4 address", () => {
                    expect(obj.to6to4().correctForm()).to.equal("2002:c0a8:1::");
                });

                it("should generate a v4 address", () => {
                    expect(obj.to4().correctForm()).to.equal("192.168.0.1");
                });
            });

            describe("Address given in ap6.arpa form", () => {
                const obj = IP6.fromArpa("e.f.f.f.3.c.2.6.f.f.f.e.6.6.8.e.1.0.6.7.9.4.e.c.0.0.0.0.1.0.0.2.ip6.arpa.");

                it("should return an Address6 object", () => {
                    expect(obj instanceof IP6).to.equal(true);
                });

                it("should generate a valid v6 address", () => {
                    expect(obj.correctForm()).to.equal("2001:0:ce49:7601:e866:efff:62c3:fffe");
                });

                it("should fail with an invalid ip6.arpa length", () => {
                    const obj = IP6.fromArpa("e.f.f.f.3.c.2.6.f.f.f.e.6.6.8.0.6.7.9.4.e.c.0.0.0.0.1.0.0.2.ip6.arpa.");

                    expect(obj.error).to.equal("Not Valid 'ip6.arpa' form");
                    expect(obj.address).to.equal(null);
                });
            });

            describe("Address inside a URL or inside a URL with a port", () => {
                it("should work with a host address", () => {
                    const obj = IP6.fromURL("2001:db8::5");

                    expect(obj.address.valid).to.equal(true);
                    expect(obj.address.address).to.equal("2001:db8::5");
                    expect(obj.port).to.equal(null);
                });

                it("should fail with an invalid URL", () => {
                    const obj = IP6.fromURL("http://zombo/foo");

                    expect(obj.error).to.equal("failed to parse address from URL");
                    expect(obj.address).to.equal(null);
                    expect(obj.port).to.equal(null);
                });

                it("should work with a basic URL", () => {
                    const obj = IP6.fromURL("http://2001:db8::5/foo");

                    expect(obj.address.isValid()).to.equal(true);
                    expect(obj.address.address).equal("2001:db8::5");
                    expect(obj.port).to.equal(null);
                });

                it("should work with a basic URL enclosed in brackets", () => {
                    const obj = IP6.fromURL("http://[2001:db8::5]/foo");

                    expect(obj.address.isValid()).to.equal(true);
                    expect(obj.address.address).equal("2001:db8::5");
                    expect(obj.port).to.equal(null);
                });

                it("should work with a URL with a port", () => {
                    const obj = IP6.fromURL("http://[2001:db8::5]:80/foo");

                    expect(obj.address.isValid()).to.equal(true);
                    expect(obj.address.address).to.equal("2001:db8::5");
                    expect(obj.port).to.equal(80);
                });

                it("should work with a URL with a long port number", () => {
                    const obj = IP6.fromURL("http://[2001:db8::5]:65536/foo");

                    expect(obj.address.isValid()).to.equal(true);
                    expect(obj.address.address).to.equal("2001:db8::5");
                    expect(obj.port).to.equal(65536);
                });

                it("should work with a address with a port", () => {
                    const obj = IP6.fromURL("[2001:db8::5]:80");

                    expect(obj.address.isValid()).to.equal(true);
                    expect(obj.address.address).to.equal("2001:db8::5");
                    expect(obj.port).to.equal(80);
                });

                it("should work with an address with a long port", () => {
                    const obj = IP6.fromURL("[2001:db8::5]:65536");

                    expect(obj.address.isValid()).to.equal(true);
                    expect(obj.address.address).to.equal("2001:db8::5");
                    expect(obj.port).to.equal(65536);
                });

                it("should parse the address but fail with an invalid port", () => {
                    const obj = IP6.fromURL("[2001:db8::5]:65537");

                    expect(obj.address.isValid()).to.equal(true);
                    expect(obj.address.address).to.equal("2001:db8::5");
                    expect(obj.port).to.equal(null);
                });

                it("should fail with an invalid address and not return a port",
                    () => {
                        const obj = IP6.fromURL("[2001:db8:z:5]:65536");

                        expect(obj.error).to.equal("failed to parse address with port");
                        expect(obj.port).to.equal(null);
                    });
            });

            describe("An address from a BigNumber", () => {
                const topic = IP6.fromBigNumber(new adone.math.BigNumber("51923840109643282840007714694758401"));

                it("should parse correctly", () => {
                    expect(topic.valid).to.equal(true);

                    // TODO: Define this behavior
                    // topic.isCorrect().to.equal(true);

                    expect(topic.correctForm()).to.equal("a:b:c:d:e:f:0:1");
                });
            });

            describe("HTML helpers", () => {
                describe("href", () => {
                    const topic = new IP6("2001:4860:4001:803::1011");

                    it("should generate a URL correctly", () => {
                        expect(topic.href()).to.equal("http://[2001:4860:4001:803::1011]/");
                        expect(topic.href(8080)).to.equal("http://[2001:4860:4001:803::1011]:8080/");
                    });
                });

                describe("link", () => {
                    const topic = new IP6("2001:4860:4001:803::1011");

                    it("should generate an anchor correctly", () => {
                        expect(topic.link()).to.equal("<a href=\"/#address=2001:4860:4001:803::1011\">2001:4860:4001:803::1011</a>");

                        expect(topic.link({ className: "highlight", prefix: "/?address=" })).to.equal("<a href=\"/?address=2001:4860:4001:803::1011\" class=\"highlight\">2001:4860:4001:803::1011</a>");
                    });

                    it("should generate a v4inv6 anchor correctly", () => {
                        const topic4 = new IP6("::ffff:c0a8:1");

                        expect(topic4.link({ v4: true })).to.equal("<a href=\"/#address=::ffff:192.168.0.1\">::ffff:192.168.0.1</a>");
                    });
                });

                describe("group", () => {
                    it("should group a fully ellided address", () => {
                        const topic = new IP6("::");

                        expect(topic.group()).to.equal(":<span class=\"hover-group group-0 group-1 group-2 group-3 group-4 group-5 group-6 group-7\"></span>:");
                    });

                    it("should group an address with no ellision", () => {
                        const topic = new IP6("a:b:c:d:1:2:3:4");

                        expect(topic.group()).to.equal(
                            "<span class=\"hover-group group-0\">a</span>:" +
                            "<span class=\"hover-group group-1\">b</span>:" +
                            "<span class=\"hover-group group-2\">c</span>:" +
                            "<span class=\"hover-group group-3\">d</span>:" +
                            "<span class=\"hover-group group-4\">1</span>:" +
                            "<span class=\"hover-group group-5\">2</span>:" +
                            "<span class=\"hover-group group-6\">3</span>:" +
                            "<span class=\"hover-group group-7\">4</span>");
                    });

                    it("should group an ellided address", () => {
                        const topic = new IP6("2001:4860:4001:803::1011");

                        expect(topic.group()).to.equal(
                            "<span class=\"hover-group group-0\">2001</span>:" +
                            "<span class=\"hover-group group-1\">4860</span>:" +
                            "<span class=\"hover-group group-2\">4001</span>:" +
                            "<span class=\"hover-group group-3\">803</span>:" +
                            "<span class=\"hover-group group-4 group-5 " +
                            "group-6\"></span>:" +
                            "<span class=\"hover-group group-7\">1011</span>");
                    });

                    it("should group an IPv4 address", () => {
                        const topic = new IP6("192.168.0.1");

                        expect(topic.group()).to.equal(
                            "<span class=\"hover-group group-v4 group-6\">192.168</span>." +
                            "<span class=\"hover-group group-v4 group-7\">0.1</span>");
                    });
                });
            });

            describe("String helpers", () => {
                describe("spanLeadingZeroes", () => {
                    it("should span leading zeroes", () => {
                        const topic = v6helpers.spanLeadingZeroes("0000:0000:4444:0001");

                        expect(topic).to.equal(
                            "<span class=\"zero\">0000</span>:" +
                            "<span class=\"zero\">0000</span>:4444:" +
                            "<span class=\"zero\">000</span>1");
                    });
                });

                describe("spanAll", () => {
                    it("should span leading zeroes", () => {
                        const topic = v6helpers.spanAll("001100");

                        expect(topic).to.equal(
                            "<span class=\"digit value-0 position-0\">" +
                            "<span class=\"zero\">0</span></span>" +
                            "<span class=\"digit value-0 position-1\">" +
                            "<span class=\"zero\">0</span></span>" +
                            "<span class=\"digit value-1 position-2\">1</span>" +
                            "<span class=\"digit value-1 position-3\">1</span>" +
                            "<span class=\"digit value-0 position-4\">" +
                            "<span class=\"zero\">0</span></span>" +
                            "<span class=\"digit value-0 position-5\">" +
                            "<span class=\"zero\">0</span></span>");
                    });

                    it("should span leading zeroes with offset", () => {
                        const topic = v6helpers.spanAll("001100", 1);

                        expect(topic).to.equal(
                            "<span class=\"digit value-0 position-1\">" +
                            "<span class=\"zero\">0</span></span>" +
                            "<span class=\"digit value-0 position-2\">" +
                            "<span class=\"zero\">0</span></span>" +
                            "<span class=\"digit value-1 position-3\">1</span>" +
                            "<span class=\"digit value-1 position-4\">1</span>" +
                            "<span class=\"digit value-0 position-5\">" +
                            "<span class=\"zero\">0</span></span>" +
                            "<span class=\"digit value-0 position-6\">" +
                            "<span class=\"zero\">0</span></span>");
                    });
                });
            });
        });
    });
});
