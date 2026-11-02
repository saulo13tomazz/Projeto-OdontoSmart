(function () {
  const OS = window.OS, U = OS.iniciarPagina('dashboard');
  if (!U) return;
  const per = OS.qs('#f-periodo'), prof = OS.qs('#f-prof');
  per.innerHTML = Object.entries(OS.periodos).map(([k, v]) => `<option value="${k}">${v.nome}</option>`).join('');
  prof.innerHTML = '<option value="">Toda a equipe (INE)</option>' + OS.db.profissionais.filter((p) => p.ine === U.ine)
    .map((p) => `<option value="${p.id}">${OS.esc(p.nome)} (${p.cbo})</option>`).join('');

  function desenhar() {
    const r = OS.calcular({ ine: U.ine, periodo: per.value, profId: prof.value });
    const info = OS.ineInfo(U.ine);
    OS.qs('#dash-sub').textContent = `Equipe ${info.equipe} · Carga horária: ${info.cargaHoraria}h · População de referência: ${r.populacao} cidadãos · Janela: ${OS.fmtData(r.janela.ini)} a ${OS.fmtData(r.janela.fim)} · Casos ativos: ${r.casosAtivos}`;
    OS.qs('#dash-score').innerHTML = r.pontuacao === null ? '' : `<div class="score-box">
      <div><div class="big">${OS.fmtDec(r.pontuacao)}</div><small>Pontuação estimada da equipe (0 a 1)</small></div>
      <div style="font-size:13px;color:#475569;max-width:520px">Média ponderada dos conceitos dos indicadores com meta (pesos e pontos em Configurações). Estimativa para apoio à gestão, não substitui a apuração oficial.</div></div>`;
    OS.qs('#dash-grid').innerHTML = r.ind.map(OS.cardIndicador).join('');
  }
  per.addEventListener('change', desenhar); prof.addEventListener('change', desenhar);
  desenhar();
})();
