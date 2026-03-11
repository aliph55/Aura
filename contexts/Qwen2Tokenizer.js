export class Qwen2Tokenizer {
  constructor() {
    this.vocab = null;
    this.merges = null;
    this.specialTokens = {
      '<|im_start|>': 151644,
      '<|im_end|>': 151645,
      '<|endoftext|>': 151643,
    };
    this.eosTokenId = 151645;
    this.bytesToUnicode = this._buildBytesToUnicode();
    // unicodeToBytes → bytesToUnicode'un tam tersi
    this.unicodeToBytes = {};
    for (const [byteVal, uChar] of Object.entries(this.bytesToUnicode)) {
      this.unicodeToBytes[uChar] = parseInt(byteVal);
    }
  }

  _buildBytesToUnicode() {
    const map = {};
    // Printable ASCII
    for (let i = 33; i <= 126; i++) map[i] = String.fromCharCode(i);
    // Latin supplement
    for (let i = 161; i <= 172; i++) map[i] = String.fromCharCode(i);
    for (let i = 174; i <= 255; i++) map[i] = String.fromCharCode(i);
    // Kalan byte'lar 256+ unicode'a map'lenir
    let n = 0;
    for (let b = 0; b < 256; b++) {
      if (map[b] === undefined) {
        map[b] = String.fromCharCode(256 + n);
        n++;
      }
    }
    return map;
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
        if (
          word[i] === first &&
          i + 1 < word.length &&
          word[i + 1] === second
        ) {
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
    const pattern =
      /'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu;
    const tokens = text.match(pattern) || [];
    for (const token of tokens) {
      // TextEncoder yerine manuel UTF-8
      const bytes = this._utf8Encode(token);
      const byteEncoded = bytes.map(b => this.bytesToUnicode[b]).join('');
      const bpeResult = this._bpe(byteEncoded);
      for (const bpeToken of bpeResult.split(' ')) {
        if (this.vocab[bpeToken] !== undefined) {
          ids.push(this.vocab[bpeToken]);
        }
      }
    }
    return ids;
  }

  _utf8Encode(str) {
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
      let cp = str.codePointAt(i);
      if (cp > 0xffff) i++; // surrogate pair
      if (cp < 0x80) {
        bytes.push(cp);
      } else if (cp < 0x800) {
        bytes.push(0xc0 | (cp >> 6));
        bytes.push(0x80 | (cp & 0x3f));
      } else if (cp < 0x10000) {
        bytes.push(0xe0 | (cp >> 12));
        bytes.push(0x80 | ((cp >> 6) & 0x3f));
        bytes.push(0x80 | (cp & 0x3f));
      } else {
        bytes.push(0xf0 | (cp >> 18));
        bytes.push(0x80 | ((cp >> 12) & 0x3f));
        bytes.push(0x80 | ((cp >> 6) & 0x3f));
        bytes.push(0x80 | (cp & 0x3f));
      }
    }
    return bytes;
  }

  decode(ids) {
    if (!this.vocab) throw new Error('Tokenizer not loaded');
    const tokens = ids
      .filter(id => !Object.values(this.specialTokens).includes(id))
      .map(id => this.reverseVocab[id] || '');

    const combined = tokens.join('');

    const bytes = [];
    for (const char of combined) {
      const byte = this.unicodeToBytes[char];
      if (byte !== undefined) {
        bytes.push(byte);
      } else {
        // Bilinmeyen karakter direkt ekle
        for (let i = 0; i < char.length; i++) {
          bytes.push(char.charCodeAt(i));
        }
      }
    }

    // TextDecoder yerine manuel UTF-8 decode
    return this._utf8Decode(bytes);
  }

  _utf8Decode(bytes) {
    let result = '';
    let i = 0;
    while (i < bytes.length) {
      const byte = bytes[i];
      if (byte < 0x80) {
        // 1 byte: ASCII
        result += String.fromCharCode(byte);
        i++;
      } else if ((byte & 0xe0) === 0xc0) {
        // 2 byte
        if (i + 1 < bytes.length) {
          const cp = ((byte & 0x1f) << 6) | (bytes[i + 1] & 0x3f);
          result += String.fromCodePoint(cp);
          i += 2;
        } else {
          i++;
        }
      } else if ((byte & 0xf0) === 0xe0) {
        // 3 byte
        if (i + 2 < bytes.length) {
          const cp =
            ((byte & 0x0f) << 12) |
            ((bytes[i + 1] & 0x3f) << 6) |
            (bytes[i + 2] & 0x3f);
          result += String.fromCodePoint(cp);
          i += 3;
        } else {
          i++;
        }
      } else if ((byte & 0xf8) === 0xf0) {
        // 4 byte
        if (i + 3 < bytes.length) {
          const cp =
            ((byte & 0x07) << 18) |
            ((bytes[i + 1] & 0x3f) << 12) |
            ((bytes[i + 2] & 0x3f) << 6) |
            (bytes[i + 3] & 0x3f);
          result += String.fromCodePoint(cp);
          i += 4;
        } else {
          i++;
        }
      } else {
        i++;
      }
    }
    return result;
  }

  async load(tokenizerJson) {
    const model = tokenizerJson.model;
    this.vocab = model.vocab;
    this.merges = new Map();
    model.merges.forEach((merge, idx) => this.merges.set(merge, idx));
    this.reverseVocab = Object.fromEntries(
      Object.entries(this.vocab).map(([k, v]) => [v, k]),
    );

    // Debug
    console.log('Ġ→byte:', this.unicodeToBytes['Ġ']); // 32 olmalı
    console.log('32→char:', this.bytesToUnicode[32]); // Ġ olmalı
    console.log('✅ Tokenizer loaded, vocab:', Object.keys(this.vocab).length);
  }

  encodeChat(systemPrompt, userMessage, history = []) {
    const ids = [];

    // System
    ids.push(151644); // <|im_start|>
    ids.push(...this.encode('system\n' + systemPrompt));
    ids.push(151645); // <|im_end|>
    ids.push(...this.encode('\n'));

    // History
    for (const [userMsg, assistantMsg] of history) {
      ids.push(151644);
      ids.push(...this.encode('user\n' + userMsg));
      ids.push(151645);
      ids.push(...this.encode('\n'));
      ids.push(151644);
      ids.push(...this.encode('assistant\n' + assistantMsg));
      ids.push(151645);
      ids.push(...this.encode('\n'));
    }

    // Current user message
    ids.push(151644);
    ids.push(...this.encode('user\n' + userMessage));
    ids.push(151645);
    ids.push(...this.encode('\n'));
    ids.push(151644);
    ids.push(...this.encode('assistant\n'));

    return ids;
  }
}

export default Qwen2Tokenizer;
