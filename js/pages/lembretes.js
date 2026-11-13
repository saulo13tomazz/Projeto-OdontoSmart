// ============================================================================
// CONTROLADOR DA CENTRAL DE LEMBRETES
// O "post-it digital" do consultório: mostra quanto falta pra meta e quais
// pacientes têm retorno marcado para hoje (além dos que sumiram no rolê!).
// ============================================================================
(function () {
  const OS = window.OS, U = OS.iniciarPagina('lembretes');
  if (!U) return;
  const hoje = OS.hoje();
  OS.qs('#lem-sub').textContent = `Avisos numéricos de metas e retornos agendados para hoje (${OS.fmtData(hoje)}).`;

  /* --- 1. Níveis dos indicadores (recado direto de quanto falta pro Ótimo) --- */
  const r = OS.calcular({ ine: U.ine, periodo: '12m' });
  const css = { otimo: 'alert-success', bom: 'alert-info', suficiente: 'alert-warning', regular: 'alert-danger', semdados: 'alert-info', info: 'alert-info' };
  const icone = { otimo: '✅', bom: 'ℹ️', suficiente: '⚠️', regular: '🚨', semdados: 'ℹ️', info: 'ℹ️' };
  const linhas = r.ind.filter((i) => i.nivel !== 'info').map((i) => {
    let txt;
    if (i.nivel === 'semdados') txt = `<strong>${i.cod}:</strong> sem dados no período.`;
    else if (i.nivel === 'otimo') txt = `<strong>${i.cod}</strong> está no nível <strong>Ótimo</strong> (${OS.fmtPct(i.pct)}). Mantenha o ritmo.`;
    else if (i.cod === 'B3') txt = `<strong>AVISO:</strong> o indicador <strong>B3</strong> está em <strong>${OS.NIVEL_NOME[i.nivel]}</strong> (${OS.fmtPct(i.pct)}); o limite Ótimo é ≤ ${OS.fmtPct(i.meta.otimo)}.`;
    else txt = `<strong>AVISO:</strong> faltam <strong>${i.faltam} ${i.unidade}</strong> para o indicador <strong>${i.cod}</strong> ficar no nível <strong>Ótimo</strong>${i.cod === 'B2' ? ` (${OS.fmtPct(i.meta.otimo)})` : ''}. Atual: ${OS.NIVEL_NOME[i.nivel]}.`;
    return `<div class="alert-box ${css[i.nivel]}"><span>${icone[i.nivel]}</span><div>${txt}</div></div>`;
  });
  OS.qs('#lem-niveis').innerHTML = linhas.join('');

  /* --- 2. Casos de hoje e atrasados (pra ninguém esquecer o João da Silva!) --- */
  const ativos = OS.db.casos.filter((c) => c.ine === U.ine && c.status === 'ativo');
  const ultima = (c) => OS.db.atendimentos.filter((a) => a.casoId === c.id).sort((a, b) => b.data.localeCompare(a.data))[0];

  // Monta o dossiê completo do retorno agendado com odontograma + último SOAP
  function cartaoCaso(c) {
    const p = OS.paciente(c.pacienteId), a = ultima(c);
    const pend = c.plano.filter((i) => i.status === 'planejado');
    const st = pend.length ? `Retorno para ${pend.map((i) => (OS.proc(i.procId) || {}).curto + (i.dente ? ' ' + i.dente : '')).join(', ')}` : 'Retorno para avaliação e alta';
    return `<div class="alert-box alert-info"><span>📌</span><div><strong>Atenção:</strong> o paciente <strong>${OS.esc(p.nome)}</strong>${a ? `, com último atendimento em ${OS.fmtData(a.data)},` : ''} tem retorno previsto para <strong>${c.retornoPrevisto === hoje ? 'o dia de hoje' : OS.fmtData(c.retornoPrevisto)}</strong>. Veja o caso clínico abaixo.</div></div>
    <div style="background:#f8fafc;border:1px solid #cbd5e1;padding:20px;border-radius:6px;margin:0 0 20px">
      <h3 style="color:#0f172a;margin-bottom:5px">Perfil do Caso Clínico: ${OS.esc(p.nome)}</h3>
      <p style="font-size:13px;color:#64748b">CPF: ${OS.fmtCPF(p.cpf)} | Status: ${OS.esc(st)} ${OS.tagsRisco(p)}</p>
      <h4 style="margin-top:15px;font-size:13px;color:#334155">Plano de Tratamento / Odontograma:</h4>
      <div class="odonto"></div>
      ${a ? `<h4 style="margin-top:15px;font-size:13px;color:#334155">Evolução SOAP (${OS.fmtData(a.data)}):</h4>
      <div class="soap-box"><p><strong>S:</strong> ${OS.esc(a.soap.s)}</p><p><strong>O:</strong> ${OS.esc(a.soap.o)}</p><p><strong>A:</strong> ${OS.esc(a.soap.a)}</p><p><strong>P:</strong> ${OS.esc(a.soap.p)}</p></div>` : ''}
      <p style="margin-top:14px"><a class="btn btn-primary btn-sm" href="atendimento.html?paciente=${encodeURIComponent(p.id)}">Iniciar atendimento</a></p>
    </div>`;
  }
  function montar(alvo, lista, vazio) {
    if (!lista.length) { alvo.innerHTML = `<div class="empty">${vazio}</div>`; return; }
    alvo.innerHTML = lista.map(cartaoCaso).join('');
    OS.qsa('.odonto', alvo).forEach((el, i) => OS.odontograma(el, OS.estadoOdonto(lista[i].plano), null, null));
  }
  montar(OS.qs('#lem-hoje'), ativos.filter((c) => c.retornoPrevisto === hoje), 'Nenhum retorno agendado para hoje.');
  // Ordena os retornos atrasados do mais "sumido" para o mais recente
  const atras = ativos.filter((c) => c.retornoPrevisto && c.retornoPrevisto < hoje).sort((a, b) => a.retornoPrevisto.localeCompare(b.retornoPrevisto));
  const alvoAt = OS.qs('#lem-atrasados');
  alvoAt.innerHTML = atras.length ? `<div class="table-scroll"><table class="data-table"><thead><tr><th>Paciente</th><th>Retorno previsto</th><th>Atraso</th><th>Contato</th><th></th></tr></thead><tbody>` +
    atras.map((c) => { const p = OS.paciente(c.pacienteId), d = Math.round((OS.parse(hoje) - OS.parse(c.retornoPrevisto)) / 864e5);
      return `<tr><td>${OS.esc(p.nome)}</td><td>${OS.fmtData(c.retornoPrevisto)}</td><td>${d} dia(s)</td><td>${OS.esc(p.tel || '—')}</td><td><a class="btn btn-secondary btn-sm" href="atendimento.html?paciente=${encodeURIComponent(p.id)}">Atender</a></td></tr>`; }).join('') + '</tbody></table></div>'
    : '<div class="empty">Nenhum retorno atrasado.</div>';
})();
