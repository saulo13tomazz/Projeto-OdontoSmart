/* ===== Utilitários gerais (datas, texto, formatação) ===== */
(function () {
  const OS = (window.OS = window.OS || {});
  const pad = (n) => String(n).padStart(2, '0');

  OS.esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  OS.qs = (sel, root) => (root || document).querySelector(sel);
  OS.qsa = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  OS.toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  OS.hoje = () => OS.toISO(new Date());
  OS.parse = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
  OS.addDias = (iso, n) => { const d = OS.parse(iso); d.setDate(d.getDate() + n); return OS.toISO(d); };
  OS.fmtData = (iso) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—');
  OS.agora = () => new Date().toISOString();

  OS.idade = (nasc, ref) => {
    const n = OS.parse(nasc), r = OS.parse(ref || OS.hoje());
    let a = r.getFullYear() - n.getFullYear();
    if (r.getMonth() < n.getMonth() || (r.getMonth() === n.getMonth() && r.getDate() < n.getDate())) a--;
    return a;
  };

  OS.digitos = (s) => String(s || '').replace(/\D/g, '');
  OS.norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  OS.uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  OS.fmtCPF = (d) => { d = OS.digitos(d); return d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : d || '—'; };
  OS.fmtPct = (n) => n.toFixed(1).replace('.', ',') + '%';
  OS.fmtDec = (n) => Number(n).toFixed(2).replace('.', ',');

  OS.baixarCSV = (nome, linhas) => {
    const csv = linhas.map((l) => l.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = nome; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  /* Modal simples: OS.modal({titulo, html, botoes:[{rotulo, classe, acao}]}) */
  OS.modal = (opts) => {
    OS.fecharModal();
    const bg = document.createElement('div');
    bg.className = 'modal-bg'; bg.id = 'os-modal';
    bg.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><h3>${OS.esc(opts.titulo)}</h3><div class="modal-body">${opts.html}</div><div class="modal-footer"></div></div>`;
    const foot = bg.querySelector('.modal-footer');
    (opts.botoes || []).forEach((b) => {
      const el = document.createElement('button');
      el.className = 'btn ' + (b.classe || 'btn-secondary'); el.textContent = b.rotulo;
      el.addEventListener('click', () => b.acao && b.acao(bg));
      foot.appendChild(el);
    });
    document.body.appendChild(bg);
    return bg;
  };
  OS.fecharModal = () => { const m = document.getElementById('os-modal'); if (m) m.remove(); };

  /* Transição suave dentro da mesma página (View Transitions API quando disponível) */
  OS.transicao = (fn) => {
    if (typeof document !== 'undefined' && document.startViewTransition && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      document.startViewTransition(() => fn());
    } else {
      fn();
    }
  };

  /* Navegação entre páginas com animação de saída suave */
  OS.navegar = (href) => {
    if (!href) return;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      location.href = href;
      return;
    }
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.add('page-leaving');
      setTimeout(() => { location.href = href; }, 180);
    } else {
      location.href = href;
    }
  };

  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('pageshow', () => {
      if (document.body) document.body.classList.remove('page-leaving');
    });
  }
})();
