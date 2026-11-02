/* ===== Estrutura comum às páginas: proteção de acesso, cabeçalho, menu e rodapé ===== */
(function () {
  const OS = window.OS;
  const MENU = [
    ['dashboard', 'dashboard.html', '1. Dashboard & Indicadores'],
    ['pacientes', 'pacientes.html', '2. Pacientes'],
    ['lembretes', 'lembretes.html', '3. Central de Lembretes'],
    ['atendimento', 'atendimento.html', '4. Atendimento & SOAP'],
    ['coletiva', 'acao-coletiva.html', '5. Ação Coletiva (PSE)'],
    ['relatorios', 'relatorios.html', '6. Relatórios & Busca Ativa'],
    ['config', 'configuracoes.html', '7. Configurações']
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
      MENU.map(([k, href, nome]) => `<li><a href="${href}" ${k === chave ? 'class="active" aria-current="page"' : ''}>${nome}</a></li>`).join('') + '</ul>';
    OS.qs('#app-footer').innerHTML = '<footer>OdontoSmart © 2026 - Gestão de Indicadores de Saúde Bucal</footer>';
    OS.qs('#trocar-perfil').addEventListener('click', () => OS.sessao.limpar());
    return u;
  };
})();
