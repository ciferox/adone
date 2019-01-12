const {
  util: { analyzeGlob }
} = adone;

export const patternRoot = pattern => {
  // return pattern.split('*', 1)[0]
  const base = analyzeGlob(pattern).base
  return base === '.' ? '' : base
}
