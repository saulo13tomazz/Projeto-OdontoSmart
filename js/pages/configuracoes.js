// ============================================================================
// CONTROLADOR DE CONFIGURAÇÕES E AUDITORIA
// O "quartel-general" da equipe: ajusta INE, metas, pesos, senhas, importa CSV
// do e-SUS e ainda deixa restaurar tudo se alguém fizer arte na demonstração.
// ============================================================================
(function () {
  const OS = window.OS, U = OS.iniciarPagina('config');
  if (!U) return;
  const $ = (s) => OS.qs(s), info = () => OS.ineInfo(U.ine);
  // Mostra mensagem de feedback lá no topo e rola suavemente pra ninguém perder o recado
  const aviso = (t, tipo) => { $('#cfg-msg').innerHTML = `<div class="alert-box alert-${tipo || 'success'}">${OS.esc(t)}</div>`; window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const REGRA = { B1: '1 vez a cada 12 meses por pessoa', B2: 'Conduta "tratamento concluído" entre os B1', B3: 'Exodontias / total de procedimentos', B4: 'Atividade coletiva (Dentista + TSB)', B5: 'Preventivos / total de procedimentos (Dentista + TSB)', B6: 'Exclusivo Cirurgião-Dentista' };
  const NOMES = { B1: '1ª Consulta Programada', B2: 'Tratamento Concluído', B3: 'Taxa de Exodontia', B4: 'Escovação Supervisionada', B5: 'Procedimentos Preventivos', B6: 'Restauração ART' };

  /* 1. INE — altera nome da equipe, carga horária (20h/30h/40h) e população adscrita */
  function ine() {
    const i = info();
    $('#cfg-ine').innerHTML = `<div class="form-grid">
      <div class="form-group"><label>Código INE</label><input class="form-control" value="${OS.esc(i.ine)}" disabled></div>
      <div class="form-group"><label for="i-eq">Equipe / UBS</label><input id="i-eq" class="form-control" value="${OS.esc(i.equipe)}"></div>
      <div class="form-group"><label for="i-ch">Carga horária pactuada</label><select id="i-ch" class="form-control">${[20, 30, 40].map((h) => `<option value="${h}" ${i.cargaHoraria === h ? 'selected' : ''}>${h} horas semanais</option>`).join('')}</select></div>
      <div class="form-group"><label for="i-pop">População de referência (B1)</label><input id="i-pop" type="number" min="1" class="form-control" value="${i.populacaoVinculada}"><span class="hint">Ao trocar a carga horária, o valor é recalculado proporcionalmente a 350 por 40h. Ajuste se a equipe tiver outro parâmetro.</span></div></div>
      <button class="btn btn-primary" id="i-salvar" type="button">Salvar equipe</button>`;
    $('#i-ch').addEventListener('change', () => { $('#i-pop').value = Math.round((350 * Number($('#i-ch').value)) / 40); });
    $('#i-salvar').addEventListener('click', () => {
      const pop = Number($('#i-pop').value);
      if (!$('#i-eq').value.trim() || !(pop > 0)) return aviso('Informe o nome da equipe e uma população maior que zero.', 'danger');
      const antes = `${i.equipe}, ${i.cargaHoraria}h, pop. ${i.populacaoVinculada}`;
      i.equipe = $('#i-eq').value.trim(); i.cargaHoraria = Number($('#i-ch').value); i.populacaoVinculada = pop;
      OS.registrarAlteracao(`Equipe ${i.ine} alterada: ${antes} → ${i.equipe}, ${i.cargaHoraria}h, pop. ${pop}.`);
      OS.salvar(); aviso('Equipe atualizada.'); ine(); log(); OS.iniciarPagina('config');
    });
  }

  /* 2. Metas, pesos e pontos — valida para ninguém colocar B3 invertido sem querer! */
  function metas() {
    const M = OS.db.config.metas, P = OS.db.config.pontos;
    const num = (id, v) => `<input id="${id}" type="number" step="0.1" class="form-control" style="width:84px" value="${v}">`;
    const linhas = Object.keys(M).map((c) => { const m = M[c]; let campos;
      if (m.tipo === 'min' || m.tipo === 'max') campos = `Ótimo ${m.tipo === 'min' ? '≥' : '≤'} ${num('m-' + c + '-otimo', m.otimo)} Bom ${num('m-' + c + '-bom', m.bom)} Suficiente ${num('m-' + c + '-suficiente', m.suficiente)} (%)`;
      else if (m.tipo === 'faixa') campos = `Ótimo de ${num('m-' + c + '-otimoMin', m.otimoMin)} a ${num('m-' + c + '-otimoMax', m.otimoMax)} · Bom ≥ ${num('m-' + c + '-bomMin', m.bomMin)} / ≤ ${num('m-' + c + '-bomMax', m.bomMax)} · Suficiente ≥ ${num('m-' + c + '-sufMin', m.sufMin)} (%)`;
      else campos = 'Acompanhamento (sem meta fixa)';
      return `<tr><td><strong>${c}</strong></td><td>${NOMES[c]}</td><td>${campos}</td><td>${num('m-' + c + '-peso', m.peso)}</td><td>${REGRA[c]}</td></tr>`; }).join('');
    $('#cfg-metas').innerHTML = `<div class="alert-box alert-warning"><span>⚠️</span><div>Os limites de <strong>Bom, Suficiente e Regular</strong> e os pontos por conceito são <strong>parâmetros iniciais</strong> do sistema. Confira com a Nota Técnica vigente antes de usar como referência oficial.</div></div>
      <div class="table-scroll"><table class="data-table"><thead><tr><th>Cód.</th><th>Indicador</th><th>Metas por conceito</th><th>Peso</th><th>Regra do sistema</th></tr></thead><tbody>${linhas}</tbody></table></div>
      <h4 style="margin:16px 0 8px;font-size:14px">Pontos por conceito</h4>
      <div class="toolbar">${['otimo', 'bom', 'suficiente', 'regular'].map((k) => `<div class="form-group"><label for="p-${k}">${OS.NIVEL_NOME[k]}</label>${num('p-' + k, P[k])}</div>`).join('')}</div>
      <button class="btn btn-primary" id="m-salvar" type="button">Salvar metas e pesos</button>`;
    $('#m-salvar').addEventListener('click', () => {
      const novo = JSON.parse(JSON.stringify(M)), novoP = {}, difs = [];
      let erro = '';
      Object.keys(novo).forEach((c) => Object.keys(novo[c]).forEach((k) => { if (typeof novo[c][k] === 'number') { const el = $(`#m-${c}-${k}`), v = Number(el.value); if (el.value === '' || isNaN(v) || v < 0) erro = `Valor inválido em ${c} (${k}).`; else novo[c][k] = v; } }));
      ['otimo', 'bom', 'suficiente', 'regular'].forEach((k) => { const v = Number($('#p-' + k).value); if (isNaN(v) || v < 0 || v > 1) erro = 'Os pontos devem estar entre 0 e 1.'; novoP[k] = v; });
      ['B1', 'B2', 'B4'].forEach((c) => { const m = novo[c]; if (!(m.otimo >= m.bom && m.bom >= m.suficiente)) erro = `${c}: use Ótimo ≥ Bom ≥ Suficiente.`; });
      if (!(novo.B3.otimo <= novo.B3.bom && novo.B3.bom <= novo.B3.suficiente)) erro = 'B3: use Ótimo ≤ Bom ≤ Suficiente (quanto menor, melhor).';
      if (!(novo.B5.otimoMin <= novo.B5.otimoMax)) erro = 'B5: o início da faixa Ótima deve ser menor que o fim.';
      if (erro) return aviso(erro, 'danger');
      Object.keys(novo).forEach((c) => Object.keys(novo[c]).forEach((k) => { if (novo[c][k] !== M[c][k]) difs.push(`${c}.${k}: ${M[c][k]} → ${novo[c][k]}`); }));
      Object.keys(novoP).forEach((k) => { if (novoP[k] !== P[k]) difs.push(`pontos.${k}: ${P[k]} → ${novoP[k]}`); });
      if (!difs.length) return aviso('Nenhuma alteração para salvar.', 'info');
      OS.db.config.metas = novo; OS.db.config.pontos = novoP;
      OS.registrarAlteracao('Metas/pesos alterados: ' + difs.join('; '));
      OS.salvar(); aviso('Metas e pesos salvos. Os indicadores já usam os novos valores.'); log();
    });
  }

  /* 3. Travas de CBO (derivadas da regra real aplicada no atendimento) */
  function cbo() {
    const ok = '<span class="badge badge-otimo">Permitido</span>', no = '<span class="badge badge-regular">Bloqueado</span>';
    const linhas = [['B1', 'Abrir plano / 1ª consulta'], ['B2', 'Alta odontológica'], ['B3', 'Exodontia'], ['B4', 'Escovação supervisionada (ação coletiva)'], ['B5', 'Procedimentos preventivos'], ['B6', 'Restauração ART']];
    const pode = (cbo, c) => (cbo === 'CD' ? true : ['B4', 'B5'].includes(c));
    $('#cfg-cbo').innerHTML = `<div class="alert-box alert-info"><strong>Validação CBO:</strong> TSB pode lançar B4 e B5. O sistema bloqueia ART (B6) e exodontia (B3) por TSB, pois são atos privativos do Cirurgião-Dentista.</div>
      <div class="table-scroll"><table class="data-table"><thead><tr><th>Indicador</th><th>Ação</th><th>Cirurgião-Dentista</th><th>TSB</th></tr></thead><tbody>${linhas.map(([c, a]) => `<tr><td><strong>${c}</strong></td><td>${a}</td><td>${pode('CD', c) ? ok : no}</td><td>${pode('TSB', c) ? ok : no}</td></tr>`).join('')}</tbody></table></div>
      <p style="font-size:12px;color:#64748b;margin-top:8px">B1/B2: a 1ª consulta e a alta são conduzidas pelo Dentista no fluxo atual; o TSB atua nos preventivos e nas ações coletivas.</p>`;
  }

  /* 4. Usuários — lista profissionais e libera cadastro novo só se for o admin */
  function users() {
    const adm = OS.senha.ehAdmin(U.id);

    const linhas = OS.db.profissionais.map((p) => {
      const st = OS.senha.tem(p.id) ? '<span class="badge badge-otimo">Definida</span>' : '<span class="badge badge-regular">Sem senha</span>';
      return `<tr><td>${OS.esc(p.nome)}</td><td>${OS.perfilNome(p.cbo)}</td><td>${OS.esc(p.cboCodigo)}</td><td>${OS.esc(p.registro)}</td><td>${OS.esc(p.ine)}</td><td>${st}</td></tr>`;
    }).join('');

    const cadastro = adm ? `<h4 style="margin:16px 0 8px;font-size:14px">Cadastrar profissional</h4>
      <div class="form-grid">
        <div class="form-group"><label for="u-nome">Nome</label><input id="u-nome" class="form-control"></div>
        <div class="form-group"><label for="u-cbo">Perfil</label><select id="u-cbo" class="form-control"><option value="CD">Cirurgião-Dentista</option><option value="TSB">Técnico em Saúde Bucal</option></select></div>
        <div class="form-group"><label for="u-reg">Registro no conselho</label><input id="u-reg" class="form-control"></div>
        <div class="form-group"><label for="u-ine">Equipe (INE)</label><select id="u-ine" class="form-control">${OS.db.ines.map((i) => `<option value="${i.ine}">${OS.esc(i.ine)} · ${OS.esc(i.equipe)}</option>`).join('')}</select></div>
        <div class="form-group"><label for="u-senha">Senha inicial</label><input id="u-senha" type="password" class="form-control" autocomplete="new-password"><span class="hint">Mínimo de ${OS.senha.MIN} caracteres. Entregue esta senha ao profissional.</span></div></div>
      <button class="btn btn-primary" id="u-add" type="button">Adicionar profissional</button>`
      : '<div class="alert-box alert-info">Somente o administrador cadastra novos profissionais.</div>';

    $('#cfg-users').innerHTML = `<div class="table-scroll"><table class="data-table"><thead><tr><th>Nome</th><th>Perfil</th><th>CBO</th><th>Registro</th><th>INE</th><th>Senha</th></tr></thead><tbody>${linhas}</tbody></table></div>${cadastro}`;
    if (!adm) return;

    $('#u-add').addEventListener('click', () => {
      const nome = $('#u-nome').value.trim(), reg = $('#u-reg').value.trim(), senha = $('#u-senha').value;
      if (!nome || !reg) return aviso('Informe nome e registro no conselho.', 'danger');
      const erro = OS.senha.validar(senha);
      if (erro) return aviso(erro, 'danger');
      const cb = $('#u-cbo').value, id = OS.uid('pr');
      OS.db.profissionais.push({ id, nome, cbo: cb, cboCodigo: cb === 'CD' ? '223293' : '322425', registro: reg, ine: $('#u-ine').value });
      OS.senha.definir(id, senha);
      OS.registrarAlteracao(`Profissional cadastrado: ${nome} (${cb}), com senha inicial definida.`); OS.salvar(); aviso('Profissional cadastrado com senha inicial.'); users(); log();
    });
  }

  /* 4.1 Troca de senha do próprio usuário (pede a atual antes para evitar pegadinha no PC aberto!) */
  function senhaCfg() {
    $('#cfg-senha').innerHTML = `<p style="font-size:13px;color:#475569;margin-bottom:10px">Altera a senha de <strong>${OS.esc(U.nome)}</strong>. Informe a senha atual para confirmar.</p>
      <div class="form-grid">
        <div class="form-group"><label for="s-atual">Senha atual</label><input id="s-atual" type="password" class="form-control" autocomplete="current-password"></div>
        <div class="form-group"><label for="s-nova">Nova senha</label><input id="s-nova" type="password" class="form-control" autocomplete="new-password"><span class="hint">Mínimo de ${OS.senha.MIN} caracteres.</span></div>
        <div class="form-group"><label for="s-conf">Confirmar nova senha</label><input id="s-conf" type="password" class="form-control" autocomplete="new-password"></div></div>
      <button class="btn btn-primary" id="s-salvar" type="button">Alterar senha</button>`;
    $('#s-salvar').addEventListener('click', () => {
      const r = OS.senha.verificar(U.id, $('#s-atual').value);
      if (!r.ok) return aviso(r.erro, 'danger');
      const erro = OS.senha.validar($('#s-nova').value, $('#s-conf').value);
      if (erro) return aviso(erro, 'danger');
      OS.senha.definir(U.id, $('#s-nova').value);
      OS.registrarAlteracao(`Senha alterada: ${U.nome}.`); OS.salvar();
      aviso('Senha alterada com sucesso.'); senhaCfg(); log();
    });
  }

  /* 5. Importação CSV — lê exportação do e-SUS e ignora CPF/CNS repetido */
  function importar() {
    $('#cfg-import').innerHTML = `<p style="font-size:13px;color:#475569;margin-bottom:10px">Traz cadastros do e-SUS para a base local da equipe atual. Arquivo CSV (separador <code>;</code> ou <code>,</code>) com cabeçalho: <code>nome;nascimento;cpf;cns;nis;mae;telefone</code> (nascimento em AAAA-MM-DD ou DD/MM/AAAA). Cadastros com CPF ou CNS já existentes são ignorados.</p>
      <div class="form-group" style="max-width:420px"><label for="imp-arq">Arquivo CSV</label><input id="imp-arq" type="file" accept=".csv,text/csv" class="form-control"></div>
      <div id="imp-res" style="margin-top:12px"></div>`;
    $('#imp-arq').addEventListener('change', (e) => {
      const f = e.target.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        const linhas = String(rd.result).replace(/^\ufeff/, '').split(/\r?\n/).filter((l) => l.trim());
        if (linhas.length < 2) return ($('#imp-res').innerHTML = '<div class="alert-box alert-danger">Arquivo vazio ou sem linhas de dados.</div>');
        const sep = linhas[0].includes(';') ? ';' : ',', cab = linhas[0].split(sep).map((c) => OS.norm(c).replace(/"/g, ''));
        const idx = (n) => cab.indexOf(n);
        if (idx('nome') < 0 || idx('nascimento') < 0) return ($('#imp-res').innerHTML = '<div class="alert-box alert-danger">Cabeçalho inválido: são obrigatórias as colunas "nome" e "nascimento".</div>');
        let ok = 0, dup = 0, inv = 0;
        linhas.slice(1).forEach((l) => {
          const c = l.split(sep).map((x) => x.trim().replace(/^"|"$/g, '')), g = (n) => (idx(n) >= 0 ? c[idx(n)] || '' : '');
          let nasc = g('nascimento'); if (/^\d{2}\/\d{2}\/\d{4}$/.test(nasc)) nasc = nasc.split('/').reverse().join('-');
          if (!g('nome') || !/^\d{4}-\d{2}-\d{2}$/.test(nasc) || (!OS.digitos(g('cpf')) && !OS.digitos(g('cns')))) { inv++; return; }
          const r = OS.cadastrarPaciente({ nome: g('nome'), nascimento: nasc, cpf: g('cpf'), cns: g('cns'), nis: g('nis'), mae: g('mae'), tel: g('telefone'), ine: U.ine });
          r.erro ? dup++ : ok++;
        });
        OS.registrarAlteracao(`Importação e-SUS: ${ok} novos, ${dup} duplicados, ${inv} inválidos.`); OS.salvar();
        $('#imp-res').innerHTML = `<div class="alert-box alert-success">Importação concluída: <strong>${ok}</strong> novos · ${dup} já existentes · ${inv} inválidos (sem nome, nascimento ou CPF/CNS).</div>`; log();
      };
      rd.readAsText(f, 'utf-8');
    });
  }

  /* 6. Logs — mostra quem mexeu em quê e quem abriu qual prontuário */
  function log() {
    const t = (l, cab, f) => `<div class="table-scroll"><table class="data-table"><thead><tr>${cab.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${l.slice(0, 15).map(f).join('')}</tbody></table></div>`;
    const dh = (iso) => `${OS.fmtData(iso)} ${iso.slice(11, 16)}`;
    $('#cfg-log').innerHTML = '<h4 style="font-size:14px">Alterações recentes</h4>' + t(OS.db.historico, ['Quando', 'Usuário', 'Alteração'], (h) => `<tr><td>${dh(h.quando)}</td><td>${OS.esc(h.usuario)}</td><td>${OS.esc(h.texto)}</td></tr>`) +
      '<h4 style="font-size:14px;margin-top:16px">Acessos a dados de pacientes</h4>' + (OS.db.acessos.length ? t(OS.db.acessos, ['Quando', 'Usuário', 'Ação', 'Paciente'], (a) => `<tr><td>${dh(a.quando)}</td><td>${OS.esc(a.usuario)}</td><td>${OS.esc(a.acao)}</td><td>${OS.esc((OS.paciente(a.pacienteId) || {}).nome || '—')}</td></tr>`) : '<div class="empty">Nenhum acesso registrado ainda.</div>');
  }

  /* 7. Botão de emergência: apaga tudo e volta à clínica demonstrativa zerinha */
  function reset() {
    $('#cfg-reset').innerHTML = '<p style="font-size:13px;color:#475569;margin-bottom:10px">Apaga tudo o que foi registrado neste navegador e recria a base de demonstração.</p><button class="btn btn-danger" id="r-reset" type="button">Restaurar dados demonstrativos</button>';
    $('#r-reset').addEventListener('click', () => OS.modal({ titulo: 'Restaurar dados demonstrativos?', html: '<p>Cadastros, atendimentos e configurações feitos neste navegador serão apagados. Esta ação não pode ser desfeita.</p>', botoes: [{ rotulo: 'Cancelar', acao: OS.fecharModal }, { rotulo: 'Apagar e restaurar', classe: 'btn-danger', acao: () => { OS.resetar(); OS.sessao.limpar(); location.href = 'login.html'; } }] }));
  }

  ine(); metas(); cbo(); users(); senhaCfg(); importar(); log(); reset();
})();
