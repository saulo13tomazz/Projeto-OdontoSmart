// ============================================================================
// CONTROLADOR DE RELATÓRIOS & BUSCA ATIVA
// Transforma os números dos indicadores em listas acionáveis com nome e telefone
// pra agente comunitária e equipe ligarem buscando quem sumiu (e exporta pro Excel!).
// ============================================================================
(function () {
  const OS = window.OS, U = OS.iniciarPagina('relatorios');
  if (!U) return;
  // LIM = 100 na tela para o navegador não engasgar; o CSV exporta a galera inteira
  const hoje = OS.hoje(), ini = OS.addDias(hoje, -365), LIM = 100;
  let atual = { cab: [], linhas: [] };

  const pacs = OS.db.pacientes.filter((p) => p.ine === U.ine);
  // Monta as colunas fixas de qualquer relatório e joga quem tem marcador de risco pro topo da fila
  const base = (p) => [p.nome, OS.idade(p.nascimento), p.tel || '—', [p.riscos.includes('gestante') ? 'Gestante' : '', p.riscos.includes('diabetico') ? 'Diabético' : ''].filter(Boolean).join(', ') || '—'];
  const prioridade = (p) => (p.riscos.length ? 0 : 1);

  // Dicionário de relatórios: cada chave gera cabeçalho, linhas e dica pro relatório escolhido
  const RELS = {
    b1() {
      const com = new Set(OS.db.atendimentos.filter((a) => a.ine === U.ine && a.tipo === 'primeira' && a.data >= ini).map((a) => a.pacienteId));
      const l = pacs.filter((p) => !com.has(p.id)).sort((a, b) => prioridade(a) - prioridade(b) || a.nome.localeCompare(b.nome));
      return { cab: ['Paciente', 'Idade', 'Telefone', 'Marcadores', 'Situação'], linhas: l.map((p) => base(p).concat(['Sem 1ª consulta programada'])), info: 'Gestantes e diabéticos aparecem primeiro.' };
    },
    b2() {
      const l = OS.db.casos.filter((c) => c.ine === U.ine && c.status === 'ativo');
      return { cab: ['Paciente', 'Idade', 'Telefone', 'Marcadores', 'Itens pendentes'], linhas: l.map((c) => { const p = OS.paciente(c.pacienteId); return base(p).concat([c.plano.filter((i) => i.status === 'planejado').map((i) => ((OS.proc(i.procId) || {}).curto || '') + (i.dente ? ' ' + i.dente : '')).join(', ') || 'Nenhum (pronto para alta)']); }), info: 'Casos ativos: cada alta registrada aproxima o B2 do nível Ótimo.' };
    },
    atraso() {
      const l = OS.db.casos.filter((c) => c.ine === U.ine && c.status === 'ativo' && c.retornoPrevisto && c.retornoPrevisto < hoje).sort((a, b) => a.retornoPrevisto.localeCompare(b.retornoPrevisto));
      return { cab: ['Paciente', 'Idade', 'Telefone', 'Marcadores', 'Retorno previsto'], linhas: l.map((c) => base(OS.paciente(c.pacienteId)).concat([OS.fmtData(c.retornoPrevisto)])), info: 'Ordenado do mais antigo ao mais recente.' };
    },
    b4() {
      const j = OS.periodos['12m'].calc(hoje), ja = new Set();
      OS.db.coletivas.filter((c) => c.ine === U.ine && c.escovacao && c.data >= j.ini).forEach((c) => c.participantes.forEach((id) => ja.add(id)));
      const l = pacs.filter((p) => OS.ehCrianca6a12(p) && !ja.has(p.id)).sort((a, b) => a.nome.localeCompare(b.nome));
      return { cab: ['Criança', 'Idade', 'Telefone', 'Marcadores', 'Mãe / responsável'], linhas: l.map((p) => base(p).concat([p.mae || '—'])), info: 'Use esta lista para organizar a próxima ação do PSE.' };
    }
  };

  // Gera e desenha a tabela conforme o relatório selecionado no combo
  function desenhar() {
    const r = RELS[OS.qs('#r-tipo').value]();
    atual = r;
    OS.qs('#r-info').textContent = `${r.linhas.length} registro(s). ${r.info}${r.linhas.length > LIM ? ` Exibindo os primeiros ${LIM}; o CSV traz a lista completa.` : ''}`;
    OS.qs('#r-tabela').innerHTML = r.linhas.length
      ? `<table class="data-table"><thead><tr>${r.cab.map((c) => `<th>${OS.esc(c)}</th>`).join('')}</tr></thead><tbody>${r.linhas.slice(0, LIM).map((l) => `<tr>${l.map((c) => `<td>${OS.esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
      : '<div class="empty">Nenhuma pendência nesta lista.</div>';
  }
  OS.qs('#r-tipo').addEventListener('change', desenhar);
  // Botão CSV: baixa a planilha inteira e anota no log de auditoria que alguém exportou dados
  OS.qs('#r-csv').addEventListener('click', () => { OS.baixarCSV(`odontosmart-${OS.qs('#r-tipo').value}-${hoje}.csv`, [atual.cab].concat(atual.linhas)); OS.logAcesso('exportar-relatorio'); });
  desenhar();
})();
