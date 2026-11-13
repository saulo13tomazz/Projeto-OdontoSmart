/* ===== Utilitários gerais (datas, texto, formatação) =====
   A "caixa de ferramentas" do OdontoSmart: sem ela, nem o espelhinho do dentista funciona! */
(function () {
  // Garante o namespace global OS onde todo mundo pendura suas funções
  const OS = (window.OS = window.OS || {});
  // Coloca um zero na esquerda se o número for tímido (ex: 7 vira '07')
  const pad = (n) => String(n).padStart(2, '0');

  // Escapa caracteres perigosos de HTML para ninguém injetar script malicioso no prontuário
  OS.esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Atalhos preguiçosos (e elegantes) para querySelector e querySelectorAll
  OS.qs = (sel, root) => (root || document).querySelector(sel);
  OS.qsa = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  // Converte Date para 'AAAA-MM-DD' sem deixar o fuso horário pregar peças
  OS.toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  // Data de hoje no formato ISO (ótimo para saber se o paciente faltou hoje!)
  OS.hoje = () => OS.toISO(new Date());
  // Transforma 'AAAA-MM-DD' de volta em Date no horário local
  OS.parse = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
  // Soma (ou subtrai) dias de uma data ISO — tipo marcar retorno pra daqui 15 dias
  OS.addDias = (iso, n) => { const d = OS.parse(iso); d.setDate(d.getDate() + n); return OS.toISO(d); };
  // Formata ISO para o jeitinho brasileiro DD/MM/AAAA (ou '—' se vier vazio)
  OS.fmtData = (iso) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—');
  // Carimbo completo de data e hora atual (para auditoria não deixar passar nada)
  OS.agora = () => new Date().toISOString();

  // Calcula a idade exata contando se a pessoa já soprou velinha este ano
  OS.idade = (nasc, ref) => {
    const n = OS.parse(nasc), r = OS.parse(ref || OS.hoje());
    let a = r.getFullYear() - n.getFullYear();
    if (r.getMonth() < n.getMonth() || (r.getMonth() === n.getMonth() && r.getDate() < n.getDate())) a--;
    return a;
  };

  // Deixa só números (arranca pontos, traços e parênteses igual extração de siso)
  OS.digitos = (s) => String(s || '').replace(/\D/g, '');
  // Normaliza texto removendo acentos, espaços extras e maiúsculas (para buscas tolerantes)
  OS.norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  // Gera ID único misturando prefixo, relógio e sorte (quase impossível repetir)
  OS.uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  // Máscara bonitinha de CPF (000.000.000-00) e formatação numérica no padrão BR (vírgula!)
  OS.fmtCPF = (d) => { d = OS.digitos(d); return d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : d || '—'; };
  OS.fmtPct = (n) => n.toFixed(1).replace('.', ',') + '%';
  OS.fmtDec = (n) => Number(n).toFixed(2).replace('.', ',');

  // Empacota uma lista em arquivo CSV compatível com Excel (com BOM UTF-8 pra não quebrar acentos!)
  OS.baixarCSV = (nome, linhas) => {
    const csv = linhas.map((l) => l.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = nome; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  /* Modal simples: OS.modal({titulo, html, botoes:[{rotulo, classe, acao}]})
     Abre uma janelinha simpática por cima da tela quando precisa confirmar algo sério */
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
  // Fecha a janelinha modal como quem fecha a boca depois do "abre bem"
  OS.fecharModal = () => { const m = document.getElementById('os-modal'); if (m) m.remove(); };
})();
