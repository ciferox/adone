const { is } = adone;

const escapeRegExpChars = (string) => string.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");

const bitapRegexSearch = (text, pattern, tokenSeparator = / +/g) => {
    const matches = text.match(new RegExp(escapeRegExpChars(pattern).replace(tokenSeparator, "|")));
    const isMatch = Boolean(matches);
    const matchedIndices = [];

    if (isMatch) {
        for (let i = 0, matchesLen = matches.length; i < matchesLen; i += 1) {
            const match = matches[i];
            matchedIndices.push([text.indexOf(match), match.length - 1]);
        }
    }

    return {
        // TODO: revisit this score
        score: isMatch ? 0.5 : 1,
        isMatch,
        matchedIndices
    };
};


const bitapScore = (pattern, { errors = 0, currentLocation = 0, expectedLocation = 0, distance = 100 } = {}) => {
    const accuracy = errors / pattern.length;
    const proximity = Math.abs(expectedLocation - currentLocation);

    if (!distance) {
        // Dodge divide by zero error.
        return proximity ? 1.0 : accuracy;
    }

    return accuracy + (proximity / distance);
};

const matchedIndices = (matchmask = [], minMatchCharLength = 1) => {
    const matchedIndices = [];
    let start = -1;
    let end = -1;
    let i = 0;

    for (let len = matchmask.length; i < len; i += 1) {
        const match = matchmask[i];
        if (match && start === -1) {
            start = i;
        } else if (!match && start !== -1) {
            end = i - 1;
            if ((end - start) + 1 >= minMatchCharLength) {
                matchedIndices.push([start, end]);
            }
            start = -1;
        }
    }

    // (i-1 - start) + 1 => i - start
    if (matchmask[i - 1] && (i - start) >= minMatchCharLength) {
        matchedIndices.push([start, i - 1]);
    }

    return matchedIndices;
};

