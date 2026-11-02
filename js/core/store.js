/* ===== Banco de dados local (localStorage) e regras de negócio de gravação ===== */
(function () {
  const OS = window.OS;
  const KEY = 'odontosmart:v2', SKEY = 'odontosmart:sessao';
  const ler = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const gravar = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* armazenamento indisponível: segue em memória */ } };

  OS.salvar = () => gravar(KEY, JSON.stringify(OS.db));
  OS.resetar = () => { OS.db = OS.gerarSeed(); OS.salvar(); };
  (function carregar() {
    const raw = ler(KEY);
    if (raw) { try { OS.db = JSON.parse(raw); return; } catch (e) { /* base corrompida: recria */ } }
    OS.resetar();
  })();

  /* ---- Sessão (Passo 0: INE + perfil) ---- */
  OS.sessao = {
    get() { const id = ler(SKEY); return id ? OS.db.profissionais.find((p) => p.id === id) || null : null; },
    set(profId) { gravar(SKEY, profId); },
    limpar() { try { localStorage.removeItem(SKEY); } catch (e) { /* ignora */ } }
  };

  /* ---- Consultas ---- */
  OS.paciente = (id) => OS.db.pacientes.find((p) => p.id === id);
  OS.profissional = (id) => OS.db.profissionais.find((p) => p.id === id);
  OS.ineInfo = (ine) => OS.db.ines.find((i) => i.ine === ine);
  OS.proc = (id) => OS.db.procedimentos.find((p) => p.id === id);
  OS.casoAtivo = (pacId) => OS.db.casos.find((c) => c.pacienteId === pacId && c.status === 'ativo');
  OS.ehCrianca6a12 = (p, ref) => { const i = OS.idade(p.nascimento, ref); return i >= 6 && i <= 12; };
  OS.perfilNome = (cbo) => (cbo === 'CD' ? 'Cirurgião-Dentista' : 'Técnico em Saúde Bucal');

  /* Permissões por perfil (travas de CBO) */
  OS.podeLancar = (cbo, procId) => {
    const pr = OS.proc(procId);
    if (!pr) return false;
    if (cbo === 'TSB' && (pr.art || pr.exodontia)) return false;
    return true;
  };

  OS.buscarPacientes = (termo, ine) => {
    const t = OS.norm(termo), d = OS.digitos(termo);
    if (!t) return [];
    return OS.db.pacientes.filter((p) => (!ine || p.ine === ine) && (
      (d.length >= 3 && (p.cpf.includes(d) || p.cns.includes(d) || p.nis.includes(d))) || OS.norm(p.nome).includes(t)
    )).slice(0, 30);
  };

  OS.registrarAlteracao = (texto) => {
    const u = OS.sessao.get();
    OS.db.historico.unshift({ quando: OS.agora(), usuario: u ? u.nome : 'Sistema', texto });
    OS.db.historico = OS.db.historico.slice(0, 200);
  };
  OS.logAcesso = (acao, pacienteId) => {
    const u = OS.sessao.get();
    OS.db.acessos.unshift({ quando: OS.agora(), profId: u ? u.id : null, usuario: u ? u.nome : '—', acao, pacienteId: pacienteId || null });
    OS.db.acessos = OS.db.acessos.slice(0, 300);
    OS.salvar();
  };

  /* ---- Cadastro (find-or-create) ---- */
  OS.cadastrarPaciente = (d) => {
    const cpf = OS.digitos(d.cpf), cns = OS.digitos(d.cns);
    const dup = OS.db.pacientes.find((p) => (cpf && p.cpf === cpf) || (cns && p.cns === cns));
    if (dup) return { erro: `Já existe cadastro com este CPF/CNS: ${dup.nome}.`, existente: dup };
    const p = {
      id: OS.uid('p'), nome: d.nome.trim(), sexo: d.sexo || '', ine: d.ine, nascimento: d.nascimento, cpf, cns,
      nis: OS.digitos(d.nis), mae: (d.mae || '').trim(), tel: (d.tel || '').trim(), riscos: d.riscos || []
    };
    OS.db.pacientes.push(p);
    OS.registrarAlteracao(`Paciente cadastrado: ${p.nome}.`);
    OS.salvar();
    OS.logAcesso('cadastro', p.id);
    return { paciente: p };
  };

  /* ---- Gravação de atendimento ----
     dados: {pacienteId, profId, soap, conduta, retornoPrevisto, procedimentos:[{procId,dente,itemId?}], planoNovo:[{procId,dente}]} */
  OS.registrarAtendimento = (dados) => {
    const db = OS.db, hoje = OS.hoje(), prof = OS.profissional(dados.profId);
    const pac = OS.paciente(dados.pacienteId);
    let caso = OS.casoAtivo(pac.id);
    const doze = OS.addDias(hoje, -365);
    const jaTeveB1 = db.atendimentos.some((a) => a.pacienteId === pac.id && a.tipo === 'primeira' && a.data > doze);
    if (!caso) {
      caso = { id: OS.uid('c'), pacienteId: pac.id, ine: prof.ine, abertura: hoje, status: 'ativo', alta: null, retornoPrevisto: null, plano: [] };
      db.casos.push(caso);
    }
    (dados.planoNovo || []).forEach((i) => caso.plano.push({ id: OS.uid('i'), dente: i.dente || '', procId: i.procId, status: 'planejado', feitoEm: null }));
    // B1 é registrado automaticamente: 1ª consulta programada, 1 vez a cada 12 meses
    const tipo = jaTeveB1 || db.atendimentos.some((a) => a.casoId === caso.id) ? 'retorno' : 'primeira';
    // marca itens do plano como feitos ou inclui o que foi realizado fora do plano
    dados.procedimentos.forEach((p) => {
      let item = p.itemId ? caso.plano.find((i) => i.id === p.itemId) : caso.plano.find((i) => i.status === 'planejado' && i.procId === p.procId && (i.dente || '') === (p.dente || ''));
      if (item) { item.status = 'feito'; item.feitoEm = hoje; }
      else caso.plano.push({ id: OS.uid('i'), dente: p.dente || '', procId: p.procId, status: 'feito', feitoEm: hoje });
    });
    const at = {
      id: OS.uid('a'), casoId: caso.id, pacienteId: pac.id, ine: prof.ine, data: hoje, profId: prof.id, tipo,
      soap: dados.soap, conduta: dados.conduta, procedimentos: dados.procedimentos.map((p) => ({ procId: p.procId, dente: p.dente || '' }))
    };
    db.atendimentos.push(at);
    if (dados.conduta === 'concluido') { caso.status = 'concluido'; caso.alta = hoje; caso.retornoPrevisto = null; }
    else caso.retornoPrevisto = dados.retornoPrevisto || OS.addDias(hoje, 14);
    OS.registrarAlteracao(`Atendimento registrado: ${pac.nome} (${tipo === 'primeira' ? 'B1' : 'retorno'}).`);
    OS.salvar();
    OS.logAcesso('atendimento', pac.id);
    return { atendimento: at, caso };
  };
})();
