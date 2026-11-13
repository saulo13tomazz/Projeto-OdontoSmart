// ============================================================================
// CONTROLADOR DO DASHBOARD PRINCIPAL
// Mostra a nota geral da equipe e os 6 cards limpos dos indicadores (B1 a B6).
// Clicou em qualquer card? Ele te teletransporta para indicador.html com tudo detalhado!
// ============================================================================
(function () {
  // Garante que o usuário está logado e desenha menu/cabeçalho com a aba 'dashboard' ativa
  const OS = window.OS, U = OS.iniciarPagina('dashboard');
  if (!U) return;
  const per = OS.qs('#f-periodo'), prof = OS.qs('#f-prof');
  // Popula os filtros de período (12m, quadrimestre, ano) e de profissional da equipe
  per.innerHTML = Object.entries(OS.periodos).map(([k, v]) => `<option value="${k}">${v.nome}</option>`).join('');
  prof.innerHTML = '<option value="">Toda a equipe (INE)</option>' + OS.db.profissionais.filter((p) => p.ine === U.ine)
    .map((p) => `<option value="${p.id}">${OS.esc(p.nome)} (${p.cbo})</option>`).join('');

  // Se o usuário voltou da tela de detalhes (?periodo=...&prof=...), restaura os filtros dele
  const qp = new URLSearchParams(location.search);
  if (qp.get('periodo') && OS.periodos[qp.get('periodo')]) per.value = qp.get('periodo');
  if (qp.get('prof')) prof.value = qp.get('prof');

  // Recalcula e redesenha a caixa de pontuação + os 6 cards clicáveis
  function desenhar() {
    const r = OS.calcular({ ine: U.ine, periodo: per.value, profId: prof.value });
    const info = OS.ineInfo(U.ine);
    // Passa os filtros atuais na URL para que clicar no card abra o detalhe no mesmo recorte
    const qs = new URLSearchParams({ periodo: per.value, ...(prof.value ? { prof: prof.value } : {}) }).toString();

    OS.qs('#dash-sub').textContent = `${info.equipe} (${info.cargaHoraria}h) · Selecione um indicador abaixo para abrir os detalhes completos.`;
    OS.qs('#dash-score').innerHTML = `<div class="score-box score-box-compact">
      <div class="score-main">
        <div class="big">${r.pontuacao === null ? '—' : OS.fmtDec(r.pontuacao)}</div>
        <div><strong>Pontuação da Equipe</strong><small>Média ponderada (0 a 1)</small></div>
      </div>
      <div class="score-kpis">
        <div><strong>${r.populacao}</strong><small>População vinculada</small></div>
        <div><strong>${r.casosAtivos}</strong><small>Casos clínicos ativos</small></div>
        <div><strong>${OS.fmtData(r.janela.ini)} – ${OS.fmtData(r.janela.fim)}</strong><small>Janela analisada</small></div>
      </div>
    </div>`;
    OS.qs('#dash-grid').innerHTML = r.ind.map((ind) => OS.cardIndicador(ind, qs)).join('');
  }
  // Qualquer mexida nos filtros atualiza o painel na hora (sem precisar apertar F5!)
  per.addEventListener('change', desenhar); prof.addEventListener('change', desenhar);
  desenhar();
})();
