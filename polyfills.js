// Polyfills complets pour React Native
// Ce fichier doit être importé avant tout autre code

// Polyfill pour DOMException
if (typeof global.DOMException === 'undefined') {
  global.DOMException = class DOMException extends Error {
    constructor(message = '', name = 'DOMException') {
      super(message);
      this.name = name;
    }
  };
}

// Polyfill pour TextEncoder/TextDecoder
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = class TextEncoder {
    constructor(encoding = 'utf-8') {
      this.encoding = encoding;
    }
    
    encode(string = '') {
      // Conversion UTF-8 compatible React Native
      const utf8 = [];
      for (let i = 0; i < string.length; i++) {
        let charCode = string.charCodeAt(i);
        
        if (charCode < 0x80) {
          utf8.push(charCode);
        } else if (charCode < 0x800) {
          utf8.push(0xc0 | (charCode >> 6));
          utf8.push(0x80 | (charCode & 0x3f));
        } else if (charCode < 0xd800 || charCode >= 0xe000) {
          utf8.push(0xe0 | (charCode >> 12));
          utf8.push(0x80 | ((charCode >> 6) & 0x3f));
          utf8.push(0x80 | (charCode & 0x3f));
        } else { // Surrogate pair
          i++;
          charCode = 0x10000 + (((charCode & 0x3ff) << 10) | (string.charCodeAt(i) & 0x3ff));
          utf8.push(0xf0 | (charCode >> 18));
          utf8.push(0x80 | ((charCode >> 12) & 0x3f));
          utf8.push(0x80 | ((charCode >> 6) & 0x3f));
          utf8.push(0x80 | (charCode & 0x3f));
        }
      }
      return new Uint8Array(utf8);
    }
  };
}

if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = class TextDecoder {
    constructor(encoding = 'utf-8') {
      this.encoding = encoding;
    }
    
    decode(buffer) {
      if (!buffer) return '';
      
      let bytes;
      if (buffer instanceof ArrayBuffer) {
        bytes = new Uint8Array(buffer);
      } else if (buffer instanceof Uint8Array) {
        bytes = buffer;
      } else if (typeof buffer === 'string') {
        return buffer;
      } else {
        return String(buffer);
      }
      
      // Décodage UTF-8 simple
      let result = '';
      for (let i = 0; i < bytes.length; i++) {
        const byte = bytes[i];
        if (byte < 0x80) {
          result += String.fromCharCode(byte);
        } else {
          // Gestion simplifiée des caractères multi-bytes
          result += String.fromCharCode(byte);
        }
      }
      return result;
    }
  };
}

// Polyfill pour Blob
if (typeof global.Blob === 'undefined') {
  global.Blob = class Blob {
    constructor(parts = [], options = {}) {
      this.parts = parts;
      this.type = options.type || '';
      this.size = 0;
      
      // Calculer la taille approximative
      for (const part of parts) {
        if (typeof part === 'string') {
          this.size += new global.TextEncoder().encode(part).length;
        } else if (part instanceof ArrayBuffer) {
          this.size += part.byteLength;
        } else if (part instanceof Uint8Array) {
          this.size += part.length;
        } else if (part?.length) {
          this.size += part.length;
        }
      }
    }
    
    async text() {
      return this.parts.join('');
    }
    
    async arrayBuffer() {
      const totalSize = this.size;
      const buffer = new ArrayBuffer(totalSize);
      const view = new Uint8Array(buffer);
      let offset = 0;
      
      for (const part of this.parts) {
        if (typeof part === 'string') {
          const encoded = new global.TextEncoder().encode(part);
          view.set(encoded, offset);
          offset += encoded.length;
        }
      }
      
      return buffer;
    }
    
    stream() {
      // Polyfill simple pour ReadableStream
      return {
        getReader() {
          let index = 0;
          return {
            read() {
              if (index < this.parts.length) {
                return Promise.resolve({
                  value: this.parts[index++],
                  done: false
                });
              }
              return Promise.resolve({ done: true });
            }
          };
        }
      };
    }
  };
}

// Polyfill pour File (étend Blob)
if (typeof global.File === 'undefined') {
  global.File = class File extends global.Blob {
    constructor(parts, name, options = {}) {
      super(parts, options);
      this.name = name;
      this.lastModified = options.lastModified || Date.now();
    }
  };
}

// Polyfill pour URL.createObjectURL
if (typeof global.URL === 'undefined') {
  global.URL = {};
}

if (typeof global.URL.createObjectURL === 'undefined') {
  global.URL.createObjectURL = function(blob) {
    return `blob:${Date.now()}-${Math.random().toString(36)}`;
  };
}

if (typeof global.URL.revokeObjectURL === 'undefined') {
  global.URL.revokeObjectURL = function(url) {
    // Ne fait rien dans React Native
  };
}

// Polyfill pour FormData (si nécessaire)
if (typeof global.FormData === 'undefined') {
  global.FormData = class FormData {
    constructor() {
      this._data = new Map();
    }
    
    append(name, value, filename) {
      if (!this._data.has(name)) {
        this._data.set(name, []);
      }
      this._data.get(name).push({ value, filename });
    }
    
    get(name) {
      const values = this._data.get(name);
      return values ? values[0].value : null;
    }
    
    getAll(name) {
      const values = this._data.get(name);
      return values ? values.map(v => v.value) : [];
    }
    
    has(name) {
      return this._data.has(name);
    }
    
    delete(name) {
      this._data.delete(name);
    }
    
    entries() {
      const entries = [];
      for (const [name, values] of this._data) {
        for (const { value } of values) {
          entries.push([name, value]);
        }
      }
      return entries[Symbol.iterator]();
    }
  };
}

console.log('✅ Polyfills React Native complets chargés avec succès');