/* ===== Componentes visuais compartilhados =====
   Fábrica de bloquinhos reutilizáveis: etiquetas, cards clicáveis, odontograma
   e selects inteligentes que já sabem o que cada profissional pode fazer. */
(function () {
  const OS = window.OS;

  // Etiquetinha colorida de status (Ótimo, Bom, Suficiente, Regular...)
  OS.badge = (nivel) => `<span class="badge badge-${nivel}">${OS.NIVEL_NOME[nivel]}</span>`;

  // Gera as tags de prioridade clínica do paciente (Gestante, Diabético e Criança 6-12 do B4)
  OS.tagsRisco = (p) => {
    let h = (p.riscos || []).map((r) => (r === 'gestante' ? '<span class="risk-tag tag-gestante">Gestante</span>' : r === 'diabetico' ? '<span class="risk-tag tag-diabetico">Diabético</span>' : `<span class="risk-tag">${OS.esc(r)}</span>`)).join('');
    if (OS.ehCrianca6a12(p)) h += '<span class="risk-tag tag-escolar">Escolar 6-12 (B4)</span>';
    return h;
  };

  /* Card resumido e clicável de indicador (dashboard) — limpo por fora, clicou abriu tudo! */
  OS.cardIndicador = (r, qs) => {
    const href = `indicador.html?cod=${encodeURIComponent(r.cod)}${qs ? '&' + qs : ''}`;
    const pctTxt = r.den === 0 ? '—' : OS.fmtPct(r.pct);
    return `<a class="indicator-card indicator-card-link" href="${href}" aria-label="Ver detalhes do indicador ${r.cod} - ${OS.esc(r.nome)}">
      <div class="indicator-header">
        <span class="indicator-code">${r.cod}</span>
        ${OS.badge(r.nivel)}
      </div>
      <div class="indicator-title">${OS.esc(r.nome)}</div>
      <div class="indicator-simple-value">
        <span class="indicator-big-pct">${pctTxt}</span>
        <span class="indicator-fraction">${r.num} / ${r.den}</span>
      </div>
      <div class="progress-container" role="progressbar" aria-valuenow="${Math.round(Math.min(100, r.prog))}" aria-valuemin="0" aria-valuemax="100">
        <div class="progress-bar ${r.cor}" style="width:${Math.max(0, Math.min(100, r.prog))}%"></div>
      </div>
      <div class="indicator-cta"><span>Ver detalhes</span><span aria-hidden="true">→</span></div>
    </a>`;
  };

  /* Odontograma permanente (FDI). estado: {dente:{status:'feito'|'planejado'|'hoje', rot}}
     A arcada dentária interativa (18 ao 48): clicar no dente aqui é indolor, prometemos! */
  const SUP = ['18','17','16','15','14','13','12','11','21','22','23','24','25','26','27','28'];
  const INF = ['48','47','46','45','44','43','42','41','31','32','33','34','35','36','37','38'];
  OS.odontograma = (el, estado, selecionado, onSelect) => {
    const cel = (d) => {
      const e = estado[d] || {};
      const cls = e.status === 'feito' ? 'tooth-treated' : e.status === 'planejado' ? 'tooth-pending' : e.status === 'hoje' ? 'tooth-today' : '';
      return `<button type="button" class="tooth-box ${cls} ${selecionado === d ? 'tooth-selected' : ''}" data-dente="${d}" aria-label="Dente ${d}${e.rot ? ', ' + OS.esc(e.rot) : ''}">${d}<small>${OS.esc(e.rot || '')}</small></button>`;
    };
    // Divide cada arcada ao meio pra ficar bonitinho e responsivo, com legenda embaixo
    const linha = (arr) => `<div class="odonto-row">${arr.slice(0, 8).map(cel).join('')}<span class="gap"></span>${arr.slice(8).map(cel).join('')}</div>`;
    el.innerHTML = `<div class="odontogram-grid">${linha(SUP)}${linha(INF)}
      <div class="odonto-legend"><span>🟩 Realizado</span><span>🟨 Planejado</span><span>🟦 Hoje</span><span>Dentes permanentes (FDI)</span></div></div>`;
    if (onSelect) OS.qsa('.tooth-box', el).forEach((b) => b.addEventListener('click', () => onSelect(b.dataset.dente)));
  };

  /* Estado do odontograma a partir de um plano (+ procedimentos de hoje)
     Pinta o mapa da boca: o que já foi tratado, o que espera na fila e o que acabou de sair do forno */
  OS.estadoOdonto = (plano, hojeProcs) => {
    const est = {};
    (plano || []).forEach((i) => { if (i.dente) est[i.dente] = { status: i.status, rot: (OS.proc(i.procId) || {}).curto }; });
    (hojeProcs || []).forEach((p) => { if (p.dente) est[p.dente] = { status: 'hoje', rot: ((OS.proc(p.procId) || {}).curto || '') + ' HOJE' }; });
    return est;
  };

  // Textos bonitos para a conduta final da consulta e dropdown com trava de CBO
  OS.condutaNome = { continuidade: 'Retorno para continuidade do tratamento', concluido: 'Tratamento concluído (Alta Odontológica)', encaminhamento: 'Encaminhamento para outro serviço' };
  OS.selectProcedimentos = (cbo) => OS.db.procedimentos.map((p) => `<option value="${p.id}" ${!OS.podeLancar(cbo, p.id) ? 'disabled' : ''}>${OS.esc(p.nome)}${!OS.podeLancar(cbo, p.id) ? ' (exclusivo CD)' : ''}</option>`).join('');
})();
