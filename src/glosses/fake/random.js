const {
    is,
    fake
} = adone;

// this program is a JavaScript version of Mersenne Twister, with concealment and encapsulation in class,
// an almost straight conversion from the original program, mt19937ar.c,
// translated by y. okada on July 17, 2006.
// and modified a little at july 20, 2006, but there are not any substantial differences.
// in this program, procedure descriptions and comments of original source code were not removed.
// lines commented with //c// were originally descriptions of c procedure. and a few following lines are appropriate JavaScript descriptions.
// lines commented with /* and */ are original comments.
// lines commented with // are additional comments in this JavaScript version.
// before using this version, create at least one instance of MersenneTwister19937 class, and initialize the each state, given below in c comments, of all the instances.
/**
 * A C-program for MT19937, with initialization improved 2002/1/26.
 * Coded by Takuji Nishimura and Makoto Matsumoto.
 *
 * Before using, initialize the state by using init_genrand(seed)
 * or init_by_array(init_key, key_length).
 *
 * Copyright (C) 1997 - 2002, Makoto Matsumoto and Takuji Nishimura,
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1. Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright
 * notice, this list of conditions and the following disclaimer in the
 * documentation and/or other materials provided with the distribution.
 *
 * 3. The names of its contributors may not be used to endorse or promote
 * products derived from this software without specific prior written
 * permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT OWNER OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 *
 * Any feedback is very welcome.
 * http://www.math.sci.hiroshima-u.ac.jp/~m-mat/MT/emt.html
 * email: m-mat @ math.sci.hiroshima-u.ac.jp (remove space)
 */

