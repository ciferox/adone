describe("encryption", () => {
    const {
        crypto
    } = adone;

    const forge = require("node-forge");
    const UTIL = forge.util;
    const PSS = forge.pss;
    const MGF = forge.mgf;
    const RANDOM = forge.random;

    const tests = [{
        keySize: 1024,
        privateKeyPem: "-----BEGIN RSA PRIVATE KEY-----\r\n" +
          "MIICWwIBAAKBgQDCjvkkLWNTeYXqEsqGiVCW/pDt3/qAodNMHcU9gOU2rxeWwiRu\r\n" +
          "OhhLqmMxXHLi0oP5Xmg0m7zdOiLMEyzzyRzdp21aqp3k5qtuSDkZcf1prsp1jpYm\r\n" +
          "6z9EGpaSHb64BCuUsQGmUPKutd5RERKHGZXtiRuvvIyue7ETq6VjXrOUHQIDAQAB\r\n" +
          "AoGAOKeBjTNaVRhyEnNeXkbmHNIMSfiK7aIx8VxJ71r1ZDMgX1oxWZe5M29uaxVM\r\n" +
          "rxg2Lgt7tLYVDSa8s0hyMptBuBdy3TJUWruDx85uwCrWnMerCt/iKVBS22fv5vm0\r\n" +
          "LEq/4gjgIVTZwgqbVxGsBlKcY2VzxAfYqYzU8EOZBeNhZdECQQDy+PJAPcUN2xOs\r\n" +
          "6qy66S91x6y3vMjs900OeX4+bgT4VSVKmLpqRTPizzcL07tT4+Y+pAAOX6VstZvZ\r\n" +
          "6iFDL5rPAkEAzP1+gaRczboKoJWKJt0uEMUmztcY9NXJFDmjVLqzKwKjcAoGgIal\r\n" +
          "h+uBFT9VJ16QajC7KxTRLlarzmMvspItUwJAeUMNhEpPwm6ID1DADDi82wdgiALM\r\n" +
          "NJfn+UVhYD8Ac//qsKQwxUDseFH6owh1AZVIIBMxg/rwUKUCt2tGVoW3uQJAIt6M\r\n" +
          "Aml/D8+xtxc45NuC1n9y1oRoTl1/Ut1rFyKbD5nnS0upR3uf9LruvjqDtaq0Thvz\r\n" +
          "+qQT4RoFJ5pfprSO2QJAdMkfNWRqECfAhZyQuUrapeWU3eQ0wjvktIynCIwiBDd2\r\n" +
          "MfjmVXzBJhMk6dtINt+vBEITVQEOdtyTgDt0y3n2Lw==\r\n" +
          "-----END RSA PRIVATE KEY-----\r\n",
        publicKeyPem: "-----BEGIN PUBLIC KEY-----\r\n" +
          "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDCjvkkLWNTeYXqEsqGiVCW/pDt\r\n" +
          "3/qAodNMHcU9gOU2rxeWwiRuOhhLqmMxXHLi0oP5Xmg0m7zdOiLMEyzzyRzdp21a\r\n" +
          "qp3k5qtuSDkZcf1prsp1jpYm6z9EGpaSHb64BCuUsQGmUPKutd5RERKHGZXtiRuv\r\n" +
          "vIyue7ETq6VjXrOUHQIDAQAB\r\n" +
          "-----END PUBLIC KEY-----\r\n",
        encrypted: "jsej3OoacmJ1VjWrlw68F+drnQORAuKAqVu6RMbz1xSXjzA355vctrJZXolRU0mvzuu/6VuNynkKGGyRJ6DHt85CvwTMChw4tOMV4Dy6bgnUt3j+DZA2sWTwFhOlpzvNQMK70QpuqrXtOZmAO59EwoDeJkW/iH6t4YzNOVYo9Jg=",
        signature: "GT0/3EV2zrXxPd1ydijJq3R7lkI4c0GtcprgpG04dSECv/xyXtikuzivxv7XzUdHpu6QiYmM0xE4D4i7LK3Mzy+f7aB4o/dg8XXO3htLiBzVI+ZJCRh06RdYctPtclAWmyZikZ8Etw3NnA/ldKuG4jApbwRb21UFm5gYLrJ4SP4=",
        signaturePss: "F4xffaANDBjhFxeSJx8ANuBbdhaWZjUHRQh4ueYQMPPCaR2mpwdqxE04sbgNgIiZzBuLIAI4HpTMMoDk3Rruhjefx3+9UhzTxgB0hRI+KzRChRs+ToltWWDZdYzt9T8hfTlELeqT4V8HgjDuteO/IAvIVlRIBwMNv53Iebu1FY4=",
        signatureWithAbcSalt: "GYA/Zp8G+jqG2Fu7Um+XP7Cr/yaVdzJN8lyt57Lw6gFflia2CPbOVMLyqLzD7fKoE8UD0Rc6DF8k04xhEu60sudw2nxGHeDvpL4M9du0uYra/WSr9kv7xNjAW62NyNerDngHD2J7O8gQ07TZiTXkrfS724vQab5xZL/+FhvisMY=",
        signatureWithCustomPrng: "LzWcUpUYK+URDp72hJbz1GVEp0rG0LHjd+Pdh2w5rfQFbUThbmXDl3X6DUT5UZr5RjUSHtc2usvH+w49XskyIJJO929sUk9EkMJMK/6QAnYYEp5BA+48pdGNNMZyjIbhyl9Y4lInzFPX8XYMM8o+tdSK+hj+dW5OPdnwWbDtR7U="
    }, {
        keySize: 1025,
        privateKeyPem: "-----BEGIN RSA PRIVATE KEY-----\r\n" +
          "MIICXgIBAAKBgQGIkej4PDlAigUh5fbbHp1WXuTHhOdQfAke+LoH0TM4uzn0QmgK\r\n" +
          "SJqxzB1COJ5o0DwZw/NR+CNy7NUrly+vmh2YPwsaqN+AsYBF9qsF93oN8/TBtaL/\r\n" +
          "GRoRGpDcCglkj1kZnDaWR79NsG8mC0TrvQCkcCLOP0c2Ux1hRbntOetGXwIDAQAB\r\n" +
          "AoGBAIaJWsoX+ZcAthmT8jHOICXFh6pJBe0zVPzkSPz82Q0MPSRUzcsYbsuYJD7Z\r\n" +
          "oJBTLQW3feANpjhwqe2ydok7y//ONm3Th53Bcu8jLfoatg4KYxNFIwXEO10mPOld\r\n" +
          "VuDIGrBkTABe6q2P5PeUKGCKLT6i/u/2OTXTrQiJbQ0gU8thAkEBjqcFivWMXo34\r\n" +
          "Cb9/EgfWCCtv9edRMexgvcFMysRsbHJHDK9JjRLobZltwtAv3cY7F3a/Cu1afg+g\r\n" +
          "jAzm5E3gowJBAPwYFHTLzaZToxFKNQztWrPsXF6YfqHpPUUIpT4UzL6DhGG0M00U\r\n" +
          "qMyhkYRRqmGOSrSovjg2hjM2643MUUWxUxUCQDPkk/khu5L3YglKzyy2rmrD1MAq\r\n" +
          "y0v3XCR3TBq89Ows+AizrJxbkLvrk/kfBowU6M5GG9o9SWFNgXWZnFittocCQQDT\r\n" +
          "e1P1419DUFi1UX6NuLTlybx3sxBQvf0jY6xUF1jn3ib5XBXJbTJqcIRF78iyjI9J\r\n" +
          "XWIugDc20bTsQOJRSAA9AkEBU8kpueHBaiXTikqqlK9wvc2Lp476hgyKVmVyBGye\r\n" +
          "9TLTWkTCzDPtManLy47YtXkXnmyazS+DlKFU61XAGEnZfg==\r\n" +
          "-----END RSA PRIVATE KEY-----\r\n",
        publicKeyPem: "-----BEGIN PUBLIC KEY-----\r\n" +
          "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQGIkej4PDlAigUh5fbbHp1WXuTH\r\n" +
          "hOdQfAke+LoH0TM4uzn0QmgKSJqxzB1COJ5o0DwZw/NR+CNy7NUrly+vmh2YPwsa\r\n" +
          "qN+AsYBF9qsF93oN8/TBtaL/GRoRGpDcCglkj1kZnDaWR79NsG8mC0TrvQCkcCLO\r\n" +
          "P0c2Ux1hRbntOetGXwIDAQAB\r\n" +
          "-----END PUBLIC KEY-----\r\n",
        encrypted: "AOVeCUN8BOVkZvt4mxyNn/yCYE1MZ40A3e/osh6EvCBcJ09hyYbx7bzKSrdkhRnDyW0pGtgP352CollasllQZ9HlfI2Wy9zKM0aYZZn8OHBA+60Tc3xHHDGznLZqggUKuhoNpj+faVZ1uzb285eTpQQa+4mLUue2svJD4ViM8+ng",
        signature: "AFSx0axDYXlF2rO3ofgUhYSI8ZlIWtJUUZ62PhgdBp9O5zFqMX3DXoiov1e7NenSOz1khvTSMctFWzKP3GU3F0yewe+Yd3UAZE0dM8vAxigSSfAchUkBDmp9OFuszUie63zwWwpG+gXtvyfueZs1RniBvW1ZmXJvS+HFgX4ouzwd",
        signaturePss: "AQvBdhAXDpu+7RpcybMgwuTUk6w+qa08Lcq3G1xHY4kC7ZUzauZd/Jn9e0ePKApDqs7eDNAOV+dQkU2wiH/uBg6VGelzb0hFwcpSLyBW92Vw0q3GlzY7myWn8qnNzasrt110zFflWQa1GiuzH/C8f+Z82/MzlWDxloJIYbq2PRC8",
        signatureWithAbcSalt: "AW4bKnG/0TGvAZgqX5Dk+fXpUNgX7INFelE46d3m+spaMTG5XalY0xP1sxWfaE/+Zl3FmZcfTNtfOCo0eNRO1h1+GZZfp32ZQZmZvkdUG+dUQp318LNzgygrVf/5iIX+QKV5/soSDuAHBzS7yDfMgzJfnXNpFE/zPLOgZIoOIuLq",
        signatureWithCustomPrng: "AVxfCyGC/7Y3kz//eYFEuWQijjR7eR05AM36CwDlLsVkDRtXoeVzz2yTFBdP+i+QgQ73C/I3lLtvXTwfleorvIX9YncVBeGDQXssmULxzqsM3izaLfJXCRAGx9ErL1Az10+fAqPZpq954OVSDqrR/61Q7CsMY7CiQO3nfIIaxgVL"
    }, {
        keySize: 1031,
        privateKeyPem: "-----BEGIN RSA PRIVATE KEY-----\r\n" +
          "MIICXwIBAAKBgWyeKqA2oA4klYrKT9hjjutYQksJNN0cxwaQwIm9AYiLxOsYtT/C\r\n" +
          "ovJx5Oy1EvkbYQbfvYsGISUx9bW8yasZkTHR55IbW3+UptvQjTDtdxBQTgQOpsAh\r\n" +
          "BJtZYY3OmyH9Sj3F3oB//oyriNoj0QYyfsvlO8UsMmLzpnf6qfZBDHA/9QIDAQAB\r\n" +
          "AoGBBj/3ne5muUmbnTfU7lOUNrCGaADonMx6G0ObAJHyk6PPOePbEgcmDyNEk+Y7\r\n" +
          "aEAODjIzmttIbvZ39/Qb+o9nDmCSZC9VxiYPP+rjOzPglCDT5ks2Xcjwzd3If6Ya\r\n" +
          "Uw6P31Y760OCYeTb4Ib+8zz5q51CkjkdX5Hq/Yu+lZn0Vx7BAkENo83VfL+bwxTm\r\n" +
          "V7vR6gXqTD5IuuIGHL3uTmMNNURAP6FQDHu//duipys83iMChcOeXtboE16qYrO0\r\n" +
          "9KC0cqL4JQJBB/aYo/auVUGZA6f50YBp0b2slGMk9TBQG0iQefuuSyH4kzKnt2e3\r\n" +
          "Q40SBmprcM+DfttWJ11bouec++goXjz+95ECQQyiTWYRxulgKVuyqCYnvpLnTEnR\r\n" +
          "0MoYlVTHBriVPkLErYaYCYgse+SNM1+N4p/Thv6KmkUcq/Lmuc5DSRfbl1iBAkEE\r\n" +
          "7GKtJQvd7EO1bfpXnARQx+tWhwHHkgpFBBVHReMZ0rQEFhJ5o2c8HZEiZFNvGO2c\r\n" +
          "1fErP14zlu2JFZ03vpCI8QJBCQz9HL28VNjafSAF2mon/SNjKablRjoGGKSoSdyA\r\n" +
          "DHDZ/LeRsTp2dg8+bSiG1R+vPqw0f/BT+ux295Sy9ocGEM8=\r\n" +
          "-----END RSA PRIVATE KEY-----\r\n",
        publicKeyPem: "-----BEGIN PUBLIC KEY-----\r\n" +
          "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgWyeKqA2oA4klYrKT9hjjutYQksJ\r\n" +
          "NN0cxwaQwIm9AYiLxOsYtT/CovJx5Oy1EvkbYQbfvYsGISUx9bW8yasZkTHR55Ib\r\n" +
          "W3+UptvQjTDtdxBQTgQOpsAhBJtZYY3OmyH9Sj3F3oB//oyriNoj0QYyfsvlO8Us\r\n" +
          "MmLzpnf6qfZBDHA/9QIDAQAB\r\n" +
          "-----END PUBLIC KEY-----\r\n",
        encrypted: "ShSS4/fEAkuS6XiQakhOpWp82IXaaCaDNtsndU4uokvriqgCGZyqc+IkIk3eVmZ8bn4vVIRR43ydFuvGgsptVjizOdLGZudph3TJ1clcYEMcCXk4z5HaEu0bx5SW9jmzHhE/z+WV8PB48q7y7C2qtmPmfttG2NMsNLBvkiaDopRO",
        signature: "Z3vYgRdezrWmdA3NC1Uz2CcHRTcE+/C2idGZA1FjUGqFztAHQ31k0QW/F5zuJdKvg8LQU45S3KxW+OQpbGPL98QbzJLhml88mFGe6OinLXJbi7UQWrtXwamc2jMdiXwovSLbXaXy6PX2QW089iC8XuAZftVi3T/IKV0458FQQprg",
        signaturePss: "R6QsK6b3QinIPZPamm/dP0Zndqti1TzAkFTRSZJaRSa1u2zuvZC5QHF4flDjEtHosWeDyxrBE7PHGQZ0b1bHv9qgHGsJCMwaQPj3AWj9fjYmx7b86KM2vHr8q/vqDaa9pTvVRSSwvD6fwoZPc9twQEfdjdDBAiy23yLDzk/zZiwM",
        signatureWithAbcSalt: "Ep9qx4/FPNcWTixWhvL2IAyJR69o5I4MIJi3cMAhDmpuTvAaL/ThQwFWkBPPOPT4Jbumnu6ELjPNjo72wa00e5k64qnZgy1pauBPMlXRlKehRc9UJZ6+xot642z8Qs+rt89OgbYTsvlyr8lzXooUHz/lPpfawYCqd7maRMs8YlYM",
        signatureWithCustomPrng: "NHAwyn2MdM5ez/WbDNbu2A2JNS+cRiWk/zBoh0lg3aq/RsBS0nrYr4AGiC5jt6KWVcN4AIVOomYtX2k+MhLoemN2t2rDj/+LXOeU7kgCAz0q0ED2NFQz7919JU+PuYXMy03qTMfl5jbvStdi/00eQHjJKGEH+xAgrDcED2lrhtCu"
    }, {
        keySize: 1032,
        privateKeyPem: "-----BEGIN RSA PRIVATE KEY-----\r\n" +
          "MIICYQIBAAKBggDPhzn5I3GecxWt5DKbP+VhM2AFNSOL0+VbYEOR1hnlZdLbxGK4\r\n" +
          "cPQzMr2qT6dyttJcsgWr3xKobPkz7vsTZzQATSiekm5Js5dGpaj5lrq/x2+WTZvn\r\n" +
          "55x9M5Y5dlpusDMKcC3KaIX/axc+MbvPFzo6Eli7JLCWdBg01eKo30knil0CAwEA\r\n" +
          "AQKBggCNl/sjFF7SOD1jbt5kdL0hi7cI9o+xOLs1lEGmAEmc7dNnZN/ibhb/06/6\r\n" +
          "wuxB5aEz47bg5IvLZMbG+1hNjc26D0J6Y3Ltwrg8f4ZMdDrh4v0DZ8hy/HbEpMrJ\r\n" +
          "Td5dk3mtw9FLow10MB5udPLTDKhfDpTcWiObKm2STtFeBk3xeEECQQ6Cx6bZxQJ1\r\n" +
          "zCxflV5Xi8BgAQaUKMqygugte+HpOLflL0j1fuZ0rPosUyDOEFkTzOsPxBYYOU8i\r\n" +
          "Gzan1GvW3WwRAkEOTTRt849wpgC9xx2pF0IrYEVmv5gEMy3IiRfCNgEoBwpTWVf4\r\n" +
          "QFpN3V/9GFz0WQEEYo6OTmkNcC3Of5zbHhu1jQJBBGxXAYQ2KnbP4uLL/DMBdYWO\r\n" +
          "Knw1JvxdLPrYXVejI2MoE7xJj2QXajbirAhEMXL4rtpicj22EmoaE4H7HVgkrJEC\r\n" +
          "QQq2V5w4AGwvW4TLHXNnYX/eB33z6ujScOuxjGNDUlBqHZja5iKkCUAjnl+UnSPF\r\n" +
          "exaOwBrlrpiLOzRer94MylKNAkEBmI58bqfkI5OCGDArAsJ0Ih58V0l1UW35C1SX\r\n" +
          "4yDoXSM5A/xQu2BJbXO4jPe3PnDvCVCEyKpbCK6bWbe26Y7zuw==\r\n" +
          "-----END RSA PRIVATE KEY-----\r\n",
        publicKeyPem: "-----BEGIN PUBLIC KEY-----\r\n" +
          "MIGgMA0GCSqGSIb3DQEBAQUAA4GOADCBigKBggDPhzn5I3GecxWt5DKbP+VhM2AF\r\n" +
          "NSOL0+VbYEOR1hnlZdLbxGK4cPQzMr2qT6dyttJcsgWr3xKobPkz7vsTZzQATSie\r\n" +
          "km5Js5dGpaj5lrq/x2+WTZvn55x9M5Y5dlpusDMKcC3KaIX/axc+MbvPFzo6Eli7\r\n" +
          "JLCWdBg01eKo30knil0CAwEAAQ==\r\n" +
          "-----END PUBLIC KEY-----\r\n",
        encrypted: "pKTbv+xgXPDc+wbjsANFu1/WTcmy4aZFKXKnxddHbU5S0Dpdj2OqCACiBwu1oENPMgPAJ27XRbFtKG+eS8tX47mKP2Fo0Bi+BPFtzuQ1bj3zUzTwzjemT+PU+a4Tho/eKjPhm6xrwGAoQH2VEDEpvcYf+SRmGFJpJ/zPUrSxgffj",
        signature: "R9WBFprCfcIC4zY9SmBpEM0E+cr5j4gMn3Ido5mktoR9VBoJqC6eR6lubIPvZZUz9e4yUSYX0squ56Q9Y0yZFQjTHgsrlmhB2YW8kpv4h8P32Oz2TLcMJK9R2tIh9vvyxwBkd/Ml1qG60GnOFUFzxUad9VIlzaF1PFR6EfnkgBUW",
        signaturePss: "v9UBd4XzBxSRz8yhWKjUkFpBX4Fr2G+ImjqbePL4sAZvYw1tWL+aUQpzG8eOyMxxE703VDh9nIZULYI/uIb9HYHQoGYQ3WoUaWqtZg1x8pZP+Ad7ilUWk5ImRl57fTznNQiVdwlkS5Wgheh1yJCES570a4eujiK9OyB0ba4rKIcM",
        signatureWithAbcSalt: "HCm0FI1jE6wQgwwi0ZwPTkGjssxAPtRh6tWXhNd2J2IoJYj9oQMMjCEElnvQFBa/l00sIsw2YV1tKyoTABaSTGV4vlJcDF+K0g/wiAf30TRUZo72DZKDNdyffDlH0wBDkNVW+F6uqdciJqBC6zz+unNh7x+FRwYaY8xhudIPXdyP",
        signatureWithCustomPrng: "AGyN8xu+0yfCR1tyB9mCXcTGb2vdLnsX9ro2Qy5KV6Hw5YMVNltAt65dKR4Y8pfu6D4WUyyJRUtJ8td2ZHYzIVtWY6bG1xFt5rkjTVg4v1tzQgUQq8AHvRE2qLzwDXhazJ1e6Id2Nuxb1uInFyRC6/gLmiPga1WRDEVvFenuIA48"
    }];

    /**
     * Creates RSA encryption & decryption tests.
     *
     * Uses different key sizes (1024, 1025, 1031, 1032). The test functions are
     * generated from "templates" below, one for each key size to provide sensible
     * output.
     *
     * Key material in was created with OpenSSL using these commands:
     *
     * openssl genrsa -out rsa_1024_private.pem 1024
     * openssl rsa -in rsa_1024_private.pem -out rsa_1024_public.pem \
     *   -outform PEM -pubout
     * echo 'too many secrets' | openssl rsautl -encrypt \
     *   -inkey rsa_1024_public.pem -pubin -out rsa_1024_encrypted.bin
     *
     * echo -n 'just testing' | openssl dgst -sha1 -binary > tosign.sha1
     * openssl pkeyutl -sign -in tosign.sha1 -inkey rsa_1024_private.pem \
     *   -out rsa_1024_sig.bin -pkeyopt digest:sha1
     * openssl pkeyutl -sign -in tosign.sha1 -inkey rsa_1024_private.pem \
     *   -out rsa_1024_sigpss.bin -pkeyopt digest:sha1 \
     *   -pkeyopt rsa_padding_mode:pss -pkeyopt rsa_pss_saltlen:20
     *
     * OpenSSL commands for signature verification:
     *
     * openssl pkeyutl -verify -in tosign.sha1 -sigfile rsa_1024_sig.bin \
     *   -pubin -inkey rsa_1024_public.pem -pkeyopt digest:sha1
     * openssl pkeyutl -verify -in tosign.sha1 -sigfile rsa_1025_sigpss.bin \
     *   -pubin -inkey rsa_1025_public.pem -pkeyopt digest:sha1 \
     *   -pkeyopt rsa_padding_mode:pss -pkeyopt rsa_pss_saltlen:20
     */
    const createTests = (params) => {
        const keySize = params.keySize;

        it(`should rsa encrypt using a ${keySize}-bit key`, () => {
            const message = "it need's to be about 20% cooler"; // it need's better grammar too

            /**
             * First step, do public key encryption
             */
            let key = crypto.pki.publicKeyFromPem(params.publicKeyPem);
            const data = key.encrypt(message);

            /**
             * Second step, use private key decryption to verify successful
             * encryption. The encrypted message differs every time, since it is
             * padded with random data. Therefore just rely on the decryption
             * routine to work, which is tested seperately against an externally
             */
            key = crypto.pki.privateKeyFromPem(params.privateKeyPem);
            assert.equal(key.decrypt(data), message);
        });

        it(`should rsa decrypt using a ${keySize}-bit key`, () => {
            const data = UTIL.decode64(params.encrypted);
            const key = crypto.pki.privateKeyFromPem(params.privateKeyPem);
            assert.equal(key.decrypt(data), "too many secrets\n");
        });

        it(`should rsa sign using a ${keySize}-bit key and PKCS#1 v1.5 padding`, () => {
            const key = crypto.pki.privateKeyFromPem(params.privateKeyPem);

            const md = crypto.md.sha1.create();
            md.start();
            md.update("just testing");

            const signature = UTIL.decode64(params.signature);
            assert.equal(key.sign(md), signature);
        });

        it(`should verify an rsa signature using a ${keySize}-bit key and PKCS#1 v1.5 padding`, () => {
            const signature = UTIL.decode64(params.signature);
            const key = crypto.pki.publicKeyFromPem(params.publicKeyPem);

            const md = crypto.md.sha1.create();
            md.start();
            md.update("just testing");

            assert.equal(key.verify(md.digest().getBytes(), signature), true);
        });

        /**
         * Note: signatures are *not* deterministic (the point of RSASSA-PSS),
         * so they can't be compared easily -- instead they are just verified
         * using the verify() function which is tested against OpenSSL-generated
         */
        it(`should rsa sign using a ${keySize}-bit key and PSS padding`, () => {
            const privateKey = crypto.pki.privateKeyFromPem(params.privateKeyPem);
            const publicKey = crypto.pki.publicKeyFromPem(params.publicKeyPem);

            const md = crypto.md.sha1.create();
            md.start();
            md.update("just testing");

            // create signature
            const pss = PSS.create(
                crypto.md.sha1.create(), MGF.mgf1.create(crypto.md.sha1.create()), 20);
            const signature = privateKey.sign(md, pss);

            // verify signature
            md.start();
            md.update("just testing");
            assert.equal(
                publicKey.verify(md.digest().getBytes(), signature, pss), true);
        });

        it(`should verify an rsa signature using a ${keySize}-bit key and PSS padding`, () => {
            const signature = UTIL.decode64(params.signaturePss);
            const key = crypto.pki.publicKeyFromPem(params.publicKeyPem);

            const md = crypto.md.sha1.create();
            md.start();
            md.update("just testing");

            const pss = PSS.create(
                crypto.md.sha1.create(), MGF.mgf1.create(crypto.md.sha1.create()), 20);
            assert.equal(
                key.verify(md.digest().getBytes(), signature, pss), true);
        });

        it(`should rsa sign using a ${keySize}-bit key and PSS padding using pss named-param API`, () => {
            const privateKey = crypto.pki.privateKeyFromPem(params.privateKeyPem);
            const publicKey = crypto.pki.publicKeyFromPem(params.publicKeyPem);

            const md = crypto.md.sha1.create();
            md.start();
            md.update("just testing");

            // create signature
            const pss = PSS.create({
                md: crypto.md.sha1.create(),
                mgf: MGF.mgf1.create(crypto.md.sha1.create()),
                saltLength: 20
            });
            const signature = privateKey.sign(md, pss);

            // verify signature
            md.start();
            md.update("just testing");
            assert.equal(
                publicKey.verify(md.digest().getBytes(), signature, pss), true);
        });

        it(`should verify an rsa signature using a ${keySize}-bit key and PSS padding using pss named-param API`, () => {
            const signature = UTIL.decode64(params.signaturePss);
            const key = crypto.pki.publicKeyFromPem(params.publicKeyPem);

            const md = crypto.md.sha1.create();
            md.start();
            md.update("just testing");

            const pss = PSS.create({
                md: crypto.md.sha1.create(),
                mgf: MGF.mgf1.create(crypto.md.sha1.create()),
                saltLength: 20
            });
            assert.equal(
                key.verify(md.digest().getBytes(), signature, pss), true);
        });

        it(`should rsa sign using a ${keySize}-bit key and PSS padding using salt "abc"`, () => {
            const privateKey = crypto.pki.privateKeyFromPem(params.privateKeyPem);

            const md = crypto.md.sha1.create();
            md.start();
            md.update("just testing");

            // create signature
            const pss = PSS.create({
                md: crypto.md.sha1.create(),
                mgf: MGF.mgf1.create(crypto.md.sha1.create()),
                salt: UTIL.createBuffer("abc")
            });
            const signature = privateKey.sign(md, pss);
            const b64 = UTIL.encode64(signature);
            assert.equal(b64, params.signatureWithAbcSalt);
        });

        it(`should verify an rsa signature using a ${keySize}-bit key and PSS padding using salt "abc"`, () => {
            const signature = UTIL.decode64(params.signatureWithAbcSalt);
            const key = crypto.pki.publicKeyFromPem(params.publicKeyPem);

            const md = crypto.md.sha1.create();
            md.start();
            md.update("just testing");

            const pss = PSS.create({
                md: crypto.md.sha1.create(),
                mgf: MGF.mgf1.create(crypto.md.sha1.create()),
                saltLength: 3
            });
            assert.equal(
                key.verify(md.digest().getBytes(), signature, pss), true);
        });

        it(`should rsa sign using a ${keySize}-bit key and PSS padding using custom PRNG`, () => {
            const prng = RANDOM.createInstance();
            prng.seedFileSync = function (needed) {
                return UTIL.fillString("a", needed);
            };
            const privateKey = crypto.pki.privateKeyFromPem(params.privateKeyPem);

            const md = crypto.md.sha1.create();
            md.start();
            md.update("just testing");

            // create signature
            const pss = PSS.create({
                md: crypto.md.sha1.create(),
                mgf: MGF.mgf1.create(crypto.md.sha1.create()),
                saltLength: 20,
                prng
            });
            const signature = privateKey.sign(md, pss);
            const b64 = UTIL.encode64(signature);
            assert.equal(b64, params.signatureWithCustomPrng);
        });

        it(`should verify an rsa signature using a ${keySize}-bit key and PSS padding using custom PRNG`, () => {
            const prng = RANDOM.createInstance();
            prng.seedFileSync = function (needed) {
                return UTIL.fillString("a", needed);
            };
            const signature = UTIL.decode64(params.signatureWithCustomPrng);
            const key = crypto.pki.publicKeyFromPem(params.publicKeyPem);

            const md = crypto.md.sha1.create();
            md.start();
            md.update("just testing");

            const pss = PSS.create({
                md: crypto.md.sha1.create(),
                mgf: MGF.mgf1.create(crypto.md.sha1.create()),
                saltLength: 20,
                prng
            });
            assert.equal(
                key.verify(md.digest().getBytes(), signature, pss), true);
        });
    };

    for (const t of tests) {
        createTests(t);
    }

    it("should ensure maximum message length for a 1024-bit key is exceeded", () => {
        /**
         * For PKCS#1 v1.5, the message must be padded with at least eight bytes,
         * two zero bytes and one byte telling what the block type is. This is 11
         * extra bytes are added to the message. The test uses a message of 118
         * bytes.Together with the 11 extra bytes the encryption block needs to be
         */
        const key = crypto.pki.publicKeyFromPem(tests[0].publicKeyPem);
        const message = UTIL.createBuffer().fillWithByte(0, 118);
        assert.throws(() => {
            key.encrypt(message.getBytes());
        });
    });

    it("should ensure maximum message length for a 1025-bit key is not exceeded", () => {
        const key = crypto.pki.publicKeyFromPem(tests[1].publicKeyPem);
        const message = UTIL.createBuffer().fillWithByte(0, 118);
        assert.doesNotThrow(() => {
            key.encrypt(message.getBytes());
        });
    });
});
