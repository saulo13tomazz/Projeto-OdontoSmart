/* ===== Estrutura comum às páginas: proteção de acesso, cabeçalho, menu e rodapé =====
   O "chassi" de todas as telas internas: desenha a barra superior, o menu lateral,
   o crachá do dentista e expulsa quem tentar entrar sem passar pelo login! */
(function () {
  const OS = window.OS;

  /* Ícones SVG (traço) usados no menu e no cabeçalho — leves e nítidos em qualquer zoom */
  const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICON = {
    dashboard: svg('<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>'),
    pacientes: svg('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
    lembretes: svg('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>'),
    atendimento: svg('<path d="M7 3c-2 0-3.5 1.6-3.5 4 0 3 1.5 4.5 2 8 .3 2.5.8 6 2.5 6 1.5 0 1.6-3.5 2.2-5.5.3-1 .8-1.5 1.8-1.5s1.5.5 1.8 1.5c.6 2 .7 5.5 2.2 5.5 1.7 0 2.2-3.5 2.5-6 .5-3.5 2-5 2-8 0-2.4-1.5-4-3.5-4-1.8 0-2.7 1-5 1S8.8 3 7 3z"/>'),
    coletiva: svg('<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/>'),
    relatorios: svg('<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>'),
    config: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'),
    sair: svg('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>')
  };
  OS.ICON = ICON;
  // O dentinho mascote do OdontoSmart (zero cáries, 100% vetorial!)
  OS.LOGO_SVG = svg('<path d="M7 3c-2 0-3.5 1.6-3.5 4 0 3 1.5 4.5 2 8 .3 2.5.8 6 2.5 6 1.5 0 1.6-3.5 2.2-5.5.3-1 .8-1.5 1.8-1.5s1.5.5 1.8 1.5c.6 2 .7 5.5 2.2 5.5 1.7 0 2.2-3.5 2.5-6 .5-3.5 2-5 2-8 0-2.4-1.5-4-3.5-4-1.8 0-2.7 1-5 1S8.8 3 7 3z"/>');

  // Lista oficial de abas do menu lateral: [chave, arquivo, rótulo]
  const MENU = [
    ['dashboard', 'dashboard.html', 'Dashboard & Indicadores'],
    ['pacientes', 'pacientes.html', 'Pacientes'],
    ['lembretes', 'lembretes.html', 'Central de Lembretes'],
    ['atendimento', 'atendimento.html', 'Atendimento & SOAP'],
    ['coletiva', 'acao-coletiva.html', 'Ação Coletiva (PSE)'],
    ['relatorios', 'relatorios.html', 'Relatórios & Busca Ativa'],
    ['config', 'configuracoes.html', 'Configurações']
  ];

  // Pega as iniciais do nome ignorando "Dr./Dra." para fazer a bolinha do avatar
  const iniciais = (nome) => String(nome || '').replace(/^(Dr\.?|Dra\.?)\s+/i, '').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');

  /* Chame no início de cada página interna. Devolve o profissional logado (ou redireciona ao login). */
  OS.iniciarPagina = (chave) => {
    const u = OS.sessao.get();
    // Sem jaleco / sem sessão? Volta correndo para a portaria (login.html)!
    if (!u) { location.replace('login.html'); return null; }
    const ine = OS.ineInfo(u.ine);
    // Monta o cabeçalho fixo com logo, equipe e crachá do profissional
    OS.qs('#app-header').innerHTML = `
      <header>
        <div class="brand">
          <div class="brand-logo">${OS.LOGO_SVG}</div>
          <h1>OdontoSmart <span>Indicadores de Saúde Bucal · e-SUS APS</span></h1>
        </div>
        <div class="user-badge">
          <div class="user-info">
            <strong>${OS.esc(u.nome)}</strong>
            <small>${OS.perfilNome(u.cbo)} · INE ${OS.esc(ine.ine)} · ${OS.esc(ine.equipe)} (${ine.cargaHoraria}h)</small>
          </div>
          <div class="avatar" title="${OS.esc(u.nome)}">${OS.esc(iniciais(u.nome))}</div>
          <a href="login.html" id="trocar-perfil" class="logout" title="Trocar perfil / sair">${ICON.sair}<span>Sair</span></a>
        </div>
      </header>`;
    // Desenha o menu lateral destacando a página ativa no momento
    OS.qs('#app-menu').innerHTML = `<div class="menu-title">Menu</div><ul>` +
      MENU.map(([k, href, nome]) => `<li><button type="button" class="nav-btn${k === chave ? ' active' : ''}" ${k === chave ? 'aria-current="page"' : ''} data-href="${href}">${ICON[k] || ''}<span>${nome}</span></button></li>`).join('') +
      `</ul><div class="menu-foot"><strong>${OS.esc(ine.equipe)}</strong>INE ${OS.esc(ine.ine)} · ${ine.cargaHoraria}h semanais</div>`;
    // Faz cada botão do menu navegar para sua respectiva tela
    OS.qsa('#app-menu .nav-btn').forEach((btn) => btn.addEventListener('click', () => { location.href = btn.dataset.href; }));
    OS.qs('#app-footer').innerHTML = '<footer>OdontoSmart © 2026 · Gestão de Indicadores de Saúde Bucal</footer>';
    // Clicou em Sair? Limpa a sessão antes de voltar ao login
    OS.qs('#trocar-perfil').addEventListener('click', () => OS.sessao.limpar());
    return u;
  };
})();
