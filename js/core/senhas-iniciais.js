// ============================================================================
// SENHAS INICIAIS DE DEMO (só para ambiente de testes/apresentação, viu?!)
// Na vida real, nunca deixe senhas soltas no código assim — a não ser que
// queira que o paciente curioso troque.
// ============================================================================
(function () {
  // Garante que o "armário" global OS exista antes de guardar as chaves
  const OS = (window.OS = window.OS || {});

  // Senhas iniciais de cada profissional cadastrado no sistema:
  // pr1 = Dr. Ramon (o chefão), pr2 = Dra. Ana, pr3 = Camila (TSB)
  OS.SENHAS_INICIAIS = {
    pr1: 'Ramon@2026',
    pr2: 'Ana@2026',
    pr3: 'Camila@2026'
  };

  // Lista VIP de quem tem superpoderes administrativos (pode criar usuário e resetar senha)
  OS.ADMIN_IDS = ['pr1'];
})();
