const {
    is,
    exception,
    promise
} = adone;

const getMilliseconds = function () {
    const hrtime = process.hrtime();
    const seconds = hrtime[0];
    const nanoseconds = hrtime[1];

    return seconds * 1e3 + Math.floor(nanoseconds / 1e6);
};

class TokenBucket {
    constructor(bucketSize = 1, tokensPerInterval = 1, interval = 1000, parentBucket = null) {
        this.bucketSize = bucketSize;
        this.tokensPerInterval = tokensPerInterval;

        if (is.string(interval)) {
            switch (interval) {
                case "sec":
                case "second": {
                    this.interval = 1000;
                    break;
                }
                case "min":
                case "minute": {
                    this.interval = 1000 * 60;
                    break;
                }
                case "hr":
                case "hour": {
                    this.interval = 1000 * 60 * 60;
                    break;
                }
                case "day": {
                    this.interval = 1000 * 60 * 60 * 24;
                    break;
                }
                default:
                    throw new Error(`Invaid interval ${interval}`);
            }
        } else {
            this.interval = interval;
        }

        this.parentBucket = parentBucket;
        this.content = 0;
        this.lastDrip = Number(new Date());
    }

    _waitInterval(count) {
        return Math.ceil((count - this.content) * (this.interval / this.tokensPerInterval));
    }

    async removeTokens(count) {
        // Is this an infinite size bucket?
        if (!this.bucketSize) {
            return count;
        }

        // Make sure the bucket can hold the requested number of tokens
        if (count > this.bucketSize) {
            throw new exception.LimitExceeded(`Requested tokens ${count} exceeds bucket size ${this.bucketSize}`);
        }

        // Drip new tokens into this bucket
        this.drip();

        // If we don't have enough tokens in this bucket, come back later
        if (count > this.content) {
            await promise.delay(this._waitInterval(count));
            return this.removeTokens(count);
        }

        if (this.parentBucket) {
            // Remove the requested from the parent bucket first
            const remainingTokens = await this.parentBucket.removeTokens();

            // Check that we still have enough tokens in this bucket
            if (count > this.content) {
                await promise.delay(this._waitInterval(count));
                return this.removeTokens(count);
            }

            // Tokens were removed from the parent bucket, now remove them from
            // this bucket and fire the callback. Note that we look at the current
            // bucket and parent bucket's remaining tokens and return the smaller
            // of the two values
            this.content -= count;
            return Math.min(remainingTokens, this.content);
        }

        // Remove the requested tokens from this bucket and fire the callback
        this.content -= count;

        return this.content;
    }

    tryRemoveTokens(count) {
        // Is this an infinite size bucket?
        if (!this.bucketSize) {
            return true;
        }

        // Make sure the bucket can hold the requested number of tokens
        if (count > this.bucketSize) {
            return false;
        }

        // Drip new tokens into this bucket
        this.drip();

        // If we don't have enough tokens in this bucket, return false
        if (count > this.content) {
            return false;
        }

        // Try to remove the requested tokens from the parent bucket
        if (this.parentBucket && !this.parent.tryRemoveTokens(count)) {
            return false;
        }

        // Remove the requested tokens from this bucket and return
        this.content -= count;
        return true;
    }

    drip() {
        if (!this.tokensPerInterval) {
            this.content = this.bucketSize;
            return;
        }

        const now = Number(new Date());
        const deltaMS = Math.max(now - this.lastDrip, 0);
        this.lastDrip = now;

        const dripAmount = deltaMS * (this.tokensPerInterval / this.interval);
        this.content = Math.min(this.content + dripAmount, this.bucketSize);
    }
}

export default class RateLimiter {
    constructor(tokensPerInterval = 1, interval = 1000, fireImmediately = false) {
        this.tokenBucket = new TokenBucket(tokensPerInterval, tokensPerInterval, interval, null);

        // Fill the token bucket to start
        this.tokenBucket.content = tokensPerInterval;

        this.curIntervalStart = getMilliseconds();
        this.tokensThisInterval = 0;
        this.fireImmediately = fireImmediately;
    }

    async removeTokens(count) {
        // Make sure the request isn't for more than we can handle
        if (count > this.tokenBucket.bucketSize) {
            throw new exception.LimitExceeded(`Requested tokens ${count} exceeds maximum tokens per interval ${this.tokenBucket.bucketSize}`);
        }

        const now = getMilliseconds();

        // Advance the current interval and reset the current interval token count if needed
        if (now - this.curIntervalStart >= this.tokenBucket.interval) {
            this.curIntervalStart = now;
            this.tokensThisInterval = 0;
        }

        // If we don't have enough tokens left in this interval, wait until the next interval
        if (count > this.tokenBucket.tokensPerInterval - this.tokensThisInterval) {
            if (this.fireImmediately) {
                return -1;
            }
            const waitInterval = Math.ceil(this.curIntervalStart + this.tokenBucket.interval - now);
            await promise.delay(waitInterval);
        }

        const tokensRemaining = await this.tokenBucket.removeTokens(count);

        this.tokensThisInterval += count;

        return tokensRemaining;
    }

    tryRemoveTokens(count) {
        // Make sure the request isn't for more than we can handle
        if (count > this.tokenBucket.bucketSize) {
            return false;
        }

        const now = getMilliseconds();

        // Advance the current interval and reset the current interval token count
        // if needed
        if (now - this.curIntervalStart >= this.tokenBucket.interval) {
            this.curIntervalStart = now;
            this.tokensThisInterval = 0;
        }

        // If we don't have enough tokens left in this interval, return false
        if (count > this.tokenBucket.tokensPerInterval - this.tokensThisInterval) {
            return false;
        }

        // Try to remove the requested number of tokens from the token bucket
        const removed = this.tokenBucket.tryRemoveTokens(count);
        if (removed) {
            this.tokensThisInterval += count;
        }
        return removed;
    }

    getTokensRemaining() {
        this.tokenBucket.drip();
        return this.tokenBucket.content;
    }
}

RateLimiter.TokenBucket = TokenBucket;