const bitapSearch = (text, pattern, patternAlphabet, { location = 0, distance = 100, threshold = 0.6, findAllMatches = false, minMatchCharLength = 1 } = {}) => {
    const expectedLocation = location;
    // Set starting location at beginning text and initialize the alphabet.
    const textLen = text.length;
    // Highest score beyond which we give up.
    let currentThreshold = threshold;
    // Is there a nearby exact match? (speedup)
    let bestLocation = text.indexOf(pattern, expectedLocation);

    const patternLen = pattern.length;

    // a mask of the matches
    const matchMask = [];
    for (let i = 0; i < textLen; i += 1) {
        matchMask[i] = 0;
    }

    if (bestLocation !== -1) {
        const score = bitapScore(pattern, {
            errors: 0,
            currentLocation: bestLocation,
            expectedLocation,
            distance
        });
        currentThreshold = Math.min(score, currentThreshold);

        // What about in the other direction? (speed up)
        bestLocation = text.lastIndexOf(pattern, expectedLocation + patternLen);

        if (bestLocation !== -1) {
            const score = bitapScore(pattern, {
                errors: 0,
                currentLocation: bestLocation,
                expectedLocation,
                distance
            });
            currentThreshold = Math.min(score, currentThreshold);
        }
    }

    // Reset the best location
    bestLocation = -1;

    let lastBitArr = [];
    let finalScore = 1;
    let binMax = patternLen + textLen;

    const mask = 1 << (patternLen - 1);

    for (let i = 0; i < patternLen; i += 1) {
        // Scan for the best match; each iteration allows for one more error.
        // Run a binary search to determine how far from the match location we can stray
        // at this error level.
        let binMin = 0;
        let binMid = binMax;

        while (binMin < binMid) {
            const score = bitapScore(pattern, {
                errors: i,
                currentLocation: expectedLocation + binMid,
                expectedLocation,
                distance
            });

            if (score <= currentThreshold) {
                binMin = binMid;
            } else {
                binMax = binMid;
            }

            binMid = Math.floor((binMax - binMin) / 2 + binMin);
        }

        // Use the result from this iteration as the maximum for the next.
        binMax = binMid;

        let start = Math.max(1, expectedLocation - binMid + 1);
        const finish = findAllMatches ? textLen : Math.min(expectedLocation + binMid, textLen) + patternLen;

        // Initialize the bit array
        const bitArr = Array(finish + 2);

        bitArr[finish + 1] = (1 << i) - 1;

        for (let j = finish; j >= start; j -= 1) {
            const currentLocation = j - 1;
            const charMatch = patternAlphabet[text.charAt(currentLocation)];

            if (charMatch) {
                matchMask[currentLocation] = 1;
            }

            // First pass: exact match
            bitArr[j] = ((bitArr[j + 1] << 1) | 1) & charMatch;

            // Subsequent passes: fuzzy match
            if (i !== 0) {
                bitArr[j] |= (((lastBitArr[j + 1] | lastBitArr[j]) << 1) | 1) | lastBitArr[j + 1];
            }

            if (bitArr[j] & mask) {
                finalScore = bitapScore(pattern, {
                    errors: i,
                    currentLocation,
                    expectedLocation,
                    distance
                });

                // This match will almost certainly be better than any existing match.
                // But check anyway.
                if (finalScore <= currentThreshold) {
                    // Indeed it is
                    currentThreshold = finalScore;
                    bestLocation = currentLocation;

                    // Already passed `loc`, downhill from here on in.
                    if (bestLocation <= expectedLocation) {
                        break;
                    }

                    // When passing `bestLocation`, don't exceed our current distance from `expectedLocation`.
                    start = Math.max(1, 2 * expectedLocation - bestLocation);
                }
            }
        }

        // No hope for a (better) match at greater error levels.  
        const score = bitapScore(pattern, {
            errors: i + 1,
            currentLocation: expectedLocation,
            expectedLocation,
            distance
        });

        if (score > currentThreshold) {
            break;
        }

        lastBitArr = bitArr;
    }

    // Count exact matches (those with a score of 0) to be "almost" exact
    return {
        isMatch: bestLocation >= 0,
        score: finalScore === 0 ? 0.001 : finalScore,
        matchedIndices: matchedIndices(matchMask, minMatchCharLength)
    };
};


const patternAlphabet = (pattern) => {
    const mask = {};
    const len = pattern.length;

    for (let i = 0; i < len; i += 1) {
        mask[pattern.charAt(i)] = 0;
    }

    for (let i = 0; i < len; i += 1) {
        mask[pattern.charAt(i)] |= 1 << (len - i - 1);
    }

    return mask;
};

class Bitap {
    constructor(pattern, {
        // Approximately where in the text is the pattern expected to be found?
        location = 0,
        // Determines how close the match must be to the fuzzy location (specified above).
        // An exact letter match which is 'distance' characters away from the fuzzy location
        // would score as a complete mismatch. A distance of '0' requires the match be at
        // the exact location specified, a threshold of '1000' would require a perfect match
        // to be within 800 characters of the fuzzy location to be found using a 0.8 threshold.
        distance = 100,
        // At what point does the match algorithm give up. A threshold of '0.0' requires a perfect match
        // (of both letters and location), a threshold of '1.0' would match anything.
        threshold = 0.6,
        // Machine word size
        maxPatternLength = 32,
        // Indicates whether comparisons should be case sensitive.
        isCaseSensitive = false,
        // Regex used to separate words when searching. Only applicable when `tokenize` is `true`.
        tokenSeparator = / +/g,
        // When true, the algorithm continues searching to the end of the input even if a perfect
        // match is found before the end of the same input.
        findAllMatches = false,
        // Minimum number of characters that must be matched before a result is considered a match
        minMatchCharLength = 1
    } = {}) {
        this.options = {
            location,
            distance,
            threshold,
            maxPatternLength,
            isCaseSensitive,
            tokenSeparator,
            findAllMatches,
            minMatchCharLength
        };

        this.pattern = this.options.isCaseSensitive ? pattern : pattern.toLowerCase();

        if (this.pattern.length <= maxPatternLength) {
            this.patternAlphabet = patternAlphabet(this.pattern);
        }
    }

