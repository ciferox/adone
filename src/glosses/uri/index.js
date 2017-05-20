const { is, x } = adone;

const defaultPorts = {
    http: "80",
    https: "443",
    ftp: "21",
    ssh: "22",
    gopher: "70",
    ws: "80",
    wss: "443"
};

const SLD = {
    // list of known Second Level Domains
    // converted list of SLDs from https://github.com/gavingmiller/second-level-domains
    // ----
    // publicsuffix.org is more current and actually used by a couple of browsers internally.
    // downside is it also contains domains like "dyndns.org" - which is fine for the security
    // issues browser have to deal with (SOP for cookies, etc) - but is way overboard for URI.js
    // ----
    list: {
        ac: " com gov mil net org ",
        ae: " ac co gov mil name net org pro sch ",
        af: " com edu gov net org ",
        al: " com edu gov mil net org ",
        ao: " co ed gv it og pb ",
        ar: " com edu gob gov int mil net org tur ",
        at: " ac co gv or ",
        au: " asn com csiro edu gov id net org ",
        ba: " co com edu gov mil net org rs unbi unmo unsa untz unze ",
        bb: " biz co com edu gov info net org store tv ",
        bh: " biz cc com edu gov info net org ",
        bn: " com edu gov net org ",
        bo: " com edu gob gov int mil net org tv ",
        br: " adm adv agr am arq art ato b bio blog bmd cim cng cnt com coop ecn edu eng esp etc eti far flog fm fnd fot fst g12 ggf gov imb ind inf jor jus lel mat med mil mus net nom not ntr odo org ppg pro psc psi qsl rec slg srv tmp trd tur tv vet vlog wiki zlg ",
        bs: " com edu gov net org ",
        bz: " du et om ov rg ",
        ca: " ab bc mb nb nf nl ns nt nu on pe qc sk yk ",
        ck: " biz co edu gen gov info net org ",
        cn: " ac ah bj com cq edu fj gd gov gs gx gz ha hb he hi hl hn jl js jx ln mil net nm nx org qh sc sd sh sn sx tj tw xj xz yn zj ",
        co: " com edu gov mil net nom org ",
        cr: " ac c co ed fi go or sa ",
        cy: " ac biz com ekloges gov ltd name net org parliament press pro tm ",
        do: " art com edu gob gov mil net org sld web ",
        dz: " art asso com edu gov net org pol ",
        ec: " com edu fin gov info med mil net org pro ",
        eg: " com edu eun gov mil name net org sci ",
        er: " com edu gov ind mil net org rochest w ",
        es: " com edu gob nom org ",
        et: " biz com edu gov info name net org ",
        fj: " ac biz com info mil name net org pro ",
        fk: " ac co gov net nom org ",
        fr: " asso com f gouv nom prd presse tm ",
        gg: " co net org ",
        gh: " com edu gov mil org ",
        gn: " ac com gov net org ",
        gr: " com edu gov mil net org ",
        gt: " com edu gob ind mil net org ",
        gu: " com edu gov net org ",
        hk: " com edu gov idv net org ",
        hu: " 2000 agrar bolt casino city co erotica erotika film forum games hotel info ingatlan jogasz konyvelo lakas media news org priv reklam sex shop sport suli szex tm tozsde utazas video ",
        id: " ac co go mil net or sch web ",
        il: " ac co gov idf k12 muni net org ",
        in: " ac co edu ernet firm gen gov i ind mil net nic org res ",
        iq: " com edu gov i mil net org ",
        ir: " ac co dnssec gov i id net org sch ",
        it: " edu gov ",
        je: " co net org ",
        jo: " com edu gov mil name net org sch ",
        jp: " ac ad co ed go gr lg ne or ",
        ke: " ac co go info me mobi ne or sc ",
        kh: " com edu gov mil net org per ",
        ki: " biz com de edu gov info mob net org tel ",
        km: " asso com coop edu gouv k medecin mil nom notaires pharmaciens presse tm veterinaire ",
        kn: " edu gov net org ",
        kr: " ac busan chungbuk chungnam co daegu daejeon es gangwon go gwangju gyeongbuk gyeonggi gyeongnam hs incheon jeju jeonbuk jeonnam k kg mil ms ne or pe re sc seoul ulsan ",
        kw: " com edu gov net org ",
        ky: " com edu gov net org ",
        kz: " com edu gov mil net org ",
        lb: " com edu gov net org ",
        lk: " assn com edu gov grp hotel int ltd net ngo org sch soc web ",
        lr: " com edu gov net org ",
        lv: " asn com conf edu gov id mil net org ",
        ly: " com edu gov id med net org plc sch ",
        ma: " ac co gov m net org press ",
        mc: " asso tm ",
        me: " ac co edu gov its net org priv ",
        mg: " com edu gov mil nom org prd tm ",
        mk: " com edu gov inf name net org pro ",
        ml: " com edu gov net org presse ",
        mn: " edu gov org ",
        mo: " com edu gov net org ",
        mt: " com edu gov net org ",
        mv: " aero biz com coop edu gov info int mil museum name net org pro ",
        mw: " ac co com coop edu gov int museum net org ",
        mx: " com edu gob net org ",
        my: " com edu gov mil name net org sch ",
        nf: " arts com firm info net other per rec store web ",
        ng: " biz com edu gov mil mobi name net org sch ",
        ni: " ac co com edu gob mil net nom org ",
        np: " com edu gov mil net org ",
        nr: " biz com edu gov info net org ",
        om: " ac biz co com edu gov med mil museum net org pro sch ",
        pe: " com edu gob mil net nom org sld ",
        ph: " com edu gov i mil net ngo org ",
        pk: " biz com edu fam gob gok gon gop gos gov net org web ",
        pl: " art bialystok biz com edu gda gdansk gorzow gov info katowice krakow lodz lublin mil net ngo olsztyn org poznan pwr radom slupsk szczecin torun warszawa waw wroc wroclaw zgora ",
        pr: " ac biz com edu est gov info isla name net org pro prof ",
        ps: " com edu gov net org plo sec ",
        pw: " belau co ed go ne or ",
        ro: " arts com firm info nom nt org rec store tm www ",
        rs: " ac co edu gov in org ",
        sb: " com edu gov net org ",
        sc: " com edu gov net org ",
        sh: " co com edu gov net nom org ",
        sl: " com edu gov net org ",
        st: " co com consulado edu embaixada gov mil net org principe saotome store ",
        sv: " com edu gob org red ",
        sz: " ac co org ",
        tr: " av bbs bel biz com dr edu gen gov info k12 name net org pol tel tsk tv web ",
        tt: " aero biz cat co com coop edu gov info int jobs mil mobi museum name net org pro tel travel ",
        tw: " club com ebiz edu game gov idv mil net org ",
        mu: " ac co com gov net or org ",
        mz: " ac co edu gov org ",
        na: " co com ",
        nz: " ac co cri geek gen govt health iwi maori mil net org parliament school ",
        pa: " abo ac com edu gob ing med net nom org sld ",
        pt: " com edu gov int net nome org publ ",
        py: " com edu gov mil net org ",
        qa: " com edu gov mil net org ",
        re: " asso com nom ",
        ru: " ac adygeya altai amur arkhangelsk astrakhan bashkiria belgorod bir bryansk buryatia cbg chel chelyabinsk chita chukotka chuvashia com dagestan e-burg edu gov grozny int irkutsk ivanovo izhevsk jar joshkar-ola kalmykia kaluga kamchatka karelia kazan kchr kemerovo khabarovsk khakassia khv kirov koenig komi kostroma kranoyarsk kuban kurgan kursk lipetsk magadan mari mari-el marine mil mordovia mosreg msk murmansk nalchik net nnov nov novosibirsk nsk omsk orenburg org oryol penza perm pp pskov ptz rnd ryazan sakhalin samara saratov simbirsk smolensk spb stavropol stv surgut tambov tatarstan tom tomsk tsaritsyn tsk tula tuva tver tyumen udm udmurtia ulan-ude vladikavkaz vladimir vladivostok volgograd vologda voronezh vrn vyatka yakutia yamal yekaterinburg yuzhno-sakhalinsk ",
        rw: " ac co com edu gouv gov int mil net ",
        sa: " com edu gov med net org pub sch ",
        sd: " com edu gov info med net org tv ",
        se: " a ac b bd c d e f g h i k l m n o org p parti pp press r s t tm u w x y z ",
        sg: " com edu gov idn net org per ",
        sn: " art com edu gouv org perso univ ",
        sy: " com edu gov mil net news org ",
        th: " ac co go in mi net or ",
        tj: " ac biz co com edu go gov info int mil name net nic org test web ",
        tn: " agrinet com defense edunet ens fin gov ind info intl mincom nat net org perso rnrt rns rnu tourism ",
        tz: " ac co go ne or ",
        ua: " biz cherkassy chernigov chernovtsy ck cn co com crimea cv dn dnepropetrovsk donetsk dp edu gov if in ivano-frankivsk kh kharkov kherson khmelnitskiy kiev kirovograd km kr ks kv lg lugansk lutsk lviv me mk net nikolaev od odessa org pl poltava pp rovno rv sebastopol sumy te ternopil uzhgorod vinnica vn zaporizhzhe zhitomir zp zt ",
        ug: " ac co go ne or org sc ",
        uk: " ac bl british-library co cym gov govt icnet jet lea ltd me mil mod national-library-scotland nel net nhs nic nls org orgn parliament plc police sch scot soc ",
        us: " dni fed isa kids nsn ",
        uy: " com edu gub mil net org ",
        ve: " co com edu gob info mil net org web ",
        vi: " co com k12 net org ",
        vn: " ac biz com edu gov health info int name net org pro ",
        ye: " co com gov ltd me net org plc ",
        yu: " ac co edu gov org ",
        za: " ac agric alt bourse city co cybernet db edu gov grondar iaccess imt inca landesign law mil net ngo nis nom olivetti org pix school tm web ",
        zm: " ac co com edu gov net org sch "
    },
    has(domain) {
        const tldOffset = domain.lastIndexOf(".");
        if (tldOffset <= 0 || tldOffset >= (domain.length - 1)) {
            return false;
        }
        const sldOffset = domain.lastIndexOf(".", tldOffset - 1);
        if (sldOffset <= 0 || sldOffset >= (tldOffset - 1)) {
            return false;
        }
        const sldList = SLD.list[domain.slice(tldOffset + 1)];
        if (!sldList) {
            return false;
        }
        return sldList.indexOf(` ${domain.slice(sldOffset + 1, tldOffset)} `) >= 0;
    },
    is(domain) {
        const tldOffset = domain.lastIndexOf(".");
        if (tldOffset <= 0 || tldOffset >= (domain.length - 1)) {
            return false;
        }
        const sldOffset = domain.lastIndexOf(".", tldOffset - 1);
        if (sldOffset >= 0) {
            return false;
        }
        const sldList = SLD.list[domain.slice(tldOffset + 1)];
        if (!sldList) {
            return false;
        }
        return sldList.indexOf(` ${domain.slice(0, tldOffset)} `) >= 0;
    },
    get(domain) {
        const tldOffset = domain.lastIndexOf(".");
        if (tldOffset <= 0 || tldOffset >= (domain.length - 1)) {
            return null;
        }
        const sldOffset = domain.lastIndexOf(".", tldOffset - 1);
        if (sldOffset <= 0 || sldOffset >= (tldOffset - 1)) {
            return null;
        }
        const sldList = SLD.list[domain.slice(tldOffset + 1)];
        if (!sldList) {
            return null;
        }
        if (sldList.indexOf(` ${domain.slice(sldOffset + 1, tldOffset)} `) < 0) {
            return null;
        }
        return domain.slice(sldOffset + 1);
    }
};

