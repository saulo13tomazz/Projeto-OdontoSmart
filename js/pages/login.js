(function () {
  const OS = window.OS, ineSel = OS.qs('#sel-ine'), perfSel = OS.qs('#sel-perfil'), profSel = OS.qs('#sel-prof'), btn = OS.qs('#btn-entrar');
  ineSel.innerHTML = OS.db.ines.map((i) => `<option value="${i.ine}">${OS.esc(i.ine)} · ${OS.esc(i.equipe)} (${i.cargaHoraria}h)</option>`).join('');
  function profs() {
    const lista = OS.db.profissionais.filter((p) => p.ine === ineSel.value && p.cbo === perfSel.value);
    profSel.innerHTML = lista.map((p) => `<option value="${p.id}">${OS.esc(p.nome)}</option>`).join('');
    btn.disabled = !lista.length;
    OS.qs('#login-aviso').innerHTML = lista.length ? '' : '<div class="alert-box alert-warning">Nenhum profissional com este perfil nesta equipe. Escolha outra combinação.</div>';
  }
  ineSel.addEventListener('change', profs); perfSel.addEventListener('change', profs); profs();
  btn.addEventListener('click', () => { OS.sessao.set(profSel.value); OS.logAcesso('login'); location.href = 'dashboard.html'; });
})();
