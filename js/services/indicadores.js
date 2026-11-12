/* ===== Motor de indicadores B1 a B6 =====
   Tudo é calculado a partir dos registros: dashboard, lembretes e alertas usam a mesma função. */
(function () {
  const OS = window.OS;

  OS.periodos = {
    '12m': { nome: 'Últimos 12 meses', calc: (h) => ({ ini: OS.addDias(h, -365), fim: h }) },
    quad: { nome: 'Quadrimestre atual', calc: (h) => { const [y, m] = h.split('-').map(Number); const q = Math.floor((m - 1) / 4); return { ini: `${y}-${String(q * 4 + 1).padStart(2, '0')}-01`, fim: h }; } },
    ano: { nome: 'Ano civil atual', calc: (h) => ({ ini: h.slice(0, 4) + '-01-01', fim: h }) }
  };

  OS.nivelDe = (m, pct) => {
    if (m.tipo === 'min') return pct >= m.otimo ? 'otimo' : pct >= m.bom ? 'bom' : pct >= m.suficiente ? 'suficiente' : 'regular';
    if (m.tipo === 'max') return pct <= m.otimo ? 'otimo' : pct <= m.bom ? 'bom' : pct <= m.suficiente ? 'suficiente' : 'regular';
    if (m.tipo === 'faixa') {
      if (pct >= m.otimoMin && pct <= m.otimoMax) return 'otimo';
      if (pct < m.otimoMin) return pct >= m.bomMin ? 'bom' : pct >= m.sufMin ? 'suficiente' : 'regular';
      return pct <= m.bomMax ? 'bom' : pct <= m.sufMax ? 'suficiente' : 'regular';
    }
    return null;
  };
  OS.NIVEL_NOME = { otimo: 'Ótimo', bom: 'Bom', suficiente: 'Suficiente', regular: 'Regular', semdados: 'Sem dados', info: 'Acompanhamento' };
  const COR = { otimo: 'bg-green', bom: 'bg-blue', suficiente: 'bg-amber', regular: 'bg-red', semdados: 'bg-gray', info: 'bg-blue' };
  const ceilN = (x) => Math.ceil(x - 1e-9);
  const floorN = (x) => Math.floor(x + 1e-9);

  /* opts: {ine, periodo, profId?, ref?} */
  OS.calcular = (opts) => {
    const db = OS.db, hoje = opts.ref || OS.hoje(), ine = opts.ine;
    const j = OS.periodos[opts.periodo || '12m'].calc(hoje);
    const info = OS.ineInfo(ine), M = db.config.metas;
    const ats = db.atendimentos.filter((a) => a.ine === ine && a.data >= j.ini && a.data <= j.fim && (!opts.profId || a.profId === opts.profId));

    const b1 = new Set(ats.filter((a) => a.tipo === 'primeira').map((a) => a.pacienteId));
    const b2 = new Set(ats.filter((a) => a.conduta === 'concluido' && b1.has(a.pacienteId)).map((a) => a.pacienteId));
    const T = { tot: 0, prev: 0, rest: 0, art: 0, exo: 0 };
    ats.forEach((a) => a.procedimentos.forEach((p) => {
      const pr = OS.proc(p.procId); if (!pr) return;
      T.tot++;
      if (pr.categoria === 'preventivo') T.prev++;
      if (pr.categoria === 'restaurador') { T.rest++; if (pr.art) T.art++; }
      if (pr.exodontia) T.exo++;
    }));
    const criancas = db.pacientes.filter((p) => p.ine === ine && OS.ehCrianca6a12(p, hoje));
    const idsCri = new Set(criancas.map((p) => p.id)), b4 = new Set();
    db.coletivas.filter((c) => c.ine === ine && c.escovacao && c.data >= j.ini && c.data <= j.fim && (!opts.profId || c.profId === opts.profId))
      .forEach((c) => c.participantes.forEach((id) => { if (idsCri.has(id)) b4.add(id); }));
    const casosAtivos = db.casos.filter((c) => c.ine === ine && c.status === 'ativo').length;

    const pct = (n, d) => (d > 0 ? (n / d) * 100 : 0);
    const mk = (cod, nome, num, den, extra) => {
      const m = M[cod], p = pct(num, den);
      let nivel = den === 0 ? 'semdados' : m.tipo === 'info' ? 'info' : OS.nivelDe(m, p);
      return Object.assign({ cod, nome, num, den, pct: p, nivel, cor: COR[nivel], meta: m }, extra);
    };
    const R = [];

    // B1
    { const alvo = ceilN((M.B1.otimo * info.populacaoVinculada) / 100), f = Math.max(0, alvo - b1.size);
      R.push(mk('B1', '1ª Consulta Odontológica Programada', b1.size, info.populacaoVinculada, {
        detalhe: `Atendidos: <strong>${b1.size} / ${info.populacaoVinculada}</strong> (${OS.fmtPct(pct(b1.size, info.populacaoVinculada))})`,
        metaTxt: `Meta Ótimo: ≥ ${OS.fmtPct(M.B1.otimo)} (${alvo})`, faltam: f, alvo, unidade: 'atendimento(s)', prog: (b1.size / alvo) * 100,
        msg: f > 0 ? `🎯 <strong>FALTAM ${f} ATENDIMENTO${f > 1 ? 'S' : ''}</strong> para alcançar a classificação ÓTIMO (${alvo} atendimentos).` : `✅ <strong>NÍVEL ÓTIMO ALCANÇADO!</strong> Meta de ${alvo} atendimentos cumprida.` })); }
    // B2
    { const alvo = ceilN((M.B2.otimo * b1.size) / 100), f = Math.max(0, alvo - b2.size);
      R.push(mk('B2', 'Tratamento Concluído (Alta)', b2.size, b1.size, {
        detalhe: `Altas: <strong>${b2.size} / ${b1.size} B1</strong> (${OS.fmtPct(pct(b2.size, b1.size))})`,
        metaTxt: `Meta Ótimo: ≥ ${OS.fmtPct(M.B2.otimo)}`, faltam: f, alvo, unidade: 'alta(s)', prog: alvo ? (b2.size / alvo) * 100 : 0, casosAtivos,
        msg: f > 0 ? `🎯 <strong>FALTAM ${f} ALTA${f > 1 ? 'S' : ''} CLÍNICA${f > 1 ? 'S' : ''}</strong> de pacientes em andamento para atingir o nível ÓTIMO (${OS.fmtPct(M.B2.otimo)}).` + (f > casosAtivos ? ` Só há ${casosAtivos} caso(s) ativo(s): será preciso novas 1ªs consultas.` : '') : `✅ <strong>NÍVEL ÓTIMO ALCANÇADO!</strong> Mantenha a resolutividade acima de ${OS.fmtPct(M.B2.otimo)}.` })); }
    // B3 (quanto menor, melhor)
    { const lim = floorN((M.B3.otimo * T.tot) / 100), margem = lim - T.exo, pc = pct(T.exo, T.tot);
      const x = T.exo ? Math.max(0, ceilN(T.exo / (M.B3.otimo / 100)) - T.tot) : 0;
      R.push(mk('B3', 'Taxa de Exodontia (Mutilação)', T.exo, T.tot, {
        detalhe: `Exodontias: <strong>${T.exo} em ${T.tot} proc.</strong> (${OS.fmtPct(pc)})`,
        metaTxt: `Limite Ótimo: ≤ ${OS.fmtPct(M.B3.otimo)}`, faltam: 0, limite: lim, margem, prog: Math.min(100, (pc / M.B3.otimo) * 100),
        msg: pc <= M.B3.otimo ? `✅ <strong>NÍVEL ÓTIMO ALCANÇADO!</strong> Mantenha a taxa abaixo de ${OS.fmtPct(M.B3.otimo)} (máximo de ${lim} exodontias neste total; margem de ${Math.max(0, margem)}).` : `⚠️ <strong>TAXA ACIMA DO LIMITE ÓTIMO.</strong> Priorize alternativas conservadoras (são ~${x} procedimentos não cirúrgicos para voltar ao limite).` })); }
    // B4
    { const alvo = ceilN((M.B4.otimo * criancas.length) / 100), f = Math.max(0, alvo - b4.size);
      R.push(mk('B4', 'Escovação Supervisionada (6-12 anos)', b4.size, criancas.length, {
        detalhe: `Participantes: <strong>${b4.size} / ${criancas.length}</strong> (${OS.fmtPct(pct(b4.size, criancas.length))})`,
        metaTxt: `Meta Ótimo: ${OS.fmtPct(M.B4.otimo)}`, faltam: f, alvo, unidade: 'criança(s)', prog: alvo ? (b4.size / alvo) * 100 : 0,
        msg: f > 0 ? `🎯 <strong>FALTAM ${f} CRIANÇA${f > 1 ? 'S' : ''}</strong> em ações coletivas (PSE) para alcançar a meta ÓTIMO (${OS.fmtPct(M.B4.otimo)}).` : `✅ <strong>META ÓTIMO ALCANÇADA!</strong> Todas as crianças vinculadas participaram.` })); }
    // B5 (faixa)
    { const pc = pct(T.prev, T.tot), om = M.B5.otimoMin / 100;
      const x = pc < M.B5.otimoMin ? Math.max(1, ceilN((om * T.tot - T.prev) / (1 - om))) : 0;
      R.push(mk('B5', 'Procedimentos Preventivos', T.prev, T.tot, {
        detalhe: `Preventivos: <strong>${T.prev} em ${T.tot}</strong> (${OS.fmtPct(pc)})`,
        metaTxt: `Faixa Ótimo: ${M.B5.otimoMin}% a ${M.B5.otimoMax}%`, faltam: x, unidade: 'procedimento(s) preventivo(s)', prog: pc,
        msg: pc < M.B5.otimoMin ? `🎯 <strong>FALTAM ${x} PROCEDIMENTO${x > 1 ? 'S' : ''} PREVENTIVO${x > 1 ? 'S' : ''}</strong> para entrar na faixa ÓTIMA (≥ ${M.B5.otimoMin}%).` : pc > M.B5.otimoMax ? `ℹ️ <strong>ACIMA DA FAIXA ÓTIMA (${OS.fmtPct(pc)}).</strong> Garanta também os procedimentos curativos necessários.` : `✅ <strong>DENTRO DA FAIXA ÓTIMA (${OS.fmtPct(pc)})!</strong> Excelente proporção de prevenção.` })); }
    // B6 (acompanhamento)
    R.push(mk('B6', 'Restauração Atraumática (ART)', T.art, T.rest, {
      detalhe: `ARTs: <strong>${T.art} em ${T.rest} rest.</strong> (${OS.fmtPct(pct(T.art, T.rest))})`,
      metaTxt: 'Meta: crescimento (sem faixa fixa)', faltam: 0, prog: pct(T.art, T.rest),
      msg: 'ℹ️ <strong>EXCLUSIVO CIRURGIÃO-DENTISTA:</strong> mantenha a preferência por ART em gestantes e crianças.' }));

    // pontuação ponderada (só indicadores com meta e com dados)
    let soma = 0, pesos = 0;
    R.forEach((r) => { if (['otimo', 'bom', 'suficiente', 'regular'].includes(r.nivel)) { soma += M[r.cod].peso * db.config.pontos[r.nivel]; pesos += M[r.cod].peso; } });
    return { ind: R, totais: T, janela: j, populacao: info.populacaoVinculada, criancas: criancas.length, casosAtivos, pontuacao: pesos ? soma / pesos : null };
  };
})();
