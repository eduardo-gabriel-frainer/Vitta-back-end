import {
  dataIsoValida,
  horarioValido,
  idPositivoValido,
  dataEHorario,
} from './validacoes.js';

export function agendaContemConsulta(agenda, inicioEm, fimEm) {
  const inicioAgenda = dataEHorario(agenda.data, agenda.horario_inicial);
  const fimAgenda = dataEHorario(agenda.data, agenda.horario_final);

  return inicioEm >= inicioAgenda && fimEm <= fimAgenda;
}

export function dadosAgendaValidos(body) {
  const { profissional_id, data, horario_inicial, horario_final } = body || {};
  const dataAgenda = dataIsoValida(data);
  const horario_inicial_validado = horarioValido(horario_inicial);
  const horario_final_validado = horarioValido(horario_final);

  if (
    !idPositivoValido(profissional_id)
    || !dataAgenda
    || !horario_inicial_validado
    || !horario_final_validado
  ) {
    return null;
  }
  if (horario_final_validado <= horario_inicial_validado) return null;

  return {
    profissional_id,
    data: dataAgenda,
    horario_inicial: horario_inicial_validado,
    horario_final: horario_final_validado,
  };
}

export function filtrosAgendaValidos(query) {
  const where = {};

  if (query.profissional_id != null) {
    const profissional_id = Number(query.profissional_id);
    if (!idPositivoValido(profissional_id)) return { erro: 'ID de profissional inválido' };
    where.profissional_id = profissional_id;
  }

  if (query.data != null) {
    const data = dataIsoValida(query.data);
    if (!data) return { erro: 'Data inválida; use o formato YYYY-MM-DD' };
    where.data = data;
  }

  return { where };
}
