import { normalizeName } from './normalize';

describe('normalizeName', () => {
  it('minúsculas e remove pontuação', () => {
    expect(normalizeName('LIDL & CIA.')).toBe('lidl');
  });

  it('remove sufixos societários', () => {
    expect(normalizeName('Continente, S.A.')).toBe('continente');
    expect(normalizeName('Makro Cash & Carry Unipessoal Lda')).toBe(
      'makro cash carry',
    );
    expect(normalizeName('Padaria Central LDA.')).toBe('padaria central');
  });

  it('remove acentos', () => {
    expect(normalizeName('Padaria São João')).toBe('padaria sao joao');
  });

  it('colapsa espaços', () => {
    expect(normalizeName('  Pingo   Doce  ')).toBe('pingo doce');
  });

  it('mantém nomes simples', () => {
    expect(normalizeName('Restaurante Sakura')).toBe('restaurante sakura');
  });

  it('string vazia ou só pontuação devolve vazio', () => {
    expect(normalizeName('...')).toBe('');
    expect(normalizeName('')).toBe('');
  });
});
