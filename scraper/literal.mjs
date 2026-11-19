// Object literal parser shared by the Node scrapers: JSON plus `template` strings, bare keys, !0 / !1.
// Bundles are read as TEXT with this parser and never executed.

export function parseLiteral(src, start) {
  let i = start;
  const BS = '\\';
  const ws = () => { while (/\s/.test(src[i])) i++; };
  const str = () => {
    const q = src[i++];
    let s = '';
    while (src[i] !== q) {
      if (src[i] === BS) { s += JSON.parse('"' + src[i] + src[i + 1] + '"'); i += 2; continue; }
      if (q === '`' && src[i] === '$' && src[i + 1] === '{') throw new Error(`template expression at ${i}`);
      s += src[i++];
    }
    i++;
    return s;
  };
  const val = () => {
    ws();
    const c = src[i];
    if (c === '{') {
      i++; const o = {}; ws();
      if (src[i] === '}') { i++; return o; }
      for (;;) {
        ws();
        let k;
        if (src[i] === '`' || src[i] === '"') k = str();
        else { k = /^[A-Za-z_$0-9]+/.exec(src.slice(i, i + 80))?.[0]; if (!k) throw new Error(`key at ${i}`); i += k.length; }
        ws(); if (src[i++] !== ':') throw new Error(`colon at ${i}`);
        o[k] = val(); ws();
        if (src[i] === ',') { i++; continue; }
        if (src[i] === '}') { i++; return o; }
        throw new Error(`object at ${i}: ${src.slice(i, i + 40)}`);
      }
    }
    if (c === '[') {
      i++; const a = []; ws();
      if (src[i] === ']') { i++; return a; }
      for (;;) {
        a.push(val()); ws();
        if (src[i] === ',') { i++; continue; }
        if (src[i] === ']') { i++; return a; }
        throw new Error(`array at ${i}`);
      }
    }
    if (c === '`' || c === '"') return str();
    for (const [lit, v] of [['!0', true], ['!1', false], ['null', null], ['void 0', null]]) {
      if (src.startsWith(lit, i)) { i += lit.length; return v; }
    }
    const m = /^-?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/.exec(src.slice(i, i + 40));
    if (m) { i += m[0].length; return Number(m[0]); }
    throw new Error(`value at ${i}: ${src.slice(i, i + 60)}`);
  };
  return val();
}
