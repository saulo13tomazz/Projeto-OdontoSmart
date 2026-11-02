# OdontoSmart (protótipo funcional)

Abra `index.html` (ou `login.html`) no navegador. Não precisa de servidor.

## Estrutura
- `login.html` ... Passo 0: INE + perfil (Dentista/TSB)
- `dashboard.html` ... indicadores B1-B6 (período e profissional filtráveis)
- `pacientes.html` ... base local, filtros, linha do tempo por indicador
- `lembretes.html` ... níveis dos indicadores, retornos de hoje e atrasados
- `atendimento.html` ... busca, cadastro, plano, procedimentos, SOAP e alertas
- `acao-coletiva.html` ... PSE / escovação supervisionada (B4)
- `relatorios.html` ... listas de busca ativa (CSV)
- `configuracoes.html` ... equipe, metas, usuários, importação e-SUS, logs

- `css/base.css, components.css, atendimento.css`
- `js/util.js, seed.js, store.js` ... utilitários, dados demo, banco local (localStorage)
- `js/indicadores.js, alertas.js` ... motor de B1-B6 e motor de alertas
- `js/layout.js, componentes.js` ... cabeçalho/menu e componentes comuns
- `js/pages/*.js` ... um script por página
