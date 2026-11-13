// ============================================================================
// CONTROLADOR DA LISTA DE PACIENTES
// O "fichário da recepção": permite buscar moradores, filtrar por grupo de risco
// e abrir a linha do tempo de tudo que o paciente já aprontou na cadeira do dentista.
// ============================================================================
(function () {
  const OS = window.OS, U = OS.iniciarPagina('pacientes');
  if (!U) return;
  // Mostra 25 por vez para não transformar o scroll numa maratona de 350 linhas
  const hoje = OS.hoje(), ini = OS.addDias(hoje, -365), PAGINA = 25;
  let limite = PAGINA;

  // Indexa atendimentos dos últimos 12 meses por paciente para consulta instantânea (O(1) no objeto!)
  const meusAts = OS.db.atendimentos.filter((a) => a.ine === U.ine && a.data >= ini);
  const porPac = {};
  meusAts.forEach((a) => (porPac[a.pacienteId] = porPac[a.pacienteId] || []).push(a));
  const lista0 = OS.db.pacientes.filter((p) => p.ine === U.ine);

  OS.qs('#pac-resumo').innerHTML = `Base local: <strong>${lista0.length} cadastrados na UBS/UPA</strong> e <strong>${Object.keys(porPac).length} atendidos em indicadores</strong> (últimos 12 meses).`;

  // Descobre em quais indicadores (B1, B2, B3, B5, B6) esse paciente já marcou gol
  function indicadoresDe(ats) {
    const s = new Set();
    ats.forEach((a) => {
      if (a.tipo === 'primeira') s.add('B1');
      if (a.conduta === 'concluido') s.add('B2');
      a.procedimentos.forEach((p) => {
        const pr = OS.proc(p.procId); if (!pr) return;
        if (pr.categoria === 'preventivo') s.add('B5');
        if (pr.exodontia) s.add('B3');
        if (pr.art) s.add('B6');
      });
    });
    return ['B1', 'B2', 'B3', 'B5', 'B6'].filter((x) => s.has(x));
  }
  const emColetiva = (id) => OS.db.coletivas.some((c) => c.ine === U.ine && c.escovacao && c.data >= ini && c.participantes.includes(id));

  // Monta a linha do tempo cronológica de consultas e escovações escolares do paciente
  function linhaTempo(p) {
    const ev = [];
    (porPac[p.id] || []).slice().sort((a, b) => a.data.localeCompare(b.data)).forEach((a) => {
      if (a.tipo === 'primeira') ev.push([a.data, `Primeira consulta dia ${OS.fmtData(a.data)} (Indicador B1)`, 'Realizada a Primeira Consulta Odontológica Programada.']);
      const nomes = (f) => a.procedimentos.filter((x) => f(OS.proc(x.procId) || {})).map((x) => OS.proc(x.procId).nome).join(', ');
      const prev = nomes((pr) => pr.categoria === 'preventivo'), art = nomes((pr) => pr.art), exo = nomes((pr) => pr.exodontia);
      if (prev) ev.push([a.data, `Procedimento preventivo dia ${OS.fmtData(a.data)} (Indicador B5)`, prev + '.']);
      if (art) ev.push([a.data, `Restauração ART dia ${OS.fmtData(a.data)} (Indicador B6)`, art + '.']);
      if (exo) ev.push([a.data, `Exodontia dia ${OS.fmtData(a.data)} (Indicador B3)`, exo + '.']);
      if (a.conduta === 'concluido') ev.push([a.data, `Tratamento concluído dia ${OS.fmtData(a.data)} (Indicador B2)`, 'Alta Odontológica registrada no desfecho da consulta.']);
    });
    OS.db.coletivas.filter((c) => c.ine === U.ine && c.escovacao && c.participantes.includes(p.id) && c.data >= ini)
      .forEach((c) => ev.push([c.data, `Escovação supervisionada dia ${OS.fmtData(c.data)} (Indicador B4)`, `Ação coletiva em ${c.local}.`]));
    ev.sort((a, b) => a[0].localeCompare(b[0]));
    return ev.length ? `<div class="timeline">${ev.map((e) => `<div class="timeline-item"><div class="timeline-date">${OS.esc(e[1])}</div><div class="timeline-desc">${OS.esc(e[2])}</div></div>`).join('')}</div>` : '';
  }

  // Aplica o texto da busca + o filtro escolhido (todos, com/sem indicador, criança, gestante, diabético)
  function filtrar() {
    const t = OS.qs('#pac-busca').value, f = OS.qs('#pac-filtro').value;
    const l = t ? OS.buscarPacientes(t, U.ine) : lista0;
    return l.filter((p) => {
      const tem = !!porPac[p.id] || emColetiva(p.id);
      if (f === 'com') return tem; if (f === 'sem') return !tem;
      if (f === 'cri') return OS.ehCrianca6a12(p);
      if (f === 'ges') return p.riscos.includes('gestante'); if (f === 'dia') return p.riscos.includes('diabetico');
      return true;
    });
  }

  // Renderiza os acordions (<details>) dos pacientes e controla o botão "Mostrar mais"
  function desenhar() {
    const l = filtrar(), alvo = OS.qs('#pac-lista');
    if (!l.length) { alvo.innerHTML = '<div class="empty">Nenhum paciente encontrado. <a href="atendimento.html?novo=1">Cadastrar novo paciente</a></div>'; OS.qs('#pac-mais').hidden = true; return; }
    alvo.innerHTML = l.slice(0, limite).map((p) => {
      const inds = indicadoresDe(porPac[p.id] || []), b4 = emColetiva(p.id);
      if (b4) inds.push('B4');
      const badge = inds.length ? `<span class="badge badge-otimo">Atendido em Indicadores (${inds.join(', ')})</span>` : '<span class="badge badge-regular">Cadastrado na UBS / UPA (Sem Indicador)</span>';
      const caso = OS.casoAtivo(p.id);
      return `<details class="patient-detail"><summary>
        <div><strong>${OS.esc(p.nome)}</strong> <small>(CPF: ${OS.fmtCPF(p.cpf)}${p.cns ? ' | CNS: ' + OS.esc(p.cns) : ''})</small><br>${OS.tagsRisco(p)}</div>
        <div>${badge}</div></summary>
        <div class="patient-content">
          <p><strong>Idade:</strong> ${OS.idade(p.nascimento)} anos | <strong>Mãe:</strong> ${OS.esc(p.mae || '—')} | <strong>Telefone:</strong> ${OS.esc(p.tel || '—')} | <strong>NIS:</strong> ${OS.esc(p.nis || '—')}</p>
          ${caso ? `<p style="margin-top:8px"><span class="badge badge-bom">Caso ativo</span> retorno previsto: ${OS.fmtData(caso.retornoPrevisto)}</p>` : ''}
          ${inds.length ? '<p style="margin-top:10px;font-weight:bold;color:#0369a1">Datas dos registros nos indicadores:</p>' + linhaTempo(p) : '<p style="margin-top:8px">Sem consultas registradas nos indicadores nos últimos 12 meses.</p>'}
          <p style="margin-top:14px"><a class="btn btn-primary btn-sm" href="atendimento.html?paciente=${encodeURIComponent(p.id)}">Iniciar atendimento</a></p>
        </div></details>`;
    }).join('');
    const mais = OS.qs('#pac-mais'); mais.hidden = l.length <= limite; mais.textContent = `Mostrar mais (${l.length - limite} restantes)`;
  }
  OS.qs('#pac-busca').addEventListener('input', () => { limite = PAGINA; desenhar(); });
  OS.qs('#pac-filtro').addEventListener('change', () => { limite = PAGINA; desenhar(); });
  OS.qs('#pac-mais').addEventListener('click', () => { limite += PAGINA; desenhar(); });
  desenhar();
})();
