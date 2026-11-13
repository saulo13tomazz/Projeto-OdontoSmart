// ============================================================================
// CONTROLADOR DE AÇÃO COLETIVA (PSE / B4)
// Módulo da escovação em massa nas escolas! Tanto Dentista quanto TSB podem
// registrar aqui e fazer o indicador B4 subir igual pasta saindo do tubo.
// ============================================================================
(function () {
  const OS = window.OS, U = OS.iniciarPagina('coletiva');
  if (!U) return;
  const $ = (s) => OS.qs(s);
  // Lista todas as crianças de 6 a 12 anos da equipe, em ordem alfabética, e guarda o Set de marcadas
  const criancas = OS.db.pacientes.filter((p) => p.ine === U.ine && OS.ehCrianca6a12(p)).sort((a, b) => a.nome.localeCompare(b.nome));
  const sel = new Set();
  // Já sugere a data de hoje e proíbe viajar no tempo para o futuro
  $('#c-data').value = OS.hoje(); $('#c-data').max = OS.hoje();

  // Desenha o card vivo do B4 no topo para acompanhar quantas crianças ainda faltam
  function painelB4() {
    const b4 = OS.calcular({ ine: U.ine, periodo: '12m' }).ind[3];
    $('#col-b4').innerHTML = `<div class="indicator-card" style="margin-bottom:20px"><div class="indicator-header"><div><span class="indicator-code">B4</span><div class="indicator-title">${OS.esc(b4.nome)}</div></div>${OS.badge(b4.nivel)}</div>
      <div class="metric-details"><span>${b4.detalhe}</span><span>${OS.esc(b4.metaTxt)}</span></div>
      <div class="progress-container"><div class="progress-bar ${b4.cor}" style="width:${Math.min(100, b4.prog)}%"></div></div><div class="goal-banner ${b4.nivel === 'otimo' ? 'ok' : ''}">${b4.nivel === 'semdados' ? 'Sem crianças de 6 a 12 anos vinculadas a esta equipe.' : b4.msg}</div></div>`;
  }
  // Descobre quem já escovou nos últimos 12 meses (para não iludir contando duas vezes)
  function jaParticipou() {
    const ini = OS.addDias(OS.hoje(), -365), s = new Set();
    OS.db.coletivas.filter((c) => c.ine === U.ine && c.escovacao && c.data >= ini).forEach((c) => c.participantes.forEach((id) => s.add(id)));
    return s;
  }
  // Renderiza a listinha de chamada escolar com checkboxes e filtro por nome
  function lista() {
    const t = OS.norm($('#c-busca').value), ja = jaParticipou();
    const l = criancas.filter((p) => !t || OS.norm(p.nome).includes(t));
    $('#c-lista').innerHTML = l.length ? `<table class="data-table" style="margin:0"><tbody>${l.map((p) => `<tr><td style="width:36px"><input type="checkbox" data-id="${p.id}" ${sel.has(p.id) ? 'checked' : ''} aria-label="Selecionar ${OS.esc(p.nome)}"></td><td>${OS.esc(p.nome)} <small>(${OS.idade(p.nascimento)} anos)</small></td><td>${ja.has(p.id) ? '<span class="badge badge-otimo">B4 já contado</span>' : '<span class="badge badge-suficiente">Falta B4</span>'}</td></tr>`).join('')}</tbody></table>` : '<div class="empty">Nenhuma criança encontrada.</div>';
    OS.qsa('[data-id]', $('#c-lista')).forEach((c) => c.addEventListener('change', () => { c.checked ? sel.add(c.dataset.id) : sel.delete(c.dataset.id); contagem(); }));
    contagem(l);
  }
  const contagem = () => { $('#c-contagem').textContent = `${sel.size} criança(s) selecionada(s) · ${criancas.length} vinculadas à equipe.`; };
  let exibidas = () => { const t = OS.norm($('#c-busca').value); return criancas.filter((p) => !t || OS.norm(p.nome).includes(t)); };
  $('#c-busca').addEventListener('input', lista);
  $('#c-todos').addEventListener('click', () => { exibidas().forEach((p) => sel.add(p.id)); lista(); });
  $('#c-limpar').addEventListener('click', () => { sel.clear(); lista(); });

  // Valida o formulário, salva a ação coletiva e recalcula o B4 na hora
  $('#c-salvar').addEventListener('click', () => {
    const erros = [];
    if (!$('#c-data').value) erros.push('Informe a data.'); else if ($('#c-data').value > OS.hoje()) erros.push('A data não pode ser futura.');
    if (!$('#c-local').value.trim()) erros.push('Informe o local.');
    if (!sel.size) erros.push('Selecione ao menos um participante.');
    if (erros.length) { $('#c-erro').innerHTML = `<div class="alert-box alert-danger">${erros.map(OS.esc).join('<br>')}</div>`; return; }
    OS.db.coletivas.push({ id: OS.uid('ac'), data: $('#c-data').value, local: $('#c-local').value.trim(), tipo: $('#c-tipo').value, escovacao: $('#c-tipo').value === 'escovacao', profId: U.id, ine: U.ine, participantes: Array.from(sel) });
    OS.registrarAlteracao(`Ação coletiva registrada em ${$('#c-local').value.trim()} (${sel.size} participantes).`);
    OS.salvar(); OS.logAcesso('acao-coletiva');
    sel.clear(); $('#c-local').value = ''; $('#c-erro').innerHTML = '<div class="alert-box alert-success">✅ Atividade registrada. O indicador B4 foi atualizado.</div>';
    painelB4(); lista(); historico();
  });

  // Mostra a tabela com as últimas visitas às escolas e creches da região
  function historico() {
    const l = OS.db.coletivas.filter((c) => c.ine === U.ine).sort((a, b) => b.data.localeCompare(a.data));
    $('#c-hist').innerHTML = l.length ? `<div class="table-scroll"><table class="data-table"><thead><tr><th>Data</th><th>Local</th><th>Atividade</th><th>Participantes</th><th>Profissional</th></tr></thead><tbody>${l.map((c) => `<tr><td>${OS.fmtData(c.data)}</td><td>${OS.esc(c.local)}</td><td>${c.escovacao ? 'Escovação supervisionada (B4)' : 'Outra ação educativa'}</td><td>${c.participantes.length}</td><td>${OS.esc((OS.profissional(c.profId) || {}).nome || '—')}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">Nenhuma atividade registrada.</div>';
  }
  painelB4(); lista(); historico();
})();
