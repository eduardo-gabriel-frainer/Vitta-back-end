function idValido(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function parametroId(value) {
  if (!/^[1-9]\d*$/.test(value)) return null;

  const id = Number(value);
  return idValido(id) ? id : null;
}

function textoValido(value, maxLength) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength;
}

function textoOpcional(value, maxLength) {
  return value == null || (typeof value === 'string' && value.trim().length <= maxLength);
}

function dataHoraValida(value) {
  if (typeof value !== 'string') return false;

  const match = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(value);
  if (!match) return false;

  const [, year, month, day, hour, minute, second] = match.map(Number);
  if (year < 1000 || hour > 23 || minute > 59 || second > 59) return false;

  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

module.exports = {
  dataHoraValida,
  idValido,
  parametroId,
  textoOpcional,
  textoValido,
};
