/* ===== Página de detalhes de um indicador (B1 a B6) ===== */
(function () {
  const OS = window.OS, U = OS.iniciarPagina('dashboard');
  if (!U) return;

  const FICHA = {
    B1: {
      numerador: 'Cidadãos com 1ª Consulta Odontológica Programada registrada no período (1 vez a cada 12 meses por pessoa).',
      denominador: 'População total vinculada à equipe de Saúde Bucal (INE).',
      regra: 'Contabilizado automaticamente ao abrir um novo plano de tratamento no atendimento para paciente sem 1ª consulta nos últimos 12 meses.',
      cbo: 'Cirurgião-Dentista',
      dica: 'Priorize gestantes, diabéticos e cidadãos sem consulta recente na lista de Busca Ativa.',
      acao: { rotulo: '+ Iniciar Atendimento', href: 'atendimento.html' },
      acaoSec: { rotulo: 'Lista de Busca Ativa (B1)', href: 'relatorios.html' }
    },
    B2: {
      numerador: 'Pacientes com 1ª consulta programada (B1) no período que tiveram o tratamento concluído (Alta Odontológica).',
      denominador: 'Total de pacientes com 1ª consulta odontológica programada (B1) no mesmo período.',
      regra: 'Apurado quando o desfecho/conduta do atendimento é marcado como "Tratamento concluído (Alta Odontológica)".',
      cbo: 'Cirurgião-Dentista',
      dica: 'Acompanhe os casos clínicos ativos com poucos itens pendentes e convoque os retornos para concluir os planos abertos.',
      acao: { rotulo: 'Ver Casos Ativos em Lembretes', href: 'lembretes.html' },
      acaoSec: { rotulo: 'Ir para Atendimento', href: 'atendimento.html' }
    },
    B3: {
      numerador: 'Total de exodontias (extrações de dentes permanentes ou decíduos) realizadas no período.',
      denominador: 'Total de procedimentos clínicos individuais realizados no período.',
      regra: 'Indicador de polaridade inversa (quanto menor a taxa, melhor). Taxas elevadas apontam perfil mutilador.',
      cbo: 'Exclusivo Cirurgião-Dentista',
      dica: 'Priorize tratamentos conservadores, restaurações (incluindo ART) e ações preventivas para manter a proporção abaixo do limite Ótimo.',
      acao: { rotulo: '+ Iniciar Atendimento', href: 'atendimento.html' }
    },
    B4: {
      numerador: 'Crianças de 6 a 12 anos vinculadas ao INE que participaram de ao menos 1 ação coletiva de escovação supervisionada no período.',
      denominador: 'Total de crianças de 6 a 12 anos cadastradas e vinculadas à equipe (INE).',
      regra: 'Registrado no módulo de Ação Coletiva (PSE). Se a mesma criança participar mais de uma vez no período, é contada apenas 1 vez.',
      cbo: 'Cirurgião-Dentista e TSB',
      dica: 'Organize mutirões nas escolas do território (PSE) com apoio do TSB e exporte a lista de crianças pendentes em Relatórios.',
      acao: { rotulo: '+ Registrar Ação Coletiva (PSE)', href: 'acao-coletiva.html' },
      acaoSec: { rotulo: 'Crianças pendentes (B4)', href: 'relatorios.html' }
    },
    B5: {
      numerador: 'Procedimentos preventivos individuais (flúor, profilaxia, orientação de higiene, selante, evidenciação de placa e cariostático).',
      denominador: 'Total de procedimentos clínicos individuais realizados no período.',
      regra: 'Avaliado por faixa: busca-se equilíbrio entre prevenção (65% a 85%) e garantia de procedimentos curativos/restauradores.',
      cbo: 'Cirurgião-Dentista e TSB',
      dica: 'Inclua orientação de higiene, profilaxia e aplicação tópica de flúor nas consultas de rotina e conte com a produção do TSB.',
      acao: { rotulo: '+ Iniciar Atendimento', href: 'atendimento.html' }
    },
    B6: {
      numerador: 'Restaurações Atraumáticas (ART) realizadas no período.',
      denominador: 'Total de procedimentos restauradores (ART + resina composta) realizados no período.',
      regra: 'Indicador de acompanhamento contínuo da resolutividade restauradora minimamente invasiva. Procedimento privativo do Cirurgião-Dentista.',
      cbo: 'Exclusivo Cirurgião-Dentista',
      dica: 'Dê preferência à técnica ART especialmente em crianças, gestantes e atendimentos de maior vulnerabilidade.',
      acao: { rotulo: '+ Iniciar Atendimento', href: 'atendimento.html' }
    }
  };

  const per = OS.qs('#f-periodo'), prof = OS.qs('#f-prof');
  per.innerHTML = Object.entries(OS.periodos).map(([k, v]) => `<option value="${k}">${v.nome}</option>`).join('');
  prof.innerHTML = '<option value="">Toda a equipe (INE)</option>' + OS.db.profissionais.filter((p) => p.ine === U.ine)
    .map((p) => `<option value="${p.id}">${OS.esc(p.nome)} (${p.cbo})</option>`).join('');

  const qp = new URLSearchParams(location.search);
  let codAtual = (qp.get('cod') || 'B1').toUpperCase();
  if (!FICHA[codAtual]) codAtual = 'B1';
  if (qp.get('periodo') && OS.periodos[qp.get('periodo')]) per.value = qp.get('periodo');
  if (qp.get('prof')) prof.value = qp.get('prof');

  function reguaConceitos(ind) {
    const m = ind.meta, P = OS.db.config.pontos;
    if (m.tipo === 'info') {
      return `<div class="alert-box alert-info" style="margin:0"><span>ℹ️</span><div>Este indicador é de <strong>acompanhamento contínuo</strong> e não possui faixas fixas de corte (Ótimo/Bom/Suficiente/Regular). Peso configurado: <strong>${m.peso}</strong>.</div></div>`;
    }
    const faixas = m.tipo === 'min'
      ? [
          ['otimo', `≥ ${OS.fmtPct(m.otimo)}`, P.otimo],
          ['bom', `de ${OS.fmtPct(m.bom)} a < ${OS.fmtPct(m.otimo)}`, P.bom],
          ['suficiente', `de ${OS.fmtPct(m.suficiente)} a < ${OS.fmtPct(m.bom)}`, P.suficiente],
          ['regular', `< ${OS.fmtPct(m.suficiente)}`, P.regular]
        ]
      : m.tipo === 'max'
      ? [
          ['otimo', `≤ ${OS.fmtPct(m.otimo)}`, P.otimo],
          ['bom', `> ${OS.fmtPct(m.otimo)} até ${OS.fmtPct(m.bom)}`, P.bom],
          ['suficiente', `> ${OS.fmtPct(m.bom)} até ${OS.fmtPct(m.suficiente)}`, P.suficiente],
          ['regular', `> ${OS.fmtPct(m.suficiente)}`, P.regular]
        ]
      : [
          ['otimo', `${m.otimoMin}% a ${m.otimoMax}%`, P.otimo],
          ['bom', `${m.bomMin}% a < ${m.otimoMin}% ou > ${m.otimoMax}% a ${m.bomMax}%`, P.bom],
          ['suficiente', `${m.sufMin}% a < ${m.bomMin}% ou > ${m.bomMax}% a ${m.sufMax}%`, P.suficiente],
          ['regular', `< ${m.sufMin}%`, P.regular]
        ];
    return `<div class="table-scroll"><table class="data-table" style="margin-top:0">
      <thead><tr><th>Conceito</th><th>Faixa de referência</th><th>Pontos</th><th>Status</th></tr></thead>
      <tbody>${faixas.map(([nv, txt, pt]) => `<tr class="${ind.nivel === nv ? 'row-current' : ''}">
        <td>${OS.badge(nv)}</td>
        <td><strong>${txt}</strong></td>
        <td>${OS.fmtDec(pt)} pt</td>
        <td>${ind.nivel === nv ? '<strong style="color:var(--brand-700)">● Nível atual</strong>' : '—'}</td>
      </tr>`).join('')}</tbody>
    </table></div>
    <p style="font-size:12px;color:var(--ink-500);margin-top:10px">Peso deste indicador na média da equipe: <strong>${m.peso}</strong> (ajustável em <a href="configuracoes.html">Configurações</a>).</p>`;
  }

  function registrosDoIndicador(cod, j) {
    const ats = OS.db.atendimentos.filter((a) => a.ine === U.ine && a.data >= j.ini && a.data <= j.fim && (!prof.value || a.profId === prof.value))
      .sort((a, b) => b.data.localeCompare(a.data));

    if (cod === 'B1') {
      const prims = ats.filter((a) => a.tipo === 'primeira');
      return `<div class="card"><div class="card-header"><span>Pacientes com 1ª Consulta Programada no período (${prims.length})</span><a class="btn btn-secondary btn-sm" href="relatorios.html">Ver quem ainda falta (Busca Ativa)</a></div>` +
        (prims.length ? `<div class="table-scroll"><table class="data-table"><thead><tr><th>Data</th><th>Paciente</th><th>Idade / Marcadores</th><th>Profissional</th><th>Situação do Caso</th><th></th></tr></thead><tbody>` +
          prims.slice(0, 40).map((a) => {
            const p = OS.paciente(a.pacienteId) || { nome: '—', nascimento: OS.hoje(), riscos: [] };
            const caso = OS.db.casos.find((c) => c.id === a.casoId);
            const st = caso && caso.status === 'concluido' ? '<span class="badge badge-otimo">Alta concluída (B2)</span>' : '<span class="badge badge-bom">Em tratamento</span>';
            return `<tr><td>${OS.fmtData(a.data)}</td><td><strong>${OS.esc(p.nome)}</strong></td><td>${OS.idade(p.nascimento)} anos ${OS.tagsRisco(p)}</td><td>${OS.esc((OS.profissional(a.profId) || {}).nome || '—')}</td><td>${st}</td><td><a class="btn btn-secondary btn-sm" href="atendimento.html?paciente=${encodeURIComponent(p.id)}">Prontuário</a></td></tr>`;
          }).join('') + `</tbody></table></div>` : '<div class="empty">Nenhuma 1ª consulta registrada neste filtro.</div>') + `</div>`;
    }

    if (cod === 'B2') {
      const ativos = OS.db.casos.filter((c) => c.ine === U.ine && c.status === 'ativo');
      const altas = ats.filter((a) => a.conduta === 'concluido');
      return `<div class="card"><div class="card-header"><span>Casos ativos aguardando Alta Odontológica (${ativos.length})</span><span style="font-size:12px;color:var(--ink-500)">Concluir estes casos eleva diretamente o B2</span></div>` +
        (ativos.length ? `<div class="table-scroll"><table class="data-table"><thead><tr><th>Paciente</th><th>Abertura</th><th>Retorno previsto</th><th>Pendências no plano</th><th></th></tr></thead><tbody>` +
          ativos.map((c) => {
            const p = OS.paciente(c.pacienteId) || { nome: '—', riscos: [] };
            const pend = c.plano.filter((i) => i.status === 'planejado').map((i) => ((OS.proc(i.procId) || {}).curto || '') + (i.dente ? ' ' + i.dente : '')).join(', ') || 'Pronto para alta';
            return `<tr><td><strong>${OS.esc(p.nome)}</strong> ${OS.tagsRisco(p)}</td><td>${OS.fmtData(c.abertura)}</td><td>${OS.fmtData(c.retornoPrevisto)}</td><td>${OS.esc(pend)}</td><td><a class="btn btn-primary btn-sm" href="atendimento.html?paciente=${encodeURIComponent(p.id)}">Atender / Dar alta</a></td></tr>`;
          }).join('') + `</tbody></table></div>` : '<div class="empty">Nenhum caso ativo pendente no momento.</div>') +
        `</div><div class="card"><div class="card-header"><span>Altas Odontológicas concluídas no período (${altas.length})</span></div>` +
        (altas.length ? `<div class="table-scroll"><table class="data-table"><thead><tr><th>Data da Alta</th><th>Paciente</th><th>Profissional</th></tr></thead><tbody>` +
          altas.slice(0, 30).map((a) => {
            const p = OS.paciente(a.pacienteId) || { nome: '—' };
            return `<tr><td>${OS.fmtData(a.data)}</td><td><strong>${OS.esc(p.nome)}</strong></td><td>${OS.esc((OS.profissional(a.profId) || {}).nome || '—')}</td></tr>`;
          }).join('') + `</tbody></table></div>` : '<div class="empty">Nenhuma alta registrada no período selecionado.</div>') + `</div>`;
    }

    if (cod === 'B3') {
      const exos = [];
      ats.forEach((a) => a.procedimentos.forEach((pr) => { const info = OS.proc(pr.procId); if (info && info.exodontia) exos.push({ a, pr, info }); }));
      return `<div class="card"><div class="card-header"><span>Exodontias registradas no período (${exos.length})</span></div>` +
        (exos.length ? `<div class="table-scroll"><table class="data-table"><thead><tr><th>Data</th><th>Paciente</th><th>Procedimento</th><th>Dente</th><th>Profissional</th></tr></thead><tbody>` +
          exos.map(({ a, pr, info }) => {
            const p = OS.paciente(a.pacienteId) || { nome: '—' };
            return `<tr><td>${OS.fmtData(a.data)}</td><td><strong>${OS.esc(p.nome)}</strong></td><td>${OS.esc(info.nome)}</td><td>${OS.esc(pr.dente || '—')}</td><td>${OS.esc((OS.profissional(a.profId) || {}).nome || '—')}</td></tr>`;
          }).join('') + `</tbody></table></div>` : '<div class="empty">Nenhuma exodontia registrada no período — ótimo controle conservador!</div>') + `</div>`;
    }

    if (cod === 'B4') {
      const cols = OS.db.coletivas.filter((c) => c.ine === U.ine && c.escovacao && c.data >= j.ini && c.data <= j.fim && (!prof.value || c.profId === prof.value))
        .sort((a, b) => b.data.localeCompare(a.data));
      return `<div class="card"><div class="card-header"><span>Ações Coletivas de Escovação Supervisionada no período (${cols.length})</span><a class="btn btn-primary btn-sm" href="acao-coletiva.html">+ Nova Ação Coletiva</a></div>` +
        (cols.length ? `<div class="table-scroll"><table class="data-table"><thead><tr><th>Data</th><th>Local (Escola / Creche)</th><th>Crianças participantes</th><th>Profissional responsável</th></tr></thead><tbody>` +
          cols.map((c) => `<tr><td>${OS.fmtData(c.data)}</td><td><strong>${OS.esc(c.local)}</strong></td><td>${c.participantes.length} criança(s)</td><td>${OS.esc((OS.profissional(c.profId) || {}).nome || '—')}</td></tr>`).join('') +
          `</tbody></table></div>` : '<div class="empty">Nenhuma ação coletiva registrada no período.</div>') + `</div>`;
    }

    if (cod === 'B5') {
      const contagem = {};
      OS.db.procedimentos.filter((p) => p.categoria === 'preventivo').forEach((p) => { contagem[p.id] = { nome: p.nome, sigtap: p.sigtap, qtd: 0 }; });
      ats.forEach((a) => a.procedimentos.forEach((p) => { if (contagem[p.procId]) contagem[p.procId].qtd++; }));
      const linhas = Object.values(contagem).sort((a, b) => b.qtd - a.qtd);
      return `<div class="card"><div class="card-header"><span>Distribuição dos Procedimentos Preventivos no período</span></div>
        <div class="table-scroll"><table class="data-table"><thead><tr><th>Procedimento Preventivo</th><th>Código SIGTAP</th><th>Quantidade realizada</th></tr></thead><tbody>` +
        linhas.map((l) => `<tr><td><strong>${OS.esc(l.nome)}</strong></td><td>${OS.esc(l.sigtap || '—')}</td><td><strong>${l.qtd}</strong></td></tr>`).join('') +
        `</tbody></table></div></div>`;
    }

    // B6
    const arts = [];
    let restConv = 0;
    ats.forEach((a) => a.procedimentos.forEach((pr) => {
      const info = OS.proc(pr.procId);
      if (info && info.categoria === 'restaurador') {
        if (info.art) arts.push({ a, pr, info });
        else restConv++;
      }
    }));
    return `<div class="card"><div class="card-header"><span>Restaurações Atraumáticas (ART) no período (${arts.length} ART vs ${restConv} convencionais)</span></div>` +
      (arts.length ? `<div class="table-scroll"><table class="data-table"><thead><tr><th>Data</th><th>Paciente</th><th>Dente</th><th>Profissional</th></tr></thead><tbody>` +
        arts.map(({ a, pr }) => {
          const p = OS.paciente(a.pacienteId) || { nome: '—', riscos: [] };
          return `<tr><td>${OS.fmtData(a.data)}</td><td><strong>${OS.esc(p.nome)}</strong> ${OS.tagsRisco(p)}</td><td>${OS.esc(pr.dente || '—')}</td><td>${OS.esc((OS.profissional(a.profId) || {}).nome || '—')}</td></tr>`;
        }).join('') + `</tbody></table></div>` : '<div class="empty">Nenhuma restauração ART registrada no período.</div>') + `</div>`;
  }

  function desenhar() {
    const r = OS.calcular({ ine: U.ine, periodo: per.value, profId: prof.value });
    const ind = r.ind.find((x) => x.cod === codAtual) || r.ind[0];
    const f = FICHA[ind.cod];
    const qsFiltro = new URLSearchParams({ periodo: per.value, ...(prof.value ? { prof: prof.value } : {}) }).toString();

    OS.qs('#btn-voltar').href = `dashboard.html?${qsFiltro}`;

    // Abas rápidas B1..B6
    OS.qs('#ind-tabs').innerHTML = r.ind.map((i) => `<button type="button" class="ind-tab ${i.cod === ind.cod ? 'active' : ''}" data-cod="${i.cod}">
      <strong>${i.cod}</strong><span>${OS.fmtPct(i.pct)}</span>
    </button>`).join('');
    OS.qsa('.ind-tab', OS.qs('#ind-tabs')).forEach((b) => b.addEventListener('click', () => {
      codAtual = b.dataset.cod;
      history.replaceState(null, '', `indicador.html?cod=${codAtual}&${qsFiltro}`);
      desenhar();
    }));

    const cls = ind.nivel === 'otimo' ? 'ok' : ind.nivel === 'suficiente' || ind.nivel === 'regular' ? 'warn' : '';
    const msg = ind.nivel === 'semdados' ? 'Sem dados registrados neste período para este indicador.' : ind.msg;

    OS.qs('#ind-hero').innerHTML = `<div class="card detail-hero">
      <div class="detail-hero-top">
        <div>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px">
            <span class="indicator-code" style="font-size:13px;padding:5px 12px">Indicador ${ind.cod}</span>
            ${OS.badge(ind.nivel)}
            <span class="chip muted" style="margin:0">Habilitação: ${OS.esc(f.cbo)}</span>
          </div>
          <h2 class="page-title" style="margin-bottom:4px">${OS.esc(ind.nome)}</h2>
          <p style="color:var(--ink-500);font-size:13.5px">Janela: ${OS.fmtData(r.janela.ini)} a ${OS.fmtData(r.janela.fim)} · Equipe ${OS.esc(OS.ineInfo(U.ine).equipe)}</p>
        </div>
        <div class="detail-hero-number">
          <div class="detail-big-pct">${ind.den === 0 ? '—' : OS.fmtPct(ind.pct)}</div>
          <div class="detail-fraction">${ind.detalhe}</div>
          <div class="detail-meta">${OS.esc(ind.metaTxt)}</div>
        </div>
      </div>

      <div class="progress-container" style="height:12px;margin:18px 0 12px" role="progressbar" aria-valuenow="${Math.round(Math.min(100, ind.prog))}" aria-valuemin="0" aria-valuemax="100">
        <div class="progress-bar ${ind.cor}" style="width:${Math.max(0, Math.min(100, ind.prog))}%"></div>
      </div>

      <div class="goal-banner ${cls}" style="font-size:13.5px;padding:14px 16px">${msg}</div>

      <div class="detail-actions">
        <a class="btn btn-primary" href="${f.acao.href}">${OS.esc(f.acao.rotulo)}</a>
        ${f.acaoSec ? `<a class="btn btn-secondary" href="${f.acaoSec.href}">${OS.esc(f.acaoSec.rotulo)}</a>` : ''}
      </div>
    </div>`;

    OS.qs('#ind-info').innerHTML = `
      <div class="card">
        <div class="card-header"><span>1. Régua de Conceitos e Metas (NT nº 30/2025)</span></div>
        ${reguaConceitos(ind)}
      </div>
      <div class="card">
        <div class="card-header"><span>2. Como este indicador é calculado</span></div>
        <div class="formula-list">
          <div><strong>Numerador (o que soma)</strong><p>${OS.esc(f.numerador)}</p></div>
          <div><strong>Denominador (base de cálculo)</strong><p>${OS.esc(f.denominador)}</p></div>
          <div><strong>Regra no OdontoSmart</strong><p>${OS.esc(f.regra)}</p></div>
          <div class="alert-box alert-info" style="margin:4px 0 0"><span>💡</span><div><strong>Recomendação prática:</strong> ${OS.esc(f.dica)}</div></div>
        </div>
      </div>`;

    OS.qs('#ind-registros').innerHTML = registrosDoIndicador(ind.cod, r.janela);
  }

  per.addEventListener('change', desenhar);
  prof.addEventListener('change', desenhar);
  desenhar();
})();