    search(text) {
        if (!this.options.isCaseSensitive) {
            text = text.toLowerCase();
        }

        // Exact match
        if (this.pattern === text) {
            return {
                isMatch: true,
                score: 0,
                matchedIndices: [[0, text.length - 1]]
            };
        }

        // When pattern length is greater than the machine word length, just do a a regex comparison
        const { maxPatternLength, tokenSeparator } = this.options;
        if (this.pattern.length > maxPatternLength) {
            return bitapRegexSearch(text, this.pattern, tokenSeparator);
        }

        // Otherwise, use Bitap algorithm
        const { location, distance, threshold, findAllMatches, minMatchCharLength } = this.options;
        return bitapSearch(text, this.pattern, this.patternAlphabet, {
            location,
            distance,
            threshold,
            findAllMatches,
            minMatchCharLength
        });
    }
}

const deepValue = (obj, path, list = []) => {
    if (!path) {
        // If there's no path left, we've gotten to the object we care about.
        list.push(obj);
    } else {
        const dotIndex = path.indexOf(".");
        let firstSegment = path;
        let remaining = null;

        if (dotIndex !== -1) {
            firstSegment = path.slice(0, dotIndex);
            remaining = path.slice(dotIndex + 1);
        }

        const value = obj[firstSegment];

        if (!is.nil(value)) {
            if (!remaining && (is.string(value) || is.number(value))) {
                list.push(value);
            } else if (is.array(value)) {
                // Search each item in the array.
                for (let i = 0, len = value.length; i < len; i += 1) {
                    deepValue(value[i], remaining, list);
                }
            } else if (remaining) {
                // An object. Recurse further.
                deepValue(value, remaining, list);
            }
        }
    }

    return list;
};

export default class Fuzzy {
    constructor(list, {
        // Approximately where in the text is the pattern expected to be found?
        location = 0,
        // Determines how close the match must be to the fuzzy location (specified above).
        // An exact letter match which is 'distance' characters away from the fuzzy location
        // would score as a complete mismatch. A distance of '0' requires the match be at
        // the exact location specified, a threshold of '1000' would require a perfect match
        // to be within 800 characters of the fuzzy location to be found using a 0.8 threshold.
        distance = 100,
        // At what point does the match algorithm give up. A threshold of '0.0' requires a perfect match
        // (of both letters and location), a threshold of '1.0' would match anything.
        threshold = 0.6,
        // Machine word size
        maxPatternLength = 32,
        // Indicates whether comparisons should be case sensitive.
        caseSensitive = false,
        // Regex used to separate words when searching. Only applicable when `tokenize` is `true`.
        tokenSeparator = / +/g,
        // When true, the algorithm continues searching to the end of the input even if a perfect
        // match is found before the end of the same input.
        findAllMatches = false,
        // Minimum number of characters that must be matched before a result is considered a match
        minMatchCharLength = 1,
        // The name of the identifier property. If specified, the returned result will be a list
        // of the items' dentifiers, otherwise it will be a list of the items.
        id = null,
        // List of properties that will be searched. This also supports nested properties.
        keys = [],
        // Whether to sort the result list, by score
        shouldSort = true,
        // The get function to use when fetching an object's properties.
        // The default will search nested paths *ie foo.bar.baz*
        getFn = deepValue,
        // Default sort function
        sortFn = (a, b) => (a.score - b.score),
        // When true, the search algorithm will search individual words **and** the full string,
        // computing the final score as a function of both. Note that when `tokenize` is `true`,
        // the `threshold`, `distance`, and `location` are inconsequential for individual tokens.
        tokenize = false,
        // When true, the result set will only include records that match all tokens. Will only work
        // if `tokenize` is also true.
        matchAllTokens = false,
        includeMatches = false,
        includeScore = false
    } = {}) {
        this.options = {
            location,
            distance,
            threshold,
            maxPatternLength,
            isCaseSensitive: caseSensitive,
            tokenSeparator,
            findAllMatches,
            minMatchCharLength,
            id,
            keys,
            includeMatches,
            includeScore,
            shouldSort,
            getFn,
            sortFn,
            tokenize,
            matchAllTokens
        };

        this.setCollection(list);
    }

