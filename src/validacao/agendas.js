import {
  dataIsoValida,
  horarioValido,
  idPositivoValido,
  dataEHorario,
} from './validacoes.js';

export function agendaContemConsulta(agenda, inicioEm, fimEm) {
  const inicioAgenda = dataEHorario(agenda.data, agenda.horarioInicial);
  const fimAgenda = dataEHorario(agenda.data, agenda.horarioFinal);

  return inicioEm >= inicioAgenda && fimEm <= fimAgenda;
}

export function dadosAgendaValidos(body) {
  const { profissional_id, data, horario_inicial, horario_final } = body || {};
  const dataAgenda = dataIsoValida(data);
  const horarioInicial = horarioValido(horario_inicial);
  const horarioFinal = horarioValido(horario_final);

  if (!idPositivoValido(profissional_id) || !dataAgenda || !horarioInicial || !horarioFinal) {
    return null;
  }
  if (horarioFinal <= horarioInicial) return null;

  return { profissionalId: profissional_id, data: dataAgenda, horarioInicial, horarioFinal };
}

export function filtrosAgendaValidos(query) {
  const where = {};

  if (query.profissional_id != null) {
    const profissionalId = Number(query.profissional_id);
    if (!idPositivoValido(profissionalId)) return { erro: 'ID de profissional inválido' };
    where.profissionalId = profissionalId;
  }

  if (query.data != null) {
    const data = dataIsoValida(query.data);
    if (!data) return { erro: 'Data inválida; use o formato YYYY-MM-DD' };
    where.data = data;
  }

  return { where };
}
