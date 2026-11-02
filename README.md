# OdontoSmart (protótipo funcional)

Abra `index.html` (ou `pages/login.html`) no navegador. Não precisa de servidor.

## Estrutura de Pastas

```text
odontosmart/
├── index.html                  # Redirecionador inicial (sessão -> dashboard ou login)
├── README.md                   # Documentação do projeto
├── pages/                      # Telas da aplicação
│   ├── login.html              # Passo 0: INE + perfil (Dentista/TSB)
│   ├── dashboard.html          # Indicadores B1-B6 (período e profissional filtráveis)
│   ├── pacientes.html          # Base local, filtros, linha do tempo por indicador
│   ├── lembretes.html          # Níveis dos indicadores, retornos de hoje e atrasados
│   ├── atendimento.html        # Busca, cadastro, plano, procedimentos, SOAP e alertas
│   ├── acao-coletiva.html      # PSE / escovação supervisionada (B4)
│   ├── relatorios.html         # Listas de busca ativa (CSV)
│   └── configuracoes.html      # Equipe, metas, usuários, importação e-SUS, logs
├── css/                        # Estilos globais e específicos
│   ├── base.css                # Reset e layout base (cabeçalho, menu, rodapé)
│   ├── components.css          # Componentes reutilizáveis (cards, tabelas, modais, badges)
│   └── atendimento.css         # Estilos do odontograma e tela de atendimento
└── js/                         # Scripts organizados por responsabilidade
    ├── core/                   # Base de dados, seed e utilitários
    │   ├── util.js             # Utilitários gerais (datas, texto, CSV, modal)
    │   ├── seed.js             # Dados demonstrativos determinísticos
    │   └── store.js            # Persistência (localStorage) e regras de gravação
    ├── services/               # Regras de negócio e motores de cálculo
    │   ├── indicadores.js      # Motor de cálculo dos indicadores B1-B6
    │   └── alertas.js          # Motor de alertas e travas do atendimento
    ├── ui/                     # Interface compartilhada
    │   ├── layout.js           # Cabeçalho, menu de navegação, rodapé e sessão
    │   └── componentes.js      # Componentes visuais (cards de indicador, odontograma)
    └── pages/                  # Controladores específicos de cada página
        ├── login.js
        ├── dashboard.js
        ├── pacientes.js
        ├── lembretes.js
        ├── atendimento.js
        ├── acao-coletiva.js
        ├── relatorios.js
        └── configuracoes.js
```

