const {
    crypto: { hash: { sha3: { sha3_512, sha3_384, sha3_256, sha3_224, keccak512, keccak384, keccak256, keccak224, shake256, shake128, cshake256, cshake128, kmac256, kmac128 } } }
} = adone;

describe("crypto", "sha3", () => {
    Array.prototype.toHexString = ArrayBuffer.prototype.toHexString = function () {
        const array = new Uint8Array(this);
        let hex = "";
        for (let i = 0; i < array.length; ++i) {
            const c = array[i].toString("16");
            hex += c.length == 1 ? `0${c}` : c;
        }
        return hex;
    };

    const testCases = {
        sha3_512: {
            ascii: {
                a69f73cca23a9ac5c8b567dc185a756e97c982164fe25859e0d1dcc1475c80a615b2123af1f5f94c11e3e9402c3ac558f500199d95b6d3e301758586281dcd26: "",
                "01dedd5de4ef14642445ba5f5b97c15e47b9ad931326e4b0727cd94cefc44fff23f07bf543139939b49128caf436dc1bdee54fcb24023a08d9403f9b4bf0d450": "The quick brown fox jumps over the lazy dog",
                "18f4f4bd419603f95538837003d9d254c26c23765565162247483f65c50303597bc9ce4d289f21d1c2f1f458828e33dc442100331b35e7eb031b5d38ba6460f8": "The quick brown fox jumps over the lazy dog."
            },
            "ascii more than 128 bytes": {
                "4f8bcf3a60d3ee56a0bd405c3e6bb37dac44b6781c41bf76c91a5d8e621d472b7b13b8806d88914af3d97585df996363ebe17566d5dfeb6f4884a7949ba8263d": "The MD5 message-digest algorithm is a widely used cryptographic hash function producing a 128-bit (16-byte) hash value, typically expressed in text format as a 32 digit hexadecimal number. MD5 has been utilized in a wide variety of cryptographic applications, and is also commonly used to verify data integrity."
            },
            "UTF-8": {
                "059bbe2efc50cc30e4d8ec5a96be697e2108fcbf9193e1296192eddabc13b143c0120d059399a13d0d42651efe23a6c1ce2d1efb576c5b207fa2516050505af7": "中文",
                "35dfaf82d2ce4be79393dc90e327b4dd15b1c150d8a30f59d8d1b42ca4fc3c87f50b77da36acccf9dc76494d07fc57cfcc9470e627c38f95bce4deab311b87e0": "aécio",
                "33ef254289f36527c93cd203ef1973aec1eff7475c23fa842c3092b0d30965d13b0805c61d0aa92c51245c56bfe26978c35c00f26eb558a043982043ee8b178c": "𠜎"
            },
            "UTF-8 more than 128 bytes": {
                accb127bb24b0ffbb7550dc637222d2f78538a8a186c98bc5efdad685b9b396639f34148bf0b94ed470f0e9c3665dc3b4c1cb321bacd32dd317a646295e073d9: "訊息摘要演算法第五版（英語：Message-Digest Algorithm 5，縮寫為MD5），是當前電腦領域用於確保資訊傳輸完整一致而廣泛使用的雜湊演算法之一",
                "5b70eaad083f1b86fd535b6812e02f5f2876a4bd8b43aede8d62ae71bb1743ebd919dc41be56d73ba45b67b2876ff215d0575788560e7b0c92b879f8a2fc3111": "訊息摘要演算法第五版（英語：Message-Digest Algorithm 5，縮寫為MD5），是當前電腦領域用於確保資訊傳輸完整一致而廣泛使用的雜湊演算法之一（又譯雜湊演算法、摘要演算法等），主流程式語言普遍已有MD5的實作。"
            },
            "special length": {
                bce9da5b408846edd5bec9f26c2dee9bd835215c3f2b3876197067d87bc4d1af0cd97f94fda59761a0d804fe82383be2c6c4886fbb82e005fcf899449029f221: "012345678901234567890123456789012345678901234567890123456789012345678901",
                "8bdcb85e6b52c29fafac0d3daf65492f2e3499e066da1a095a65eb1144849a26b2790a8b39c2a7fb747456f749391d953841a61cb13289f9806f04981c180a86": "01234567890123456789012345678901234567890123456789012345678901234567890"
            },
            Array: {
                a69f73cca23a9ac5c8b567dc185a756e97c982164fe25859e0d1dcc1475c80a615b2123af1f5f94c11e3e9402c3ac558f500199d95b6d3e301758586281dcd26: [],
                "01dedd5de4ef14642445ba5f5b97c15e47b9ad931326e4b0727cd94cefc44fff23f07bf543139939b49128caf436dc1bdee54fcb24023a08d9403f9b4bf0d450": [84, 104, 101, 32, 113, 117, 105, 99, 107, 32, 98, 114, 111, 119, 110, 32, 102, 111, 120, 32, 106, 117, 109, 112, 115, 32, 111, 118, 101, 114, 32, 116, 104, 101, 32, 108, 97, 122, 121, 32, 100, 111, 103]
            }
        },
        sha3_384: {
            ascii: {
                "0c63a75b845e4f7d01107d852e4c2485c51a50aaaa94fc61995e71bbee983a2ac3713831264adb47fb6bd1e058d5f004": "",
                "7063465e08a93bce31cd89d2e3ca8f602498696e253592ed26f07bf7e703cf328581e1471a7ba7ab119b1a9ebdf8be41": "The quick brown fox jumps over the lazy dog",
                "1a34d81695b622df178bc74df7124fe12fac0f64ba5250b78b99c1273d4b080168e10652894ecad5f1f4d5b965437fb9": "The quick brown fox jumps over the lazy dog."
            },
            "ascii more than 128 bytes": {
                ca6b121a6060bc85de05e5a8d70577838fad2481b092c8263d6f7bcbe5148740f0c7f9c4dc27061339570496956aaef6: "The MD5 message-digest algorithm is a widely used cryptographic hash function producing a 128-bit (16-byte) hash value, typically expressed in text format as a 32 digit hexadecimal number. MD5 has been utilized in a wide variety of cryptographic applications, and is also commonly used to verify data integrity."
            },
            "UTF-8": {
                "9fb5b99e3c546f2738dcd50a14e9aef9c313800c1bf8cf76bc9b2c3a23307841364c5a2d0794702662c5796fb72f5432": "中文",
                "70b447f1bd5ce5a4753ccf7a3697eca0315954774374bc1042aff19582ccc32d5067f7da6c2bea9d6d344e11924cbe72": "aécio",
                "7add8d544b0a7cf188b54b1697a046f77e49d5f292e7ffe56feeed90a500b0bf026b9b68892888a1bafb9f8cb89ed874": "𠜎"
            },
            "UTF-8 more than 128 bytes": {
                "7d0f80fe5c79a04a2a37a30a440e0cc068eb78fe6c3182246ede29645c144b5d33c44607cb2c3111ba77ffc66107f1cd": "訊息摘要演算法第五版（英語：Message-Digest Algorithm 5，縮寫為MD5），是當前電腦領域用於確保資訊傳輸完整一致而廣泛使用的雜湊演算法之一",
                e344b95c6a961a27793eff00fa5103ef78b4180fe41c93fc60a31aff49b3b5e95a92c84fda9a6c80fa403b7df58db59f: "訊息摘要演算法第五版（英語：Message-Digest Algorithm 5，縮寫為MD5），是當前電腦領域用於確保資訊傳輸完整一致而廣泛使用的雜湊演算法之一（又譯雜湊演算法、摘要演算法等），主流程式語言普遍已有MD5的實作。"
            }
        },
        sha3_256: {
            ascii: {
                a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a: "",
                "69070dda01975c8c120c3aada1b282394e7f032fa9cf32f4cb2259a0897dfc04": "The quick brown fox jumps over the lazy dog",
                a80f839cd4f83f6c3dafc87feae470045e4eb0d366397d5c6ce34ba1739f734d: "The quick brown fox jumps over the lazy dog."
            },
            "ascii more than 128 bytes": {
                fa198893674a0bf9fb35980504e8cefb250aabd2311a37e5d2205f07fb023d36: "The MD5 message-digest algorithm is a widely used cryptographic hash function producing a 128-bit (16-byte) hash value, typically expressed in text format as a 32 digit hexadecimal number. MD5 has been utilized in a wide variety of cryptographic applications, and is also commonly used to verify data integrity."
            },
            "UTF-8": {
                ac5305da3d18be1aed44aa7c70ea548da243a59a5fd546f489348fd5718fb1a0: "中文",
                "65c756408eb6c35a1ffa2d7e09711bdc9f0b28716b1376223844a2b4c52b6718": "aécio",
                babe9afc555b0311700dfb0b5b6296d49347b3d770480baedfcdc47a4aea6e82: "𠜎"
            },
            "UTF-8 more than 128 bytes": {
                "4b2f36e4320b86e6ead0ad001e47e6d9e7fcf0044cd5a5fd65490a633c0372a4": "訊息摘要演算法第五版（英語：Message-Digest Algorithm 5，縮寫為MD5），是當前電腦領域用於確保資訊傳輸完整一致而廣泛使用的雜湊演算法之一",
                "558a7f843b1ac5e7a8bbef90357876bcce0612992d0dfa2907e95521612f507f": "訊息摘要演算法第五版（英語：Message-Digest Algorithm 5，縮寫為MD5），是當前電腦領域用於確保資訊傳輸完整一致而廣泛使用的雜湊演算法之一（又譯雜湊演算法、摘要演算法等），主流程式語言普遍已有MD5的實作。"
            }
        },
        sha3_224: {
            ascii: {
                "6b4e03423667dbb73b6e15454f0eb1abd4597f9a1b078e3f5b5a6bc7": "",
                d15dadceaa4d5d7bb3b48f446421d542e08ad8887305e28d58335795: "The quick brown fox jumps over the lazy dog",
                "2d0708903833afabdd232a20201176e8b58c5be8a6fe74265ac54db0": "The quick brown fox jumps over the lazy dog."
            },
            "ascii more than 128 bytes": {
                "06885009a28e43e15bf1af718561ad211515a27b542eabc36764a0ca": "The MD5 message-digest algorithm is a widely used cryptographic hash function producing a 128-bit (16-byte) hash value, typically expressed in text format as a 32 digit hexadecimal number. MD5 has been utilized in a wide variety of cryptographic applications, and is also commonly used to verify data integrity."
            },
            "UTF-8": {
                "106d169e10b61c2a2a05554d3e631ec94467f8316640f29545d163ee": "中文",
                b16bad54608dc01864a5d7510d4c19b09f3a0f39cfc4ba1e53aa952a: "aécio",
                f59253c41cb87e5cd953311656716cb5b64dbafc9e8155f0dd68123c: "𠜎"
            },
            "UTF-8 more than 128 bytes": {
                "135c13deb71fdf6fb77b52b720c43ddd6ce7467f9147a74248557114": "訊息摘要演算法第五版（英語：Message-Digest Algorithm 5，縮寫為MD5），是當前電腦領域用於確保資訊傳輸完整一致而廣泛使用的雜湊演算法之一",
                bd05581e02445c53e05aad2014f6a3819d77a9dff918b8c6bf60bd06: "訊息摘要演算法第五版（英語：Message-Digest Algorithm 5，縮寫為MD5），是當前電腦領域用於確保資訊傳輸完整一致而廣泛使用的雜湊演算法之一（又譯雜湊演算法、摘要演算法等），主流程式語言普遍已有MD5的實作。"
            }
        },
        keccak512: {
            ascii: {
                "0eab42de4c3ceb9235fc91acffe746b29c29a8c366b7c60e4e67c466f36a4304c00fa9caf9d87976ba469bcbe06713b435f091ef2769fb160cdab33d3670680e": "",
                d135bb84d0439dbac432247ee573a23ea7d3c9deb2a968eb31d47c4fb45f1ef4422d6c531b5b9bd6f449ebcc449ea94d0a8f05f62130fda612da53c79659f609: "The quick brown fox jumps over the lazy dog",
                ab7192d2b11f51c7dd744e7b3441febf397ca07bf812cceae122ca4ded6387889064f8db9230f173f6d1ab6e24b6e50f065b039f799f5592360a6558eb52d760: "The quick brown fox jumps over the lazy dog."
            },
            "ascii more than 128 bytes": {
                "10dcbf6389980ce3594547939bbc685363d28adbd6a05bc4abd7fc62e7693a1f6e33569fed5a380bfecb56ae811d25939b95823f39bb0f16a08740629d066d43": "The MD5 message-digest algorithm is a widely used cryptographic hash function producing a 128-bit (16-byte) hash value, typically expressed in text format as a 32 digit hexadecimal number. MD5 has been utilized in a wide variety of cryptographic applications, and is also commonly used to verify data integrity."
            },
            "UTF-8": {
                "2f6a1bd50562230229af34b0ccf46b8754b89d23ae2c5bf7840b4acfcef86f87395edc0a00b2bfef53bafebe3b79de2e3e01cbd8169ddbb08bde888dcc893524": "中文",
                c452ec93e83d4795fcab62a76eed0d88f2231a995ce108ac8f130246f87c4a11cb18a2c1a688a5695906a6f863e71bbe8997c6610319ab97f12d2e5bf0afe458: "aécio",
                "8a2d72022ce19d989dbe6a0017faccbf5dc2e22c162d1c5eb168864d32dd1a71e1b4782652c148cf6ca47b77a72c96fff682e72bdfef0566d4b7cca3c9ccc59d": "𠜎"
            },
            "UTF-8 more than 128 bytes": {
                "6a67c28aa1946ca1be8382b861aac4aaf20052f495db9b6902d13adfa603eaba5d169f8896b86d461b2949283eb98e503c3f0640188ea7d6731526fc06568d37": "訊息摘要演算法第五版（英語：Message-Digest Algorithm 5，縮寫為MD5），是當前電腦領域用於確保資訊傳輸完整一致而廣泛使用的雜湊演算法之一",
                d04ff5b0e85e9968be2a4d4e133c15c7ccee7497198bb651599a97d11d00bca6048d329ab75aa454566cd532648fa1cb4551985d9d645de9fa43a311a9ee8e4d: "訊息摘要演算法第五版（英語：Message-Digest Algorithm 5，縮寫為MD5），是當前電腦領域用於確保資訊傳輸完整一致而廣泛使用的雜湊演算法之一（又譯雜湊演算法、摘要演算法等），主流程式語言普遍已有MD5的實作。"
            }
        },
        keccak384: {
            ascii: {
                "2c23146a63a29acf99e73b88f8c24eaa7dc60aa771780ccc006afbfa8fe2479b2dd2b21362337441ac12b515911957ff": "",
                "283990fa9d5fb731d786c5bbee94ea4db4910f18c62c03d173fc0a5e494422e8a0b3da7574dae7fa0baf005e504063b3": "The quick brown fox jumps over the lazy dog",
                "9ad8e17325408eddb6edee6147f13856ad819bb7532668b605a24a2d958f88bd5c169e56dc4b2f89ffd325f6006d820b": "The quick brown fox jumps over the lazy dog."
            },
            "ascii more than 128 bytes": {
                e7ec8976b4d96e43f50ae8ecdcf2d97a56236e6406e8dd00efd0d9abe885659db58a2f4b138a4ecfb1bd0052f6569516: "The MD5 message-digest algorithm is a widely used cryptographic hash function producing a 128-bit (16-byte) hash value, typically expressed in text format as a 32 digit hexadecimal number. MD5 has been utilized in a wide variety of cryptographic applications, and is also commonly used to verify data integrity."
            },
            "UTF-8": {
                "743f64bb7544c6ed923be4741b738dde18b7cee384a3a09c4e01acaaac9f19222cdee137702bd3aa05dc198373d87d6c": "中文",
                "08990555e131af8597687614309da4c5053ce866f348544da0a0c2c78c2cc79680ebb57cfbe238286e78ea133a037897": "aécio",
                "2a80f59abf3111f38a35a3daa25123b495f90e9736bd300e35911d19abdd8806498c581333f198ccbbf2252b57c2925d": "𠜎"
            },
            "UTF-8 more than 128 bytes": {
                a3b043a2f69e4326a05d478fa4c8aa2bd7612453d775af37665a0b96ef2207cdc74c50cdba1629796a5136fe77300b05: "訊息摘要演算法第五版（英語：Message-Digest Algorithm 5，縮寫為MD5），是當前電腦領域用於確保資訊傳輸完整一致而廣泛使用的雜湊演算法之一",
                "66414c090cc3fe9c396d313cbaa100aefd335e851838b29382568b7f57357ada7c54b8fa8c17f859945bba88b2c2e332": "訊息摘要演算法第五版（英語：Message-Digest Algorithm 5，縮寫為MD5），是當前電腦領域用於確保資訊傳輸完整一致而廣泛使用的雜湊演算法之一（又譯雜湊演算法、摘要演算法等），主流程式語言普遍已有MD5的實作。"
            }
        },
        keccak256: {
            ascii: {
                c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470: "",
                "4d741b6f1eb29cb2a9b9911c82f56fa8d73b04959d3d9d222895df6c0b28aa15": "The quick brown fox jumps over the lazy dog",
                "578951e24efd62a3d63a86f7cd19aaa53c898fe287d2552133220370240b572d": "The quick brown fox jumps over the lazy dog."
            },
            "ascii more than 128 bytes": {
                af20018353ffb50d507f1555580f5272eca7fdab4f8295db4b1a9ad832c93f6d: "The MD5 message-digest algorithm is a widely used cryptographic hash function producing a 128-bit (16-byte) hash value, typically expressed in text format as a 32 digit hexadecimal number. MD5 has been utilized in a wide variety of cryptographic applications, and is also commonly used to verify data integrity."
            },
            "UTF-8": {
                "70a2b6579047f0a977fcb5e9120a4e07067bea9abb6916fbc2d13ffb9a4e4eee": "中文",
                d7d569202f04daf90432810d6163112b2695d7820da979327ebd894efb0276dc: "aécio",
                "16a7cc7a58444cbf7e939611910ddc82e7cba65a99d3e8e08cfcda53180a2180": "𠜎"
            },
            "UTF-8 more than 128 bytes": {
                d1021d2d4c5c7e88098c40f422af68493b4b64c913cbd68220bf5e6127c37a88: "訊息摘要演算法第五版（英語：Message-Digest Algorithm 5，縮寫為MD5），是當前電腦領域用於確保資訊傳輸完整一致而廣泛使用的雜湊演算法之一",
                ffabf9bba2127c4928d360c9905cb4911f0ec21b9c3b89f3b242bccc68389e36: "訊息摘要演算法第五版（英語：Message-Digest Algorithm 5，縮寫為MD5），是當前電腦領域用於確保資訊傳輸完整一致而廣泛使用的雜湊演算法之一（又譯雜湊演算法、摘要演算法等），主流程式語言普遍已有MD5的實作。"
            }
        },
        keccak224: {
            ascii: {
                f71837502ba8e10837bdd8d365adb85591895602fc552b48b7390abd: "",
                "310aee6b30c47350576ac2873fa89fd190cdc488442f3ef654cf23fe": "The quick brown fox jumps over the lazy dog",
                c59d4eaeac728671c635ff645014e2afa935bebffdb5fbd207ffdeab: "The quick brown fox jumps over the lazy dog."
            },
            "ascii more than 128 bytes": {
                "8dd58b706e3a08ec4f1f202af39295b38c355a39b23308ade7218a21": "The MD5 message-digest algorithm is a widely used cryptographic hash function producing a 128-bit (16-byte) hash value, typically expressed in text format as a 32 digit hexadecimal number. MD5 has been utilized in a wide variety of cryptographic applications, and is also commonly used to verify data integrity."
            },
            "UTF-8": {
                "7bc2a0b6e7e0a055a61e4f731e2944b560f41ff98967dcbf4bbf77a5": "中文",
                "66f3db76bf8cb35726cb278bac412d187c3484ab2083dc50ef5ffb55": "aécio",
                "3bfa94845726f4cd5cf17d19b5eacac17b3694790e13a76d5c81c7c2": "𠜎"
            },
            "UTF-8 more than 128 bytes": {
                d59eef8f394ef7d96967bb0bde578785c033f7f0a21913d6ba41ed1b: "訊息摘要演算法第五版（英語：Message-Digest Algorithm 5，縮寫為MD5），是當前電腦領域用於確保資訊傳輸完整一致而廣泛使用的雜湊演算法之一",
                "27123a2a3860d1041d4769778c4b078732bf4300f7e1c56536ab2644": "訊息摘要演算法第五版（英語：Message-Digest Algorithm 5，縮寫為MD5），是當前電腦領域用於確保資訊傳輸完整一致而廣泛使用的雜湊演算法之一（又譯雜湊演算法、摘要演算法等），主流程式語言普遍已有MD5的實作。"
            }
        }
    };

    testCases.sha3_512.Uint8Array = {
        a69f73cca23a9ac5c8b567dc185a756e97c982164fe25859e0d1dcc1475c80a615b2123af1f5f94c11e3e9402c3ac558f500199d95b6d3e301758586281dcd26: new Uint8Array([]),
        "01dedd5de4ef14642445ba5f5b97c15e47b9ad931326e4b0727cd94cefc44fff23f07bf543139939b49128caf436dc1bdee54fcb24023a08d9403f9b4bf0d450": new Uint8Array([84, 104, 101, 32, 113, 117, 105, 99, 107, 32, 98, 114, 111, 119, 110, 32, 102, 111, 120, 32, 106, 117, 109, 112, 115, 32, 111, 118, 101, 114, 32, 116, 104, 101, 32, 108, 97, 122, 121, 32, 100, 111, 103])
    };
    testCases.sha3_512.ArrayBuffer = {
        a69f73cca23a9ac5c8b567dc185a756e97c982164fe25859e0d1dcc1475c80a615b2123af1f5f94c11e3e9402c3ac558f500199d95b6d3e301758586281dcd26: new ArrayBuffer(0),
        "01dedd5de4ef14642445ba5f5b97c15e47b9ad931326e4b0727cd94cefc44fff23f07bf543139939b49128caf436dc1bdee54fcb24023a08d9403f9b4bf0d450": new Uint8Array([84, 104, 101, 32, 113, 117, 105, 99, 107, 32, 98, 114, 111, 119, 110, 32, 102, 111, 120, 32, 106, 117, 109, 112, 115, 32, 111, 118, 101, 114, 32, 116, 104, 101, 32, 108, 97, 122, 121, 32, 100, 111, 103]).buffer
    };

    testCases.sha3_512.Buffer = {
        a69f73cca23a9ac5c8b567dc185a756e97c982164fe25859e0d1dcc1475c80a615b2123af1f5f94c11e3e9402c3ac558f500199d95b6d3e301758586281dcd26: Buffer.alloc(0),
        "01dedd5de4ef14642445ba5f5b97c15e47b9ad931326e4b0727cd94cefc44fff23f07bf543139939b49128caf436dc1bdee54fcb24023a08d9403f9b4bf0d450": Buffer.from(new Uint8Array([84, 104, 101, 32, 113, 117, 105, 99, 107, 32, 98, 114, 111, 119, 110, 32, 102, 111, 120, 32, 106, 117, 109, 112, 115, 32, 111, 118, 101, 114, 32, 116, 104, 101, 32, 108, 97, 122, 121, 32, 100, 111, 103]))
    };

    const errorTestCases = [null, undefined, { length: 0 }, 0, 1, false, true, NaN, Infinity, function () { }];

    const runTestCases = function (name, algorithm) {
        const methods = [
            {
                name,
                call: algorithm
            },
            {
                name: `${name}.hex`,
                call: algorithm.hex
            },
            {
                name: `${name}.array`,
                call(message) {
                    return algorithm.array(message).toHexString();
                }
            },
            {
                name: `${name}.digest`,
                call(message) {
                    return algorithm.digest(message).toHexString();
                }
            },
            {
                name: `${name}.arrayBuffer`,
                call(message) {
                    return algorithm.arrayBuffer(message).toHexString();
                }
            }
        ];

        const classMethods = [
            {
                name: "create",
                call(message) {
                    return algorithm.create().update(message).toString();
                }
            },
            {
                name: "update",
                call(message) {
                    return algorithm.update(message).toString();
                }
            },
            {
                name: "hex",
                call(message) {
                    return algorithm.update(message).hex();
                }
            },
            {
                name: "array",
                call(message) {
                    return algorithm.update(message).array().toHexString();
                }
            },
            {
                name: "digest",
                call(message) {
                    return algorithm.update(message).digest().toHexString();
                }
            },
            {
                name: "arrayBuffer",
                call(message) {
                    return algorithm.update(message).arrayBuffer().toHexString();
                }
            },
            {
                name: "finalize",
                call(message) {
                    const hash = algorithm.update(message);
                    hash.hex();
                    hash.update(message);
                    return hash.hex();
                }
            }
        ];

        const subTestCases = testCases[name];

        describe(name, () => {
            methods.forEach((method) => {
                describe(`#${method.name}`, () => {
                    for (const testCaseName in subTestCases) {
                        (function (testCaseName) {
                            const testCase = subTestCases[testCaseName];
                            describe(`when ${testCaseName}`, () => {
                                for (const hash in testCase) {
                                    (function (message, hash) {
                                        it("should be equal", () => {
                                            assert.equal(method.call(message), hash);
                                        });
                                    })(testCase[hash], hash);
                                }
                            });
                        })(testCaseName);
                    }
                });
            });

            classMethods.forEach((method) => {
                describe(`#${method.name}`, () => {
                    for (const testCaseName in subTestCases) {
                        (function (testCaseName) {
                            const testCase = subTestCases[testCaseName];
                            describe(`when ${testCaseName}`, () => {
                                for (const hash in testCase) {
                                    (function (message, hash) {
                                        it("should be equal", () => {
                                            assert.equal(method.call(message), hash);
                                        });
                                    })(testCase[hash], hash);
                                }
                            });
                        })(testCaseName);
                    }
                });
            });

            describe(`#${name}`, () => {
                errorTestCases.forEach((testCase) => {
                    describe(`when ${testCase}`, () => {
                        it("should throw error", () => {
                            assert.throws(() => {
                                algorithm(testCase);
                            }, /input is invalid type/);
                        });
                    });
                });
            });
        });
    };

    runTestCases("sha3_512", sha3_512);
    runTestCases("sha3_384", sha3_384);
    runTestCases("sha3_256", sha3_256);
    runTestCases("sha3_224", sha3_224);
    runTestCases("keccak512", keccak512);
    runTestCases("keccak384", keccak384);
    runTestCases("keccak256", keccak256);
    runTestCases("keccak224", keccak224);

    describe("#keccak512", () => {
        describe("#encodeString", () => {
            errorTestCases.forEach((testCase) => {
                describe(`when ${testCase}`, () => {
                    it("should throw error", () => {
                        assert.throws(() => {
                            keccak512.create().encodeString(testCase);
                        }, /input is invalid type/);
                    });
                });
            });

            describe("when ArrayBuffer", () => {
                it("should throw error", () => {
                    assert.equal(keccak512.create().encodeString(new ArrayBuffer(0)), 2);
                });
            });
            describe("when Uint8Array", () => {
                it("should throw error", () => {
                    assert.equal(keccak512.create().encodeString(new Uint8Array(0)), 2);
                });
            });

            describe("when UTF-8", () => {
                it("should throw error", () => {
                    assert.equal(keccak512.create().encodeString("中文"), 8);
                    assert.equal(keccak512.create().encodeString("aécio"), 8);
                    assert.equal(keccak512.create().encodeString("𠜎"), 6);
                });
            });
        });
    });


    describe("#shake128", () => {
        describe("with 256 output", () => {
            it("should be equal", () => {
                assert.equal(shake128("", 256), "7f9c2ba4e88f827d616045507605853ed73b8093f6efbc88eb1a6eacfa66ef26");
                assert.equal(shake128("The quick brown fox jumps over the lazy dog", 256), "f4202e3c5852f9182a0430fd8144f0a74b95e7417ecae17db0f8cfeed0e3e66e");
                assert.equal(shake128("The quick brown fox jumps over the lazy dof", 256), "853f4538be0db9621a6cea659a06c1107b1f83f02b13d18297bd39d7411cf10c");
            });
        });

        describe("with 8 output", () => {
            it("should be equal", () => {
                assert.equal(shake128("", 8), "7f");
                assert.equal(shake128("The quick brown fox jumps over the lazy dog", 8), "f4");
                assert.equal(shake128("The quick brown fox jumps over the lazy dof", 8), "85");
            });
        });

        describe("with 1368 output", () => {
            it("should be equal", () => {
                assert.equal(shake128("AAA", 1368), "15e0fe495a05b74f9fd3eaa8a898a623488220dcbf9ba2f12d23d278b7cecfa4a5e4b8d0fccb0fdbc9e51cd0b4344a32a83f0ba40a514a7b86a77c854c61b836192849da9214c43c4f8bc09ec7a76af92b2fc56e4952024be65b1a47835e0bc014733b24d0e31197ca648f831caebbfd8a5b237ae6bdc9d6cc803a2c5e57dd9346eecf972bd85450f18a413dc6239982e1eb6e0c6df856385c9597d0320edb40b6fe60a74f07524015ad36");
                assert.equal(shake128("AAA", 1376), "15e0fe495a05b74f9fd3eaa8a898a623488220dcbf9ba2f12d23d278b7cecfa4a5e4b8d0fccb0fdbc9e51cd0b4344a32a83f0ba40a514a7b86a77c854c61b836192849da9214c43c4f8bc09ec7a76af92b2fc56e4952024be65b1a47835e0bc014733b24d0e31197ca648f831caebbfd8a5b237ae6bdc9d6cc803a2c5e57dd9346eecf972bd85450f18a413dc6239982e1eb6e0c6df856385c9597d0320edb40b6fe60a74f07524015ad36b6");
            });
        });

        describe("with more output", () => {
            it("should be equal", () => {
                assert.equal(shake128("", 16), "7f9c");
                assert.equal(shake128("", 24), "7f9c2b");
                assert.deepEqual(shake128.array("", 8), [0x7f]);
                assert.deepEqual(shake128.array("", 16), [0x7f, 0x9c]);
                assert.deepEqual(shake128.array("", 24), [0x7f, 0x9c, 0x2b]);
            });
        });

        describe("with 8 output ArrayBuffer", () => {
            it("should be equal", () => {
                assert.equal(shake128.buffer("", 8).toHexString(), "7f");
                assert.equal(shake128.buffer("The quick brown fox jumps over the lazy dog", 8).toHexString(), "f4");
                assert.equal(shake128.buffer("The quick brown fox jumps over the lazy dof", 8).toHexString(), "85");
            });
        });

        describe("#update", () => {
            it("should be equal", () => {
                assert.equal(shake128.update("", 256).hex(), "7f9c2ba4e88f827d616045507605853ed73b8093f6efbc88eb1a6eacfa66ef26");
                assert.equal(shake128.update("The quick brown fox ", 256).update("jumps over the lazy dog").hex(), "f4202e3c5852f9182a0430fd8144f0a74b95e7417ecae17db0f8cfeed0e3e66e");
            });
        });
    });

    describe("#shake256", () => {
        describe("with 512 output", () => {
            it("should be equal", () => {
                assert.equal(shake256("", 512), "46b9dd2b0ba88d13233b3feb743eeb243fcd52ea62b81b82b50c27646ed5762fd75dc4ddd8c0f200cb05019d67b592f6fc821c49479ab48640292eacb3b7c4be");
            });
        });
        describe("with 8 output", () => {
            it("should be equal", () => {
                assert.equal(shake256("", 8), "46");
            });
        });

        describe("with 1112 output", () => {
            it("should be equal", () => {
                assert.equal(shake256("AAA", 1112), "419614c8b247ee5e9f4a540f7aaa5ca5b44b119f47ab7f494c05095ae5a61ab6b62c84b8b27888813ce8a4d4dab3ed7617c6bab643aa01bb1b113e6d48c3e1eeb73e96f96ffaf12e0c36b190404982b856087acfcb467535e17152e5c15a4d62a18a15d8fe434b3a7274362b0d46b627df1e011a1d037e161d5b540df7ebadab351fb730904daa9a4f40fd");
                assert.equal(shake256("AAA", 1120), "419614c8b247ee5e9f4a540f7aaa5ca5b44b119f47ab7f494c05095ae5a61ab6b62c84b8b27888813ce8a4d4dab3ed7617c6bab643aa01bb1b113e6d48c3e1eeb73e96f96ffaf12e0c36b190404982b856087acfcb467535e17152e5c15a4d62a18a15d8fe434b3a7274362b0d46b627df1e011a1d037e161d5b540df7ebadab351fb730904daa9a4f40fdb5");
            });
        });

        describe("with 4100 output", () => {
            it("should be equal", () => {
                // https://raw.githubusercontent.com/gvanas/KeccakCodePackage/master/TestVectors/ShortMsgKAT_SHAKE256.txt
                // Len = 0, Msg = 00
                assert.equal(shake256("", 4100), "46b9dd2b0ba88d13233b3feb743eeb243fcd52ea62b81b82b50c27646ed5762fd75dc4ddd8c0f200cb05019d67b592f6fc821c49479ab48640292eacb3b7c4be141e96616fb13957692cc7edd0b45ae3dc07223c8e92937bef84bc0eab862853349ec75546f58fb7c2775c38462c5010d846c185c15111e595522a6bcd16cf86f3d122109e3b1fdd943b6aec468a2d621a7c06c6a957c62b54dafc3be87567d677231395f6147293b68ceab7a9e0c58d864e8efde4e1b9a46cbe854713672f5caaae314ed9083dab4b099f8e300f01b8650f1f4b1d8fcf3f3cb53fb8e9eb2ea203bdc970f50ae55428a91f7f53ac266b28419c3778a15fd248d339ede785fb7f5a1aaa96d313eacc890936c173cdcd0fab882c45755feb3aed96d477ff96390bf9a66d1368b208e21f7c10d04a3dbd4e360633e5db4b602601c14cea737db3dcf722632cc77851cbdde2aaf0a33a07b373445df490cc8fc1e4160ff118378f11f0477de055a81a9eda57a4a2cfb0c83929d310912f729ec6cfa36c6ac6a75837143045d791cc85eff5b21932f23861bcf23a52b5da67eaf7baae0f5fb1369db78f3ac45f8c4ac5671d85735cdddb09d2b1e34a1fc066ff4a162cb263d6541274ae2fcc865f618abe27c124cd8b074ccd516301b91875824d09958f341ef274bdab0bae316339894304e35877b0c28a9b1fd166c796b9cc258a064a8f57e27f2a");

                // Len = 2040
                // Msg = 3A3A819C48EFDE2AD914FBF00E18AB6BC4F14513AB27D0C178A188B61431E7F5623CB66B23346775D386B50E982C493ADBBFC54B9A3CD383382336A1A0B2150A15358F336D03AE18F666C7573D55C4FD181C29E6CCFDE63EA35F0ADF5885CFC0A3D84A2B2E4DD24496DB789E663170CEF74798AA1BBCD4574EA0BBA40489D764B2F83AADC66B148B4A0CD95246C127D5871C4F11418690A5DDF01246A0C80A43C70088B6183639DCFDA4125BD113A8F49EE23ED306FAAC576C3FB0C1E256671D817FC2534A52F5B439F72E424DE376F4C565CCA82307DD9EF76DA5B7C4EB7E085172E328807C02D011FFBF33785378D79DC266F6A5BE6BB0E4A92ECEEBAEB1
                assert.equal(shake256([0x3A, 0x3A, 0x81, 0x9C, 0x48, 0xEF, 0xDE, 0x2A, 0xD9, 0x14, 0xFB, 0xF0, 0x0E, 0x18, 0xAB, 0x6B, 0xC4, 0xF1, 0x45, 0x13, 0xAB, 0x27, 0xD0, 0xC1, 0x78, 0xA1, 0x88, 0xB6, 0x14, 0x31, 0xE7, 0xF5, 0x62, 0x3C, 0xB6, 0x6B, 0x23, 0x34, 0x67, 0x75, 0xD3, 0x86, 0xB5, 0x0E, 0x98, 0x2C, 0x49, 0x3A, 0xDB, 0xBF, 0xC5, 0x4B, 0x9A, 0x3C, 0xD3, 0x83, 0x38, 0x23, 0x36, 0xA1, 0xA0, 0xB2, 0x15, 0x0A, 0x15, 0x35, 0x8F, 0x33, 0x6D, 0x03, 0xAE, 0x18, 0xF6, 0x66, 0xC7, 0x57, 0x3D, 0x55, 0xC4, 0xFD, 0x18, 0x1C, 0x29, 0xE6, 0xCC, 0xFD, 0xE6, 0x3E, 0xA3, 0x5F, 0x0A, 0xDF, 0x58, 0x85, 0xCF, 0xC0, 0xA3, 0xD8, 0x4A, 0x2B, 0x2E, 0x4D, 0xD2, 0x44, 0x96, 0xDB, 0x78, 0x9E, 0x66, 0x31, 0x70, 0xCE, 0xF7, 0x47, 0x98, 0xAA, 0x1B, 0xBC, 0xD4, 0x57, 0x4E, 0xA0, 0xBB, 0xA4, 0x04, 0x89, 0xD7, 0x64, 0xB2, 0xF8, 0x3A, 0xAD, 0xC6, 0x6B, 0x14, 0x8B, 0x4A, 0x0C, 0xD9, 0x52, 0x46, 0xC1, 0x27, 0xD5, 0x87, 0x1C, 0x4F, 0x11, 0x41, 0x86, 0x90, 0xA5, 0xDD, 0xF0, 0x12, 0x46, 0xA0, 0xC8, 0x0A, 0x43, 0xC7, 0x00, 0x88, 0xB6, 0x18, 0x36, 0x39, 0xDC, 0xFD, 0xA4, 0x12, 0x5B, 0xD1, 0x13, 0xA8, 0xF4, 0x9E, 0xE2, 0x3E, 0xD3, 0x06, 0xFA, 0xAC, 0x57, 0x6C, 0x3F, 0xB0, 0xC1, 0xE2, 0x56, 0x67, 0x1D, 0x81, 0x7F, 0xC2, 0x53, 0x4A, 0x52, 0xF5, 0xB4, 0x39, 0xF7, 0x2E, 0x42, 0x4D, 0xE3, 0x76, 0xF4, 0xC5, 0x65, 0xCC, 0xA8, 0x23, 0x07, 0xDD, 0x9E, 0xF7, 0x6D, 0xA5, 0xB7, 0xC4, 0xEB, 0x7E, 0x08, 0x51, 0x72, 0xE3, 0x28, 0x80, 0x7C, 0x02, 0xD0, 0x11, 0xFF, 0xBF, 0x33, 0x78, 0x53, 0x78, 0xD7, 0x9D, 0xC2, 0x66, 0xF6, 0xA5, 0xBE, 0x6B, 0xB0, 0xE4, 0xA9, 0x2E, 0xCE, 0xEB, 0xAE, 0xB1], 4100), "8a5199b4a7e133e264a86202720655894d48cff344a928cf8347f48379cef347dfc5bcffab99b27b1f89aa2735e23d30088ffa03b9edb02b9635470ab9f1038985d55f9ca774572dd006470ea65145469609f9fa0831bf1ffd842dc24acade27bd9816e3b5bf2876cb112232a0eb4475f1dff9f5c713d9ffd4ccb89ae5607fe35731df06317949eef646e9591cf3be53add6b7dd2b6096e2b3fb06e662ec8b2d77422daad9463cd155204acdbd38e319613f39f99b6dfb35ca9365160066db19835888c2241ff9a731a4acbb5663727aac34a401247fbaa7499e7d5ee5b69d31025e63d04c35c798bca1262d5673a9cf0930b5ad89bd485599dc184528da4790f088ebd170b635d9581632d2ff90db79665ced430089af13c9f21f6d443a818064f17aec9e9c5457001fa8dc6afbadbe3138f388d89d0e6f22f66671255b210754ed63d81dce75ce8f189b534e6d6b3539aa51e837c42df9df59c71e6171cd4902fe1bdc73fb1775b5c754a1ed4ea7f3105fc543ee0418dad256f3f6118ea77114a16c15355b42877a1db2a7df0e155ae1d8670abcec3450f4e2eec9838f895423ef63d261138baaf5d9f104cb5a957aea06c0b9b8c78b0d441796dc0350ddeabb78a33b6f1f9e68ede3d1805c7b7e2cfd54e0fad62f0d8ca67a775dc4546af9096f2edb221db42843d65327861282dc946a0ba01a11863ab2d1dfd16e3973d4");
            });
        });

        describe("with 4100 output ArrayBuffer", () => {
            it("should be equal", () => {
                // https://raw.githubusercontent.com/gvanas/KeccakCodePackage/master/TestVectors/ShortMsgKAT_SHAKE256.txt
                // Len = 0, Msg = 00
                assert.equal(shake256.buffer("", 4100).toHexString(), "46b9dd2b0ba88d13233b3feb743eeb243fcd52ea62b81b82b50c27646ed5762fd75dc4ddd8c0f200cb05019d67b592f6fc821c49479ab48640292eacb3b7c4be141e96616fb13957692cc7edd0b45ae3dc07223c8e92937bef84bc0eab862853349ec75546f58fb7c2775c38462c5010d846c185c15111e595522a6bcd16cf86f3d122109e3b1fdd943b6aec468a2d621a7c06c6a957c62b54dafc3be87567d677231395f6147293b68ceab7a9e0c58d864e8efde4e1b9a46cbe854713672f5caaae314ed9083dab4b099f8e300f01b8650f1f4b1d8fcf3f3cb53fb8e9eb2ea203bdc970f50ae55428a91f7f53ac266b28419c3778a15fd248d339ede785fb7f5a1aaa96d313eacc890936c173cdcd0fab882c45755feb3aed96d477ff96390bf9a66d1368b208e21f7c10d04a3dbd4e360633e5db4b602601c14cea737db3dcf722632cc77851cbdde2aaf0a33a07b373445df490cc8fc1e4160ff118378f11f0477de055a81a9eda57a4a2cfb0c83929d310912f729ec6cfa36c6ac6a75837143045d791cc85eff5b21932f23861bcf23a52b5da67eaf7baae0f5fb1369db78f3ac45f8c4ac5671d85735cdddb09d2b1e34a1fc066ff4a162cb263d6541274ae2fcc865f618abe27c124cd8b074ccd516301b91875824d09958f341ef274bdab0bae316339894304e35877b0c28a9b1fd166c796b9cc258a064a8f57e27f2a");

                // Len = 2040
                // Msg = 3A3A819C48EFDE2AD914FBF00E18AB6BC4F14513AB27D0C178A188B61431E7F5623CB66B23346775D386B50E982C493ADBBFC54B9A3CD383382336A1A0B2150A15358F336D03AE18F666C7573D55C4FD181C29E6CCFDE63EA35F0ADF5885CFC0A3D84A2B2E4DD24496DB789E663170CEF74798AA1BBCD4574EA0BBA40489D764B2F83AADC66B148B4A0CD95246C127D5871C4F11418690A5DDF01246A0C80A43C70088B6183639DCFDA4125BD113A8F49EE23ED306FAAC576C3FB0C1E256671D817FC2534A52F5B439F72E424DE376F4C565CCA82307DD9EF76DA5B7C4EB7E085172E328807C02D011FFBF33785378D79DC266F6A5BE6BB0E4A92ECEEBAEB1
                assert.equal(shake256.buffer([0x3A, 0x3A, 0x81, 0x9C, 0x48, 0xEF, 0xDE, 0x2A, 0xD9, 0x14, 0xFB, 0xF0, 0x0E, 0x18, 0xAB, 0x6B, 0xC4, 0xF1, 0x45, 0x13, 0xAB, 0x27, 0xD0, 0xC1, 0x78, 0xA1, 0x88, 0xB6, 0x14, 0x31, 0xE7, 0xF5, 0x62, 0x3C, 0xB6, 0x6B, 0x23, 0x34, 0x67, 0x75, 0xD3, 0x86, 0xB5, 0x0E, 0x98, 0x2C, 0x49, 0x3A, 0xDB, 0xBF, 0xC5, 0x4B, 0x9A, 0x3C, 0xD3, 0x83, 0x38, 0x23, 0x36, 0xA1, 0xA0, 0xB2, 0x15, 0x0A, 0x15, 0x35, 0x8F, 0x33, 0x6D, 0x03, 0xAE, 0x18, 0xF6, 0x66, 0xC7, 0x57, 0x3D, 0x55, 0xC4, 0xFD, 0x18, 0x1C, 0x29, 0xE6, 0xCC, 0xFD, 0xE6, 0x3E, 0xA3, 0x5F, 0x0A, 0xDF, 0x58, 0x85, 0xCF, 0xC0, 0xA3, 0xD8, 0x4A, 0x2B, 0x2E, 0x4D, 0xD2, 0x44, 0x96, 0xDB, 0x78, 0x9E, 0x66, 0x31, 0x70, 0xCE, 0xF7, 0x47, 0x98, 0xAA, 0x1B, 0xBC, 0xD4, 0x57, 0x4E, 0xA0, 0xBB, 0xA4, 0x04, 0x89, 0xD7, 0x64, 0xB2, 0xF8, 0x3A, 0xAD, 0xC6, 0x6B, 0x14, 0x8B, 0x4A, 0x0C, 0xD9, 0x52, 0x46, 0xC1, 0x27, 0xD5, 0x87, 0x1C, 0x4F, 0x11, 0x41, 0x86, 0x90, 0xA5, 0xDD, 0xF0, 0x12, 0x46, 0xA0, 0xC8, 0x0A, 0x43, 0xC7, 0x00, 0x88, 0xB6, 0x18, 0x36, 0x39, 0xDC, 0xFD, 0xA4, 0x12, 0x5B, 0xD1, 0x13, 0xA8, 0xF4, 0x9E, 0xE2, 0x3E, 0xD3, 0x06, 0xFA, 0xAC, 0x57, 0x6C, 0x3F, 0xB0, 0xC1, 0xE2, 0x56, 0x67, 0x1D, 0x81, 0x7F, 0xC2, 0x53, 0x4A, 0x52, 0xF5, 0xB4, 0x39, 0xF7, 0x2E, 0x42, 0x4D, 0xE3, 0x76, 0xF4, 0xC5, 0x65, 0xCC, 0xA8, 0x23, 0x07, 0xDD, 0x9E, 0xF7, 0x6D, 0xA5, 0xB7, 0xC4, 0xEB, 0x7E, 0x08, 0x51, 0x72, 0xE3, 0x28, 0x80, 0x7C, 0x02, 0xD0, 0x11, 0xFF, 0xBF, 0x33, 0x78, 0x53, 0x78, 0xD7, 0x9D, 0xC2, 0x66, 0xF6, 0xA5, 0xBE, 0x6B, 0xB0, 0xE4, 0xA9, 0x2E, 0xCE, 0xEB, 0xAE, 0xB1], 4100).toHexString(), "8a5199b4a7e133e264a86202720655894d48cff344a928cf8347f48379cef347dfc5bcffab99b27b1f89aa2735e23d30088ffa03b9edb02b9635470ab9f1038985d55f9ca774572dd006470ea65145469609f9fa0831bf1ffd842dc24acade27bd9816e3b5bf2876cb112232a0eb4475f1dff9f5c713d9ffd4ccb89ae5607fe35731df06317949eef646e9591cf3be53add6b7dd2b6096e2b3fb06e662ec8b2d77422daad9463cd155204acdbd38e319613f39f99b6dfb35ca9365160066db19835888c2241ff9a731a4acbb5663727aac34a401247fbaa7499e7d5ee5b69d31025e63d04c35c798bca1262d5673a9cf0930b5ad89bd485599dc184528da4790f088ebd170b635d9581632d2ff90db79665ced430089af13c9f21f6d443a818064f17aec9e9c5457001fa8dc6afbadbe3138f388d89d0e6f22f66671255b210754ed63d81dce75ce8f189b534e6d6b3539aa51e837c42df9df59c71e6171cd4902fe1bdc73fb1775b5c754a1ed4ea7f3105fc543ee0418dad256f3f6118ea77114a16c15355b42877a1db2a7df0e155ae1d8670abcec3450f4e2eec9838f895423ef63d261138baaf5d9f104cb5a957aea06c0b9b8c78b0d441796dc0350ddeabb78a33b6f1f9e68ede3d1805c7b7e2cfd54e0fad62f0d8ca67a775dc4546af9096f2edb221db42843d65327861282dc946a0ba01a11863ab2d1dfd16e3973d4");
            });
        });

        describe("with 4100 output Array", () => {
            it("should be equal", () => {
                // https://raw.githubusercontent.com/gvanas/KeccakCodePackage/master/TestVectors/ShortMsgKAT_SHAKE256.txt
                // Len = 0, Msg = 00
                assert.equal(shake256.array("", 4100).toHexString(), "46b9dd2b0ba88d13233b3feb743eeb243fcd52ea62b81b82b50c27646ed5762fd75dc4ddd8c0f200cb05019d67b592f6fc821c49479ab48640292eacb3b7c4be141e96616fb13957692cc7edd0b45ae3dc07223c8e92937bef84bc0eab862853349ec75546f58fb7c2775c38462c5010d846c185c15111e595522a6bcd16cf86f3d122109e3b1fdd943b6aec468a2d621a7c06c6a957c62b54dafc3be87567d677231395f6147293b68ceab7a9e0c58d864e8efde4e1b9a46cbe854713672f5caaae314ed9083dab4b099f8e300f01b8650f1f4b1d8fcf3f3cb53fb8e9eb2ea203bdc970f50ae55428a91f7f53ac266b28419c3778a15fd248d339ede785fb7f5a1aaa96d313eacc890936c173cdcd0fab882c45755feb3aed96d477ff96390bf9a66d1368b208e21f7c10d04a3dbd4e360633e5db4b602601c14cea737db3dcf722632cc77851cbdde2aaf0a33a07b373445df490cc8fc1e4160ff118378f11f0477de055a81a9eda57a4a2cfb0c83929d310912f729ec6cfa36c6ac6a75837143045d791cc85eff5b21932f23861bcf23a52b5da67eaf7baae0f5fb1369db78f3ac45f8c4ac5671d85735cdddb09d2b1e34a1fc066ff4a162cb263d6541274ae2fcc865f618abe27c124cd8b074ccd516301b91875824d09958f341ef274bdab0bae316339894304e35877b0c28a9b1fd166c796b9cc258a064a8f57e27f2a");

                // Len = 2040
                // Msg = 3A3A819C48EFDE2AD914FBF00E18AB6BC4F14513AB27D0C178A188B61431E7F5623CB66B23346775D386B50E982C493ADBBFC54B9A3CD383382336A1A0B2150A15358F336D03AE18F666C7573D55C4FD181C29E6CCFDE63EA35F0ADF5885CFC0A3D84A2B2E4DD24496DB789E663170CEF74798AA1BBCD4574EA0BBA40489D764B2F83AADC66B148B4A0CD95246C127D5871C4F11418690A5DDF01246A0C80A43C70088B6183639DCFDA4125BD113A8F49EE23ED306FAAC576C3FB0C1E256671D817FC2534A52F5B439F72E424DE376F4C565CCA82307DD9EF76DA5B7C4EB7E085172E328807C02D011FFBF33785378D79DC266F6A5BE6BB0E4A92ECEEBAEB1
                assert.equal(shake256.array([0x3A, 0x3A, 0x81, 0x9C, 0x48, 0xEF, 0xDE, 0x2A, 0xD9, 0x14, 0xFB, 0xF0, 0x0E, 0x18, 0xAB, 0x6B, 0xC4, 0xF1, 0x45, 0x13, 0xAB, 0x27, 0xD0, 0xC1, 0x78, 0xA1, 0x88, 0xB6, 0x14, 0x31, 0xE7, 0xF5, 0x62, 0x3C, 0xB6, 0x6B, 0x23, 0x34, 0x67, 0x75, 0xD3, 0x86, 0xB5, 0x0E, 0x98, 0x2C, 0x49, 0x3A, 0xDB, 0xBF, 0xC5, 0x4B, 0x9A, 0x3C, 0xD3, 0x83, 0x38, 0x23, 0x36, 0xA1, 0xA0, 0xB2, 0x15, 0x0A, 0x15, 0x35, 0x8F, 0x33, 0x6D, 0x03, 0xAE, 0x18, 0xF6, 0x66, 0xC7, 0x57, 0x3D, 0x55, 0xC4, 0xFD, 0x18, 0x1C, 0x29, 0xE6, 0xCC, 0xFD, 0xE6, 0x3E, 0xA3, 0x5F, 0x0A, 0xDF, 0x58, 0x85, 0xCF, 0xC0, 0xA3, 0xD8, 0x4A, 0x2B, 0x2E, 0x4D, 0xD2, 0x44, 0x96, 0xDB, 0x78, 0x9E, 0x66, 0x31, 0x70, 0xCE, 0xF7, 0x47, 0x98, 0xAA, 0x1B, 0xBC, 0xD4, 0x57, 0x4E, 0xA0, 0xBB, 0xA4, 0x04, 0x89, 0xD7, 0x64, 0xB2, 0xF8, 0x3A, 0xAD, 0xC6, 0x6B, 0x14, 0x8B, 0x4A, 0x0C, 0xD9, 0x52, 0x46, 0xC1, 0x27, 0xD5, 0x87, 0x1C, 0x4F, 0x11, 0x41, 0x86, 0x90, 0xA5, 0xDD, 0xF0, 0x12, 0x46, 0xA0, 0xC8, 0x0A, 0x43, 0xC7, 0x00, 0x88, 0xB6, 0x18, 0x36, 0x39, 0xDC, 0xFD, 0xA4, 0x12, 0x5B, 0xD1, 0x13, 0xA8, 0xF4, 0x9E, 0xE2, 0x3E, 0xD3, 0x06, 0xFA, 0xAC, 0x57, 0x6C, 0x3F, 0xB0, 0xC1, 0xE2, 0x56, 0x67, 0x1D, 0x81, 0x7F, 0xC2, 0x53, 0x4A, 0x52, 0xF5, 0xB4, 0x39, 0xF7, 0x2E, 0x42, 0x4D, 0xE3, 0x76, 0xF4, 0xC5, 0x65, 0xCC, 0xA8, 0x23, 0x07, 0xDD, 0x9E, 0xF7, 0x6D, 0xA5, 0xB7, 0xC4, 0xEB, 0x7E, 0x08, 0x51, 0x72, 0xE3, 0x28, 0x80, 0x7C, 0x02, 0xD0, 0x11, 0xFF, 0xBF, 0x33, 0x78, 0x53, 0x78, 0xD7, 0x9D, 0xC2, 0x66, 0xF6, 0xA5, 0xBE, 0x6B, 0xB0, 0xE4, 0xA9, 0x2E, 0xCE, 0xEB, 0xAE, 0xB1], 4100).toHexString(), "8a5199b4a7e133e264a86202720655894d48cff344a928cf8347f48379cef347dfc5bcffab99b27b1f89aa2735e23d30088ffa03b9edb02b9635470ab9f1038985d55f9ca774572dd006470ea65145469609f9fa0831bf1ffd842dc24acade27bd9816e3b5bf2876cb112232a0eb4475f1dff9f5c713d9ffd4ccb89ae5607fe35731df06317949eef646e9591cf3be53add6b7dd2b6096e2b3fb06e662ec8b2d77422daad9463cd155204acdbd38e319613f39f99b6dfb35ca9365160066db19835888c2241ff9a731a4acbb5663727aac34a401247fbaa7499e7d5ee5b69d31025e63d04c35c798bca1262d5673a9cf0930b5ad89bd485599dc184528da4790f088ebd170b635d9581632d2ff90db79665ced430089af13c9f21f6d443a818064f17aec9e9c5457001fa8dc6afbadbe3138f388d89d0e6f22f66671255b210754ed63d81dce75ce8f189b534e6d6b3539aa51e837c42df9df59c71e6171cd4902fe1bdc73fb1775b5c754a1ed4ea7f3105fc543ee0418dad256f3f6118ea77114a16c15355b42877a1db2a7df0e155ae1d8670abcec3450f4e2eec9838f895423ef63d261138baaf5d9f104cb5a957aea06c0b9b8c78b0d441796dc0350ddeabb78a33b6f1f9e68ede3d1805c7b7e2cfd54e0fad62f0d8ca67a775dc4546af9096f2edb221db42843d65327861282dc946a0ba01a11863ab2d1dfd16e3973d4");
            });
        });
    });

    // http://csrc.nist.gov/groups/ST/toolkit/documents/Examples/cSHAKE_samples.pdf
    const testCases2 = [
        {
            name: "cshake128",
            method: cshake128,
            cases: [
                {
                    input: [0x00, 0x01, 0x02, 0x03],
                    bits: 256,
                    n: "",
                    s: "Email Signature",
                    output: "c1c36925b6409a04f1b504fcbca9d82b4017277cb5ed2b2065fc1d3814d5aaf5"
                },
                {
                    input: [0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x1B, 0x1C, 0x1D, 0x1E, 0x1F, 0x20, 0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27, 0x28, 0x29, 0x2A, 0x2B, 0x2C, 0x2D, 0x2E, 0x2F, 0x30, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x3B, 0x3C, 0x3D, 0x3E, 0x3F, 0x40, 0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4A, 0x4B, 0x4C, 0x4D, 0x4E, 0x4F, 0x50, 0x51, 0x52, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5A, 0x5B, 0x5C, 0x5D, 0x5E, 0x5F, 0x60, 0x61, 0x62, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x6B, 0x6C, 0x6D, 0x6E, 0x6F, 0x70, 0x71, 0x72, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7A, 0x7B, 0x7C, 0x7D, 0x7E, 0x7F, 0x80, 0x81, 0x82, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8A, 0x8B, 0x8C, 0x8D, 0x8E, 0x8F, 0x90, 0x91, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0x9B, 0x9C, 0x9D, 0x9E, 0x9F, 0xA0, 0xA1, 0xA2, 0xA3, 0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xAB, 0xAC, 0xAD, 0xAE, 0xAF, 0xB0, 0xB1, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6, 0xB7, 0xB8, 0xB9, 0xBA, 0xBB, 0xBC, 0xBD, 0xBE, 0xBF, 0xC0, 0xC1, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7],
                    bits: 256,
                    n: "",
                    s: "Email Signature",
                    output: "c5221d50e4f822d96a2e8881a961420f294b7b24fe3d2094baed2c6524cc166b"
                },
                {
                    input: "",
                    bits: 256,
                    n: "",
                    s: "",
                    output: "7f9c2ba4e88f827d616045507605853ed73b8093f6efbc88eb1a6eacfa66ef26"
                }
            ]
        },
        {
            name: "cshake256",
            method: cshake256,
            cases: [
                {
                    input: [0x00, 0x01, 0x02, 0x03],
                    bits: 512,
                    n: "",
                    s: "Email Signature",
                    output: "d008828e2b80ac9d2218ffee1d070c48b8e4c87bff32c9699d5b6896eee0edd164020e2be0560858d9c00c037e34a96937c561a74c412bb4c746469527281c8c"
                },
                {
                    input: [0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x1B, 0x1C, 0x1D, 0x1E, 0x1F, 0x20, 0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27, 0x28, 0x29, 0x2A, 0x2B, 0x2C, 0x2D, 0x2E, 0x2F, 0x30, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x3B, 0x3C, 0x3D, 0x3E, 0x3F, 0x40, 0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4A, 0x4B, 0x4C, 0x4D, 0x4E, 0x4F, 0x50, 0x51, 0x52, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5A, 0x5B, 0x5C, 0x5D, 0x5E, 0x5F, 0x60, 0x61, 0x62, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x6B, 0x6C, 0x6D, 0x6E, 0x6F, 0x70, 0x71, 0x72, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7A, 0x7B, 0x7C, 0x7D, 0x7E, 0x7F, 0x80, 0x81, 0x82, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8A, 0x8B, 0x8C, 0x8D, 0x8E, 0x8F, 0x90, 0x91, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0x9B, 0x9C, 0x9D, 0x9E, 0x9F, 0xA0, 0xA1, 0xA2, 0xA3, 0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xAB, 0xAC, 0xAD, 0xAE, 0xAF, 0xB0, 0xB1, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6, 0xB7, 0xB8, 0xB9, 0xBA, 0xBB, 0xBC, 0xBD, 0xBE, 0xBF, 0xC0, 0xC1, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7],
                    bits: 512,
                    n: "",
                    s: "Email Signature",
                    output: "07dc27b11e51fbac75bc7b3c1d983e8b4b85fb1defaf218912ac86430273091727f42b17ed1df63e8ec118f04b23633c1dfb1574c8fb55cb45da8e25afb092bb"
                },
                {
                    input: "",
                    bits: 512,
                    n: "",
                    s: "",
                    output: "46b9dd2b0ba88d13233b3feb743eeb243fcd52ea62b81b82b50c27646ed5762fd75dc4ddd8c0f200cb05019d67b592f6fc821c49479ab48640292eacb3b7c4be"
                }
            ]
        }
    ];

    testCases2.forEach((testCase) => {
        describe(`#${testCase.name}`, () => {
            testCase.cases.forEach((c) => {
                it("should be equal", () => {
                    assert.equal(testCase.method(c.input, c.bits, c.n, c.s), c.output);
                });
            });
        });
    });


    // http://csrc.nist.gov/groups/ST/toolkit/documents/Examples/KMAC_samples.pdf
    const testCases3 = [
        {
            name: "kmac128",
            method: kmac128,
            cases: [
                {
                    input: [0x00, 0x01, 0x02, 0x03],
                    bits: 256,
                    key: [0x40, 0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4A, 0x4B, 0x4C, 0x4D, 0x4E, 0x4F, 0x50, 0x51, 0x52, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5A, 0x5B, 0x5C, 0x5D, 0x5E, 0x5F],
                    s: "",
                    output: "e5780b0d3ea6f7d3a429c5706aa43a00fadbd7d49628839e3187243f456ee14e"
                },
                {
                    input: [0x00, 0x01, 0x02, 0x03],
                    bits: 256,
                    key: [0x40, 0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4A, 0x4B, 0x4C, 0x4D, 0x4E, 0x4F, 0x50, 0x51, 0x52, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5A, 0x5B, 0x5C, 0x5D, 0x5E, 0x5F],
                    s: "My Tagged Application",
                    output: "3b1fba963cd8b0b59e8c1a6d71888b7143651af8ba0a7070c0979e2811324aa5"
                },
                {
                    input: [
                        0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F,
                        0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x1B, 0x1C, 0x1D, 0x1E, 0x1F,
                        0x20, 0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27, 0x28, 0x29, 0x2A, 0x2B, 0x2C, 0x2D, 0x2E, 0x2F,
                        0x30, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x3B, 0x3C, 0x3D, 0x3E, 0x3F,
                        0x40, 0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4A, 0x4B, 0x4C, 0x4D, 0x4E, 0x4F,
                        0x50, 0x51, 0x52, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5A, 0x5B, 0x5C, 0x5D, 0x5E, 0x5F,
                        0x60, 0x61, 0x62, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x6B, 0x6C, 0x6D, 0x6E, 0x6F,
                        0x70, 0x71, 0x72, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7A, 0x7B, 0x7C, 0x7D, 0x7E, 0x7F,
                        0x80, 0x81, 0x82, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8A, 0x8B, 0x8C, 0x8D, 0x8E, 0x8F,
                        0x90, 0x91, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0x9B, 0x9C, 0x9D, 0x9E, 0x9F,
                        0xA0, 0xA1, 0xA2, 0xA3, 0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xAB, 0xAC, 0xAD, 0xAE, 0xAF,
                        0xB0, 0xB1, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6, 0xB7, 0xB8, 0xB9, 0xBA, 0xBB, 0xBC, 0xBD, 0xBE, 0xBF,
                        0xC0, 0xC1, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7
                    ],
                    bits: 256,
                    key: [0x40, 0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4A, 0x4B, 0x4C, 0x4D, 0x4E, 0x4F, 0x50, 0x51, 0x52, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5A, 0x5B, 0x5C, 0x5D, 0x5E, 0x5F],
                    s: "My Tagged Application",
                    output: "1f5b4e6cca02209e0dcb5ca635b89a15e271ecc760071dfd805faa38f9729230"
                }
            ]
        },
        {
            name: "kmac256",
            method: kmac256,
            cases: [
                {
                    input: [0x00, 0x01, 0x02, 0x03],
                    bits: 512,
                    key: [0x40, 0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4A, 0x4B, 0x4C, 0x4D, 0x4E, 0x4F, 0x50, 0x51, 0x52, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5A, 0x5B, 0x5C, 0x5D, 0x5E, 0x5F],
                    s: "My Tagged Application",
                    output: "20c570c31346f703c9ac36c61c03cb64c3970d0cfc787e9b79599d273a68d2f7f69d4cc3de9d104a351689f27cf6f5951f0103f33f4f24871024d9c27773a8dd"
                },
                {
                    input: [
                        0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F,
                        0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x1B, 0x1C, 0x1D, 0x1E, 0x1F,
                        0x20, 0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27, 0x28, 0x29, 0x2A, 0x2B, 0x2C, 0x2D, 0x2E, 0x2F,
                        0x30, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x3B, 0x3C, 0x3D, 0x3E, 0x3F,
                        0x40, 0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4A, 0x4B, 0x4C, 0x4D, 0x4E, 0x4F,
                        0x50, 0x51, 0x52, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5A, 0x5B, 0x5C, 0x5D, 0x5E, 0x5F,
                        0x60, 0x61, 0x62, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x6B, 0x6C, 0x6D, 0x6E, 0x6F,
                        0x70, 0x71, 0x72, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7A, 0x7B, 0x7C, 0x7D, 0x7E, 0x7F,
                        0x80, 0x81, 0x82, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8A, 0x8B, 0x8C, 0x8D, 0x8E, 0x8F,
                        0x90, 0x91, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0x9B, 0x9C, 0x9D, 0x9E, 0x9F,
                        0xA0, 0xA1, 0xA2, 0xA3, 0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xAB, 0xAC, 0xAD, 0xAE, 0xAF,
                        0xB0, 0xB1, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6, 0xB7, 0xB8, 0xB9, 0xBA, 0xBB, 0xBC, 0xBD, 0xBE, 0xBF,
                        0xC0, 0xC1, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7
                    ],
                    bits: 512,
                    key: [0x40, 0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4A, 0x4B, 0x4C, 0x4D, 0x4E, 0x4F, 0x50, 0x51, 0x52, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5A, 0x5B, 0x5C, 0x5D, 0x5E, 0x5F],
                    s: "",
                    output: "75358cf39e41494e949707927cee0af20a3ff553904c86b08f21cc414bcfd691589d27cf5e15369cbbff8b9a4c2eb17800855d0235ff635da82533ec6b759b69"
                },
                {
                    input: [
                        0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F,
                        0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x1B, 0x1C, 0x1D, 0x1E, 0x1F,
                        0x20, 0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27, 0x28, 0x29, 0x2A, 0x2B, 0x2C, 0x2D, 0x2E, 0x2F,
                        0x30, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x3B, 0x3C, 0x3D, 0x3E, 0x3F,
                        0x40, 0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4A, 0x4B, 0x4C, 0x4D, 0x4E, 0x4F,
                        0x50, 0x51, 0x52, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5A, 0x5B, 0x5C, 0x5D, 0x5E, 0x5F,
                        0x60, 0x61, 0x62, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x6B, 0x6C, 0x6D, 0x6E, 0x6F,
                        0x70, 0x71, 0x72, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7A, 0x7B, 0x7C, 0x7D, 0x7E, 0x7F,
                        0x80, 0x81, 0x82, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8A, 0x8B, 0x8C, 0x8D, 0x8E, 0x8F,
                        0x90, 0x91, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0x9B, 0x9C, 0x9D, 0x9E, 0x9F,
                        0xA0, 0xA1, 0xA2, 0xA3, 0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xAB, 0xAC, 0xAD, 0xAE, 0xAF,
                        0xB0, 0xB1, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6, 0xB7, 0xB8, 0xB9, 0xBA, 0xBB, 0xBC, 0xBD, 0xBE, 0xBF,
                        0xC0, 0xC1, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7
                    ],
                    bits: 512,
                    key: [0x40, 0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4A, 0x4B, 0x4C, 0x4D, 0x4E, 0x4F, 0x50, 0x51, 0x52, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5A, 0x5B, 0x5C, 0x5D, 0x5E, 0x5F],
                    s: "My Tagged Application",
                    output: "b58618f71f92e1d56c1b8c55ddd7cd188b97b4ca4d99831eb2699a837da2e4d970fbacfde50033aea585f1a2708510c32d07880801bd182898fe476876fc8965"
                }
            ]
        }
    ];

    testCases3.forEach((testCase) => {
        describe(`#${testCase.name}`, () => {
            testCase.cases.forEach((c) => {
                it("should be equal", () => {
                    assert.equal(testCase.method(c.key, c.input, c.bits, c.s), c.output);
                });
            });
        });
    });
});