const MersenneTwister19937 = function () {
    /**
     * constants should be scoped inside the class
     */
    let N, M, MATRIX_A, UPPER_MASK, LOWER_MASK;
    /**
     * Period parameters
     */
    //c//#define N 624
    //c//#define M 397
    //c//#define MATRIX_A 0x9908b0dfUL   /* constant vector a */
    //c//#define UPPER_MASK 0x80000000UL /* most significant w-r bits */
    //c//#define LOWER_MASK 0x7fffffffUL /* least significant r bits */
    N = 624;
    M = 397;
    MATRIX_A = 0x9908b0df; /**
                            * constant vector a
                            */
    UPPER_MASK = 0x80000000; /**
                              * most significant w-r bits
                              */
    LOWER_MASK = 0x7fffffff; /**
                              * least significant r bits
                              */
    //c//static unsigned long mt[N]; /* the array for the state vector  */
    //c//static int mti=N+1; /* mti==N+1 means mt[N] is not initialized */
    const mt = new Array(N); /**
                              * the array for the state vector
                              */
    let mti = N + 1; /**
                      * mti==N+1 means mt[N] is not initialized
                      */

    function unsigned32(n1) // returns a 32-bits unsiged integer from an operand to which applied a bit operator.
    {
        return n1 < 0 ? (n1 ^ UPPER_MASK) + UPPER_MASK : n1;
    }

    function subtraction32(n1, n2) // emulates lowerflow of a c 32-bits unsiged integer variable, instead of the operator -. these both arguments must be non-negative integers expressible using unsigned 32 bits.
    {
        return n1 < n2 ? unsigned32((0x100000000 - (n2 - n1)) & 0xffffffff) : n1 - n2;
    }

    function addition32(n1, n2) // emulates overflow of a c 32-bits unsiged integer variable, instead of the operator +. these both arguments must be non-negative integers expressible using unsigned 32 bits.
    {
        return unsigned32((n1 + n2) & 0xffffffff);
    }

    function multiplication32(n1, n2) // emulates overflow of a c 32-bits unsiged integer variable, instead of the operator *. these both arguments must be non-negative integers expressible using unsigned 32 bits.
    {
        let sum = 0;
        for (let i = 0; i < 32; ++i) {
            if ((n1 >>> i) & 0x1) {
                sum = addition32(sum, unsigned32(n2 << i));
            }
        }
        return sum;
    }

    /**
     * initializes mt[N] with a seed
     */
    //c//void init_genrand(unsigned long s)
    this.init_genrand = function (s) {
        //c//mt[0]= s & 0xffffffff;
        mt[0] = unsigned32(s & 0xffffffff);
        for (mti = 1; mti < N; mti++) {
            mt[mti] =
                //c//(1812433253 * (mt[mti-1] ^ (mt[mti-1] >> 30)) + mti);
                addition32(multiplication32(1812433253, unsigned32(mt[mti - 1] ^ (mt[mti - 1] >>> 30))), mti);
            /**
             * See Knuth TAOCP Vol2. 3rd Ed. P.106 for multiplier.
             */
            /**
             * In the previous versions, MSBs of the seed affect
             */
            /**
             * only MSBs of the array mt[].
             */
            /**
             * 2002/01/09 modified by Makoto Matsumoto
             */
            //c//mt[mti] &= 0xffffffff;
            mt[mti] = unsigned32(mt[mti] & 0xffffffff);
            /* for >32 bit machines */
        }
    };

    /**
     * initialize by an array with array-length
     */
    /**
     * init_key is the array for initializing keys
     */
    /**
     * key_length is its length
     */
    /**
     * slight change for C++, 2004/2/26
     */
    //c//void init_by_array(unsigned long init_key[], int key_length)
    this.init_by_array = function (init_key, key_length) {
        //c//int i, j, k;
        let i, j, k;
        //c//init_genrand(19650218);
        this.init_genrand(19650218);
        i = 1; j = 0;
        k = (N > key_length ? N : key_length);
        for (; k; k--) {
            //c//mt[i] = (mt[i] ^ ((mt[i-1] ^ (mt[i-1] >> 30)) * 1664525))
            //c//	+ init_key[j] + j; /* non linear */
            mt[i] = addition32(addition32(unsigned32(mt[i] ^ multiplication32(unsigned32(mt[i - 1] ^ (mt[i - 1] >>> 30)), 1664525)), init_key[j]), j);
            mt[i] =
                //c//mt[i] &= 0xffffffff; /* for WORDSIZE > 32 machines */
                unsigned32(mt[i] & 0xffffffff);
            i++; j++;
            if (i >= N) {
                mt[0] = mt[N - 1]; i = 1;
            }
            if (j >= key_length) {
                j = 0;
            }
        }
        for (k = N - 1; k; k--) {
            //c//mt[i] = (mt[i] ^ ((mt[i-1] ^ (mt[i-1] >> 30)) * 1566083941))
            //c//- i; /* non linear */
            mt[i] = subtraction32(unsigned32((dbg = mt[i]) ^ multiplication32(unsigned32(mt[i - 1] ^ (mt[i - 1] >>> 30)), 1566083941)), i);
            //c//mt[i] &= 0xffffffff; /* for WORDSIZE > 32 machines */
            mt[i] = unsigned32(mt[i] & 0xffffffff);
            i++;
            if (i >= N) {
                mt[0] = mt[N - 1]; i = 1;
            }
        }
        mt[0] = 0x80000000; /* MSB is 1; assuring non-zero initial array */
    };

    /**
     * moved outside of genrand_int32() by jwatte 2010-11-17; generate less garbage
     */
    const mag01 = [0x0, MATRIX_A];

    /**
     * generates a random number on [0,0xffffffff]-interval
     */
    //c//unsigned long genrand_int32(void)
    this.genrand_int32 = function () {
        //c//unsigned long y;
        //c//static unsigned long mag01[2]={0x0UL, MATRIX_A};
        let y;
        /* mag01[x] = x * MATRIX_A  for x=0,1 */

        if (mti >= N) { /**
                         * generate N words at one time
                         */
            //c//int kk;
            let kk;

            if (mti == N + 1) /**
                               * if init_genrand() has not been called,
                               */
            //c//init_genrand(5489); /* a default initial seed is used */
            {
                this.init_genrand(5489);
            } /* a default initial seed is used */

            for (kk = 0; kk < N - M; kk++) {
                //c//y = (mt[kk]&UPPER_MASK)|(mt[kk+1]&LOWER_MASK);
                //c//mt[kk] = mt[kk+M] ^ (y >> 1) ^ mag01[y & 0x1];
                y = unsigned32((mt[kk] & UPPER_MASK) | (mt[kk + 1] & LOWER_MASK));
                mt[kk] = unsigned32(mt[kk + M] ^ (y >>> 1) ^ mag01[y & 0x1]);
            }
            for (; kk < N - 1; kk++) {
                //c//y = (mt[kk]&UPPER_MASK)|(mt[kk+1]&LOWER_MASK);
                //c//mt[kk] = mt[kk+(M-N)] ^ (y >> 1) ^ mag01[y & 0x1];
                y = unsigned32((mt[kk] & UPPER_MASK) | (mt[kk + 1] & LOWER_MASK));
                mt[kk] = unsigned32(mt[kk + (M - N)] ^ (y >>> 1) ^ mag01[y & 0x1]);
            }
            //c//y = (mt[N-1]&UPPER_MASK)|(mt[0]&LOWER_MASK);
            //c//mt[N-1] = mt[M-1] ^ (y >> 1) ^ mag01[y & 0x1];
            y = unsigned32((mt[N - 1] & UPPER_MASK) | (mt[0] & LOWER_MASK));
            mt[N - 1] = unsigned32(mt[M - 1] ^ (y >>> 1) ^ mag01[y & 0x1]);
            mti = 0;
        }

        y = mt[mti++];

        /**
         * Tempering
         */
        //c//y ^= (y >> 11);
        //c//y ^= (y << 7) & 0x9d2c5680;
        //c//y ^= (y << 15) & 0xefc60000;
        //c//y ^= (y >> 18);
        y = unsigned32(y ^ (y >>> 11));
        y = unsigned32(y ^ ((y << 7) & 0x9d2c5680));
        y = unsigned32(y ^ ((y << 15) & 0xefc60000));
        y = unsigned32(y ^ (y >>> 18));

        return y;
    };

    /**
     * generates a random number on [0,0x7fffffff]-interval
     */
    //c//long genrand_int31(void)
    this.genrand_int31 = function () {
        //c//return (genrand_int32()>>1);
        return (this.genrand_int32() >>> 1);
    };

    /**
     * generates a random number on [0,1]-real-interval
     */
    //c//double genrand_real1(void)
    this.genrand_real1 = function () {
        //c//return genrand_int32()*(1.0/4294967295.0);
        return this.genrand_int32() * (1.0 / 4294967295.0);
        /* divided by 2^32-1 */
    };

    /**
     * generates a random number on [0,1)-real-interval
     */
    //c//double genrand_real2(void)
    this.genrand_real2 = function () {
        //c//return genrand_int32()*(1.0/4294967296.0);
        return this.genrand_int32() * (1.0 / 4294967296.0);
        /* divided by 2^32 */
    };

    /**
     * generates a random number on (0,1)-real-interval
     */
    //c//double genrand_real3(void)
    this.genrand_real3 = function () {
        //c//return ((genrand_int32()) + 0.5)*(1.0/4294967296.0);
        return ((this.genrand_int32()) + 0.5) * (1.0 / 4294967296.0);
        /* divided by 2^32 */
    };

    /**
     * generates a random number on [0,1) with 53-bit resolution
     */
    //c//double genrand_res53(void)
    this.genrand_res53 = function () {
        //c//unsigned long a=genrand_int32()>>5, b=genrand_int32()>>6;
        let a = this.genrand_int32() >>> 5, b = this.genrand_int32() >>> 6;
        return (a * 67108864.0 + b) * (1.0 / 9007199254740992.0);
    };
    /* These real versions are due to Isaku Wada, 2002/01/09 added */
};