    setCollection(list) {
        this.list = list;
        return list;
    }

    search(pattern) {
        const { tokenSearchers, fullSearcher } = this._prepareSearchers(pattern);

        const { weights, results } = this._search(tokenSearchers, fullSearcher);

        this._computeScore(weights, results);

        if (this.options.shouldSort) {
            this._sort(results);
        }

        return this._format(results);
    }

    _prepareSearchers(pattern = "") {
        const tokenSearchers = [];

        if (this.options.tokenize) {
            // Tokenize on the separator
            const tokens = pattern.split(this.options.tokenSeparator);
            for (let i = 0, len = tokens.length; i < len; i += 1) {
                tokenSearchers.push(new Bitap(tokens[i], this.options));
            }
        }

        const fullSearcher = new Bitap(pattern, this.options);

        return { tokenSearchers, fullSearcher };
    }

    _search(tokenSearchers = [], fullSearcher) {
        const list = this.list;
        const resultMap = {};
        const results = [];

        // Check the first item in the list, if it's a string, then we assume
        // that every item in the list is also a string, and thus it's a flattened array.
        if (is.string(list[0])) {
            // Iterate over every item
            for (let i = 0, len = list.length; i < len; i += 1) {
                this._analyze({
                    key: "",
                    value: list[i],
                    record: i,
                    index: i
                }, {
                    resultMap,
                    results,
                    tokenSearchers,
                    fullSearcher
                });
            }

            return { weights: null, results };
        }

        // Otherwise, the first item is an Object (hopefully), and thus the searching
        // is done on the values of the keys of each item.
        const weights = {};
        for (let i = 0, len = list.length; i < len; i += 1) {
            const item = list[i];
            // Iterate over every key
            for (let j = 0, keysLen = this.options.keys.length; j < keysLen; j += 1) {
                let key = this.options.keys[j];
                if (!is.string(key)) {
                    weights[key.name] = {
                        weight: (1 - key.weight) || 1
                    };
                    if (key.weight <= 0 || key.weight > 1) {
                        throw new Error("Key weight has to be > 0 and <= 1");
                    }
                    key = key.name;
                } else {
                    weights[key] = {
                        weight: 1
                    };
                }

                this._analyze({
                    key,
                    value: this.options.getFn(item, key),
                    record: item,
                    index: i
                }, {
                    resultMap,
                    results,
                    tokenSearchers,
                    fullSearcher
                });
            }
        }

        return { weights, results };
    }

