// Qwen2Tokenizer.js
// Qwen2 BPE tokenizer - React Native compatible (no import.meta)

export class Qwen2Tokenizer {
  constructor() {
    this.vocab = null;
    this.merges = null;
    this.specialTokens = {
      '<|im_start|>': 151644,
      '<|im_end|>': 151645,
      '<|endoftext|>': 151643,
    };
    this.eosTokenId = 151645; // <|im_end|>
    this.bytesToUnicode = this._buildBytesToUnicode();
    this.unicodeToBytes = Object.fromEntries(
      Object.entries(this.bytesToUnicode).map(([k, v]) => [v, parseInt(k)])
    );
  }

  _buildBytesToUnicode() {
    const bs = [
      ...Array.from({ length: '~'.charCodeAt(0) - '!'.charCodeAt(0) + 1 }, (_, i) => i + '!'.charCodeAt(0)),
      ...Array.from({ length: '¬'.charCodeAt(0) - '¡'.charCodeAt(0) + 1 }, (_, i) => i + '¡'.charCodeAt(0)),
      ...Array.from({ length: 'ÿ'.charCodeAt(0) - '®'.charCodeAt(0) + 1 }, (_, i) => i + '®'.charCodeAt(0)),
    ];
    const cs = [...bs];
    let n = 0;
    for (let b = 0; b < 256; b++) {
      if (!bs.includes(b)) {
        bs.push(b);
        cs.push(256 + n);
        n++;
      }
    }
    return Object.fromEntries(bs.map((b, i) => [b, String.fromCharCode(cs[i])]));
  }

  async load(tokenizerJson) {
    // tokenizerJson: parsed JSON from tokenizer.json
    const model = tokenizerJson.model;
    this.vocab = model.vocab;
    this.merges = new Map();
    model.merges.forEach((merge, idx) => {
      this.merges.set(merge, idx);
    });
    console.log('✅ Qwen2 tokenizer loaded, vocab size:', Object.keys(this.vocab).length);
  }

  _getBPEPairs(word) {
    const pairs = new Set();
    let prevChar = word[0];
    for (let i = 1; i < word.length; i++) {
      pairs.add(`${prevChar} ${word[i]}`);
      prevChar = word[i];
    }
    return pairs;
  }

  _bpe(token) {
    let word = token.split('');
    let pairs = this._getBPEPairs(word);
    if (pairs.size === 0) return token;

    while (true) {
      let minRank = Infinity;
      let bigram = null;
      for (const pair of pairs) {
        const rank = this.merges.has(pair) ? this.merges.get(pair) : Infinity;
        if (rank < minRank) {
          minRank = rank;
          bigram = pair;
        }
      }

      if (!bigram || !this.merges.has(bigram)) break;

      const [first, second] = bigram.split(' ');
      const newWord = [];
      let i = 0;
      while (i < word.length) {
        const j = word.indexOf(first, i);
        if (j === -1) {
          newWord.push(...word.slice(i));
          break;
        }
        newWord.push(...word.slice(i, j));
        i = j;
        if (word[i] === first && i + 1 < word.length && word[i + 1] === second) {
          newWord.push(first + second);
          i += 2;
        } else {
          newWord.push(word[i]);
          i++;
        }
      }
      word = newWord;
      if (word.length === 1) break;
      pairs = this._getBPEPairs(word);
    }
    return word.join(' ');
  }

  encode(text) {
    if (!this.vocab || !this.merges) throw new Error('Tokenizer not loaded');

    const ids = [];
    // Basit regex ile word tokenize (Qwen2 pattern)
    const pattern = /'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu;
    const tokens = text.match(pattern) || [];

    for (const token of tokens) {
      // Byte encode
      const byteEncoded = Array.from(new TextEncoder().encode(token))
        .map(b => this.bytesToUnicode[b])
        .join('');

      // BPE
      const bpeResult = this._bpe(byteEncoded);
      for (const bpeToken of bpeResult.split(' ')) {
        if (this.vocab[bpeToken] !== undefined) {
          ids.push(this.vocab[bpeToken]);
        }
      }
    }
    return ids;
  }

  decode(ids) {
    if (!this.vocab) throw new Error('Tokenizer not loaded');
    const reverseVocab = Object.fromEntries(
      Object.entries(this.vocab).map(([k, v]) => [v, k])
    );

    let text = ids
      .filter(id => !Object.values(this.specialTokens).includes(id))
      .map(id => reverseVocab[id] || '')
      .join('');

    // Byte decode
    try {
      const bytes = Array.from(text).map(c => this.unicodeToBytes[c]).filter(b => b !== undefined);
      return new TextDecoder().decode(new Uint8Array(bytes));
    } catch {
      return text;
    }
  }

  encodeChat(systemPrompt, userMessage, history = []) {
    let text = `<|im_start|>system\n${systemPrompt}<|im_end|>\n`;
    for (const [userMsg, assistantMsg] of history) {
      text += `<|im_start|>user\n${userMsg}<|im_end|>\n<|im_start|>assistant\n${assistantMsg}<|im_end|>\n`;
    }
    text += `<|im_start|>user\n${userMessage}<|im_end|>\n<|im_start|>assistant\n`;

    const ids = [];
    // Split on special tokens
    const parts = text.split(/(<\|im_start\|>|<\|im_end\|>|\n)/);
    for (const part of parts) {
      if (part === '<|im_start|>') { ids.push(151644); }
      else if (part === '<|im_end|>') { ids.push(151645); }
      else if (part === '\n') { ids.push(...this.encode('\n')); }
      else if (part.length > 0) { ids.push(...this.encode(part)); }
    }
    return ids;
  }
}

export default Qwen2Tokenizer;
