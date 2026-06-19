/**
 * Regex patterns for tokenizing the query string.
 *
 * Patterns are applied in priority order (first match wins):
 * 1-2. Quoted strings (single and double quotes)
 * 3. Parenthesized groups
 * 4-9. Comparison operators (>=, >, <=, <, !==, !=, =)
 * 10-11. Regex operators (~*, ~)
 * 12. AND expressions (&)
 *
 * Note: OR (|) is handled implicitly as the fallback delimiter in compile().
 */
const patterns = [
  /('[^']*')/, // Single quoted string
  /("[^"]*")/, // Double quoted string
  /\(([^()]+)\)/, // Grouping with parentheses
  /([^&|]+>=[^&|]+)/, // Greater than or equal
  /([^&|]+>[^&|]+)/, // Greater than
  /([^&|]+<=[^&|]+)/, // Less than or equal
  /([^&|]+<[^&|]+)/, // Less than
  /([^&|]+!=[^&|]+)/, // Not equal
  /([^&|]+=[^&|]+)/, // Equal or IN
  /([^&|]+~\*[^&|]+)/, // Regex case-insensitive
  /([^&|]+~[^&|]+)/, // Regex
  /([^|]*[&][^|]*)/, // AND
];

/**
 * Recursively tokenize the query string by replacing matched patterns
 * with unique placeholder keys stored in the params map.
 *
 * The algorithm works by repeatedly matching regex patterns and replacing
 * each match with a generated key (e.g., "x1_ab3f"). Nested structures
 * like parentheses are recursively parsed so inner content is tokenized first.
 *
 * @param {string} str The query string to parse.
 * @param {Object} params The parameters map to populate with token values.
 * @param {Object} opts Internal state: counter (c) and unique prefix (p).
 * @returns {string} The tokenized query string with all patterns replaced by keys.
 */
function parse(str, params = {}, opts = {}) {
  // Initialize a monotonically increasing counter for unique key generation
  if (!opts.c) {
    opts.c = 0;
  }
  // Generate a random prefix that doesn't already appear in the string,
  // preventing collisions with field names or values
  if (!opts.p) {
    do {
      opts.p = Math.random().toString(16).slice(2);
    } while (str.indexOf(opts.p) > -1);
  }
  for (let i = 0; i < patterns.length; i++) {
    const re = patterns[i];
    while (true) {
      const r = str.match(re);
      if (!r) break;
      // Generate a unique placeholder key
      const k = `x${++opts.c}_${opts.p}`;
      str = str.replace(r[0], k);
      // If the pattern has a capture group (i.e., it's a compound token like parentheses),
      // recursively parse the captured content. Otherwise use the raw capture.
      const param = r[0] !== r[1] ? parse(r[1], params, opts) : r[1];
      // Store the token: quoted strings (indices 0-1) keep whitespace; others are trimmed
      params[k] = i < 2 ? param : param.replace(/\s/g, "");
    }
  }
  return str;
}

/**
 * Recursively compile a tokenized string and its parameters into a MongoDB query object.
 *
 * This function resolves placeholder keys back to their values via the params map,
 * then determines the type of expression (comparison, logical operator, regex, etc.)
 * and builds the corresponding MongoDB query structure.
 *
 * @param {string} str The tokenized string or placeholder key to compile.
 * @param {Object} params The parameters map containing resolved token values.
 * @returns {Object|null|string|boolean|number|Date} The compiled MongoDB query component.
 */