// encoding / decoding according to RFC3986
const strictEncodeURIComponent = (string) => encodeURIComponent(string).replace(/[!'()*]/g, escape).replace(/\*/g, "%2A");

const escapeRegEx = (string) => string.replace(/([.*+?^=!:${}()|[\]/\\])/g, "\\$1");

const filterArrayValues = (data, value) => {
    let lookup = {};

    if (is.regexp(value)) {
        lookup = null;
    } else if (is.array(value)) {
        for (let i = 0; i < value.length; i++) {
            lookup[value[i]] = true;
        }
    } else {
        lookup[value] = true;
    }

    for (let i = 0, length = data.length; i < length; i++) {
        /*jshint laxbreak: true */
        const _match = lookup && !is.undefined(lookup[data[i]])
            || !lookup && value.test(data[i]);
        /*jshint laxbreak: false */
        if (_match) {
            data.splice(i, 1);
            length--;
            i--;
        }
    }

    return data;
};

// TODO: заменить на аналог из npm пакета
// 17.06.2016: целиком заменить не получится, функция должна быть с рекурсивным обходом
const arrayContains = (list, value) => {
    let i;
    let length;

    // value may be string, number, array, regexp
    if (is.array(value)) {
        // Note: this can be optimized to O(n) (instead of current O(m * n))
        for (i = 0, length = value.length; i < length; i++) {
            if (!arrayContains(list, value[i])) {
                return false;
            }
        }

        return true;
    }

    const isRegexp = is.regexp(value);
    for (i = 0, length = list.length; i < length; i++) {
        if (isRegexp) {
            if (is.string(list[i]) && list[i].match(value)) {
                return true;
            }
        } else if (list[i] === value) {
            return true;
        }
    }

    return false;
};

// TODO: заменить на аналог из npm пакета
// 17.06.2016: в текущей реализации нельзя, т.к. is.deepEqual проверяет вплоть до порядка следования ключей.
const arraysEqual = (a, b) => {
    if (!is.array(a) || !is.array(b)) {
        return false;
    }

    // arrays can't be equal if they have different amount of content
    if (a.length !== b.length) {
        return false;
    }

    a.sort();
    b.sort();

    for (let i = 0, l = a.length; i < l; i++) {
        if (a[i] !== b[i]) {
            return false;
        }
    }

    return true;
};

const trimSlashes = (text) => {
    const trimEpression = /^\/+|\/+$/g;
    return text.replace(trimEpression, "");
};

export default class URI {
    constructor(url = "", { base, defaultProtocol = null } = {}) {
        this.defaultProtocol = defaultProtocol;
        this.href(url);

        // resolve to base according to http://dvcs.w3.org/hg/url/raw-file/tip/Overview.html#constructor
        if (!is.undefined(base)) {
            this.absoluteTo(base);
        }
    }

    clone() {
        return new URI(this);
    }

    toString() {
        return this.build(false)._string;
    }

    is(what) {
        let ip = false;
        let ip4 = false;
        let ip6 = false;
        let name = false;
        let sld = false;
        let idn = false;
        let punycode = false;
        let relative = !this._parts.urn;

        if (this._parts.hostname) {
            relative = false;
            // well, 333.444.555.666 matches, but it sure ain't no IPv4 - do we care?
            ip4 = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(this._parts.hostname);
            ip6 = URI._ip6Expression.test(this._parts.hostname);
            ip = ip4 || ip6;
            name = !ip;
            sld = name && SLD && SLD.has(this._parts.hostname);
            idn = name && /[^a-z0-9.-]/i.test(this._parts.hostname);
            punycode = name && /(xn--)/i.test(this._parts.hostname);
        }

        switch (what.toLowerCase()) {
            case "relative": {
                return relative;

            }
            case "absolute": {
                return !relative;
            }
            // hostname identification
            case "domain":
            case "name": {
                return name;
            }
            case "sld": {
                return sld;
            }
            case "ip": {
                return ip;
            }
            case "ip4":
            case "ipv4":
            case "inet4": {
                return ip4;
            }
            case "ip6":
            case "ipv6":
            case "inet6": {
                return ip6;
            }
            case "idn": {
                return idn;
            }
            case "url": {
                return !this._parts.urn;
            }
            case "urn": {
                return Boolean(this._parts.urn);
            }
            case "punycode": {
                return punycode;
            }
        }

        return null;
    }

    username(value) {
        if (is.undefined(value)) {
            return this._parts.username || "";
        }
        this._parts.username = value || null;
        return this;

    }

    password(value) {
        if (is.undefined(value)) {
            return this._parts.password || "";
        }
        this._parts.password = value || null;
        return this;

    }

    protocol(value) {
        if (!is.undefined(value)) {

            if (!value || value === "") {
                this._parts.protocol = this.defaultProtocol;
                return this;
            }

            // accept trailing ://
            const newProtocol = value.replace(/:(\/\/)?$/, "");

            if (!value.match(URI._protocol_expression)) {
                throw new x.InvalidArgument(`Protocol "${value}" contains characters other than [A-Z0-9.+-] or doesn't start with [A-Z]`);
            }

            this._parts.protocol = newProtocol;
            return this;
        }
        return this._parts.protocol;
    }

    port(value) {
        if (this._parts.urn) {
            return is.undefined(value) ? "" : this;
        }

        if (!is.undefined(value)) {
            let newPort = value.toString();
            if (newPort.match(/[^0-9]/)) {
                throw new x.InvalidArgument(`Port "${newPort}" contains characters other than [0-9]`);
            }

            if (newPort === "0") {
                newPort = null;
            }

            this._parts.port = newPort;
            return this;
        }

        return this._parts.port || "";
    }

    hostname(value) {
        if (this._parts.urn) {
            return is.undefined(value) ? "" : this;
        }

        if (!is.undefined(value)) {
            const x = {};
            const res = URI._parseHost(value, x);
            if (res !== "/") {
                throw new x.InvalidArgument(`Hostname "${value}" contains characters other than [A-Z0-9.-]`);
            }

            const newHostname = x.hostname;

            this._parts.hostname = newHostname || null;
            return this;
        }
        return this._parts.hostname || "";
    }

    // compound accessors
    origin(value) {
        if (this._parts.urn) {
            return is.undefined(value) ? "" : this;
        }

        if (is.undefined(value)) {
            const protocol = this.protocol();
            const authority = this.authority();
            if (!authority) {
                return "";
            }

            return (protocol ? `${protocol}://` : "") + this.authority();
        }
        const origin = new URI(value);
        this.protocol(origin.protocol()).authority(origin.authority());
        return this;

    }

    host(value) {
        if (this._parts.urn) {
            return is.undefined(value) ? "" : this;
        }

        if (is.undefined(value)) {
            return this._parts.hostname ? URI._buildHost(this._parts) : "";
        }
        const res = URI._parseHost(value, this._parts);
        if (res !== "/") {
            throw new x.InvalidArgument(`Hostname "${value}" contains characters other than [A-Z0-9.-]`);
        }

        return this;

    }

    authority(value) {
        if (this._parts.urn) {
            return is.undefined(value) ? "" : this;
        }

        if (is.undefined(value)) {
            return this._parts.hostname ? URI._buildAuthority(this._parts) : "";
        }
        const res = URI._parseAuthority(value, this._parts);
        if (res !== "/") {
            throw new x.InvalidArgument(`Hostname "${value}" contains characters other than [A-Z0-9.-]`);
        }

        return this;

    }

    userinfo(value) {
        let newUserinfo = value;

        if (this._parts.urn) {
            return is.undefined(newUserinfo) ? "" : this;
        }

        if (is.undefined(newUserinfo)) {
            const t = URI._buildUserinfo(this._parts);
            return t ? t.substring(0, t.length - 1) : t;
        }
        if (newUserinfo[newUserinfo.length - 1] !== "@") {
            newUserinfo += "@";
        }

        URI._parseUserinfo(newUserinfo, this._parts);
        return this;

    }

    resource(value) {
        if (is.undefined(value)) {
            return this.path()
                + (this.query() ? `?${this.query()}` : "")
                + (this.fragment() ? `#${this.fragment()}` : "");
        }

        const parts = URI._parse(value);
        this._parts.path = parts.path;
        this._parts.query = parts.query;
        this._parts.fragment = parts.fragment;
        return this;
    }

    // fraction accessors
    subdomain(value) {
        let newSubdomain = value;

        if (this._parts.urn) {
            return is.undefined(newSubdomain) ? "" : this;
        }

        // convenience, return "www" from "www.example.org"
        if (is.undefined(newSubdomain)) {
            if (!this._parts.hostname || this.is("IP")) {
                return "";
            }

            // grab domain and add another segment
            const end = this._parts.hostname.length - this.domain().length - 1;
            return this._parts.hostname.substring(0, end) || "";
        }
        const e = this._parts.hostname.length - this.domain().length;
        const sub = this._parts.hostname.substring(0, e);
        const replace = new RegExp(`^${escapeRegEx(sub)}`);

        if (newSubdomain && newSubdomain.charAt(newSubdomain.length - 1) !== ".") {
            newSubdomain += ".";
        }

        if (newSubdomain) {
            URI._ensureValidHostname(newSubdomain);
        }

        this._parts.hostname = this._parts.hostname.replace(replace, newSubdomain);
        return this;

    }

    domain(value) {
        let newDomain = value;

        if (this._parts.urn) {
            return is.undefined(newDomain) ? "" : this;
        }

        let onlyDomain = false;

        if (is.boolean(newDomain)) {
            [onlyDomain, newDomain] = [newDomain, undefined];
        }

        // convenience, return "example.org" from "www.example.org"
        if (is.undefined(newDomain)) {
            if (!this._parts.hostname || this.is("IP")) {
                return "";
            }

            // if hostname consists of 1 or 2 segments, it must be the domain
            const t = this._parts.hostname.match(/\./g);
            if (t && t.length < 2) {
                return this._parts.hostname;
            }

            // grab tld and add another segment
            let end = this._parts.hostname.length - this.tld(onlyDomain).length - 1;
            end = this._parts.hostname.lastIndexOf(".", end - 1) + 1;
            return this._parts.hostname.substring(end) || "";
        }
        if (!newDomain) {
            throw new x.InvalidArgument("cannot set domain empty");
        }

        URI._ensureValidHostname(newDomain);

        if (!this._parts.hostname || this.is("IP")) {
            this._parts.hostname = newDomain;
        } else {
            const replace = new RegExp(`${escapeRegEx(this.domain())}$`);
            this._parts.hostname = this._parts.hostname.replace(replace, newDomain);
        }

        return this;

    }

    tld(value) {
        let newTLD = value;

        if (this._parts.urn) {
            return is.undefined(newTLD) ? "" : this;
        }

        let lastTLD = false;

        if (is.boolean(newTLD)) {
            [lastTLD, newTLD] = [newTLD, undefined];
        }

        // return "org" from "www.example.org"
        if (is.undefined(newTLD)) {
            if (!this._parts.hostname || this.is("IP")) {
                return "";
            }

            const pos = this._parts.hostname.lastIndexOf(".");
            const tld = this._parts.hostname.substring(pos + 1);

            if (lastTLD !== true && SLD && SLD.list[tld.toLowerCase()]) {
                return SLD.get(this._parts.hostname) || tld;
            }

            return tld;
        }
        let replace;

        if (!newTLD) {
            throw new x.InvalidArgument("cannot set TLD empty");
        } else if (newTLD.match(/[^a-zA-Z0-9-]/)) {
            if (SLD && SLD.is(newTLD)) {
                replace = new RegExp(`${escapeRegEx(this.tld())}$`);
                this._parts.hostname = this._parts.hostname.replace(replace, newTLD);
            } else {
                throw new x.InvalidArgument(`TLD "${newTLD}" contains characters other than [A-Z0-9]`);
            }
        } else if (!this._parts.hostname || this.is("IP")) {
            throw new x.IllegalState("cannot set TLD on non-domain host");
        } else {
            replace = new RegExp(`${escapeRegEx(this.tld())}$`);
            this._parts.hostname = this._parts.hostname.replace(replace, newTLD);
        }

        return this;

    }

    directory(value) {
        let newDirectory = value;

        if (this._parts.urn) {
            return is.undefined(newDirectory) ? "" : this;
        }


        if (is.undefined(newDirectory) || newDirectory === true) {
            if (!this._parts.path && !this._parts.hostname) {
                return "";
            }

            if (this._parts.path === "/") {
                return "/";
            }

            const end = this._parts.path.length - this.filename().length - 1;
            const res = this._parts.path.substring(0, end) || (this._parts.hostname ? "/" : "");

            return newDirectory ? URI.decodePath(res) : res;

        }
        if (newDirectory instanceof URI) {
            newDirectory = newDirectory.path();
        }

        const e = this._parts.path.length - this.filename().length;
        const directory = this._parts.path.substring(0, e);
        const replace = new RegExp(`^${escapeRegEx(directory)}`);

            // fully qualifier directories begin with a slash
        if (!this.is("relative")) {
            if (!newDirectory) {
                newDirectory = "/";
            }

            if (newDirectory.charAt(0) !== "/") {
                newDirectory = `/${newDirectory}`;
            }
        }

            // directories always end with a slash
        if (newDirectory && newDirectory.charAt(newDirectory.length - 1) !== "/") {
            newDirectory += "/";
        }

        newDirectory = URI.recodePath(newDirectory);
        this._parts.path = this._parts.path.replace(replace, newDirectory);
        return this;

    }

    filename(value) {
        let newFilename = value;

        if (this._parts.urn) {
            return is.undefined(newFilename) ? "" : this;
        }


        if (is.undefined(newFilename) || newFilename === true) {
            if (!this._parts.path || this._parts.path === "/") {
                return "";
            }

            const pos = this._parts.path.lastIndexOf("/");
            const res = this._parts.path.substring(pos + 1);

            return newFilename ? URI.decodePathSegment(res) : res;
        }
        let mutatedDirectory = false;

        if (newFilename.charAt(0) === "/") {
            newFilename = newFilename.substring(1);
        }

        if (newFilename.match(/\.?\//)) {
            mutatedDirectory = true;
        }

        const replace = new RegExp(`${escapeRegEx(this.filename())}$`);
        newFilename = URI.recodePath(newFilename);
        this._parts.path = this._parts.path.replace(replace, newFilename);

        if (mutatedDirectory) {
            this.normalizePath();
        }

        return this;

    }

    suffix(value) {
        let newSuffix = value;

        if (this._parts.urn) {
            return is.undefined(newSuffix) ? "" : this;
        }


        if (is.undefined(newSuffix) || newSuffix === true) {
            if (!this._parts.path || this._parts.path === "/") {
                return "";
            }

            const filename = this.filename();
            const pos = filename.lastIndexOf(".");

            if (pos === -1) {
                return "";
            }

            // suffix may only contain alnum characters (yup, I made this up.)
            const s = filename.substring(pos + 1);
            const res = (/^[a-z0-9%]+$/i).test(s) ? s : "";
            return newSuffix ? URI.decodePathSegment(res) : res;
        }
        if (newSuffix.charAt(0) === ".") {
            newSuffix = newSuffix.substring(1);
        }

        const suffix = this.suffix();
        let replace;

        if (!suffix) {
            if (!newSuffix) {
                return this;
            }
            this._parts.path += `.${URI.recodePath(newSuffix)}`;
        } else if (!newSuffix) {
            replace = new RegExp(`${escapeRegEx(`.${suffix}`)}$`);
        } else {
            replace = new RegExp(`${escapeRegEx(suffix)}$`);
        }

        if (replace) {
            newSuffix = URI.recodePath(newSuffix);
            this._parts.path = this._parts.path.replace(replace, newSuffix);
        }

        return this;

    }

    segment(_segment, _value) {
        let [segment, newValue] = [_segment, _value];

        if (!is.undefined(segment) && !is.number(segment)) {
            [newValue, segment] = [segment, undefined];
        }

        if (!is.undefined(segment) && !is.number(segment)) {
            throw new x.InvalidArgument(`Bad segment "${segment}", must be 0-based integer`);
        }

        const separator = this._parts.urn ? ":" : "/";
        const path = this.path();
        const absolute = path.substring(0, 1) === "/";
        let segments = path.split(separator);

        if (absolute) {
            segments.shift();
        }

        if (segment < 0) {
            // allow negative indexes to address from the end
            segment = Math.max(segments.length + segment, 0);
        }

        if (newValue === undefined) {
            return segment === undefined ? segments : segments[segment];
        } else if (segment === null || segments[segment] === undefined) {
            if (is.array(newValue)) {
                segments = [];
                // collapse empty elements within array
                for (let i = 0, l = newValue.length; i < l; i++) {
                    if (!newValue[i].length && (!segments.length || !segments[segments.length - 1].length)) {
                        continue;
                    }

                    if (segments.length && !segments[segments.length - 1].length) {
                        segments.pop();
                    }

                    segments.push(trimSlashes(newValue[i]));
                }
            } else if (newValue || is.string(newValue)) {
                newValue = trimSlashes(newValue);
                if (segments[segments.length - 1] === "") {
                    // empty trailing elements have to be overwritten
                    // to prevent results such as /foo//bar
                    segments[segments.length - 1] = newValue;
                } else {
                    segments.push(newValue);
                }
            }
        } else {
            if (newValue) {
                segments[segment] = trimSlashes(newValue);
            } else {
                segments.splice(segment, 1);
            }
        }

        if (absolute) {
            segments.unshift("");
        }

        return this.path(segments.join(separator));
    }

    segmentCoded(_segment, _value) {
        let [segment, newValue] = [_segment, _value];

        if (!is.number(segment)) {
            [newValue, segment] = [segment, undefined];
        }

        if (is.undefined(newValue)) {
            let segments = this.segment(segment, newValue);
            if (!is.array(segments)) {
                segments = segments !== undefined ? URI.decode(segments) : undefined;
            } else {
                for (let i = 0, l = segments.length; i < l; i++) {
                    segments[i] = URI.decode(segments[i]);
                }
            }
            return segments;
        }

        if (!is.array(newValue)) {
            newValue = is.string(newValue) ? URI.encode(newValue) : newValue;
        } else {
            for (let i = 0, l = newValue.length; i < l; i++) {
                newValue[i] = URI.encode(newValue[i]);
            }
        }

        return this.segment(segment, newValue);
    }

    fragment(value) {
        let newFragment = value;

        if (is.undefined(newFragment)) {
            return this._parts.fragment || "";
        }


        if (!is.null(newFragment)) {
            newFragment = value.toString();
            if (newFragment.charAt(0) === "#") {
                newFragment = newFragment.substring(1);
            }
        }

        this._parts.fragment = newFragment;
        return this;
    }

    query(value) {
        let newValue = value;

        if (is.undefined(newValue)) {
            return this._parts.query || "";
        }

        if (newValue === true) {
            return URI._parseQuery(this._parts.query, this._parts.escapeQuerySpace);
        }

        if (is.function(newValue)) {
            const data = URI._parseQuery(this._parts.query, this._parts.escapeQuerySpace);
            const result = newValue.call(this, data);
            this._parts.query = URI._buildQuery(result || data, this._parts.duplicateQueryParameters, this._parts.escapeQuerySpace);
            return this;
        }

        if (!is.string(newValue)) {
            this._parts.query = URI._buildQuery(newValue, this._parts.duplicateQueryParameters, this._parts.escapeQuerySpace);
            return this;
        }


        if (!is.null(newValue)) {
            newValue = newValue.toString();
            if (newValue.charAt(0) === "?") {
                newValue = newValue.substring(1);
            }
        }

        this._parts.query = newValue === "" ? null : newValue;
        return this;
    }

    setQuery(name, value) {
        const data = URI._parseQuery(this._parts.query, this._parts.escapeQuerySpace);

        if (is.string(name)) {
            data[name] = !is.undefined(value) ? value : null;
        } else if (is.object(name)) {
            for (const key in name) {
                if (is.propertyOwned(name, key)) {
                    data[key] = name[key];
                }
            }
        } else {
            throw new x.InvalidArgument("URI._addQuery() accepts an object, string as the name parameter");
        }

        this._parts.query = URI._buildQuery(data, this._parts.duplicateQueryParameters, this._parts.escapeQuerySpace);

        return this;
    }

    addQuery(name, value) {
        const data = URI._parseQuery(this._parts.query, this._parts.escapeQuerySpace);
        URI._addQuery(data, name, is.undefined(value) ? null : value);
        this._parts.query = URI._buildQuery(data, this._parts.duplicateQueryParameters, this._parts.escapeQuerySpace);
        return this;
    }

    removeQuery(name, value) {
        const data = URI._parseQuery(this._parts.query, this._parts.escapeQuerySpace);
        URI._removeQuery(data, name, value);
        this._parts.query = URI._buildQuery(data, this._parts.duplicateQueryParameters, this._parts.escapeQuerySpace);
        return this;
    }

    // TODO: по возможности избавиться от boolean аргументов
    hasQuery(name, value, withinArray) {
        const data = URI._parseQuery(this._parts.query, this._parts.escapeQuerySpace);
        return URI._hasQuery(data, name, value, withinArray);
    }

    path(value) {
        let newPath = value;

        if (is.undefined(newPath) || newPath === true) {
            const res = this._parts.path || (this._parts.hostname ? "/" : "");
            return newPath ? (this._parts.urn ? URI.decodeUrnPath : URI.decodePath)(res) : res;
        }
        if (newPath instanceof URI) {
            newPath = newPath.path();
        }

        if (this._parts.urn) {
            this._parts.path = newPath ? URI.recodeUrnPath(newPath) : "";
        } else {
            this._parts.path = newPath ? URI.recodePath(newPath) : "/";
        }
        return this;

    }

    href(value) {
        let newHref = value;

        if (is.undefined(newHref)) {
            return this.toString();
        }

        this._string = "";
        this._parts = URI._parts();
        this._parts.protocol = this._parts.protocol || this.defaultProtocol;

        const isURI = newHref instanceof URI;
        const isObject = is.object(newHref) && (newHref.hostname || newHref.path || newHref.pathname);

        // window.location is reported to be an object, but it's not the sort of object we're looking for:
        // * location.protocol ends with a colon
        // * location.query != object.search
        // * location.hash != object.fragment
        // simply serializing the unknown object should do the trick
        // (for location, not for everything...)
        if (!isURI && isObject && !is.undefined(newHref.pathname)) {
            newHref = newHref.toString();
        }

        if (is.string(newHref)) {
            this._parts = URI._parse(String(newHref), this._parts);
        } else if (isURI || isObject) {
            const src = isURI ? newHref._parts : newHref;
            for (const key in src) {
                if (is.propertyOwned(this._parts, key)) {
                    this._parts[key] = src[key];
                }
            }
        } else {
            throw new x.InvalidArgument("invalid input");
        }

        return this;
    }

    build() {
        this._string = "";

        if (this._parts.protocol) {
            this._string += `${this._parts.protocol}:`;
        }

        if (!this._parts.urn && (this._string || this._parts.hostname)) {
            this._string += "//";
        }

        this._string += (URI._buildAuthority(this._parts) || "");

        if (is.string(this._parts.path)) {
            if (this._parts.path.charAt(0) !== "/" && is.string(this._parts.hostname)) {
                this._string += "/";
            }

            this._string += this._parts.path;
        }

        if (is.string(this._parts.query) && this._parts.query) {
            this._string += `?${this._parts.query}`;
        }

        if (is.string(this._parts.fragment) && this._parts.fragment) {
            this._string += `#${this._parts.fragment}`;
        }
        return this;
    }

    absoluteTo(_base) {
        let base = _base;

        const resolved = this.clone();

        if (this._parts.urn) {
            throw new x.IllegalState("URNs do not have any generally defined hierarchical components");
        }

        if (!(base instanceof URI)) {
            base = new URI(base);
        }

        if (!resolved._parts.protocol) {
            resolved._parts.protocol = base._parts.protocol;
        }

        if (this._parts.hostname) {
            return resolved;
        }

        const properties = ["protocol", "username", "password", "hostname", "port"];
        for (let i = 0; i < properties.length; i++) {
            const p = properties[i];
            resolved._parts[p] = base._parts[p];
        }

        if (!resolved._parts.path) {
            resolved._parts.path = base._parts.path;
            if (!resolved._parts.query) {
                resolved._parts.query = base._parts.query;
            }
        } else if (resolved._parts.path.substring(-2) === "..") {
            resolved._parts.path += "/";
        }

        if (resolved.path().charAt(0) !== "/") {
            let basedir = base.directory();
            if (!basedir) {
                basedir = base.path().indexOf("/") === 0 ? "/" : "";
            }
            resolved._parts.path = (basedir ? (`${basedir}/`) : "") + resolved._parts.path;
            resolved.normalizePath();
        }

        resolved.build();
        return resolved;
    }

    relativeTo(_base) {
        let base = _base;

        const relative = this.clone().normalize();

        if (relative._parts.urn) {
            throw new x.IllegalState("URNs do not have any generally defined hierarchical components");
        }

        base = new URI(base).normalize();
        const relativeParts = relative._parts;
        const baseParts = base._parts;
        const relativePath = relative.path();
        const basePath = base.path();

        if (relativePath.charAt(0) !== "/") {
            throw new x.IllegalState("URI is already relative");
        }

        if (basePath.charAt(0) !== "/") {
            throw new x.IllegalState("Cannot calculate a URI relative to another relative URI");
        }

        if (relativeParts.protocol === baseParts.protocol) {
            relativeParts.protocol = null;
        }

        if (relativeParts.username !== baseParts.username || relativeParts.password !== baseParts.password) {
            return relative.build();
        }

        if (relativeParts.protocol !== null || relativeParts.username !== null || relativeParts.password !== null) {
            return relative.build();
        }

        if (relativeParts.hostname === baseParts.hostname && relativeParts.port === baseParts.port) {
            relativeParts.hostname = null;
            relativeParts.port = null;
        } else {
            return relative.build();
        }

        if (relativePath === basePath) {
            relativeParts.path = "";
            return relative.build();
        }

        // determine common sub path
        const length = Math.min(relativePath.length, basePath.length);
        let pos;

        // find first non-matching character
        for (pos = 0; pos < length; pos++) {
            if (relativePath.charAt(pos) !== basePath.charAt(pos)) {
                pos--;
                break;
            }
        }

        let common;
        if (pos < 1) {
            common = relativePath.charAt(0) === basePath.charAt(0) && relativePath.charAt(0) === "/" ? "/" : "";
        } else {
            if (relativePath.charAt(pos) !== "/" || basePath.charAt(pos) !== "/") {
                pos = relativePath.substring(0, pos).lastIndexOf("/");
            }
            common = relativePath.substring(0, pos + 1);
        }

        // If the paths have nothing in common, return a relative URL with the absolute path.
        if (!common) {
            return relative.build();
        }

        const parents = baseParts.path
            .substring(common.length)
            .replace(/[^/]*$/, "")
            .replace(/.*?\//g, "../");

        relativeParts.path = (parents + relativeParts.path.substring(common.length)) || "./";

        return relative.build();
    }

    normalize() {
        if (this._parts.urn) {
            return this
                .normalizeProtocol()
                .normalizePath()
                .normalizeQuery()
                .normalizeFragment()
                .build();
        }

        return this
            .normalizeProtocol()
            .normalizeHostname()
            .normalizePort()
            .normalizePath()
            .normalizeQuery()
            .normalizeFragment()
            .build();
    }

    normalizeProtocol() {
        if (is.string(this._parts.protocol)) {
            this._parts.protocol = this._parts.protocol.toLowerCase();
        }

        return this;
    }

    normalizeHostname() {
        if (this._parts.hostname) {
            if (this.is("IDN")) {
                this._parts.hostname = adone.punycode.toASCII(this._parts.hostname);
            } else if (this.is("IPv6")) {
                this._parts.hostname = URI._normalizeIPv6Address(this._parts.hostname);
            }

            this._parts.hostname = this._parts.hostname.toLowerCase();
        }

        return this;
    }

    normalizePort() {
        // remove port of it's the protocol's default
        if (is.string(this._parts.protocol)) {
            if (this._parts.port === defaultPorts[this._parts.protocol]) {
                this._parts.port = null;
            }
        }

        return this;
    }

    normalizePath() {
        let path = this._parts.path;
        if (!path) {
            return this;
        }

        if (this._parts.urn) {
            this._parts.path = URI.recodeUrnPath(this._parts.path);
            return this;
        }

        if (this._parts.path === "/") {
            return this;
        }

        path = URI.recodePath(path);


        // handle relative paths
        let wasRelative;
        if (path.charAt(0) !== "/") {
            wasRelative = true;
            path = `/${path}`;
        }

        // handle relative files (as opposed to directories)
        if (path.slice(-3) === "/.." || path.slice(-2) === "/.") {
            path += "/";
        }

        // resolve simples
        path = path
            .replace(/(\/(\.\/)+)|(\/\.$)/g, "/")
            .replace(/\/{2,}/g, "/");

        // remember leading parents
        let leadingParents = "";
        if (wasRelative) {
            leadingParents = path.substring(1).match(/^(\.\.\/)+/) || "";
            if (leadingParents) {
                leadingParents = leadingParents[0];
            }
        }

        // resolve parents
        for (;;) {
            const parent = path.search(/\/\.\.(\/|$)/);
            if (parent === -1) {
                // no more ../ to resolve
                break;
            } else if (parent === 0) {
                // top level cannot be relative, skip it
                path = path.substring(3);
                continue;
            }

            let pos = path.substring(0, parent).lastIndexOf("/");
            if (pos === -1) {
                pos = parent;
            }
            path = path.substring(0, pos) + path.substring(parent + 3);
        }

        // revert to relative
        if (wasRelative && this.is("relative")) {
            path = leadingParents + path.substring(1);
        }

        this._parts.path = path;
        return this;
    }

    normalizeQuery() {
        if (is.string(this._parts.query)) {
            if (!this._parts.query.length) {
                this._parts.query = null;
            } else {
                this.query(URI._parseQuery(this._parts.query, this._parts.escapeQuerySpace));
            }
        }

        return this;
    }

    normalizeFragment() {
        if (!this._parts.fragment) {
            this._parts.fragment = null;
        }

        return this;
    }

    iso8859() {
        // expect unicode input, iso8859 output
        const e = URI.encode;
        const d = URI.decode;

        URI.encode = escape;
        URI.decode = decodeURIComponent;
        try {
            this.normalize();
        } finally {
            URI.encode = e;
            URI.decode = d;
        }
        return this;
    }

    unicode() {
        // expect iso8859 input, unicode output
        const e = URI.encode;
        const d = URI.decode;

        URI.encode = strictEncodeURIComponent;
        URI.decode = unescape;
        try {
            this.normalize();
        } finally {
            URI.encode = e;
            URI.decode = d;
        }
        return this;
    }

    readable() {
        const uri = this.clone();
        // removing username, password, because they shouldn't be displayed according to RFC 3986
        uri.username("").password("").normalize();
        let t = "";
        if (uri._parts.protocol) {
            t += `${uri._parts.protocol}://`;
        }

        if (uri._parts.hostname) {
            if (uri.is("punycode")) {
                t += adone.punycode.toUnicode(uri._parts.hostname);
                if (uri._parts.port) {
                    t += `:${uri._parts.port}`;
                }
            } else {
                t += uri.host();
            }
        }

        if (uri._parts.hostname && uri._parts.path && uri._parts.path.charAt(0) !== "/") {
            t += "/";
        }

        t += uri.path(true);
        if (uri._parts.query) {
            let q = "";
            for (let i = 0, qp = uri._parts.query.split("&"), l = qp.length; i < l; i++) {
                const kv = (qp[i] || "").split("=");
                q += `&${URI._decodeQuery(kv[0], this._parts.escapeQuerySpace).replace(/&/g, "%26")}`;

                if (!is.undefined(kv[1])) {
                    q += `=${URI._decodeQuery(kv[1], this._parts.escapeQuerySpace).replace(/&/g, "%26")}`;
                }
            }
            t += `?${q.substring(1)}`;
        }

        const f = URI._decodeQuery(uri.fragment(), true);
        t += f ? `#${f}` : "";
        return t;
    }

    equals(uri) {
        const one = this.clone();
        const two = new URI(uri);

        one.normalize();
        two.normalize();

        // exact match
        if (one.toString() === two.toString()) {
            return true;
        }

        // extract query string
        const firstQuery = one.query();
        const secondQuery = two.query();
        one.query("");
        two.query("");

        // definitely not equal if not even non-query parts match
        if (one.toString() !== two.toString()) {
            return false;
        }

        // query parameters have the same length, even if they're permuted
        if (firstQuery.length !== secondQuery.length) {
            return false;
        }

        const firstMap = URI._parseQuery(firstQuery, this._parts.escapeQuerySpace);
        const secondMap = URI._parseQuery(secondQuery, this._parts.escapeQuerySpace);
        const checked = {};

        for (const key in firstMap) {
            if (is.propertyOwned(firstMap, key)) {
                if (!is.array(firstMap[key])) {
                    if (firstMap[key] !== secondMap[key]) {
                        return false;
                    }
                } else if (!arraysEqual(firstMap[key], secondMap[key])) {
                    return false;
                }

                checked[key] = true;
            }
        }

        for (const key in secondMap) {
            if (is.propertyOwned(secondMap, key)) {
                if (!checked[key]) {
                    // two contains a parameter not present in one
                    return false;
                }
            }
        }

        return true;
    }

    // state
    duplicateQueryParameters(value) {
        this._parts.duplicateQueryParameters = Boolean(value);
        return this;
    }

    escapeQuerySpace(value) {
        this._parts.escapeQuerySpace = Boolean(value);
        return this;
    }

    static _parts() {
        return {
            protocol: null,
            username: null,
            password: null,
            hostname: null,
            urn: null,
            port: null,
            path: null,
            query: null,
            fragment: null,
            // state: allow duplicate query parameters (a=1&a=1)
            duplicateQueryParameters: false,
            // state: replaces + with %20 (space in query strings)
            escapeQuerySpace: true
        };
    }

    static join(...args) {
        const input = [];
        const segments = [];
        let nonEmptySegments = 0;

        for (let i = 0; i < args.length; ++i) {
            const url = new URI(args[i]);
            input.push(url);
            const _segments = url.segment();
            for (let s = 0; s < _segments.length; s++) {
                if (is.string(_segments[s])) {
                    segments.push(_segments[s]);
                } else if (_segments[s] instanceof URI) {
                    segments.push(_segments[s].toString());
                }

                if (_segments[s]) {
                    nonEmptySegments++;
                }
            }
        }

        if (!segments.length || !nonEmptySegments) {
            return new URI("");
        }

        const uri = new URI("").segment(segments);

        if (input[0].path() === "" || input[0].path().slice(0, 1) === "/") {
            uri.path(`/${uri.path()}`);
        }

        return uri.normalize();
    }

    static _ensureValidHostname(value) {
        // Theoretically URis allow percent-encoding in Hostnames (according to RFC 3986)
        // they are not part of DNS and therefore ignored by URI.js

        // allowed hostname characters according to RFC 3986
        // ALPHA DIGIT "-" "." "_" "~" "!" "$" "&" "'" "(" ")" "*" "+" "," ";" "=" %encoded
        // I've never seen a (non-IDN) hostname other than: ALPHA DIGIT . -
        const invalidHostnameCharacters = /[^a-zA-Z0-9.-]/;

        if (value.match(invalidHostnameCharacters)) {
            if (adone.punycode.toASCII(value).match(invalidHostnameCharacters)) {
                throw new x.InvalidArgument(`Hostname "${value}" contains characters other than [A-Z0-9.-]`);
            }
        }
    }

    static relative(base, to) {
        return new URI(to).relativeTo(base);
    }

    static isAbsolute(path) {
        if (is.string(path)) {
            return path.charAt(0) === "/";
        } else if (path instanceof URI) {
            return path.path().charAt(0) === "/";
        }
        throw new x.InvalidArgument("URI.isAbsolute() accepts only strings and URI's as argument");
    }

    static resolve(...args) {
        if (args.length === 0) {
            return new URI(process.cwd());
        }
        let path = ".";
        for (let i = 0; i < args.length; i++) {
            if (URI.isAbsolute(args[i])) {
                path = args[i];
            } else {
                if (is.string(args[i])) {
                    path = URI.join(path, args[i]);
                } else if (args[i] instanceof URI) {
                    path = URI.join(path, args[i].toString());
                } else {
                    throw new x.InvalidArgument("URI.resolve() accepts only strings and URI's as arguments");
                }
            }
        }

        if (!URI.isAbsolute(path)) {
            path = URI.join(process.cwd(), path);
        }

        return new URI(path).toString();

    }

    static _parseQuery(_string, escapeQuerySpace) {
        let string = _string;

        if (!string) {
            return {};
        }

        // throw out the funky business - "?"[name"="value"&"]+
        string = string.replace(/&+/g, "&").replace(/^\?*&*|&+$/g, "");

        if (!string) {
            return {};
        }

        const items = {};
        const splits = string.split("&");

        for (let i = 0; i < splits.length; i++) {
            const value = splits[i].split("=");
            const name = URI._decodeQuery(value.shift(), escapeQuerySpace);
            // no "=" is null according to http://dvcs.w3.org/hg/url/raw-file/tip/Overview.html#collect-url-parameters
            const result = value.length ? URI._decodeQuery(value.join("="), escapeQuerySpace) : null;

            if (is.propertyOwned(items, name)) {
                if (is.string(items[name]) || items[name] === null) {
                    items[name] = [items[name]];
                }

                items[name].push(result);
            } else {
                items[name] = result;
            }
        }

        return items;
    }

    static _buildQuery(data, duplicateQueryParameters, escapeQuerySpace) {
        // according to http://tools.ietf.org/html/rfc3986 or http://labs.apache.org/webarch/uri/rfc/rfc3986.html
        // being »-._~!$&'()*+,;=:@/?« %HEX and alnum are allowed
        // the RFC explicitly states ?/foo being a valid use case, no mention of parameter syntax!
        // URI.js treats the query string as being application/x-www-form-urlencoded
        // see http://www.w3.org/TR/REC-html40/interact/forms.html#form-content-type

        let t = "";
        for (const key in data) {
            if (is.propertyOwned(data, key) && key) {
                if (is.array(data[key])) {
                    const unique = new Set();
                    for (let i = 0; i < data[key].length; ++i) {
                        if (!is.undefined(data[key][i]) && !unique.has(data[key][i])) {
                            t += `&${URI._buildQueryParameter(key, data[key][i], escapeQuerySpace)}`;
                            if (duplicateQueryParameters !== true) {
                                unique.add(data[key][i]);
                            }
                        }
                    }
                } else if (!is.undefined(data[key])) {
                    t += `&${URI._buildQueryParameter(key, data[key], escapeQuerySpace)}`;
                }
            }
        }

        return t.substring(1);
    }

    static _buildQueryParameter(name, value, escapeQuerySpace) {
        // http://www.w3.org/TR/REC-html40/interact/forms.html#form-content-type -- application/x-www-form-urlencoded
        // don't append "=" for null values, according to http://dvcs.w3.org/hg/url/raw-file/tip/Overview.html#url-parameter-serialization
        return URI._encodeQuery(name, escapeQuerySpace) + (value !== null ? `=${URI._encodeQuery(value, escapeQuerySpace)}` : "");
    }

    static _addQuery(data, name, value) {
        if (is.object(name)) {
            for (const key in name) {
                if (is.propertyOwned(name, key)) {
                    URI._addQuery(data, key, name[key]);
                }
            }
        } else if (is.string(name)) {
            if (is.undefined(data[name])) {
                data[name] = value;
                return;
            } else if (is.string(data[name])) {
                data[name] = [data[name]];
            }

            let _value = value;

            if (!is.array(value)) {
                _value = [_value];
            }

            data[name] = (data[name] || []).concat(_value);
        } else {
            throw new x.InvalidArgument("URI._addQuery() accepts an object, string as the name parameter");
        }
    }

    static _removeQuery(data, name, value) {
        if (is.array(name)) {
            for (let i = 0; i < name.length; ++i) {
                data[name[i]] = undefined;
            }
        } else if (is.regexp(name)) {
            for (const key in data) {
                if (name.test(key)) {
                    data[key] = undefined;
                }
            }
        } else if (is.object(name)) {
            for (const key in name) {
                if (is.propertyOwned(name, key)) {
                    URI._removeQuery(data, key, name[key]);
                }
            }
        } else if (is.string(name)) {
            if (!is.undefined(value)) {
                if (is.regexp(value)) {
                    if (!is.array(data[name]) && value.test(data[name])) {
                        data[name] = undefined;
                    } else {
                        data[name] = filterArrayValues(data[name], value);
                    }
                } else if (data[name] === String(value) && (!is.array(value) || value.length === 1)) {
                    data[name] = undefined;
                } else if (is.array(data[name])) {
                    data[name] = filterArrayValues(data[name], value);
                }
            } else {
                data[name] = undefined;
            }
        } else {
            throw new x.InvalidArgument("URI._removeQuery() accepts an object, string, RegExp as the first parameter");
        }
    }

    static _hasQuery(data, name, value, withinArray) {
        switch (is._getTag(name)) {
            case "string": {
                // Nothing to do here
                break;
            }
            case "regexp": {
                for (const key in data) {
                    if (is.propertyOwned(data, key)) {
                        if (name.test(key) && (is.undefined(value) || URI._hasQuery(data, key, value))) {
                            return true;
                        }
                    }
                }
                return false;
            }
            case "object": {
                for (const _key in name) {
                    if (is.propertyOwned(name, _key)) {
                        if (!URI._hasQuery(data, _key, name[_key])) {
                            return false;
                        }
                    }
                }
                return true;
            }
            default: {
                throw new x.InvalidArgument("URI._hasQuery() accepts a string, regular expression or object as the name parameter");
            }
        }

        let newValue = value;

        switch (is._getTag(value)) {
            case "undefined": {
                // true if exists (but may be empty)
                return name in data; // !is.undefined(data[name]);
            }
            case "boolean": {
                // true if exists and non-empty
                const _booly = Boolean(is.array(data[name]) ? data[name].length : data[name]);
                return value === _booly;
            }
            case "function": {
                // allow complex comparison
                return Boolean(value(data[name], name, data));
            }
            case "array": {
                if (!is.array(data[name])) {
                    return false;
                }

                const op = withinArray ? arrayContains : arraysEqual;
                return op(data[name], value);
            }
            case "regexp": {
                if (!is.array(data[name])) {
                    return Boolean(data[name] && data[name].match(value));
                }

                if (!withinArray) {
                    return false;
                }

                return arrayContains(data[name], value);
            }
            case "number": {
                newValue = String(value);
            } // falls through
            case "string": {
                if (!is.array(data[name])) {
                    return data[name] === newValue;
                }

                if (!withinArray) {
                    return false;
                }
                return arrayContains(data[name], newValue);
            }
            default: {
                throw new x.InvalidArgument("URI._hasQuery() accepts undefined, boolean, string, number, RegExp, Function as the value parameter");
            }
        }
    }

    static _encodeQuery(string, escapeQuerySpace = true) {
        const escaped = URI.encode(string);
        return escapeQuerySpace ? escaped.replace(/%20/g, "+") : escaped;
    }

    static _decodeQuery(_string, escapeQuerySpace = true) {
        const string = String(_string);

        try {
            return URI.decode(escapeQuerySpace ? string.replace(/\+/g, "%20") : string);
        } catch (e) {
            // we're not going to mess with weird encodings,
            // give up and return the undecoded original string
            // see https://github.com/medialize/URI.js/issues/87
            // see https://github.com/medialize/URI.js/issues/92
            return string;
        }
    }

    static _buildHost(parts) {
        let t = "";

        if (!parts.hostname) {
            return "";
        } else if (URI._ip6Expression.test(parts.hostname)) {
            t += `[${parts.hostname}]`;
        } else {
            t += parts.hostname;
        }

        if (parts.port) {
            t += `:${parts.port}`;
        }

        return t;
    }

    static _buildAuthority(parts) {
        return URI._buildUserinfo(parts) + URI._buildHost(parts);
    }

    static _buildUserinfo(parts) {
        let t = "";

        if (parts.username) {
            t += URI.encode(parts.username);
        }

        if (parts.password) {
            t += `:${URI.encode(parts.password)}`;
        }

        if (t) {
            t += "@";
        }

        return t;
    }

    static _normalizeIPv6Address(address) {
        // based on:
        // Javascript to test an IPv6 address for proper format, and to
        // present the "best text representation" according to IETF Draft RFC at
        // http://tools.ietf.org/html/draft-ietf-6man-text-addr-representation-04
        // 8 Feb 2010 Rich Brown, Dartware, LLC
        // Please feel free to use this code as long as you provide a link to
        // http://www.intermapper.com
        // http://intermapper.com/support/tools/IPV6-Validator.aspx
        // http://download.dartware.com/thirdparty/ipv6validator.js

        const _address = address.toLowerCase();
        const segments = _address.split(":");
        let length = segments.length;
        let total = 8;

        // trim colons (:: or ::a:b:c… or …a:b:c::)
        if (segments[0] === "" && segments[1] === "" && segments[2] === "") {
            // must have been ::
            // remove first two items
            segments.shift();
            segments.shift();
        } else if (segments[0] === "" && segments[1] === "") {
            // must have been ::xxxx
            // remove the first item
            segments.shift();
        } else if (segments[length - 1] === "" && segments[length - 2] === "") {
            // must have been xxxx::
            segments.pop();
        }

        length = segments.length;

        // adjust total segments for IPv4 trailer
        if (segments[length - 1].indexOf(".") !== -1) {
            // found a "." which means IPv4
            total = 7;
        }

        // fill empty segments them with "0000"
        let pos;
        for (pos = 0; pos < length; pos++) {
            if (segments[pos] === "") {
                break;
            }
        }

        if (pos < total) {
            segments.splice(pos, 1, "0000");
            while (segments.length < total) {
                segments.splice(pos, 0, "0000");
            }
        }

        // strip leading zeros
        let _segments;
        for (let i = 0; i < total; i++) {
            _segments = segments[i].split("");
            for (let j = 0; j < 3; j++) {
                if (_segments[0] === "0" && _segments.length > 1) {
                    _segments.splice(0, 1);
                } else {
                    break;
                }
            }

            segments[i] = _segments.join("");
        }

        // find longest sequence of zeroes and coalesce them into one segment
        let best = -1;
        let _best = 0;
        let _current = 0;
        let current = -1;
        let inzeroes = false;

        for (let i = 0; i < total; i++) {
            if (inzeroes) {
                if (segments[i] === "0") {
                    _current += 1;
                } else {
                    inzeroes = false;
                    if (_current > _best) {
                        best = current;
                        _best = _current;
                    }
                }
            } else {
                if (segments[i] === "0") {
                    inzeroes = true;
                    current = i;
                    _current = 1;
                }
            }
        }

        if (_current > _best) {
            best = current;
            _best = _current;
        }

        if (_best > 1) {
            segments.splice(best, _best, "");
        }

        length = segments.length;

        // assemble remaining segments
        let result = "";
        if (segments[0] === "") {
            result = ":";
        }

        for (let i = 0; i < length; i++) {
            result += segments[i];
            if (i === length - 1) {
                break;
            }

            result += ":";
        }

        if (segments[length - 1] === "") {
            result += ":";
        }

        return result;
    }

    static _parseUserinfo(string, parts) {
        // extract username:password
        const firstSlash = string.indexOf("/");
        const pos = string.lastIndexOf("@", firstSlash > -1 ? firstSlash : string.length - 1);
        let t;

        let newString = string;

        // authority@ must come before /path
        if (pos > -1 && (firstSlash === -1 || pos < firstSlash)) {
            t = string.substring(0, pos).split(":");
            parts.username = t[0] ? decodeURIComponent(t[0]) : null;
            t.shift();
            parts.password = t[0] ? decodeURIComponent(t.join(":")) : null;
            newString = string.substring(pos + 1);
        } else {
            parts.username = null;
            parts.password = null;
        }

        return newString;
    }

    static _parseHost(_string, parts) {
        // Copy chrome, IE, opera backslash-handling behavior.
        // Back slashes before the query string get converted to forward slashes
        // See: https://github.com/joyent/node/blob/386fd24f49b0e9d1a8a076592a404168faeecc34/lib/url.js#L115-L124
        // See: https://code.google.com/p/chromium/issues/detail?id=25916
        // https://github.com/medialize/URI.js/pull/233
        let string = _string.replace(/\\/g, "/");

        // extract host:port
        let pos = string.indexOf("/");
        let bracketPos;
        let t;

        if (pos === -1) {
            pos = string.length;
        }

        if (string.charAt(0) === "[") {
            // IPv6 host - http://tools.ietf.org/html/draft-ietf-6man-text-addr-representation-04#section-6
            // I claim most client software breaks on IPv6 anyways. To simplify things, URI only accepts
            // IPv6+port in the format [2001:db8::1]:80 (for the time being)
            bracketPos = string.indexOf("]");
            parts.hostname = string.substring(1, bracketPos) || null;
            parts.port = string.substring(bracketPos + 2, pos) || null;
            if (parts.port === "/") {
                parts.port = null;
            }
        } else {
            const firstColon = string.indexOf(":");
            const firstSlash = string.indexOf("/");
            const nextColon = string.indexOf(":", firstColon + 1);
            if (nextColon !== -1 && (firstSlash === -1 || nextColon < firstSlash)) {
                // IPv6 host contains multiple colons - but no port
                // this notation is actually not allowed by RFC 3986, but we're a liberal parser
                parts.hostname = string.substring(0, pos) || null;
                parts.port = null;
            } else {
                t = string.substring(0, pos).split(":");
                parts.hostname = t[0] || null;
                parts.port = t[1] || null;
            }
        }

        if (parts.port === "0") {
            parts.port = null;
        }

        if (parts.hostname && string.substring(pos).charAt(0) !== "/") {
            pos++;
            string = `/${string}`;
        }

        return string.substring(pos) || "/";
    }

    static _parseAuthority(string, parts) {
        const _string = URI._parseUserinfo(string, parts);
        return URI._parseHost(_string, parts);
    }

    static _parse(_string, _parts) {
        const parts = _parts || {};
        let string = _string;
        // [protocol"://"[username[":"password]"@"]hostname[":"port]"/"?][path]["?"querystring]["#"fragment]

        // extract fragment
        let pos = string.indexOf("#");
        if (pos > -1) {
            // escaping?
            parts.fragment = string.substring(pos + 1) || null;
            string = string.substring(0, pos);
        }

        // extract query
        pos = string.indexOf("?");
        if (pos > -1) {
            // escaping?
            parts.query = string.substring(pos + 1) || null;
            string = string.substring(0, pos);
        }

        // extract protocol
        if (string.substring(0, 2) === "//") {
            // relative-scheme
            parts.protocol = null;
            string = string.substring(2);
            // extract "user:pass@host:port"
            string = URI._parseAuthority(string, parts);
        } else {
            pos = string.indexOf(":");
            if (pos > -1) {
                parts.protocol = string.substring(0, pos) || null;
                if (parts.protocol && !parts.protocol.match(URI._protocol_expression)) {
                    // : may be within the path
                    parts.protocol = undefined;
                } else if (string.substring(pos + 1, pos + 3) === "//") {
                    string = string.substring(pos + 3);

                    // extract "user:pass@host:port"
                    string = URI._parseAuthority(string, parts);
                } else {
                    string = string.substring(pos + 1);
                    parts.urn = true;
                }
            }
        }

        // what's left must be the path
        parts.path = string;

        return parts;
    }
}
URI.encode = strictEncodeURIComponent;
URI.decode = decodeURIComponent;
URI._characters = {
    pathname: {
        encode: {
            // RFC3986 2.1: For consistency, URI producers and normalizers should
            // use uppercase hexadecimal digits for all percent-encodings.
            expression: /%(24|26|2B|2C|3B|3D|3A|40)/ig,
            map: {
                // -._~!'()*
                "%24": "$",
                "%26": "&",
                "%2B": "+",
                "%2C": ",",
                "%3B": ";",
                "%3D": "=",
                "%3A": ":",
                "%40": "@"
            }
        },
        decode: {
            expression: /[/?#]/g,
            map: {
                "/": "%2F",
                "?": "%3F",
                "#": "%23"
            }
        }
    },
    reserved: {
        encode: {
            // RFC3986 2.1: For consistency, URI producers and normalizers should
            // use uppercase hexadecimal digits for all percent-encodings.
            expression: /%(21|23|24|26|27|28|29|2A|2B|2C|2F|3A|3B|3D|3F|40|5B|5D)/ig,
            map: {
                // gen-delims
                "%3A": ":",
                "%2F": "/",
                "%3F": "?",
                "%23": "#",
                "%5B": "[",
                "%5D": "]",
                "%40": "@",
                // sub-delims
                "%21": "!",
                "%24": "$",
                "%26": "&",
                "%27": "'",
                "%28": "(",
                "%29": ")",
                "%2A": "*",
                "%2B": "+",
                "%2C": ",",
                "%3B": ";",
                "%3D": "="
            }
        }
    },
    urnpath: {
        // The characters under `encode` are the characters called out by RFC 2141 as being acceptable
        // for usage in a URN. RFC2141 also calls out "-", ".", and "_" as acceptable characters, but
        // these aren't encoded by encodeURIComponent, so we don't have to call them out here. Also
        // note that the colon character is not featured in the encoding map; this is because URI.js
        // gives the colons in URNs semantic meaning as the delimiters of path segements, and so it
        // should not appear unencoded in a segment itself.
        // See also the note above about RFC3986 and capitalalized hex digits.
        encode: {
            expression: /%(21|24|27|28|29|2A|2B|2C|3B|3D|40)/ig,
            map: {
                "%21": "!",
                "%24": "$",
                "%27": "'",
                "%28": "(",
                "%29": ")",
                "%2A": "*",
                "%2B": "+",
                "%2C": ",",
                "%3B": ";",
                "%3D": "=",
                "%40": "@"
            }
        },
        // These characters are the characters called out by RFC2141 as "reserved" characters that
        // should never appear in a URN, plus the colon character (see note above).
        decode: {
            expression: /[/?#:]/g,
            map: {
                "/": "%2F",
                "?": "%3F",
                "#": "%23",
                ":": "%3A"
            }
        }
    }
};
// credits to Rich Brown
// source: http://forums.intermapper.com/viewtopic.php?p=1096#1096
// specification: http://www.ietf.org/rfc/rfc4291.txt
URI._ip6Expression = /^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$/;

// generate encode/decode path functions
const generateAccessor = (_group, _part) => {
    return (string) => {
        try {
            return URI[_part](String(string)).replace(URI._characters[_group][_part].expression, (c) => URI._characters[_group][_part].map[c]);
        } catch (e) {
            // we're not going to mess with weird encodings,
            // give up and return the undecoded original string
            // see https://github.com/medialize/URI.js/issues/87
            // see https://github.com/medialize/URI.js/issues/92
            return string;
        }
    };
};

for (const part of ["encode", "decode"]) {
    URI[`${part}PathSegment`] = generateAccessor("pathname", part);
    URI[`${part}UrnPathSegment`] = generateAccessor("urnpath", part);
}

const generateSegmentedPathFunction = (_sep, _codingFuncName, _innerCodingFuncName) => {
    return (string) => {
        // Why pass in names of functions, rather than the function objects themselves? The
        // definitions of some functions (but in particular, URI.decode) will occasionally change due
        // to URI.js having ISO8859 and Unicode modes. Passing in the name and getting it will ensure
        // that the functions we use here are "fresh".
        let actualCodingFunc;
        if (!_innerCodingFuncName) {
            actualCodingFunc = URI[_codingFuncName];
        } else {
            actualCodingFunc = (string) => URI[_codingFuncName](URI[_innerCodingFuncName](string));
        }

        const segments = string.split(_sep);

        for (let i = 0; i < segments.length; ++i) {
            segments[i] = actualCodingFunc(segments[i]);
        }

        return segments.join(_sep);
    };
};

// This takes place outside the above loop because we don't want, e.g., encodeUrnPath functions.
URI.decodePath = generateSegmentedPathFunction("/", "decodePathSegment");
URI.decodeUrnPath = generateSegmentedPathFunction(":", "decodeUrnPathSegment");
URI.recodePath = generateSegmentedPathFunction("/", "encodePathSegment", "decode");
URI.recodeUrnPath = generateSegmentedPathFunction(":", "encodeUrnPathSegment", "decode");
URI.encodeReserved = generateAccessor("reserved", "encode");

if (is.win32) {
    URI.delimiter = ";";
    URI.sep = "\\";
} else {
    URI.delimiter = ":";
    URI.sep = "/";
}