    _analyze({ key, value, record, index }, { tokenSearchers = [], fullSearcher = [], resultMap = {}, results = [] } = {}) {
        // Check if the texvaluet can be searched
        if (is.nil(value)) {
            return;
        }

        let exists = false;
        let averageScore = -1;
        let numTextMatches = 0;

        if (is.string(value)) {
            const mainSearchResult = fullSearcher.search(value);

            if (this.options.tokenize) {
                const words = value.split(this.options.tokenSeparator);
                const scores = [];

                for (let i = 0; i < tokenSearchers.length; i += 1) {
                    const tokenSearcher = tokenSearchers[i];

                    // let tokenScores = []
                    let hasMatchInText = false;

                    for (let j = 0; j < words.length; j += 1) {
                        const word = words[j];
                        const tokenSearchResult = tokenSearcher.search(word);
                        const obj = {};
                        if (tokenSearchResult.isMatch) {
                            obj[word] = tokenSearchResult.score;
                            exists = true;
                            hasMatchInText = true;
                            scores.push(tokenSearchResult.score);
                        } else {
                            obj[word] = 1;
                            if (!this.options.matchAllTokens) {
                                scores.push(1);
                            }
                        }
                        // tokenScores.push(obj)
                    }

                    if (hasMatchInText) {
                        numTextMatches += 1;
                    }
                }

                averageScore = scores[0];
                const scoresLen = scores.length;
                for (let i = 1; i < scoresLen; i += 1) {
                    averageScore += scores[i];
                }
                averageScore = averageScore / scoresLen;
            }

            let finalScore = mainSearchResult.score;
            if (averageScore > -1) {
                finalScore = (finalScore + averageScore) / 2;
            }

            const checkTextMatches = (this.options.tokenize && this.options.matchAllTokens) ? numTextMatches >= tokenSearchers.length : true;

            // If a match is found, add the item to <rawResults>, including its score
            if ((exists || mainSearchResult.isMatch) && checkTextMatches) {
                // Check if the item already exists in our results
                const existingResult = resultMap[index];

                if (existingResult) {
                    // Use the lowest score
                    // existingResult.score, bitapResult.score
                    existingResult.output.push({
                        key,
                        score: finalScore,
                        matchedIndices: mainSearchResult.matchedIndices
                    });
                } else {
                    // Add it to the raw result list
                    resultMap[index] = {
                        item: record,
                        output: [{
                            key,
                            score: finalScore,
                            matchedIndices: mainSearchResult.matchedIndices
                        }]
                    };

                    results.push(resultMap[index]);
                }
            }
        } else if (is.array(value)) {
            for (let i = 0, len = value.length; i < len; i += 1) {
                this._analyze({
                    key,
                    value: value[i],
                    record,
                    index
                }, {
                    resultMap,
                    results,
                    tokenSearchers,
                    fullSearcher
                });
            }
        }
    }

    _computeScore(weights, results) {
        for (let i = 0, len = results.length; i < len; i += 1) {
            const output = results[i].output;
            const scoreLen = output.length;

            let totalScore = 0;
            let bestScore = 1;

            for (let j = 0; j < scoreLen; j += 1) {
                const score = output[j].score;
                const weight = weights ? weights[output[j].key].weight : 1;
                const nScore = score * weight;

                if (weight !== 1) {
                    bestScore = Math.min(bestScore, nScore);
                } else {
                    output[j].nScore = nScore;
                    totalScore += nScore;
                }
            }

            results[i].score = bestScore === 1 ? totalScore / scoreLen : bestScore;
        }
    }

    _sort(results) {
        results.sort(this.options.sortFn);
    }

    _format(results) {
        const finalOutput = [];

        const transformers = [];

        if (this.options.includeMatches) {
            transformers.push((result, data) => {
                const output = result.output;
                data.matches = [];

                for (let i = 0, len = output.length; i < len; i += 1) {
                    const item = output[i];
                    const obj = {
                        indices: item.matchedIndices
                    };
                    if (item.key) {
                        obj.key = item.key;
                    }
                    data.matches.push(obj);
                }
            });
        }

        if (this.options.includeScore) {
            transformers.push((result, data) => {
                data.score = result.score;
            });
        }

        for (let i = 0, len = results.length; i < len; i += 1) {
            const result = results[i];

            if (this.options.id) {
                result.item = this.options.getFn(result.item, this.options.id)[0];
            }

            if (!transformers.length) {
                finalOutput.push(result.item);
                continue;
            }

            const data = {
                item: result.item
            };

            for (let j = 0, len = transformers.length; j < len; j += 1) {
                transformers[j](result, data);
            }

            finalOutput.push(data);
        }

        return finalOutput;
    }
}
