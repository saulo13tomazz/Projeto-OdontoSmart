/* ===== Motor de alertas do atendimento =====
   O "grilo falante" do consultório: avisa em tempo real se faltou prevenção,
   se já dá pra dar alta ou se o TSB tentou pegar o fórceps sem autorização!
   Retorna bloqueios (impedem salvar), sugestões e avisos (o dentista decide). */
(function () {
  const OS = window.OS;

  /* Analisa o que está sendo lançado no atendimento antes de salvar.
     ctx: {paciente, caso, prof, procs:[{procId,dente,itemId?}], conduta, ignorados:Set} */
  OS.avaliarAtendimento = (ctx) => {
    const out = [], M = OS.db.config.metas, hoje = OS.hoje();
    const nome = (id) => (OS.proc(id) || {}).nome || id;

    // 1) Travas de CBO — barra na hora se o perfil não puder assinar aquele procedimento
    const proibidos = ctx.procs.filter((p) => !OS.podeLancar(ctx.prof.cbo, p.procId));
    if (proibidos.length) {
      out.push({ id: 'cbo', tipo: 'bloqueio', titulo: 'Lançamento não permitido para o perfil TSB',
        texto: `Os procedimentos a seguir são exclusivos do Cirurgião-Dentista (ART/B6 e exodontia/B3): <strong>${proibidos.map((p) => OS.esc(nome(p.procId))).join(', ')}</strong>. Remova-os ou entre com o perfil de Dentista.` });
    }

    // 2) Alta odontológica (B2): zerou a listinha do plano? Bora comemorar dando alta!
    if (ctx.conduta !== 'concluido') {
      const itens = ctx.caso ? ctx.caso.plano : [];
      const feitosHoje = new Set(ctx.procs.map((p) => p.itemId).filter(Boolean));
      const pend = itens.filter((i) => i.status === 'planejado' && !feitosHoje.has(i.id));
      if (itens.length &&  pend.length === 0) {
        const b2 = OS.calcular({ ine: ctx.prof.ine, periodo: '12m' }).ind[1];
        const txt = b2.faltam > 0
          ? `Todos os itens do plano foram tratados. Deseja dar a <strong>Alta Odontológica (B2)</strong>? Faltam apenas <strong>${b2.faltam} paciente${b2.faltam > 1 ? 's' : ''}</strong> para sua equipe atingir o nível Ótimo neste indicador (este paciente é um deles).`
          : `Todos os itens do plano foram tratados. Deseja dar a <strong>Alta Odontológica (B2)</strong>? Sua equipe já está no nível Ótimo; a alta ajuda a mantê-lo.`;
        out.push({ id: 'alta', tipo: 'sugestao', titulo: 'Sugestão de alta odontológica', texto: txt, acao: { rotulo: 'Dar alta (B2)', fn: 'alta' } });
      }
    } else if (ctx.caso) {
      // O dentista marcou "concluído", mas ainda sobrou dente pendente no plano — vale checar!
      const feitosHoje = new Set(ctx.procs.map((p) => p.itemId).filter(Boolean));
      const pend = ctx.caso.plano.filter((i) => i.status === 'planejado' && !feitosHoje.has(i.id));
      if (pend.length) {
        out.push({ id: 'pendencias', tipo: 'aviso', titulo: 'Plano com itens pendentes',
          texto: `Há ${pend.length} item(ns) do plano ainda não realizado(s): ${pend.map((i) => `${OS.esc((OS.proc(i.procId) || {}).curto)}${i.dente ? ' ' + OS.esc(i.dente) : ''}`).join(', ')}. Concluir o tratamento mesmo assim?` });
      }
    }

    // 3) Prevenção para crianças (B5) — baixinho de até 12 anos merece pelo menos um flúorzinho!
    const idade = OS.idade(ctx.paciente.nascimento);
    const temPrev = ctx.procs.some((p) => (OS.proc(p.procId) || {}).categoria === 'preventivo');
    if (idade <= 12 && !temPrev) {
      out.push({ id: 'prev', tipo: 'sugestao', titulo: 'Ação preventiva',
        texto: `Paciente de <strong>${idade} anos</strong> sem procedimento preventivo hoje. Deseja incluir <strong>profilaxia e flúor</strong> (B5)?`, acao: { rotulo: 'Incluir profilaxia e flúor', fn: 'prev' } });
    }

    // 4) Impacto da exodontia no B3 — lembra com carinho antes de transformar a boca em banguela
    const exo = ctx.procs.filter((p) => (OS.proc(p.procId) || {}).exodontia).length;
    if (exo && ctx.prof.cbo === 'CD') {
      const r = OS.calcular({ ine: ctx.prof.ine, periodo: '12m' }), T = r.totais;
      const novo = ((T.exo + exo) / (T.tot + ctx.procs.length)) * 100;
      if (novo > M.B3.otimo && r.ind[2].nivel === 'otimo') {
        out.push({ id: 'b3', tipo: 'aviso', titulo: 'Taxa de exodontia (B3)', texto: `Com esta(s) exodontia(s), a taxa de exodontia da equipe passa de ${OS.fmtPct(r.ind[2].pct)} para <strong>${OS.fmtPct(novo)}</strong>, acima do limite Ótimo (${OS.fmtPct(M.B3.otimo)}). Confirme se não há alternativa conservadora.` });
      }
    }
    // Bloqueios nunca podem ser "ignorados"; o resto o profissional dispensa se quiser
    return out.filter((a) => a.tipo === 'bloqueio' || !(ctx.ignorados && ctx.ignorados.has(a.id)));
  };
})();
