(function () {
  const OS = window.OS, ineSel = OS.qs('#sel-ine'), perfSel = OS.qs('#sel-perfil'), profSel = OS.qs('#sel-prof'), btn = OS.qs('#btn-entrar');
  const senhaInp = OS.qs('#inp-senha'), aviso = OS.qs('#login-aviso');

  const msg = (t, tipo) => { aviso.innerHTML = t ? `<div class="alert-box alert-${tipo || 'warning'}">${OS.esc(t)}</div>` : ''; };

  ineSel.innerHTML = OS.db.ines.map((i) => `<option value="${i.ine}">${OS.esc(i.ine)} · ${OS.esc(i.equipe)} (${i.cargaHoraria}h)</option>`).join('');

  function atualizar() {
    const id = profSel.value;
    senhaInp.value = ''; senhaInp.classList.remove('invalid');
    if (!id) {
      btn.disabled = true; senhaInp.disabled = true;
      return msg('Nenhum profissional com este perfil nesta equipe. Escolha outra combinação.');
    }
    if (!OS.senha.tem(id)) {
      btn.disabled = true; senhaInp.disabled = true;
      return msg('Este perfil ainda não tem senha. Solicite ao administrador.');
    }
    btn.disabled = false; senhaInp.disabled = false; msg('');
  }

  function profs() {
    const lista = OS.db.profissionais.filter((p) => p.ine === ineSel.value && p.cbo === perfSel.value);
    profSel.innerHTML = lista.map((p) => `<option value="${p.id}">${OS.esc(p.nome)}</option>`).join('');
    atualizar();
  }

  function entrar() {
    const prof = OS.profissional(profSel.value);
    if (!prof || !OS.senha.tem(prof.id)) return;

    const r = OS.senha.verificar(prof.id, senhaInp.value);
    if (!r.ok) { senhaInp.classList.add('invalid'); senhaInp.value = ''; senhaInp.focus(); OS.senha.registrarFalha(prof); return msg(r.erro, 'danger'); }

    OS.sessao.set(prof.id); OS.logAcesso('login'); location.href = 'dashboard.html';
  }

  ineSel.addEventListener('change', profs); perfSel.addEventListener('change', profs); profSel.addEventListener('change', atualizar);
  senhaInp.addEventListener('input', () => senhaInp.classList.remove('invalid'));
  senhaInp.addEventListener('keydown', (e) => { if (e.key === 'Enter') entrar(); });
  btn.addEventListener('click', entrar);
  profs();
})();