//  Exports: Public API

export const mersenne = {};

//  Export the twister class
mersenne.MersenneTwister19937 = MersenneTwister19937;

//  Export a simplified function to generate random numbers
const gen = new MersenneTwister19937();
gen.init_genrand((new Date()).getTime() % 1000000000);

// Added max, min range functionality, Marak Squires Sept 11 2014
mersenne.rand = function (max, min) {
    if (is.undefined(max)) {
        min = 0;
        max = 32768;
    }
    return Math.floor(gen.genrand_real2() * (max - min) + min);
};
mersenne.seed = function (S) {
    if (!is.number(S)) {
        throw new Error(`seed(S) must take numeric argument; is ${typeof (S)}`);
    }
    gen.init_genrand(S);
};
mersenne.seed_array = function (A) {
    if (typeof (A) !== "object") {
        throw new Error(`seed_array(A) must take array of numbers; is ${typeof (A)}`);
    }
    gen.init_by_array(A);
};

/**
 * returns a single random number based on a max number or range
 *
 * @method fake.random.number
 * @param {mixed} options
 */
export const number = function (options) {

    if (is.number(options)) {
        options = {
            max: options
        };
    }

    options = options || {};

    if (is.undefined(options.min)) {
        options.min = 0;
    }

    if (is.undefined(options.max)) {
        options.max = 99999;
    }
    if (is.undefined(options.precision)) {
        options.precision = 1;
    }

    // Make the range inclusive of the max value
    let max = options.max;
    if (max >= 0) {
        max += options.precision;
    }

    let randomNumber = Math.floor(
        mersenne.rand(max / options.precision, options.min / options.precision));
    // Workaround problem in Float point arithmetics for e.g. 6681493 / 0.01
    randomNumber = randomNumber / (1 / options.precision);

    return randomNumber;

};

/**
 * takes an array and returns a random element of the array
 *
 * @method fake.random.arrayElement
 * @param {array} array
 */
