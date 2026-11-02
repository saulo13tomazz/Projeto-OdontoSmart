/* ===== Dados demonstrativos (gerados de forma determinística) =====
   Os números dos indicadores NÃO são escritos aqui: são calculados pelo motor
   (indicadores.js) a partir destes registros, então nunca ficam inconsistentes. */
(function () {
  const OS = window.OS;

  OS.CATALOGO = [
    { id: 'prev_fluor', sigtap: '0101020058', nome: 'Aplicação tópica de flúor', curto: 'Flúor', categoria: 'preventivo' },
    { id: 'prev_selante', sigtap: '0101020074', nome: 'Aplicação de selante', curto: 'Selante', categoria: 'preventivo' },
    { id: 'prev_evid', sigtap: '0101020082', nome: 'Evidenciação de placa bacteriana', curto: 'Evid.', categoria: 'preventivo' },
    { id: 'prev_cariostatico', sigtap: '0101020066', nome: 'Aplicação de cariostático', curto: 'Cariost.', categoria: 'preventivo' },
    { id: 'prev_profilaxia', sigtap: '', nome: 'Profilaxia / raspagem supragengival', curto: 'Profil.', categoria: 'preventivo' },
    { id: 'prev_orient', sigtap: '', nome: 'Orientação de higiene bucal', curto: 'Orient.', categoria: 'preventivo' },
    { id: 'rest_resina', sigtap: '', nome: 'Restauração em resina composta', curto: 'Resina', categoria: 'restaurador' },
    { id: 'rest_art', sigtap: '', nome: 'Restauração atraumática (ART)', curto: 'ART', categoria: 'restaurador', art: true },
    { id: 'cir_exo', sigtap: '0414020120', nome: 'Exodontia de dente permanente', curto: 'Exo', categoria: 'cirurgico', exodontia: true },
    { id: 'cir_exo_dec', sigtap: '', nome: 'Exodontia de dente decíduo', curto: 'Exo dec.', categoria: 'cirurgico', exodontia: true },
    { id: 'out_urgencia', sigtap: '', nome: 'Acesso à polpa / medicação (urgência)', curto: 'Urgên.', categoria: 'outro' }
  ];

  OS.METAS_PADRAO = {
    B1: { tipo: 'min', otimo: 15, bom: 13, suficiente: 8, peso: 2 },
    B2: { tipo: 'min', otimo: 75, bom: 60, suficiente: 45, peso: 2 },
    B3: { tipo: 'max', otimo: 8, bom: 12, suficiente: 16, peso: 2 },
    B4: { tipo: 'min', otimo: 100, bom: 75, suficiente: 50, peso: 2 },
    B5: { tipo: 'faixa', otimoMin: 65, otimoMax: 85, bomMin: 50, bomMax: 95, sufMin: 35, sufMax: 100, peso: 1 },
    B6: { tipo: 'info', peso: 1 }
  };
  OS.PONTOS_PADRAO = { otimo: 1, bom: 0.75, suficiente: 0.5, regular: 0.25 };

  OS.gerarSeed = function () {
    let s = 20260101;
    const rnd = () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
    const pick = (a) => a[Math.floor(rnd() * a.length)];
    const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const dig = (n) => Array.from({ length: n }, () => ri(0, 9)).join('');
    const hoje = OS.hoje();
    const dias = (n) => OS.addDias(hoje, -n);

    const INE1 = '0001849201', INE2 = '0001849202';
    const ines = [
      { ine: INE1, equipe: 'eSB Unidade Centro I', cargaHoraria: 40, populacaoVinculada: 350 },
      { ine: INE2, equipe: 'eSB Unidade Centro II', cargaHoraria: 20, populacaoVinculada: 175 }
    ];
    const profissionais = [
      { id: 'pr1', nome: 'Dr. Ramon Rodrigues', cbo: 'CD', cboCodigo: '223293', registro: 'CRO-PB (fictício)', ine: INE1 },
      { id: 'pr2', nome: 'Ana Beatriz Souza', cbo: 'TSB', cboCodigo: '322425', registro: 'CRO-PB (fictício)', ine: INE1 },
      { id: 'pr3', nome: 'Dra. Camila Torres', cbo: 'CD', cboCodigo: '223293', registro: 'CRO-PB (fictício)', ine: INE2 }
    ];

    /* ---------- Pacientes: 350 cadastrados, 100 crianças de 6 a 12 anos ---------- */
    const fem = ['Maria', 'Ana', 'Francisca', 'Antônia', 'Adriana', 'Juliana', 'Márcia', 'Fernanda', 'Patrícia', 'Aline', 'Sandra', 'Camila', 'Luciana', 'Raimunda', 'Joana', 'Beatriz', 'Larissa', 'Elaine', 'Rita', 'Cláudia'];
    const mas = ['José', 'João', 'Antônio', 'Francisco', 'Carlos', 'Paulo', 'Pedro', 'Lucas', 'Luiz', 'Marcos', 'Rafael', 'Daniel', 'Gabriel', 'Eduardo', 'Rodrigo', 'Fábio', 'Sérgio', 'Mateus', 'Ricardo', 'Alex'];
    const sob = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Pereira', 'Lima', 'Costa', 'Ferreira', 'Rodrigues', 'Almeida', 'Nascimento', 'Alves', 'Carvalho', 'Gomes', 'Martins', 'Araújo', 'Ribeiro', 'Barbosa', 'Moreira', 'Cavalcante'];
    const nasc = (anos, extra) => { const d = OS.parse(hoje); d.setFullYear(d.getFullYear() - anos); d.setDate(d.getDate() - extra); return OS.toISO(d); };
    const mkPac = (i, o) => {
      const sexo = o.sexo || (rnd() < 0.55 ? 'F' : 'M');
      const nome = o.nome || `${pick(sexo === 'F' ? fem : mas)} ${pick(sob)} ${pick(sob)}`;
      const sn = nome.split(' ').slice(-1)[0];
      return {
        id: 'p' + String(i + 1).padStart(3, '0'), nome, sexo, ine: INE1,
        nascimento: o.nascimento, cpf: o.cpf || dig(11), cns: o.cns || '7' + dig(14), nis: o.nis !== undefined ? o.nis : (rnd() < 0.6 ? dig(11) : ''),
        mae: o.mae || `${pick(fem)} ${sn}`, tel: o.tel || `(83) 9${dig(4)}-${dig(4)}`, riscos: o.riscos || []
      };
    };
    const pacientes = [];
    pacientes.push(mkPac(0, { nome: 'João da Silva', sexo: 'M', nascimento: nasc(34, 100), cpf: '12345678900', cns: '700012345678901', mae: 'Maria da Silva', tel: '(83) 98888-1122', riscos: ['diabetico'] }));
    pacientes.push(mkPac(1, { nome: 'Maria Oliveira Santos', sexo: 'F', nascimento: nasc(26, 40), cpf: '98765432111', cns: '700098765432100', mae: 'Ana Oliveira', tel: '(83) 99911-2233', riscos: ['gestante'] }));
    pacientes.push(mkPac(2, { nome: 'Carlos Eduardo Lima', sexo: 'M', nascimento: nasc(41, 200), cpf: '11122233344', cns: '', nis: '' }));
    let idx = 3;
    for (let k = 0; k < 100; k++, idx++) pacientes.push(mkPac(idx, { nascimento: nasc(ri(6, 12), ri(0, 330)) }));
    for (; idx < 350; idx++) {
      const idade = ri(13, 85), sexo = rnd() < 0.55 ? 'F' : 'M', riscos = [];
      if (sexo === 'F' && idade >= 18 && idade <= 40 && rnd() < 0.06) riscos.push('gestante');
      if (idade > 35 && rnd() < 0.12) riscos.push('diabetico');
      pacientes.push(mkPac(idx, { sexo, nascimento: nasc(idade, ri(0, 330)), riscos }));
    }

    /* ---------- Atendimentos: 42 pacientes com 1ª consulta (B1), 28 altas (B2) ---------- */
    const outros = pacientes.filter((p, i) => i >= 3);
    const sorteados = shuffle(outros).slice(0, 40);
    const alvo = [pacientes[0], pacientes[1], ...sorteados];
    const ativosIds = new Set(['p001', 'p002', ...sorteados.slice(0, 12).map((p) => p.id)]);

    const procPool = {
      prev: shuffle(Array.from({ length: 110 }, (_, i) => ['prev_fluor', 'prev_orient', 'prev_profilaxia', 'prev_selante', 'prev_evid', 'prev_cariostatico'][i % 6])),
      rest: shuffle([...Array(14).fill('rest_art'), ...Array(29).fill('rest_resina')]),
      exo: ['cir_exo', 'cir_exo', 'cir_exo'],
      out: Array(6).fill('out_urgencia')
    };
    const tirar = (id) => { for (const k of Object.keys(procPool)) { const i = procPool[k].indexOf(id); if (i >= 0) { procPool[k].splice(i, 1); return; } } };
    // procedimentos já "gastos" nos atendimentos de João e Maria (contam no total de 162)
    ['prev_fluor', 'prev_orient', 'rest_resina', 'prev_orient', 'prev_fluor'].forEach(tirar);

    const dentesAdulto = ['18','17','16','15','14','13','12','11','21','22','23','24','25','26','27','28','48','47','46','45','44','43','42','41','31','32','33','34','35','36','37','38'];
    const dentesCrianca = ['16', '26', '36', '46', '11', '21', '31', '41'];
    const soapS = ['Dor ao mastigar.', 'Sensibilidade ao frio.', 'Queixa de cavidade no dente.', 'Procura para avaliação e prevenção.', 'Sangramento gengival ao escovar.'];
    const soapO = ['Lesão de cárie em dentina.', 'Placa visível e gengivite leve.', 'Cavidade oclusal sem comprometimento pulpar.', 'Dentes hígidos, risco moderado de cárie.'];

    const casos = [], atendimentos = [];
    const poolAts = [];
    alvo.forEach((p, n) => {
      const ativo = ativosIds.has(p.id);
      const idade = OS.idade(p.nascimento);
      const base = p.id === 'p001' ? 52 : p.id === 'p002' ? 38 : ri(25, 290);
      const nAt = p.id === 'p001' || p.id === 'p002' ? 1 : ativo ? ri(1, 2) : ri(1, 3);
      const casoId = 'c' + String(n + 1).padStart(3, '0');
      const caso = { id: casoId, pacienteId: p.id, ine: INE1, abertura: dias(base), status: ativo ? 'ativo' : 'concluido', alta: null, retornoPrevisto: null, plano: [] };
      for (let k = 0; k < nAt; k++) {
        let data = OS.addDias(caso.abertura, k * ri(7, 25));
        if (data > OS.addDias(hoje, -1)) data = OS.addDias(hoje, -1);
        const ultimo = k === nAt - 1;
        const a = {
          id: `a-${casoId}-${k + 1}`, casoId, pacienteId: p.id, ine: INE1, data, profId: 'pr1',
          tipo: k === 0 ? 'primeira' : 'retorno',
          soap: { s: pick(soapS), o: pick(soapO), a: 'D82 - Doença dos dentes/gengivas (cárie)', p: ultimo && !ativo ? 'Tratamento concluído.' : 'Continuidade do plano.' },
          conduta: ultimo ? (ativo ? 'continuidade' : 'concluido') : 'continuidade', procedimentos: []
        };
        if (ultimo && !ativo) caso.alta = data;
        atendimentos.push(a); poolAts.push({ a, crianca: idade < 13, caso });
      }
      casos.push(caso);
    });

    // atendimentos de João e Maria (controlados)
    const aJ = atendimentos.find((a) => a.casoId === 'c001'), cJ = casos[0];
    aJ.soap = { s: 'Paciente relata sensibilidade no elemento 36.', o: 'Lesão de cárie oclusal em dentina no dente 36.', a: 'D82 - Cárie dentária (CIAP-2)', p: 'Retorno para restauração ART (B6) e encerramento com alta (B2).' };
    aJ.procedimentos = [{ procId: 'prev_fluor', dente: '21' }, { procId: 'prev_orient', dente: '' }, { procId: 'rest_resina', dente: '16' }];
    cJ.plano = [
      { id: 'i-j1', dente: '16', procId: 'rest_resina', status: 'feito', feitoEm: aJ.data },
      { id: 'i-j2', dente: '21', procId: 'prev_fluor', status: 'feito', feitoEm: aJ.data },
      { id: 'i-j3', dente: '36', procId: 'rest_art', status: 'planejado', feitoEm: null }
    ];
    cJ.retornoPrevisto = hoje;
    const aM = atendimentos.find((a) => a.casoId === 'c002'), cM = casos[1];
    aM.soap = { s: 'Gestante (2º trimestre) sem queixas; deseja avaliação.', o: 'Gengivite gestacional leve.', a: 'D82 - Doença gengival', p: 'Orientação, flúor e retorno para ART no 26.' };
    aM.procedimentos = [{ procId: 'prev_orient', dente: '' }, { procId: 'prev_fluor', dente: '' }];
    cM.plano = [{ id: 'i-m1', dente: '26', procId: 'rest_art', status: 'planejado', feitoEm: null }];
    cM.retornoPrevisto = OS.addDias(hoje, 7);

    // distribui o restante do pool entre os demais atendimentos
    const livres = poolAts.filter((x) => x.caso.id !== 'c001' && x.caso.id !== 'c002');
    const dente = (x, procId) => (['rest_art', 'rest_resina', 'cir_exo', 'prev_selante', 'prev_cariostatico'].includes(procId) ? pick(x.crianca ? dentesCrianca : dentesAdulto) : '');
    const todos = shuffle([...procPool.prev, ...procPool.rest, ...procPool.exo, ...procPool.out]);
    const ordem = shuffle(livres);
    todos.forEach((procId, i) => {
      let alvoAt;
      if (i < ordem.length && procId !== 'cir_exo') alvoAt = ordem[i];
      else { const cand = procId === 'cir_exo' ? livres.filter((x) => !x.crianca) : livres; alvoAt = pick(cand); }
      alvoAt.a.procedimentos.push({ procId, dente: dente(alvoAt, procId) });
    });
    livres.forEach((x) => {
      const a = x.a, cat = (id) => OS.CATALOGO.find((c) => c.id === id).categoria;
      if (a.tipo === 'retorno' && a.procedimentos.length && a.procedimentos.every((p) => cat(p.procId) === 'preventivo') && rnd() < 0.35) a.profId = 'pr2';
    });
    // plano de tratamento dos demais casos: o que foi feito + pendências nos ativos
    livres.forEach((x) => {
      x.a.procedimentos.forEach((p, i) => x.caso.plano.push({ id: `i-${x.a.id}-${i}`, dente: p.dente, procId: p.procId, status: 'feito', feitoEm: x.a.data }));
    });
    casos.forEach((c) => {
      if (c.status === 'ativo' && c.id !== 'c001' && c.id !== 'c002') {
        const proc = pick(['rest_resina', 'rest_art']);
        c.plano.push({ id: 'i-p-' + c.id, dente: pick(dentesAdulto), procId: proc, status: 'planejado', feitoEm: null });
        let r = OS.addDias(hoje, ri(-10, 20)); if (r === hoje) r = OS.addDias(hoje, 1);
        c.retornoPrevisto = r;
      }
    });

    /* ---------- Ações coletivas (B4): 85 das 100 crianças participaram ---------- */
    const criancas = shuffle(pacientes.filter((p) => OS.idade(p.nascimento) >= 6 && OS.idade(p.nascimento) <= 12));
    const part = criancas.slice(0, 85).map((p) => p.id);
    const grupos = [part.slice(0, 25), part.slice(25, 50), part.slice(50, 70), part.slice(70, 85)];
    grupos[1] = grupos[1].concat(grupos[0].slice(0, 4)); // repetições não contam duas vezes
    const locais = ['EMEF João XXIII', 'EMEF Santa Luzia', 'Escola Municipal Rui Barbosa', 'EMEF Pe. Cícero'];
    const coletivas = grupos.map((g, i) => ({
      id: 'ac' + (i + 1), data: dias(120 - i * 30), local: locais[i], tipo: 'escovacao', escovacao: true,
      profId: i % 2 ? 'pr2' : 'pr1', ine: INE1, participantes: g
    }));

    return {
      versao: 1, ines, profissionais, pacientes, casos, atendimentos, coletivas,
      procedimentos: OS.CATALOGO,
      config: { metas: JSON.parse(JSON.stringify(OS.METAS_PADRAO)), pontos: Object.assign({}, OS.PONTOS_PADRAO) },
      historico: [{ quando: OS.agora(), usuario: 'Sistema', texto: 'Base demonstrativa gerada.' }],
      acessos: []
    };
  };
})();
