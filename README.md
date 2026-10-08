# Calderaria — Ordem de Serviço

Aplicação web local para gestão de Ordens de Serviço (OS) de **Caldeiraria**, baseada no formulário padrão **TEM 16** (Rev. 08 – 10/07/2024).

## Funcionalidades

- **Tela de login** com usuários master hardcoded (sem backend)
- **Dashboard** com totais, OS em aberto, concluídas e críticas
- **Lista de OS** com filtros (busca, status, prazo/criticidade)
- **Nova / Editar OS** com todos os campos do formulário original:
  - Nº OP, Nº OS, Cliente, Item, Qtd. de Peças
  - Prazo: 72h · 24h Crítico · Imediato
  - Dados de ocorrência e abertura
  - Checkboxes de trabalho (Desamassar, Furação, Soldar, Jatear, etc.)
  - Execução (responsável, datas início/fim)
  - Insumos e Observações
- **Visualização detalhada** de cada OS
- Dados salvos no **localStorage** do navegador (persistência local)
- 100% estático — sem servidor, sem banco de dados

## Usuários master (já no código)

| Usuário  | Senha       | Nome            |
|----------|-------------|-----------------|
| `admin`  | `admin123`  | Administrador   |
| `master` | `master123` | Master User     |
| `ayrton` | `qualidade` | Ayrton R.       |
| `nelson` | `aprovador` | Nelson C.       |

> Altere os usuários em `js/app.js` (constante `USERS`).

## Como usar

### Opção 1 — Abrir direto no navegador
1. Clone ou baixe o repositório
2. Abra o arquivo `index.html` no navegador (duplo clique ou arraste)

### Opção 2 — Servidor local simples
```bash
# Com Python
python -m http.server 8080

# Ou com Node (npx)
npx serve .
```
Acesse `http://localhost:8080`

### Opção 3 — GitHub Pages
1. Em **Settings → Pages**, escolha a branch `main` e a pasta `/ (root)`
2. Acesse a URL gerada (ex: `https://historiasbiblicasapp.github.io/Calderaria`)

## Estrutura

```
Calderaria/
├── index.html          # Página principal (login + app)
├── css/
│   └── styles.css      # Estilos auxiliares
├── js/
│   └── app.js          # Lógica completa (auth, CRUD, dashboard)
└── README.md
```

## Personalização

- **Usuários**: edite o array `USERS` em `js/app.js`
- **Tipos de trabalho**: edite o array `TRABALHOS` em `js/app.js`
- **Cores / visual**: Tailwind via CDN + `css/styles.css`

## Dados de exemplo

Na primeira abertura é criada automaticamente uma OS de demonstração. Você pode excluí-la pela lista.

## Tecnologias

- HTML5 + CSS3 (Tailwind CDN)
- JavaScript vanilla (ES6+)
- localStorage / sessionStorage
- Sem dependências de build

---

**App:** Calderaria · **Padrão:** TEM 16 · **Revisão:** 8 · **Data:** 10/07/2024  
**Criador:** Ayrton R. · **Aprovador:** Nelson C. · **Setor:** Qualidade
