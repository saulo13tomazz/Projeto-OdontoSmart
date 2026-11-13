// ============================================================================
// MOTOR DE SENHAS E CRIPTOGRAFIA (SHA-256 NA RAÇA!)
// Sim, alguém escreveu SHA-256 em JavaScript puro aqui dentro para funcionar até
// abrindo o arquivo direto no navegador (file://), sem precisar de servidor!
// Mais protegido que minha casa.
// ============================================================================
(function () {
  const OS = window.OS;

  // 20 mil rodadas de hash (pra deixar hacker suando frio), mínimo 6 caracteres,
  // 5 erros bloqueia por 30 segundinhos (tempo ideal pra respirar e lembrar da ex)
  const ITER = 20000, MIN = 6, MAX_FALHAS = 5, BLOQUEIO_MS = 30000;

  // Constantes mágicas do SHA-256 geradas a partir de raízes de números primos
  // (Não mexa aqui a menos que queira inventar uma matemática nova hoje)
  const K = [], H0 = [];
  (function constantes() {
    let n = 2, c = 0;
    while (c < 64) {
      let primo = true;
      for (let i = 2; i * i <= n; i++) if (n % i === 0) { primo = false; break; }
      if (primo) {
        if (c < 8) H0[c] = (Math.pow(n, 1 / 2) % 1 * 4294967296) | 0;
        K[c] = (Math.pow(n, 1 / 3) % 1 * 4294967296) | 0;
        c++;
      }
      n++;
    }
  })();

  // Rotação circular de bits para a direita (o liquidificador do SHA-256)
  const ror = (x, n) => (x >>> n) | (x << (32 - n));

  // Calcula o hash SHA-256 de qualquer texto — transforma '123456' numa sopa irreconhecível
  function sha256(texto) {
    const msg = new TextEncoder().encode(texto), l = msg.length;

    // Prepara o bloco múltiplo de 64 bytes com padding e tamanho da mensagem no final
    const total = (((l + 8) >> 6) + 1) << 6, buf = new Uint8Array(total);
    buf.set(msg); buf[l] = 0x80;
    const dv = new DataView(buf.buffer);
    dv.setUint32(total - 8, Math.floor((l * 8) / 4294967296));
    dv.setUint32(total - 4, (l * 8) >>> 0);

    // Faz as 64 rodadas de embaralhamento em cada bloquinho de 64 bytes
    const h = H0.slice(), w = new Array(64);
    for (let off = 0; off < total; off += 64) {
      for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4);
      for (let i = 16; i < 64; i++) {
        const s0 = ror(w[i - 15], 7) ^ ror(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        const s1 = ror(w[i - 2], 17) ^ ror(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      let [a, b, c, d, e, f, g, hh] = h;
      for (let i = 0; i < 64; i++) {
        const S1 = ror(e, 6) ^ ror(e, 11) ^ ror(e, 25), ch = (e & f) ^ (~e & g);
        const t1 = (hh + S1 + ch + K[i] + w[i]) | 0;
        const S0 = ror(a, 2) ^ ror(a, 13) ^ ror(a, 22), mj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + mj) | 0;
        hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      h[0] = (h[0] + a) | 0; h[1] = (h[1] + b) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0;
      h[4] = (h[4] + e) | 0; h[5] = (h[5] + f) | 0; h[6] = (h[6] + g) | 0; h[7] = (h[7] + hh) | 0;
    }
    // Converte os 8 números de 32 bits para texto hexadecimal bem bonitinho
    return h.map((x) => (x >>> 0).toString(16).padStart(8, '0')).join('');
  }
  OS._sha256 = sha256;

  // Gera um "sal" aleatório de 16 bytes pra temperar a senha e impedir senhas iguais com hash igual
  const novoSalt = () => {
    const b = new Uint8Array(16);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(b);
    else for (let i = 0; i < b.length; i++) b[i] = Math.floor(Math.random() * 256);
    return Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('');
  };

  // Estica a senha rodando SHA-256 milhares de vezes (paciência de jó, segurança de banco!)
  const derivar = (senha, salt, iter) => {
    let h = sha256(salt + ':' + senha);
    for (let i = 1; i < iter; i++) h = sha256(h + salt + senha);
    return h;
  };

  // Comparação em tempo constante (olha cada letra até o fim pra ninguém cronometrar o erro)
  const iguais = (a, b) => {
    if (a.length !== b.length) return false;
    let r = 0;
    for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return r === 0;
  };

  // Atalho pro cofre de credenciais dentro do banco local
  const cred = () => (OS.db.credenciais = OS.db.credenciais || {});

  // API pública de senhas usada pelo login e pelas configurações
  OS.senha = {
    MIN,

    // Descobre se o profissional já tem senha cadastrada no cofre
    tem(profId) { return !!cred()[profId]; },

    // Checa se a senha não é curtinha demais e se a confirmação bate certinho
    validar(senha, confirmacao) {
      if (!senha || senha.length < MIN) return `A senha deve ter pelo menos ${MIN} caracteres.`;
      if (confirmacao !== undefined && senha !== confirmacao) return 'A confirmação não confere com a senha.';
      return '';
    },

    // Salva nova senha com salt novinho e zera o histórico de tropeços
    definir(profId, senha) {
      const salt = novoSalt();
      cred()[profId] = { salt, hash: derivar(senha, salt, ITER), iter: ITER, atualizadoEm: OS.agora(), falhas: 0, bloqueadoAte: 0 };
      OS.salvar();
    },

    // Confere se a senha digitada bate; se errar demais, aplica castigo de 30s
    verificar(profId, senha) {
      const c = cred()[profId];
      if (!c) return { ok: false, erro: 'Este perfil ainda não tem senha.' };

      const agora = Date.now();
      if (c.bloqueadoAte && c.bloqueadoAte > agora) {
        const s = Math.ceil((c.bloqueadoAte - agora) / 1000);
        return { ok: false, bloqueadoSeg: s, erro: `Muitas tentativas. Aguarde ${s}s para tentar novamente.` };
      }

      if (iguais(derivar(senha, c.salt, c.iter), c.hash)) {
        if (c.falhas || c.bloqueadoAte) { c.falhas = 0; c.bloqueadoAte = 0; OS.salvar(); }
        return { ok: true };
      }

      // Errou! Anota a derrapada e, se atingir o limite,ja era nego
      c.falhas = (c.falhas || 0) + 1;
      let erro = 'Senha incorreta.';
      if (c.falhas >= MAX_FALHAS) { c.falhas = 0; c.bloqueadoAte = agora + BLOQUEIO_MS; erro = `Senha incorreta. Perfil bloqueado por ${BLOQUEIO_MS / 1000}s.`; }
      OS.salvar();
      return { ok: false, erro };
    },

    // Verifica se o profissional é o chefão (admin)
    ehAdmin(profId) { return (OS.ADMIN_IDS || []).indexOf(profId) !== -1; },

    // Na primeira carga (ou após reset), garante que os usuários padrão recebam suas senhas iniciais
    aplicarIniciais() {
      const ini = OS.SENHAS_INICIAIS || {};
      let n = 0;
      Object.keys(ini).forEach((id) => {
        if (OS.profissional(id) && !OS.senha.tem(id) && !OS.senha.validar(String(ini[id]))) { OS.senha.definir(id, String(ini[id])); n++; }
      });
      return n;
    },

    // Dedura no log de acessos sempre que alguém erra a senha no login
    registrarFalha(prof) {
      OS.db.acessos.unshift({ quando: OS.agora(), profId: prof.id, usuario: prof.nome, acao: 'falha de login', pacienteId: null });
      OS.db.acessos = OS.db.acessos.slice(0, 300);
      OS.salvar();
    }
  };

  // Já aplica as senhas iniciais assim que o arquivo carrega (ninguém fica trancado pra fora!)
  OS.senha.aplicarIniciais();
})();
