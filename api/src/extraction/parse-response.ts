/**
 * Extrai o objeto JSON da resposta do modelo, tolerando cercas de código
 * (```json ... ```) e texto à volta.
 */
export function parseModelResponse(text: string): unknown {
  const trimmed = text.trim();

  const direct = tryParse(trimmed);
  if (direct !== undefined) return direct;

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    const inner = tryParse(fenced[1].trim());
    if (inner !== undefined) return inner;
  }

  // Último recurso: do primeiro "{" ao último "}"
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first !== -1 && last > first) {
    const slice = tryParse(trimmed.slice(first, last + 1));
    if (slice !== undefined) return slice;
  }

  throw new SyntaxError('Resposta do modelo não contém JSON válido.');
}

function tryParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
