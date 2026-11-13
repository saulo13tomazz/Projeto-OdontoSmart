/* ===== Banco de dados local (localStorage) e regras de negócio de gravação =====
   É o "cérebro guardião" do prontuário: salva tudo no navegador mesmo sem internet,
   porque posto de saúde sem Wi-Fi não pode deixar paciente esperando de boca aberta! */
(function () {
  const OS = window.OS;
  // Chaves usadas no localStorage para o banco completo e para a sessão do profissional logado
  const KEY = 'odontosmart:v2', SKEY = 'odontosmart:sessao';
  // Leitores/escritores blindados contra modo anônimo ou armazenamento bloqueado
  const ler = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const gravar = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* armazenamento indisponível: segue em memória */ } };

  // Salva o banco inteiro e permite resetar tudo pros dados de fábrica quando der vontade
  OS.salvar = () => gravar(KEY, JSON.stringify(OS.db));
  OS.resetar = () => { OS.db = OS.gerarSeed(); OS.salvar(); };
  // Ao iniciar, tenta carregar do localStorage; se não achar (ou estiver bichado), gera do zero
  (function carregar() {
    const raw = ler(KEY);
    if (raw) { try { OS.db = JSON.parse(raw); return; } catch (e) { /* base corrompida: recria */ } }
    OS.resetar();
  })();

  /* ---- Sessão (Passo 0: INE + perfil) ----
     Lembra qual dentista ou TSB está com o jaleco vestido no momento */
  OS.sessao = {
    get() { const id = ler(SKEY); return id ? OS.db.profissionais.find((p) => p.id === id) || null : null; },
    set(profId) { gravar(SKEY, profId); },
    limpar() { try { localStorage.removeItem(SKEY); } catch (e) { /* ignora */ } }
  };

  /* ---- Consultas rápidas (buscam pelo ID sem drama) ---- */
  OS.paciente = (id) => OS.db.pacientes.find((p) => p.id === id);
  OS.profissional = (id) => OS.db.profissionais.find((p) => p.id === id);
  OS.ineInfo = (ine) => OS.db.ines.find((i) => i.ine === ine);
  OS.proc = (id) => OS.db.procedimentos.find((p) => p.id === id);
  // Pega o caso odontológico que ainda está aberto ("tratamento em andamento")
  OS.casoAtivo = (pacId) => OS.db.casos.find((c) => c.pacienteId === pacId && c.status === 'ativo');
  // Criança de 6 a 12 anos entra na mira do indicador B4 (escovação supervisionada!)
  OS.ehCrianca6a12 = (p, ref) => { const i = OS.idade(p.nascimento, ref); return i >= 6 && i <= 12; };
  // Traduz a sigla do CBO para um título bonito no crachá
  OS.perfilNome = (cbo) => (cbo === 'CD' ? 'Cirurgião-Dentista' : 'Técnico em Saúde Bucal');

  /* Permissões por perfil (travas de CBO)
     Regra de ouro: TSB não extrai dente nem faz ART sozinho — cada macaco no seu mocho (e cada broca na sua mão)! */
  OS.podeLancar = (cbo, procId) => {
    const pr = OS.proc(procId);
    if (!pr) return false;
    if (cbo === 'TSB' && (pr.art || pr.exodontia)) return false;
    return true;
  };

  // Pesquisa paciente por nome, CPF, CNS ou NIS (com limite de 30 para não travar a recepção)
  OS.buscarPacientes = (termo, ine) => {
    const t = OS.norm(termo), d = OS.digitos(termo);
    if (!t) return [];
    return OS.db.pacientes.filter((p) => (!ine || p.ine === ine) && (
      (d.length >= 3 && (p.cpf.includes(d) || p.cns.includes(d) || p.nis.includes(d))) || OS.norm(p.nome).includes(t)
    )).slice(0, 30);
  };

  // Guarda as últimas 200 alterações de sistema (tipo diário de bordo da clínica)
  OS.registrarAlteracao = (texto) => {
    const u = OS.sessao.get();
    OS.db.historico.unshift({ quando: OS.agora(), usuario: u ? u.nome : 'Sistema', texto });
    OS.db.historico = OS.db.historico.slice(0, 200);
  };
  // Registra os últimos 300 acessos para auditoria (aqui ninguém bisbilhota prontuário escondido!)
  OS.logAcesso = (acao, pacienteId) => {
    const u = OS.sessao.get();
    OS.db.acessos.unshift({ quando: OS.agora(), profId: u ? u.id : null, usuario: u ? u.nome : '—', acao, pacienteId: pacienteId || null });
    OS.db.acessos = OS.db.acessos.slice(0, 300);
    OS.salvar();
  };

  /* ---- Cadastro (find-or-create) ----
     Cadastra paciente novo só se o CPF/CNS não existir — nada de outro por aí */
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
     Salva SOAP, procedimentos, baixa no plano de tratamento e decide sozinho se é 1ª consulta (B1) ou retorno.
     dados: {pacienteId, profId, soap, conduta, retornoPrevisto, procedimentos:[{procId,dente,itemId?}], planoNovo:[{procId,dente}]} */
  OS.registrarAtendimento = (dados) => {
    const db = OS.db, hoje = OS.hoje(), prof = OS.profissional(dados.profId);
    const pac = OS.paciente(dados.pacienteId);
    let caso = OS.casoAtivo(pac.id);
    const doze = OS.addDias(hoje, -365);
    const jaTeveB1 = db.atendimentos.some((a) => a.pacienteId === pac.id && a.tipo === 'primeira' && a.data > doze);
    // Se o paciente não tem tratamento aberto ainda, abre um prontuário zerinho agora
    if (!caso) {
      caso = { id: OS.uid('c'), pacienteId: pac.id, ine: prof.ine, abertura: hoje, status: 'ativo', alta: null, retornoPrevisto: null, plano: [] };
      db.casos.push(caso);
    }
    // Acrescenta os novos dentes/procedimentos planejados para as próximas consultas
    (dados.planoNovo || []).forEach((i) => caso.plano.push({ id: OS.uid('i'), dente: i.dente || '', procId: i.procId, status: 'planejado', feitoEm: null }));
    // B1 é registrado automaticamente: 1ª consulta programada, 1 vez a cada 12 meses
    const tipo = jaTeveB1 || db.atendimentos.some((a) => a.casoId === caso.id) ? 'retorno' : 'primeira';
    // marca itens do plano como feitos ou inclui o que foi realizado fora do plano (surpresa na cadeira!)
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
    // Se deu alta ("tratamento concluído"), fecha o caso e comemora o B2; senão agenda retorno (padrão 14 dias)
    if (dados.conduta === 'concluido') { caso.status = 'concluido'; caso.alta = hoje; caso.retornoPrevisto = null; }
    else caso.retornoPrevisto = dados.retornoPrevisto || OS.addDias(hoje, 14);
    OS.registrarAlteracao(`Atendimento registrado: ${pac.nome} (${tipo === 'primeira' ? 'B1' : 'retorno'}).`);
    OS.salvar();
    OS.logAcesso('atendimento', pac.id);
    return { atendimento: at, caso };
  };
})();
