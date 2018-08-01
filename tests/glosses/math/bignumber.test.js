const { BigNumber } = adone.math;

describe("math", "BigNumber", () => {
    describe("big", () => {
        it("create", () => {
            expect(new BigNumber(1337).toString()).to.be.deep.equal("1337");
            expect(new BigNumber("1337").toString()).to.be.deep.equal("1337");
            expect(new BigNumber("100").toString()).to.be.deep.equal("100");

            expect(new BigNumber("55555555555555555555555555").toString()).to.be.deep.equal("55555555555555555555555555");

            expect(Number(new BigNumber("1e+100").toString())).to.be.deep.equal(1e+100);
            expect(Number(new BigNumber("1e+100").bitLength())).to.be.deep.equal(333);
            expect(Number(new BigNumber("1.23e+45").toString())).to.be.deep.equal(1.23e+45);

            for (let i = 0; i < 10; i++) {
                expect(new BigNumber(`1.23456e+${i}`).toString()).to.be.deep.equal(String(Math.floor(1.23456 * Math.pow(10, i))));
            }

            expect(new BigNumber("1.23e-45").toString()).to.be.deep.equal("0");

            expect(() => {
                new BigNumber(undefined);
            }).to.throw();
            expect(() => {
                new BigNumber(null);
            }).to.throw();
        });

        it("add", () => {
            for (let i = -10; i < 10; i++) {
                for (let j = -10; j < 10; j++) {
                    const js = j.toString();
                    const ks = (i + j).toString();
                    expect(new BigNumber(i).add(j).toString()).to.be.deep.equal(ks);
                    expect(new BigNumber(i).add(js).toString()).to.be.deep.equal(ks);
                    expect(new BigNumber(i).add(new BigNumber(j)).toString()).to.be.deep.equal(ks);
                    expect(new BigNumber(i).add(new BigNumber(j)).toString()).to.be.deep.equal(ks);
                    expect(BigNumber.add(i, j).toString()).to.be.deep.equal(ks);
                }
            }

            expect(
                new BigNumber("201781752444966478956292456789265633588628356858680927185287861892" +
                    "9889675589272409635031813235465496971529430565627918846694860512" +
                    "1492948268400884893722767401972695174353441"
                ).add("939769862972759638577945343130228368606420083646071622223953046277" +
                "3784500359975110887672142614667937014937371109558223563373329424" +
                "0624814097369771481147215472578762824607080").toString()
            ).to.be.deep.equal("1141551615417726117534237799919494002195048440504752549409240908170367" +
            "41759492475205227039558501334339864668016751861424100681899362117762" +
            "365770656374869982874551457998960521");
        });

        it("sub", () => {
            for (let i = -10; i < 10; i++) {
                for (let j = -10; j < 10; j++) {
                    const js = j.toString();
                    const ks = (i - j).toString();
                    expect(new BigNumber(i).sub(j).toString()).to.be.deep.equal(ks);
                    expect(new BigNumber(i).sub(js).toString()).to.be.deep.equal(ks);
                    expect(new BigNumber(i).sub(new BigNumber(j)).toString()).to.be.deep.equal(ks);
                    expect(BigNumber.sub(i, j).toString()).to.be.deep.equal(ks);
                }
            }

            expect(new BigNumber("635849762218952604062459342660379446997761295162166888134051068531" + "9813941775949841573516110003093332652267534768664621969514455380" + "8051168706779408804756208386011014197185296").sub("757617343536280696839135295661092954931163607913400460585109207644" + "7966483882748233585856350085641718822741649072106343655764769889" + "6399869016678013515043471880323279258685478").toString()).to.be.deep.equal("-121767581317328092776675953000713507933402312751233572451058139112815" + "25421067983920123402400825483861704741143034417216862503145088348700" + "309898604710287263494312265061500182");
        });

        it("mul", () => {
            for (let i = -10; i < 10; i++) {
                for (let j = -10; j < 10; j++) {
                    const js = j.toString();
                    const ks = (i * j).toString();
                    expect(new BigNumber(i).mul(j).toString()).to.be.deep.equal(ks);
                    expect(new BigNumber(i).mul(js).toString()).to.be.deep.equal(ks);
                    expect(new BigNumber(i).mul(new BigNumber(j)).toString()).to.be.deep.equal(ks);
                    expect(BigNumber.mul(i, j).toString()).to.be.deep.equal(ks);
                }
            }

            expect(new BigNumber("433593290010590489671135819286259593426549306666324008679782084292" + "2446494189019075159822930571858728009485237489829138626896756141" + "8738958337632249177044975686477011571044266").mul("127790264841901718791915669264129510947625523373763053776083279450" + "3886212911067061184379695097643279217271150419129022856601771338" + "794256383410400076210073482253089544155377").toString()).to.be.deep.equal("5540900136412485758752141142221047463857522755277604708501015732755989" + "17659432099233635577634197309727815375309484297883528869192732141328" + "99346769031695550850320602049507618052164677667378189154076988316301" + "23719953859959804490669091769150047414629675184805332001182298088891" + "58079529848220802017396422115936618644438110463469902675126288489182" + "82");

            expect(new BigNumber("10000000000000000000000000000").mul(-123).toString()).to.be.deep.equal("-1230000000000000000000000000000");
        });

        it("div", () => {
            for (let i = -10; i < 10; i++) {
                for (let j = -10; j < 10; j++) {
                    const js = j.toString();
                    const round = i / j < 0 ? Math.ceil : Math.floor;
                    const ks = round(i / j).toString();
                    if (ks.match(/^-?\d+$/)) {
                        // ignore exceptions
                        expect(new BigNumber(i).div(j).toString()).to.be.deep.equal(ks);
                        expect(new BigNumber(i).div(js).toString()).to.be.deep.equal(ks);
                        expect(new BigNumber(i).div(new BigNumber(j)).toString()).to.be.deep.equal(ks);
                        expect(BigNumber.div(i, j).toString()).to.be.deep.equal(ks);
                    }
                }
            }

            expect(new BigNumber("433593290010590489671135819286259593426549306666324008679782084292" + "2446494189019075159822930571858728009485237489829138626896756141" + "8738958337632249177044975686477011571044266").div("127790264841901718791915669264129510947625523373763053776083279450" + "3886212911067061184379695097643279217271150419129022856601771338" + "794256383410400076210073482253089544155377").toString()).to.be.deep.equal("33");
        });

        it("abs", () => {
            expect(new BigNumber("433593290010590489671135819286259593426549306666324008679782084292" + "2446494189019075159822930571858728009485237489829138626896756141" + "8738958337632249177044975686477011571044266").abs().toString()).to.be.deep.equal("4335932900105904896711358192862595934265493066663240086797820842922446" + "49418901907515982293057185872800948523748982913862689675614187389583" + "37632249177044975686477011571044266");

            expect(new BigNumber("-43359329001059048967113581928625959342654930666632400867978208429" + "2244649418901907515982293057185872800948523748982913862689675614" + "18738958337632249177044975686477011571044266").abs().toString()).to.be.deep.equal("4335932900105904896711358192862595934265493066663240086797820842922446" + "49418901907515982293057185872800948523748982913862689675614187389583" + "37632249177044975686477011571044266");
        });

        it("neg", () => {
            expect(new BigNumber("433593290010590489671135819286259593426549306666324008679782084292" + "2446494189019075159822930571858728009485237489829138626896756141" + "8738958337632249177044975686477011571044266").neg().toString()).to.be.deep.equal("-433593290010590489671135819286259593426549306666324008679782084292244" + "64941890190751598229305718587280094852374898291386268967561418738958" + "337632249177044975686477011571044266");

            expect(new BigNumber("-43359329001059048967113581928625959342654930666632400867978208429" + "2244649418901907515982293057185872800948523748982913862689675614" + "18738958337632249177044975686477011571044266").neg().toString()).to.be.deep.equal("4335932900105904896711358192862595934265493066663240086797820842922446" + "49418901907515982293057185872800948523748982913862689675614187389583" + "37632249177044975686477011571044266");
        });

        it("mod", () => {
            for (let i = 0; i < 10; i++) {
                for (let j = 0; j < 10; j++) {
                    const js = j.toString();
                    if (!isNaN(i % j)) {
                        const ks = (i % j).toString();
                        expect(new BigNumber(i).mod(j).toString()).to.be.deep.equal(ks);
                        expect(new BigNumber(i).mod(js).toString()).to.be.deep.equal(ks);
                        expect(new BigNumber(i).mod(new BigNumber(j)).toString()).to.be.deep.equal(ks);
                        expect(BigNumber.mod(i, j).toString()).to.be.deep.equal(ks);
                    }
                }
            }

            expect(new BigNumber("486541542410442549118519277483401413").mod("1802185856709793916115771381388554").toString()).to.be.deep.equal("1753546955507985683376775889880387");
        });

        it("cmp", () => {
            for (let i = -10; i <= 10; i++) {
                const bi = new BigNumber(i);

                for (let j = -10; j <= 10; j++) {
                    [j, new BigNumber(j)].forEach((jj) => {
                        expect(bi.lt(jj)).to.be.deep.equal(i < j);
                        expect(bi.le(jj)).to.be.deep.equal(i <= j);
                        expect(bi.eq(jj)).to.be.deep.equal(i === j);
                        expect(bi.ne(jj)).to.be.deep.equal(i !== j);
                        expect(bi.gt(jj)).to.be.deep.equal(i > j);
                        expect(bi.ge(jj)).to.be.deep.equal(i >= j);
                    });
                }
            }
        });

        it("powm", () => {
            const twos = [2, "2", new BigNumber(2), new BigNumber("2")];
            const tens = [100000, "100000", new BigNumber(100000), new BigNumber(100000)];
            twos.forEach((two) => {
                tens.forEach((ten) => {
                    expect(new BigNumber("111111111").powm(two, ten).toString()).to.be.deep.equal("54321");
                });
            });

            expect(new BigNumber("624387628734576238746587435").powm(2732, "457676874367586").toString()).to.be.deep.equal("335581885073251");
        });

        it("pow", () => {
            [2, "2", new BigNumber(2), new BigNumber("2")].forEach((two) => {
                expect(new BigNumber("111111111").pow(two).toString()).to.be.deep.equal("12345678987654321");
            });

            expect(new BigNumber("3487438743234789234879").pow(22).toString()).to.be.deep.equal("861281136448465709000943928980299119292959327175552412961995332536782980636409994680542395362634321718164701236369695670918217801815161694902810780084448291245512671429670376051205638247649202527956041058237646154753587769450973231275642223337064356190945030999709422512682440247294915605076918925272414789710234097768366414400280590151549041536921814066973515842848197905763447515344747881160891303219471850554054186959791307149715821010152303317328860351766337716947079041");
        });

        it("and", () => {
            for (let i = 0; i < 256; i += 7) {
                for (let j = 0; j < 256; j += 7) {
                    const js = j.toString();
                    const ks = (i & j).toString();
                    expect(new BigNumber(i).and(j).toString()).to.be.deep.equal(ks);
                    expect(new BigNumber(i).and(js).toString()).to.be.deep.equal(ks);
                    expect(new BigNumber(i).and(new BigNumber(j)).toString()).to.be.deep.equal(ks);
                    expect(BigNumber.and(i, j).toString()).to.be.deep.equal(ks);

                    expect(new BigNumber(-1 * i).and(j).toString()).to.be.deep.equal((-1 * i & j).toString());
                    expect(new BigNumber(i).and(-1 * j).toString()).to.be.deep.equal((i & -1 * j).toString());
                    expect(new BigNumber(-1 * i).and(-1 * j).toString()).to.be.deep.equal((-1 * i & -1 * j).toString());
                }
            }
            expect(BigNumber.and(new BigNumber("111111", 16), new BigNumber("111111", 16)).toString(16)).to.be.deep.equal("111111");
            expect(BigNumber.and(new BigNumber("111110", 16), new BigNumber("111111", 16)).toString(16)).to.be.deep.equal("111110");
            expect(BigNumber.and(new BigNumber("111112", 16), new BigNumber("111111", 16)).toString(16)).to.be.deep.equal("111110");
            expect(BigNumber.and(new BigNumber("111121", 16), new BigNumber("111111", 16)).toString(16)).to.be.deep.equal("111101");
            expect(BigNumber.and(new BigNumber("111131", 16), new BigNumber("111111", 16)).toString(16)).to.be.deep.equal("111111");

            expect(BigNumber.and(new BigNumber("-111111", 16), new BigNumber("111111", 16)).toString(16)).to.be.deep.equal("1");
            expect(BigNumber.and(new BigNumber("111111", 16), new BigNumber("-111111", 16)).toString(16)).to.be.deep.equal("1");
            expect(BigNumber.and(new BigNumber("-111111", 16), new BigNumber("-111111", 16)).toString(16)).to.be.deep.equal("-111111");
        });

        it("or", () => {
            for (let i = 0; i < 256; i += 7) {
                for (let j = 0; j < 256; j += 7) {
                    const js = j.toString();
                    const ks = (i | j).toString();
                    expect(new BigNumber(i).or(j).toString()).to.be.deep.equal(ks);
                    expect(new BigNumber(i).or(js).toString()).to.be.deep.equal(ks);
                    expect(new BigNumber(i).or(new BigNumber(j)).toString()).to.be.deep.equal(ks);
                    expect(BigNumber.or(i, j).toString()).to.be.deep.equal(ks);

                    expect(new BigNumber(-1 * i).or(j).toString()).to.be.deep.equal((-1 * i | j).toString());
                    expect(new BigNumber(i).or(-1 * j).toString()).to.be.deep.equal((i | -1 * j).toString());
                    expect(new BigNumber(-1 * i).or(-1 * j).toString()).to.be.deep.equal((-1 * i | -1 * j).toString());
                }
            }
            expect(BigNumber.or(new BigNumber("111111", 16), new BigNumber("111111", 16)).toString(16)).to.be.deep.equal("111111");
            expect(BigNumber.or(new BigNumber("111110", 16), new BigNumber("111111", 16)).toString(16)).to.be.deep.equal("111111");
            expect(BigNumber.or(new BigNumber("111112", 16), new BigNumber("111111", 16)).toString(16)).to.be.deep.equal("111113");
            expect(BigNumber.or(new BigNumber("111121", 16), new BigNumber("111111", 16)).toString(16)).to.be.deep.equal("111131");

            expect(BigNumber.or(new BigNumber("-111111", 16), new BigNumber("111111", 16)).toString(16)).to.be.deep.equal("-01");
            expect(BigNumber.or(new BigNumber("111111", 16), new BigNumber("-111111", 16)).toString(16)).to.be.deep.equal("-01");
            expect(BigNumber.or(new BigNumber("-111111", 16), new BigNumber("-111111", 16)).toString(16)).to.be.deep.equal("-111111");
        });

        it("xor", () => {
            for (let i = 0; i < 256; i += 7) {
                for (let j = 0; j < 256; j += 7) {
                    const js = j.toString();
                    const ks = (i ^ j).toString();
                    expect(new BigNumber(i).xor(j).toString()).to.be.deep.equal(ks);
                    expect(new BigNumber(i).xor(js).toString()).to.be.deep.equal(ks);
                    expect(new BigNumber(i).xor(new BigNumber(j)).toString()).to.be.deep.equal(ks);
                    expect(BigNumber.xor(i, j).toString()).to.be.deep.equal(ks);

                    expect(new BigNumber(-1 * i).xor(j).toString()).to.be.deep.equal((-1 * i ^ j).toString());
                    expect(new BigNumber(i).xor(-1 * j).toString()).to.be.deep.equal((i ^ -1 * j).toString());
                    expect(new BigNumber(-1 * i).xor(-1 * j).toString()).to.be.deep.equal((-1 * i ^ -1 * j).toString());
                }
            }
            expect(BigNumber.xor(new BigNumber("111111", 16), new BigNumber("111111", 16)).toString()).to.be.deep.equal("0");
            expect(BigNumber.xor(new BigNumber("111110", 16), new BigNumber("111111", 16)).toString()).to.be.deep.equal("1");
            expect(BigNumber.xor(new BigNumber("111112", 16), new BigNumber("111111", 16)).toString()).to.be.deep.equal("3");
            expect(BigNumber.xor(new BigNumber("111121", 16), new BigNumber("111111", 16)).toString()).to.be.deep.equal("48");

            expect(BigNumber.xor(new BigNumber("-111111", 16), new BigNumber("111111", 16)).toString()).to.be.deep.equal("-2");
            expect(BigNumber.xor(new BigNumber("111111", 16), new BigNumber("-111111", 16)).toString()).to.be.deep.equal("-2");
            expect(BigNumber.xor(new BigNumber("-111111", 16), new BigNumber("-111111", 16)).toString()).to.be.deep.equal("0");
        });

        it("rand", () => {
            for (let i = 1; i < 1000; i++) {
                const x = new BigNumber(i).rand().toNumber();
                expect(x >= 0 && x < i).to.be.true();

                const y = new BigNumber(i).rand(i + 10).toNumber();
                expect(i <= y && y < i + 10).to.be.true();

                const z = BigNumber.rand(i, i + 10).toNumber();
                expect(i <= z && z < i + 10).to.be.true();
            }
        });

        it("primes", () => {
            const ps = { 2: true, 3: true, 5: true, 7: true };
            for (let i = 0; i <= 10; i++) {
                expect(new BigNumber(i).probPrime()).to.be.deep.equal(Boolean(ps[i]));
            }

            const ns = {
                2: 3,
                3: 5,
                15313: 15319,
                222919: 222931,
                611939: 611951,
                334214459: "334214467",
                961748927: "961748941",
                9987704933: "9987704953"
            };

            Object.keys(ns).forEach((n) => {
                expect(new BigNumber(n).nextPrime().toString()).to.be.deep.equal(ns[n].toString());
            });

            const uniques = ["3", "11", "37", "101", "9091", "9901", "333667", "909091", "99990001", "999999000001", "9999999900000001", "909090909090909091", "1111111111111111111", "11111111111111111111111", "900900900900990990990991"];

            const wagstaff = ["3", "11", "43", "683", "2731", "43691", "174763", "2796203", "715827883", "2932031007403", "768614336404564651", "201487636602438195784363", "845100400152152934331135470251", "56713727820156410577229101238628035243"];

            const big = ["4669523849932130508876392554713407521319117239637943224980015676156491", "54875133386847519273109693154204970395475080920935355580245252923343305939004903", "204005728266090048777253207241416669051476369216501266754813821619984472224780876488344279", "2074722246773485207821695222107608587480996474721117292752992589912196684750549658310084416732550077", "5628290459057877291809182450381238927697314822133923421169378062922140081498734424133112032854812293"];
            [uniques, wagstaff, big].forEach((xs) => {
                xs.forEach((x) => {
                    const p = new BigNumber(x).probPrime();
                    expect(p === true || p === "maybe").to.be.ok();
                });
            });
        });

        it("isbitset", () => {
            function mkbin(bn) {
                let bin = "";

                for (let i = 0; i < bn.bitLength(); ++i) {
                    bin += bn.isBitSet(i) ? "1" : "0";
                }

                return bin;
            }

            expect(mkbin(new BigNumber(127))).to.be.deep.equal("1111111");
            expect(mkbin(new BigNumber(-127))).to.be.deep.equal("1111111");

            expect(mkbin(new BigNumber(128))).to.be.deep.equal("00000001");
            expect(mkbin(new BigNumber(-128))).to.be.deep.equal("00000001");

            expect(mkbin(new BigNumber(129))).to.be.deep.equal("10000001");
            expect(mkbin(new BigNumber(-129))).to.be.deep.equal("10000001");
        });

        it("invertm", () => {
            // numbers from http://www.itl.nist.gov/fipspubs/fip186.htm appendix 5
            const q = new BigNumber("b20db0b101df0c6624fc1392ba55f77d577481e5", 16);
            const k = new BigNumber("79577ddcaafddc038b865b19f8eb1ada8a2838c6", 16);
            const kinv = k.invertm(q);
            expect(kinv.toString(16)).to.be.deep.equal("2784e3d672d972a74e22c67f4f4f726ecc751efa");
        });

        it("shift", () => {
            expect(new BigNumber(37).shiftLeft(2).toString()).to.be.deep.equal((37 << 2).toString()); // 148
            expect(new BigNumber(37).shiftRight(2).toString()).to.be.deep.equal((37 >> 2).toString()); // 9

            expect(new BigNumber(2).pow(Math.pow(2, 10)).shiftRight(4).toString()).to.be.equal(new BigNumber(2).pow(Math.pow(2, 10)).div(16).toString());
        });

        it("mod", () => {
            expect(new BigNumber(55555).mod(2).toString()).to.be.deep.equal("1");
            expect(new BigNumber("1234567").mod(new BigNumber("4321")).toNumber()).to.be.deep.equal(1234567 % 4321);
        });

        it("endian", () => {
            const a = new BigNumber(0x0102030405);
            expect(a.toBuffer({ endian: "big", size: 2 }).toString("hex")).to.be.deep.equal("000102030405");
            expect(a.toBuffer({ endian: "little", size: 2 }).toString("hex")).to.be.deep.equal("010003020504");

            const b = new BigNumber(0x0102030405);
            expect(b.toBuffer({ endian: "big", size: "auto" }).toString("hex")).to.be.deep.equal("0102030405");
            expect(b.toBuffer({ endian: "little", size: "auto" }).toString("hex")).to.be.deep.equal("0504030201");

            const c = Buffer.from("000102030405", "hex");
            expect(BigNumber.fromBuffer(c, { endian: "big", size: "auto" }).toString(16)).to.be.deep.equal("102030405");
            expect(BigNumber.fromBuffer(c, { endian: "little", size: "auto" }).toString(16)).to.be.deep.equal("50403020100");
        });

        it("bitlength", () => {
            const bl = new BigNumber("433593290010590489671135819286259593426549306666324008679782084292" + "2446494189019075159822930571858728009485237489829138626896756141" + "873895833763224917704497568647701157104426").bitLength();

            expect(bl > 0).to.be.equal(true);
        });

        it("gcd", () => {
            const b1 = new BigNumber("234897235923342343242");
            const b2 = new BigNumber("234790237101762305340234");
            const expected = new BigNumber("6");
            expect(b1.gcd(b2).toString()).to.be.equal(expected.toString());
        });

        it("jacobi", () => {
            // test case from p. 134 of D. R. Stinson
            let b1 = new BigNumber("7411");
            let b2 = new BigNumber("9283");
            expect(b1.jacobi(b2)).to.be.equal(-1);

            // test case from p. 132 of D. R. Stinson
            b1 = new BigNumber("6278");
            b2 = new BigNumber("9975");
            expect(b1.jacobi(b2)).to.be.equal(-1);

            // test case from p. 74 of Men. Oorsh. Vans.
            b1 = new BigNumber("158");
            b2 = new BigNumber("235");
            expect(b1.jacobi(b2)).to.be.equal(-1);

            // test case from p. 216 of Kumanduri Romero
            b1 = new BigNumber("4");
            b2 = new BigNumber("7");
            expect(b1.jacobi(b2)).to.be.equal(1);

            // test case from p. 363 of K. R. Rosen
            b1 = new BigNumber("68");
            b2 = new BigNumber("111");
            expect(b1.jacobi(b2)).to.be.equal(1);
        });
    });

    describe("buf", () => {

        it("bufBe", () => {
            const buf1 = Buffer.from([1, 2, 3, 4]);
            const num = BigNumber.fromBuffer(buf1, { size: 4 }).toNumber();
            expect(num).to.be.deep.equal(Number(Math.pow(256, 3)) + 2 * Math.pow(256, 2) + 3 * 256 + 4);

            const buf2 = Buffer.allocUnsafe(4);
            buf2.writeUInt32BE(num);
            expect(buf1).to.be.deep.equal(buf2);
        });

        it("bufLe", () => {
            const buf1 = Buffer.from([1, 2, 3, 4]);
            const num = BigNumber.fromBuffer(buf1, { size: 4, endian: "little" }).toNumber();

            const buf2 = Buffer.allocUnsafe(4);
            buf2.writeUInt32LE(num);
            expect(buf1).to.be.deep.equal(buf2);
        });

        it("bufBe_le", () => {
            const bufBe = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
            const bufLe = Buffer.from([4, 3, 2, 1, 8, 7, 6, 5]);

            const numBe = BigNumber.fromBuffer(bufBe, { size: 4, endian: "big" }).toString();

            const numLe = BigNumber.fromBuffer(bufLe, { size: 4, endian: "little" }).toString();

            expect(numBe).to.be.deep.equal(numLe);
        });

        it("buf_high_bits", () => {
            const bufBe = Buffer.from([201, 202, 203, 204, 205, 206, 207, 208]);
            const bufLe = Buffer.from([204, 203, 202, 201, 208, 207, 206, 205]);

            const numBe = BigNumber.fromBuffer(bufBe, { size: 4, endian: "big" }).toString();

            const numLe = BigNumber.fromBuffer(bufLe, { size: 4, endian: "little" }).toString();

            expect(numBe).to.be.deep.equal(numLe);
        });

        it("buf_to_from", () => {
            const nums = [0, 1, 10, 15, 3, 16, 7238, 1337, 31337, 505050, "172389721984375328763297498273498732984324", "32848432742", "12988282841231897498217398217398127983721983719283721", "718293798217398217312387213972198321"];

            nums.forEach((num) => {
                const b = new BigNumber(num);
                const u = b.toBuffer();

                expect(u).to.be.ok();
                expect(BigNumber.fromBuffer(u).toString()).to.be.deep.equal(b.toString());
            });

            expect(() => {
                new BigNumber(-1).toBuffer(); // can"t pack negative numbers yet
            }).to.throw(Error);
        });

        it("toBuf", () => {
            const buf = Buffer.from([0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f]);
            const b = new BigNumber(0x0a * 256 * 256 * 256 * 256 * 256 + 0x0b * 256 * 256 * 256 * 256 + 0x0c * 256 * 256 * 256 + 0x0d * 256 * 256 + 0x0e * 256 + 0x0f);

            expect(b.toString(16)).to.be.deep.equal("a0b0c0d0e0f");

            expect([].slice.call(b.toBuffer({ endian: "big", size: 2 }))).to.be.deep.equal([0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f]);

            expect([].slice.call(b.toBuffer({ endian: "little", size: 2 }))).to.be.deep.equal([0x0b, 0x0a, 0x0d, 0x0c, 0x0f, 0x0e]);

            expect(BigNumber.fromBuffer(buf).toString(16)).to.be.deep.equal(b.toString(16));

            expect([].slice.call(new BigNumber(43135012110).toBuffer({
                endian: "little", size: 4
            }))).to.be.deep.equal([0x0a, 0x00, 0x00, 0x00, 0x0e, 0x0d, 0x0c, 0x0b]);

            expect([].slice.call(new BigNumber(43135012110).toBuffer({
                endian: "big", size: 4
            }))).to.be.deep.equal([0x00, 0x00, 0x00, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e]);
        });

        it("zeroPad", () => {
            const b = new BigNumber(0x123456);

            expect([].slice.call(b.toBuffer({ endian: "big", size: 4 }))).to.be.deep.equal([0x00, 0x12, 0x34, 0x56]);

            expect([].slice.call(b.toBuffer({ endian: "little", size: 4 }))).to.be.deep.equal([0x56, 0x34, 0x12, 0x00]);
        });

        it("toMpint", () => {
            // test values taken directly out of
            // http://tools.ietf.org/html/rfc4251#page-10

            const refs = {
                0: Buffer.from([0x00, 0x00, 0x00, 0x00]),
                "9a378f9b2e332a7": Buffer.from([0x00, 0x00, 0x00, 0x08, 0x09, 0xa3, 0x78, 0xf9, 0xb2, 0xe3, 0x32, 0xa7]),
                80: Buffer.from([0x00, 0x00, 0x00, 0x02, 0x00, 0x80]),
                "-1234": Buffer.from([0x00, 0x00, 0x00, 0x02, 0xed, 0xcc]),
                "-deadbeef": Buffer.from([0x00, 0x00, 0x00, 0x05, 0xff, 0x21, 0x52, 0x41, 0x11])
            };

            Object.keys(refs).forEach((key) => {
                const buf0 = new BigNumber(key, 16).toBuffer("mpint");
                const buf1 = refs[key];

                expect(buf0).to.be.deep.equal(buf1);
            });
        });
    });

    describe("trucating", () => {
        it("should be not truncated on x86 platforms", () => {
            let num = new BigNumber(0x100000000);
            expect(num.toString()).to.be.equal("4294967296");
            expect(num.add(0x100000000).toString()).to.be.equal("8589934592");
            expect(num.sub(0x100000001).toString()).to.be.equal("-1");
            expect(num.mul(0x100000000).toString().toString()).to.be.equal("18446744073709551616");
            expect(num.div(0x100000002).toString()).to.be.equal("0");
            expect(num.mod(0x100000002).toString()).to.be.equal("4294967296");
            num = new BigNumber(2);
            expect(num.powm(0x100000001, 4).toString()).to.be.equal("0");
            num = new BigNumber(-0x100000000);
            expect(num.cmp(-0x100000000) === 0).to.be.true();
            num = new BigNumber(0x100000000);
            expect(num.cmp(0x100000000) === 0).to.be.true();
        });
    });

    describe("isbignum", () => {
        it("create", () => {
            const validBn = new BigNumber("42");
            let testObj;

            testObj = new BigNumber("123");
            expect(adone.is.bigNumber(testObj)).to.be.true();

            testObj = {};
            expect(adone.is.bigNumber(testObj)).to.be.false();

            testObj = {};
            expect(() => {
                validBn.add(testObj);
            }).to.throw();
        });
    });
});