function compile(str, params = {}) {
  const val = params[str] || str;
  switch (true) {
    case /^null$/.test(val): {
      return null;
    }
    case /^now([+-]\d+([dhms])?)?$/.test(val): {
      const r = val.match(/^now([+-]\d+?([dhms])?)$/);
      if (r) {
        const n = parseInt(r[1] || 0, 10);
        const unit = r[2] || "d";
        const date = new Date();
        const units = { d: "Date", h: "Hours", m: "Minutes", s: "Seconds" };
        date[`set${units[unit]}`](date[`get${units[unit]}`]() + n);
        return date;
      }
      return new Date();
    }
    case /^'[^']*'$/.test(val): {
      const r = val.split(/^'([^']*)'$/);
      const value = r[1] || "";
      return value;
    }
    case /^"[^"]*"$/.test(val): {
      const r = val.split(/^"([^"]*)"$/);
      const value = r[1] || "";
      return value;
    }
    case /^\[[^[\]]*\]$/.test(val): {
      const arr = [];
      if (val === "[]") {
        return arr;
      }
      const r = val.slice(1, -1).split(/\s*,\s*/);
      for (let i = 0; i < r.length; i++) {
        const value = compile(r[i], params);
        arr.push(value);
      }
      return arr;
    }
    case />=/.test(val): {
      const r = val.split(/\s*>=\s*/);
      const field = compile(r[0], params);
      const value = compile(r[1], params);
      return { [field]: { $gte: value } };
    }
    case />/.test(val): {
      const r = val.split(/\s*>\s*/);
      const field = compile(r[0], params);
      const value = compile(r[1], params);
      return { [field]: { $gt: value } };
    }
    case /<=/.test(val): {
      const r = val.split(/\s*<=\s*/);
      const field = compile(r[0], params);
      const value = compile(r[1], params);
      return { [field]: { $lte: value } };
    }
    case /</.test(val): {
      const r = val.split(/\s*<\s*/);
      const field = compile(r[0], params);
      const value = compile(r[1], params);
      return { [field]: { $lt: value } };
    }
    case /!==/.test(val): {
      const r = val.split(/\s*!==\s*/);
      const field = compile(r[0], params);
      const value = compile(r[1], params);
      return { [field]: { $ne: value } };
    }
    case /!=/.test(val): {
      const r = val.split(/\s*!=\s*/);
      const field = compile(r[0], params);
      const value = compile(r[1], params);
      return {
        [field]:
          Array.isArray(value) && value.length > 0
            ? { $nin: value }
            : { $ne: value },
      };
    }
    case /==/.test(val): {
      const r = val.split(/\s*==\s*/);
      const field = compile(r[0], params);
      const value = compile(r[1], params);
      return { [field]: value };
    }
    case /=/.test(val): {
      const r = val.split(/\s*=\s*/);
      const field = compile(r[0], params);
      const value = compile(r[1], params);
      return {
        [field]:
          Array.isArray(value) && value.length > 0 ? { $in: value } : value,
      };
    }
    case /~\*/.test(val): {
      const r = val.split(/\s*~\*\s*/);
      const field = compile(r[0], params);
      const value = compile(r[1], params);
      return { [field]: { $regex: value, $options: "i" } };
    }
    case /~/.test(val): {
      const r = val.split(/\s*~\s*/);
      const field = compile(r[0], params);
      const value = compile(r[1], params);
      return { [field]: { $regex: value } };
    }
    case /&/.test(val): {
      const arr = [];
      const r = val.split(/\s*&\s*/);
      for (let i = 0; i < r.length; i++) {
        const value = compile(r[i], params);
        if (typeof value === "object" && value !== null) {
          arr.push(value);
        }
      }
      return { $and: arr };
    }
    case /\|/.test(val): {
      const arr = [];
      const r = val.split(/\s*\|\s*/);
      for (let i = 0; i < r.length; i++) {
        const value = compile(r[i], params);
        if (typeof value === "object" && value !== null) {
          arr.push(value);
        }
      }
      return { $or: arr };
    }
    default: {
      let value = val;
      while (params[value]) {
        value = compile(params[value], params);
      }
      if (value && typeof value === "string") {
        if (value.toLowerCase() === "true") return true;
        if (value.toLowerCase() === "false") return false;
        if (!isNaN(value)) return +value;
        if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(.\d{3}Z?)?)?$/.test(value)) {
          const d = new Date(value);
          if (!isNaN(d)) return d;
        }
      }
      return value || null;
    }
  }
}

/**
 * Convert a human-readable search query into a MongoDB query object.
 *
 * @param {string} str The search query string.
 * @returns {Object|null} The MongoDB query object, or null if the input is invalid.
 */
export default function convert(str) {
  if (!str || typeof str !== "string") return null;
  const params = {};
  const parsed = parse(str, params);
  return compile(parsed, params);
}
