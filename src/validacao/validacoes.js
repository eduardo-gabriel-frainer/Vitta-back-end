export function idPositivoValido(id) {
  return Number.isInteger(id) && id > 0;
}

export function nomeValido(nome) {
  if (typeof nome !== 'string') return null;

  const nomeNormalizado = nome.trim();
  return nomeNormalizado || null;
}

export function textosOpcionaisValidos(...valores) {
  return valores.every((valor) => valor == null || typeof valor === 'string');
}

export function normalizarTextoOpcional(valor) {
  return valor?.trim() || null;
}

export function intervaloValido(inicio, fim) {
  const inicioEm = new Date(`${inicio}`.replace(' ', 'T') + 'Z');
  const fimEm = new Date(`${fim}`.replace(' ', 'T') + 'Z');

  if (Number.isNaN(inicioEm.getTime()) || Number.isNaN(fimEm.getTime()) || fimEm <= inicioEm) {
    return null;
  }

  return { inicioEm, fimEm };
}

export function dataAtualUtc() {
  const hoje = new Date();
  return new Date(Date.UTC(
    hoje.getUTCFullYear(),
    hoje.getUTCMonth(),
    hoje.getUTCDate(),
  ));
}
