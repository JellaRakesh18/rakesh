import { calculatorInputSchema } from '../validators/toolValidators.js';

export const calculatorDeclaration = {
  name: 'calculator',
  description:
    'Safely evaluate mathematical expressions (arithmetic, percentages, growth rates, powers, sqrt, log, min, max, round) without executing arbitrary code.',
  parameters: {
    type: 'OBJECT',
    properties: {
      expression: {
        type: 'STRING',
        description:
          'Mathematical expression, e.g. "(145 - 112) / 112 * 100" or "sqrt(16) + 2^3".',
      },
    },
    required: ['expression'],
  },
};

const FUNCTIONS = {
  sqrt: (x) => Math.sqrt(x),
  abs: (x) => Math.abs(x),
  round: (x) => Math.round(x),
  floor: (x) => Math.floor(x),
  ceil: (x) => Math.ceil(x),
  log: (x) => Math.log10(x),
  ln: (x) => Math.log(x),
  min: (...args) => Math.min(...args),
  max: (...args) => Math.max(...args),
};

const CONSTANTS = {
  PI: Math.PI,
  E: Math.E,
};

function tokenize(expr) {
  const tokens = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let numStr = '';
      while (i < expr.length && /[0-9.]/.test(expr[i])) {
        numStr += expr[i];
        i += 1;
      }
      const val = Number(numStr);
      if (!Number.isFinite(val)) throw new Error(`Invalid number: ${numStr}`);
      tokens.push({ type: 'NUMBER', value: val });
      continue;
    }
    if (/[a-zA-Z_]/.test(ch)) {
      let ident = '';
      while (i < expr.length && /[a-zA-Z0-9_]/.test(expr[i])) {
        ident += expr[i];
        i += 1;
      }
      tokens.push({ type: 'IDENT', value: ident });
      continue;
    }
    if ('+-*/%^(),'.includes(ch)) {
      tokens.push({ type: 'OP', value: ch });
      i += 1;
      continue;
    }
    throw new Error(`Unexpected character "${ch}"`);
  }
  return tokens;
}

/**
 * Recursive-descent math expression evaluator (never uses eval or Function).
 */
export function safeEvaluateMath(expression) {
  const tokens = tokenize(expression);
  let pos = 0;

  const peek = () => tokens[pos];
  const consume = () => tokens[pos++];

  function parseExpression() {
    let left = parseTerm();
    while (peek()?.type === 'OP' && (peek().value === '+' || peek().value === '-')) {
      const op = consume().value;
      const right = parseTerm();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  function parseTerm() {
    let left = parsePower();
    while (
      peek()?.type === 'OP' &&
      (peek().value === '*' || peek().value === '/' || peek().value === '%')
    ) {
      const op = consume().value;
      const right = parsePower();
      if ((op === '/' || op === '%') && right === 0) {
        throw new Error('Division by zero');
      }
      if (op === '*') left *= right;
      else if (op === '/') left /= right;
      else left %= right;
    }
    return left;
  }

  function parsePower() {
    let base = parseUnary();
    if (peek()?.type === 'OP' && peek().value === '^') {
      consume();
      const exponent = parsePower();
      base = Math.pow(base, exponent);
    }
    return base;
  }

  function parseUnary() {
    if (peek()?.type === 'OP' && (peek().value === '+' || peek().value === '-')) {
      const op = consume().value;
      const val = parseUnary();
      return op === '-' ? -val : val;
    }
    return parsePrimary();
  }

  function parsePrimary() {
    const token = peek();
    if (!token) throw new Error('Unexpected end of expression');

    if (token.type === 'NUMBER') {
      consume();
      return token.value;
    }

    if (token.type === 'IDENT') {
      consume();
      const upper = token.value.toUpperCase();
      if (Object.hasOwn(CONSTANTS, upper) && peek()?.value !== '(') {
        return CONSTANTS[upper];
      }
      const fnName = token.value.toLowerCase();
      if (!Object.hasOwn(FUNCTIONS, fnName)) {
        throw new Error(`Unsupported function or identifier: ${token.value}`);
      }
      if (peek()?.value !== '(') {
        throw new Error(`Expected "(" after function ${token.value}`);
      }
      consume(); // '('
      const fnArgs = [];
      if (peek()?.value !== ')') {
        fnArgs.push(parseExpression());
        while (peek()?.value === ',') {
          consume();
          fnArgs.push(parseExpression());
        }
      }
      if (peek()?.value !== ')') {
        throw new Error(`Expected ")" after arguments to ${token.value}`);
      }
      consume(); // ')'
      if (fnArgs.length === 0) throw new Error(`Function ${fnName} requires at least 1 argument`);
      return FUNCTIONS[fnName](...fnArgs);
    }

    if (token.type === 'OP' && token.value === '(') {
      consume();
      const val = parseExpression();
      if (peek()?.value !== ')') {
        throw new Error('Missing closing parenthesis ")"');
      }
      consume();
      return val;
    }

    throw new Error(`Unexpected token: ${token.value}`);
  }

  const result = parseExpression();
  if (pos < tokens.length) {
    throw new Error(`Unexpected trailing token: ${tokens[pos].value}`);
  }
  if (!Number.isFinite(result)) {
    throw new Error('Calculation resulted in non-finite value');
  }
  return Number(result.toPrecision(12));
}

export async function runCalculator(rawArgs) {
  const args = calculatorInputSchema.parse(rawArgs);
  const result = safeEvaluateMath(args.expression);
  return {
    expression: args.expression,
    result,
    sources: [
      {
        id: `calc-${Date.now()}`,
        title: `Calculation: ${args.expression} = ${result}`,
        url: '',
        snippet: `Verified deterministic calculation: ${args.expression} = ${result}`,
        publishedDate: new Date().toISOString().slice(0, 10),
        sourceType: 'calculation',
      },
    ],
  };
}
