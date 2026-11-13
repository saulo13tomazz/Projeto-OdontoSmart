// ============================================================================
// CONTROLADOR DE ATENDIMENTO CLÍNICO & SOAP
// A estrela do consultório! Conduz a consulta do início ao fim:
// busca/cadastra paciente -> confere risco -> odontograma + plano -> SOAP -> alertas -> salva!
// ============================================================================
(function () {
  const OS = window.OS, U = OS.iniciarPagina('atendimento');
  if (!U) return;
  const $ = (s) => OS.qs(s);
  // Estado vivo da consulta atual (guarda paciente, dente clicado, procedimentos do dia e textos do SOAP)
  const S = { pac: null, caso: null, procs: [], planoNovo: [], ignorados: new Set(), dente: '', soap: { s: '', o: '', a: '', p: '' }, conduta: 'continuidade', retorno: OS.addDias(OS.hoje(), 14) };

  /* ---------- Passo 1: busca na recepção ---------- */
  function buscar() {
    const termo = $('#busca-termo').value, alvo = $('#busca-resultado');
    if (!termo.trim()) { alvo.innerHTML = ''; return; }
    const l = OS.buscarPacientes(termo, U.ine);
    if (!l.length) {
      alvo.innerHTML = '<div class="alert-box alert-warning" style="margin-top:12px"><span>⚠️</span><div><strong>Paciente não localizado.</strong> <button class="btn btn-primary btn-sm" id="btn-novo" type="button" style="margin-left:8px">Cadastrar novo</button></div></div>';
      $('#btn-novo').addEventListener('click', () => abrirCadastro(termo));
      return;
    }
    alvo.innerHTML = '<div class="search-results">' + l.map((p) => `<div class="search-item"><div><strong>${OS.esc(p.nome)}</strong> <small>CPF ${OS.fmtCPF(p.cpf)}${p.cns ? ' | CNS ' + OS.esc(p.cns) : ''} | ${OS.idade(p.nascimento)} anos</small><br>${OS.tagsRisco(p)}</div><button class="btn btn-primary btn-sm" data-id="${p.id}" type="button">Selecionar</button></div>`).join('') + '</div>';
    OS.qsa('[data-id]', alvo).forEach((b) => b.addEventListener('click', () => selecionar(OS.paciente(b.dataset.id))));
  }
  $('#btn-buscar').addEventListener('click', buscar);
  $('#busca-termo').addEventListener('keydown', (e) => { if (e.key === 'Enter') buscar(); });

  /* ---------- Cadastro rápido (quando o paciente ainda não tem ficha) ---------- */
  function abrirCadastro(termo) {
    $('#bloco-cadastro').hidden = false;
    const d = OS.digitos(termo);
    if (d.length === 11) $('#cad-cpf').value = d; else if (d.length === 15) $('#cad-cns').value = d; else if (termo && !d) $('#cad-nome').value = termo.trim();
    $('#cad-nome').focus();
  }
  $('#cad-cancelar').addEventListener('click', () => { $('#bloco-cadastro').hidden = true; });
  $('#cad-salvar').addEventListener('click', () => {
    const v = (id) => $(id).value, erros = [];
    const cpf = OS.digitos(v('#cad-cpf')), cns = OS.digitos(v('#cad-cns'));
    if (!v('#cad-nome').trim()) erros.push('Informe o nome completo.');
    if (!v('#cad-nasc')) erros.push('Informe a data de nascimento.'); else if (v('#cad-nasc') > OS.hoje()) erros.push('A data de nascimento não pode ser futura.');
    if (!cpf && !cns) erros.push('Informe CPF ou CNS.');
    if (cpf && cpf.length !== 11) erros.push('O CPF deve ter 11 dígitos.');
    if (cns && cns.length !== 15) erros.push('O CNS deve ter 15 dígitos.');
    if (erros.length) { $('#cad-erro').innerHTML = `<div class="alert-box alert-danger">${erros.map(OS.esc).join('<br>')}</div>`; return; }
    const riscos = []; if ($('#cad-ges').checked) riscos.push('gestante'); if ($('#cad-dia').checked) riscos.push('diabetico');
    const r = OS.cadastrarPaciente({ nome: v('#cad-nome'), nascimento: v('#cad-nasc'), sexo: v('#cad-sexo'), cpf, cns, nis: v('#cad-nis'), mae: v('#cad-mae'), tel: v('#cad-tel'), riscos, ine: U.ine });
    if (r.erro) { $('#cad-erro').innerHTML = `<div class="alert-box alert-danger">${OS.esc(r.erro)}</div>`; return; }
    $('#cad-erro').innerHTML = ''; $('#bloco-cadastro').hidden = true; $('#busca-resultado').innerHTML = '';
    selecionar(r.paciente);
  });

  /* ---------- Passo 2: validação de perfil (gestante/diabético ainda valem?) ---------- */
  function selecionar(p) {
    Object.assign(S, { pac: p, caso: null, procs: [], planoNovo: [], ignorados: new Set(), dente: '', soap: { s: '', o: '', a: '', p: '' }, conduta: 'continuidade', retorno: OS.addDias(OS.hoje(), 14) });
    $('#bloco-trabalho').hidden = true; $('#bloco-final').hidden = true;
    OS.logAcesso('abrir-prontuario', p.id);
    const caso = OS.casoAtivo(p.id);
    const el = $('#bloco-paciente'); el.hidden = false;
    el.innerHTML = `<div class="patient-context-banner">
      <div class="patient-context-info">
        <h3>👤 Paciente Selecionado: <strong>${OS.esc(p.nome)}</strong></h3>
        <p>CPF: ${OS.fmtCPF(p.cpf)} | CNS: ${OS.esc(p.cns || '—')} | NIS: ${OS.esc(p.nis || '—')} | Idade: ${OS.idade(p.nascimento)} anos | Tel.: ${OS.esc(p.tel || '—')}</p>
        <p style="margin-top:4px">${OS.tagsRisco(p)} <small style="color:#0369a1;font-weight:bold">(INE: ${OS.esc(p.ine)})</small></p>
        <p style="margin-top:8px;font-size:12px">Confirme se os marcadores continuam os mesmos:
          <label><input type="checkbox" id="m-ges" ${p.riscos.includes('gestante') ? 'checked' : ''}> Gestante</label>
          <label style="margin-left:10px"><input type="checkbox" id="m-dia" ${p.riscos.includes('diabetico') ? 'checked' : ''}> Diabético</label></p>
      </div>
      <div style="text-align:right"><span class="badge ${caso ? 'badge-bom' : 'badge-info'}">${caso ? 'Caso ativo' : 'Sem caso aberto'}</span><br><br>
        <button class="btn btn-primary" id="btn-iniciar" type="button">Iniciar atendimento</button></div></div>`;
    $('#btn-iniciar').addEventListener('click', () => {
      const r = []; if ($('#m-ges').checked) r.push('gestante'); if ($('#m-dia').checked) r.push('diabetico');
      if (r.join() !== p.riscos.join()) { p.riscos = r; OS.registrarAlteracao(`Marcadores de risco atualizados: ${p.nome}.`); OS.salvar(); }
      iniciar();
    });
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* ---------- Passo 3 e 4: caso clínico + odontograma + evolução SOAP ---------- */
  function iniciar() {
    S.caso = OS.casoAtivo(S.pac.id);
    $('#bloco-paciente').hidden = true; $('#bloco-trabalho').hidden = false;
    desenhar();
  }
  const nomeItem = (i) => `${OS.esc((OS.proc(i.procId) || {}).nome)}${i.dente ? ' · dente ' + OS.esc(i.dente) : ''}`;

  // Mostra em tempo real quais indicadores (B1..B6) serão afetados quando clicar em Salvar
  function impactos() {
    const hojeB1 = !OS.db.atendimentos.some((a) => a.pacienteId === S.pac.id && a.tipo === 'primeira' && a.data > OS.addDias(OS.hoje(), -365)) && !S.caso;
      const cat = (f) => S.procs.some((p) => f(OS.proc(p.procId) || {}));
        const flags = [
      ['B1 - 1ª Consulta Programada', hojeB1], ['B2 - Alta Odontológica', S.conduta === 'concluido'], ['B3 - Exodontia', cat((p) => p.exodontia)],
      ['B5 - Prevenção', cat((p) => p.categoria === 'preventivo')], ['B6 - Restauração ART', cat((p) => p.art)]
    ];
    return flags.map(([t, on]) => `<span class="alloc-tag ${on ? '' : 'off'}">${t}</span>`).join('');
  }

  function desenhar() {
      const el = $('#bloco-trabalho'), caso = S.caso, plano = caso ? caso.plano : [];
        const pendentes = plano.filter((i) => i.status === 'planejado');
         const ultima = caso ? OS.db.atendimentos.filter((a) => a.casoId === caso.id).sort((a, b) => b.data.localeCompare(a.data))[0] : null;
             const doze = OS.db.atendimentos.some((a) => a.pacienteId === S.pac.id && a.tipo === 'primeira' && a.data > OS.addDias(OS.hoje(), -365));

    el.innerHTML = `
    <div class="patient-context-banner" style="margin-bottom:20px"><div class="patient-context-info"><h3>👤 ${OS.esc(S.pac.nome)}</h3><p>${OS.idade(S.pac.nascimento)} anos ${OS.tagsRisco(S.pac)} · atendendo como ${OS.esc(U.nome)} (${U.cbo})</p></div>
      <button class="btn btn-secondary btn-sm" id="btn-trocar" type="button">Trocar paciente</button></div>

    <div class="card">
      <div class="card-header">2. ${caso ? 'Caso clínico em andamento' : 'Novo Plano de Tratamento'}</div>
      ${caso
        ? `<p style="font-size:13px;color:#475569">Aberto em ${OS.fmtData(caso.abertura)}${caso.retornoPrevisto ? ' · retorno previsto ' + OS.fmtData(caso.retornoPrevisto) : ''}.</p>
           ${ultima ? `<div class="alert-box alert-info" style="margin-top:10px"><span>📌</span><div><strong>Pendências da última sessão (${OS.fmtData(ultima.data)}):</strong> ${pendentes.length ? pendentes.map((i) => nomeItem(i)).join('; ') : 'nenhum item pendente no plano.'}<br><small>P anterior: ${OS.esc(ultima.soap.p)}</small></div></div>` : ''}`
        : `<div class="alert-box ${doze ? 'alert-warning' : 'alert-info'}"><span>ℹ️</span><div>${doze ? 'Este paciente já teve 1ª consulta programada nos últimos 12 meses: ela <strong>não</strong> conta novamente no B1.' : 'Ao salvar, a <strong>1ª consulta odontológica programada (B1)</strong> será registrada automaticamente.'}</div></div>`}
      <ul class="plan-list" id="lista-plano">
        ${plano.map((i) => i.status === 'feito'
          ? `<li style="color:#64748b">✔ ${nomeItem(i)} <small>(realizado em ${OS.fmtData(i.feitoEm)})</small></li>`
          : `<li><label><input type="checkbox" data-item="${i.id}" ${S.procs.some((p) => p.itemId === i.id) ? 'checked' : ''} ${OS.podeLancar(U.cbo, i.procId) ? '' : 'disabled'}> Executar hoje:</label> ${nomeItem(i)} ${OS.podeLancar(U.cbo, i.procId) ? '' : '<small>(exclusivo CD)</small>'}</li>`).join('')}
        ${S.planoNovo.map((i, n) => `<li>🗒 Planejar: ${nomeItem(i)} <button class="btn btn-secondary btn-sm" data-rm-plano="${n}" type="button">remover</button></li>`).join('')}
      </ul>
      ${!plano.length && !S.planoNovo.length ? '<p class="hint" style="font-size:12px;color:#64748b">Sem itens no plano. Adicione abaixo os procedimentos previstos.</p>' : ''}
      <div id="odonto"></div>
    </div>

    <div class="card">
      <div class="card-header">3. Procedimentos do dia</div>
      <div class="form-grid">
        <div class="form-group span-2"><label for="p-proc">Procedimento</label><select id="p-proc" class="form-control">${OS.selectProcedimentos(U.cbo)}</select></div>
        <div class="form-group"><label for="p-dente">Dente (opcional)</label><input id="p-dente" class="form-control" value="${OS.esc(S.dente)}" placeholder="clique no odontograma" maxlength="2"></div>
        <div class="form-group" style="justify-content:flex-end;flex-direction:row;gap:8px;flex-wrap:wrap">
          <button class="btn btn-primary" id="p-add" type="button">Adicionar ao atendimento</button>
          <button class="btn btn-secondary" id="p-plan" type="button">Só planejar</button></div>
      </div>
      <div id="chips">${S.procs.length ? S.procs.map((p, n) => `<span class="chip">${OS.esc((OS.proc(p.procId) || {}).nome)}${p.dente ? ' · ' + OS.esc(p.dente) : ''}<button type="button" data-rm="${n}" aria-label="Remover">×</button></span>`).join('') : '<span class="chip muted">Nenhum procedimento lançado hoje</span>'}</div>
      <div class="allocation-summary-box"><h4>📊 Indicadores impactados por este atendimento (apuração automática)</h4><div class="allocation-tags-container" id="impactos">${impactos()}</div></div>
    </div>

    <div class="card">
      <div class="card-header">4. Evolução SOAP & Finalização</div>
      <div class="form-grid">
        <div class="form-group span-2"><label for="s-s">Subjetivo (S)</label><textarea id="s-s" class="form-control">${OS.esc(S.soap.s)}</textarea></div>
        <div class="form-group span-2"><label for="s-o">Objetivo (O)</label><textarea id="s-o" class="form-control">${OS.esc(S.soap.o)}</textarea></div>
        <div class="form-group span-2"><label for="s-a">Avaliação (A) *</label><input id="s-a" class="form-control" value="${OS.esc(S.soap.a)}" placeholder="Ex.: D82 - cárie em dentina"></div>
        <div class="form-group span-2"><label for="s-p">Plano (P)</label><input id="s-p" class="form-control" value="${OS.esc(S.soap.p)}"></div>
        <div class="form-group"><label for="s-conduta">Conduta</label><select id="s-conduta" class="form-control">${Object.entries(OS.condutaNome).map(([k, v]) => `<option value="${k}" ${S.conduta === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
        <div class="form-group" id="g-retorno" ${S.conduta === 'concluido' ? 'hidden' : ''}><label for="s-retorno">Retorno previsto</label><input type="date" id="s-retorno" class="form-control" value="${S.retorno}" min="${OS.hoje()}"></div>
      </div>
      <div id="erro-salvar"></div>
      <button class="btn btn-success" id="btn-salvar" type="button" style="width:100%;font-size:15px;padding:12px">💾 Salvar evolução e apurar indicadores</button>
    </div>`;

    OS.odontograma($('#odonto'), OS.estadoOdonto(plano.concat(S.planoNovo.map((i) => ({ ...i, status: 'planejado' }))), S.procs), S.dente, (d) => { S.dente = S.dente === d ? '' : d; lerCampos(); desenhar(); });
    ligar();
  }

  // Lê os inputs do SOAP/conduta antes de redesenhar a tela, senão o usuário perde o que digitou!
  function lerCampos() {
    const v = (id) => ($(id) ? $(id).value : '');
    S.soap = { s: v('#s-s'), o: v('#s-o'), a: v('#s-a'), p: v('#s-p') };
    S.conduta = v('#s-conduta') || S.conduta; S.retorno = v('#s-retorno') || S.retorno;
    if ($('#p-dente')) S.dente = v('#p-dente').trim();
  }

  function ligar() {
    $('#btn-trocar').addEventListener('click', () => { $('#bloco-trabalho').hidden = true; $('#bloco-final').hidden = true; selecionar(S.pac); });
    OS.qsa('[data-item]').forEach((c) => c.addEventListener('change', () => {
      lerCampos();
      const item = S.caso.plano.find((i) => i.id === c.dataset.item);
      if (c.checked) S.procs.push({ procId: item.procId, dente: item.dente || '', itemId: item.id });
      else S.procs = S.procs.filter((p) => p.itemId !== item.id);
      S.ignorados.clear(); desenhar();
    }));
    OS.qsa('[data-rm]').forEach((b) => b.addEventListener('click', () => { lerCampos(); S.procs.splice(Number(b.dataset.rm), 1); S.ignorados.clear(); desenhar(); }));
    OS.qsa('[data-rm-plano]').forEach((b) => b.addEventListener('click', () => { lerCampos(); S.planoNovo.splice(Number(b.dataset.rmPlano), 1); desenhar(); }));
    const dentValido = () => { const d = $('#p-dente').value.trim(); if (d && !/^[1-4][1-8]$/.test(d)) { $('#p-dente').classList.add('invalid'); return null; } return d; };
    $('#p-add').addEventListener('click', () => { lerCampos(); const d = dentValido(); if (d === null) return; S.procs.push({ procId: $('#p-proc').value, dente: d }); S.dente = ''; S.ignorados.clear(); desenhar(); });
    $('#p-plan').addEventListener('click', () => { lerCampos(); const d = dentValido(); if (d === null) return; S.planoNovo.push({ procId: $('#p-proc').value, dente: d }); S.dente = ''; desenhar(); });
    $('#s-conduta').addEventListener('change', () => { lerCampos(); S.ignorados.clear(); desenhar(); });
    $('#btn-salvar').addEventListener('click', salvar);
  }

  /* ---------- Salvar: validação + motor de alertas (trava TSB, alta B2, flúor em criança...) ---------- */
  function salvar() {
    lerCampos();
    const erros = [];
    if (!S.soap.a.trim()) erros.push('Preencha a Avaliação (A) do SOAP.');
    if (!S.procs.length) erros.push('Lance ao menos um procedimento realizado hoje.');
    if (S.conduta !== 'concluido' && S.retorno < OS.hoje()) erros.push('O retorno previsto não pode ser no passado.');
    if (erros.length) { $('#erro-salvar').innerHTML = `<div class="alert-box alert-danger">${erros.map(OS.esc).join('<br>')}</div>`; return; }
    $('#erro-salvar').innerHTML = '';
    revisar();
  }

  function revisar() {
     const alertas = OS.avaliarAtendimento({ paciente: S.pac, caso: S.caso, prof: U, procs: S.procs, conduta: S.conduta, ignorados: S.ignorados });
      if (!alertas.length) { OS.fecharModal(); return gravar(); }
        const bloq = alertas.some((a) => a.tipo === 'bloqueio');
          const icone = { bloqueio: '⛔', sugestao: '💡', aviso: '⚠️' }, cls = { bloqueio: 'alert-danger', sugestao: 'alert-info', aviso: 'alert-warning' };
            const html = alertas.map((a) => `<div class="alert-box ${cls[a.tipo]}"><span>${icone[a.tipo]}</span><div><strong>${OS.esc(a.titulo)}</strong><br>${a.texto}
      ${a.tipo === 'bloqueio' ? '' : `<div class="alert-actions">${a.acao ? `<button class="btn btn-primary btn-sm" data-ac="${a.acao.fn}" type="button">${OS.esc(a.acao.rotulo)}</button>` : ''}<button class="btn btn-secondary btn-sm" data-ig="${a.id}" type="button">${a.acao ? 'Ignorar' : 'Confirmar mesmo assim'}</button></div>`}</div></div>`).join('');
    const m = OS.modal({ titulo: bloq ? 'Corrija antes de salvar' : 'Antes de salvar', html, botoes: [{ rotulo: 'Voltar e editar', classe: 'btn-secondary', acao: () => OS.fecharModal() }] });
    OS.qsa('[data-ig]', m).forEach((b) => b.addEventListener('click', () => { S.ignorados.add(b.dataset.ig); revisar(); }));
    OS.qsa('[data-ac]', m).forEach((b) => b.addEventListener('click', () => {
      if (b.dataset.ac === 'alta') { S.conduta = 'concluido'; }
      if (b.dataset.ac === 'prev') {
        ['prev_profilaxia', 'prev_fluor'].forEach((id) => { if (!S.procs.some((p) => p.procId === id)) S.procs.push({ procId: id, dente: '' }); });
      }
      S.ignorados.clear(); OS.fecharModal(); desenhar(); revisar();
    }));
  }

  /* ---------- Gravação final e tela de vitória (mostra o impacto nos indicadores!) ---------- */
  function gravar() {
    const r = OS.registrarAtendimento({ pacienteId: S.pac.id, profId: U.id, soap: S.soap, conduta: S.conduta, retornoPrevisto: S.retorno, procedimentos: S.procs, planoNovo: S.planoNovo });
    const calc = OS.calcular({ ine: U.ine, periodo: '12m' });
    const rel = calc.ind.filter((i) => (i.cod === 'B1' && r.atendimento.tipo === 'primeira') || (i.cod === 'B2' && S.conduta === 'concluido') || (i.cod === 'B5' && S.procs.some((p) => (OS.proc(p.procId) || {}).categoria === 'preventivo')) || (i.cod === 'B3' && S.procs.some((p) => (OS.proc(p.procId) || {}).exodontia)) || (i.cod === 'B6' && S.procs.some((p) => (OS.proc(p.procId) || {}).art)));
    $('#bloco-trabalho').hidden = true;
    const f = $('#bloco-final'); f.hidden = false;
    f.innerHTML = `<div class="card"><div class="alert-box alert-success"><span>✅</span><div><strong>Atendimento salvo.</strong> ${OS.esc(S.pac.nome)} foi alocado automaticamente nos indicadores abaixo.</div></div>
      ${rel.map((i) => `<div class="alert-box alert-info"><span>📊</span><div><strong>${i.cod} · ${OS.NIVEL_NOME[i.nivel]}</strong> — ${i.detalhe}<br>${i.msg}</div></div>`).join('')}
      <p style="margin-top:12px"><a class="btn btn-primary" href="atendimento.html">Novo atendimento</a> <a class="btn btn-secondary" href="dashboard.html">Ver dashboard</a></p></div>`;
    f.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- Entrada via URL (?paciente=... vindo de Lembretes/Pacientes ou ?novo=1) ---------- */
  const qp = new URLSearchParams(location.search);
  if (qp.get('novo')) abrirCadastro('');
  else if (qp.get('paciente') && OS.paciente(qp.get('paciente'))) selecionar(OS.paciente(qp.get('paciente')));
})();
