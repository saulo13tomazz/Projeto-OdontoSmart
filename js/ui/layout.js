/* ===== Estrutura comum às páginas: proteção de acesso, cabeçalho, menu e rodapé ===== */
(function () {
  const OS = window.OS;
  const MENU = [
    ['dashboard', 'dashboard.html', 'Dashboard & Indicadores'],
    ['pacientes', 'pacientes.html', 'Pacientes'],
    ['lembretes', 'lembretes.html', 'Central de Lembretes'],
    ['atendimento', 'atendimento.html', 'Atendimento & SOAP'],
    ['coletiva', 'acao-coletiva.html', 'Ação Coletiva (PSE)'],
    ['relatorios', 'relatorios.html', 'Relatórios & Busca Ativa'],
    ['config', 'configuracoes.html', 'Configurações']
  ];

  /* Chame no início de cada página interna. Devolve o profissional logado (ou redireciona ao login). */
  OS.iniciarPagina = (chave) => {
    const u = OS.sessao.get();
    if (!u) { location.replace('login.html'); return null; }
    const ine = OS.ineInfo(u.ine);
    OS.qs('#app-header').innerHTML = `
      <header>
        <div class="brand"><h1>OdontoSmart <span>Indicadores de Saúde Bucal e-SUS APS</span></h1></div>
        <div class="user-badge">
          <strong>${OS.esc(u.nome)}</strong> (${OS.perfilNome(u.cbo)})<br>
          <small>INE: ${OS.esc(ine.ine)} | ${OS.esc(ine.equipe)} (${ine.cargaHoraria}h)</small><br>
          <a href="login.html" id="trocar-perfil">Trocar perfil / sair</a>
        </div>
      </header>`;
    OS.qs('#app-menu').innerHTML = `<div class="menu-title">Menu de Navegação</div><ul>` +
      MENU.map(([k, href, nome]) => `<li><button type="button" class="nav-btn${k === chave ? ' active' : ''}" ${k === chave ? 'aria-current="page"' : ''} data-href="${href}">${nome}</button></li>`).join('') + '</ul>';
    OS.qsa('#app-menu .nav-btn').forEach((btn) => btn.addEventListener('click', () => { location.href = btn.dataset.href; }));
    OS.qs('#app-footer').innerHTML = '<footer>OdontoSmart © 2026 - Gestão de Indicadores de Saúde Bucal</footer>';
    OS.qs('#trocar-perfil').addEventListener('click', () => OS.sessao.limpar());
    return u;
  };
})();
