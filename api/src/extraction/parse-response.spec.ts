import { parseModelResponse } from './parse-response';

describe('parseModelResponse', () => {
  it('aceita JSON puro', () => {
    expect(parseModelResponse('{"a": 1}')).toEqual({ a: 1 });
  });

  it('aceita JSON dentro de cercas ```json', () => {
    expect(parseModelResponse('Aqui está:\n```json\n{"a": 1}\n```')).toEqual({
      a: 1,
    });
  });

  it('aceita JSON rodeado de texto', () => {
    expect(parseModelResponse('Resultado: {"a": {"b": 2}} fim.')).toEqual({
      a: { b: 2 },
    });
  });

  it('lança erro sem JSON', () => {
    expect(() => parseModelResponse('não há json aqui')).toThrow(SyntaxError);
  });
});