export const arrayElement = function (array) {
    array = array || ["a", "b", "c"];
    const r = fake.random.number({ max: array.length - 1 });
    return array[r];
};

/**
 * takes an array and returns a subset with random elements of the array
 *
 * @method fake.random.arrayElements
 * @param {array} array
 * @param {number} count number of elements to pick
 */
export const arrayElements = function (array, count) {
    array = array || ["a", "b", "c"];

    if (!is.number(count)) {
        count = fake.random.number({ min: 1, max: array.length });
    } else if (count > array.length) {
        count = array.length;
    } else if (count < 0) {
        count = 0;
    }

    const arrayCopy = array.slice();
    const countToRemove = arrayCopy.length - count;
    for (let i = 0; i < countToRemove; i++) {
        const indexToRemove = fake.random.number({ max: arrayCopy.length - 1 });
        arrayCopy.splice(indexToRemove, 1);
    }

    return arrayCopy;
};

/**
 * takes an object and returns the randomly key or value
 *
 * @method fake.random.objectElement
 * @param {object} object
 * @param {mixed} field
 */
export const objectElement = function (object, field) {
    object = object || { foo: "bar", too: "car" };
    const array = Object.keys(object);
    const key = fake.random.arrayElement(array);

    return field === "key" ? key : object[key];
};

/**
 * uuid
 *
 * @method fake.random.uuid
 */
export const uuid = function () {
    const self = this;
    const RFC4122_TEMPLATE = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
    const replacePlaceholders = function (placeholder) {
        const random = self.number({ min: 0, max: 15 });
        const value = placeholder == "x" ? random : (random & 0x3 | 0x8);
        return value.toString(16);
    };
    return RFC4122_TEMPLATE.replace(/[xy]/g, replacePlaceholders);
};

/**
 * boolean
 *
 * @method fake.random.boolean
 */
export const boolean = function () {
    return Boolean(fake.random.number(1));
};

// TODO: have ability to return specific type of word? As in: noun, adjective, verb, etc
/**
 * word
 *
 * @method fake.random.word
 * @param {string} type
 */
export const word = function (type) {
    const wordMethods = [
        "commerce.department",
        "commerce.productName",
        "commerce.productAdjective",
        "commerce.productMaterial",
        "commerce.product",
        "commerce.color",

        "company.catchPhraseAdjective",
        "company.catchPhraseDescriptor",
        "company.catchPhraseNoun",
        "company.bsAdjective",
        "company.bsBuzz",
        "company.bsNoun",
        "address.streetSuffix",
        "address.county",
        "address.country",
        "address.state",

        "finance.accountName",
        "finance.transactionType",
        "finance.currencyName",

        "hacker.noun",
        "hacker.verb",
        "hacker.adjective",
        "hacker.ingverb",
        "hacker.abbreviation",

        "name.jobDescriptor",
        "name.jobArea",
        "name.jobType"];

    // randomly pick from the many fake methods that can generate words
    const randomWordMethod = fake.random.arrayElement(wordMethods);
    return fake.fake(`{{${randomWordMethod}}}`);

};

/**
 * randomWords
 *
 * @method fake.random.words
 * @param {number} count defaults to a random value between 1 and 3
 */
export const words = function randomWords(count) {
    const words = [];
    if (is.undefined(count)) {
        count = fake.random.number({ min: 1, max: 3 });
    }
    for (let i = 0; i < count; i++) {
        words.push(fake.random.word());
    }
    return words.join(" ");
};

/**
 * locale
 *
 * @method fake.random.image
 */
export const image = function randomImage() {
    return fake.image.image();
};

/**
 * locale
 *
 * @method fake.random.locale
 */
export const locale = function randomLocale() {
    return fake.random.arrayElement(Object.keys(fake.locales));
};

/**
 * alphaNumeric
 *
 * @method fake.random.alphaNumeric
 * @param {number} count defaults to 1
 */
export const alphaNumeric = function alphaNumeric(count) {
    if (is.undefined(count)) {
        count = 1;
    }

    let wholeString = "";
    for (let i = 0; i < count; i++) {
        wholeString += fake.random.arrayElement(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"]);
    }

    return wholeString;
};

/**
 * hexaDecimal
 *
 * @method fake.random.hexaDecimal
 * @param {number} count defaults to 1
 */
export const hexaDecimal = function hexaDecimal(count) {
    if (is.undefined(count)) {
        count = 1;
    }

    let wholeString = "";
    for (let i = 0; i < count; i++) {
        wholeString += fake.random.arrayElement(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f", "A", "B", "C", "D", "E", "F"]);
    }

    return `0x${wholeString}`;
};
