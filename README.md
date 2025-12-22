# TP2 – Desenvolvimento de Aplicações Web  
## API Meteorológica IPMA (Node.js + Express + Prisma)

Este projeto implementa um sistema completo de **integração, processamento, armazenamento e exposição de dados meteorológicos** provenientes do IPMA, recorrendo a uma API REST documentada com Swagger e a um frontend web simples para consumo da API.

---

## 1. Tecnologias Utilizadas

- Node.js
- Express.js
- Prisma ORM
- SQLite
- Axios
- node-cron
- Swagger / OpenAPI
- HTML, CSS, JavaScript (Frontend)

---

## 2. Estrutura do Projeto

├── prisma/
│ ├── schema.prisma
│ ├── seed.cjs
│ └── migrations/
│
├── public/
│ ├── index.html
│ ├── app.js
│ └── style.css
│
├── src/
│ ├── app.js
│ ├── server.js
│ ├── cron.js
│ ├── swagger.js
│ ├── sync-now.js
│ ├── services/
│ │ ├── ipma.service.js
│ │ └── sync.service.js
│ └── middlewares/
│ └── apiKey.middleware.js
│
├── tests/
│ └── api_crud_tests.mjs
│
├── arquitetura.md
├── .env
├── package.json
└── README.md


---

## 3. Documentação dos Ficheiros

### 3.1 Backend

#### `src/server.js`
- Ponto de entrada da aplicação
- Inicia o servidor Express
- Arranca o cron de sincronização automática

**Entrada:** variáveis de ambiente  
**Saída:** servidor ativo na porta configurada

---

#### `src/app.js`
- Configuração principal da aplicação Express
- Define middlewares
- Define todos os endpoints REST
- Serve o frontend (`public/`)
- Expõe Swagger em `/docs`

---

#### `src/cron.js`
- Define a sincronização automática com o IPMA
- Usa `node-cron`

**Variável de ambiente:**
- `SYNC_CRON` (default: `5 * * * *` → de hora a hora ao minuto 5)

---

#### `src/services/ipma.service.js`
- Responsável por consumir a API pública do IPMA
- Usa Axios para obter previsões diárias

**Entrada:** nenhuma  
**Saída:** lista de previsões IPMA em formato normalizado

---

#### `src/services/sync.service.js`
- Serviço central de sincronização
- Processa dados IPMA
- Normaliza datas
- Calcula campos derivados (amplitude térmica)
- Faz `upsert` na base de dados
- Regista histórico de execuções (`sync_runs`)

---

#### `src/sync-now.js`
- Script para executar sincronização manual
- Útil para testes e setup inicial

---

#### `src/swagger.js`
- Configuração do Swagger/OpenAPI
- Gera documentação automaticamente a partir do `app.js`

---

### 3.2 Base de Dados (Prisma)

#### `prisma/schema.prisma`
Define os modelos:

- `City` – cidades do IPMA
- `Forecast` – previsões por cidade e data
- `Watchlist` – CRUD local
- `SyncRun` – histórico de sincronizações

---

#### `prisma/seed.cjs`
- Script de seed inicial
- Popula a tabela `City` com dados do IPMA

---

### 3.3 Frontend

#### `public/index.html`
- Interface web principal
- Permite pesquisar cidades e consultar previsões

---

#### `public/app.js`
- Consome a API REST
- Chama `/cities` e `/forecast`
- Apresenta dados graficamente (cards + gráfico)

---

#### `public/style.css`
- Estilos da aplicação
- Layout responsivo e tema escuro

---

## 4. Variáveis de Ambiente (`.env`)


DATABASE_URL="file:./dev.db"
API_KEY="troca_isto_por_uma_chave"
PORT=3000
SYNC_CRON="5 * * * *"


---

## 5. Setup e Execução do Projeto

### 5.1 Requisitos

- Node.js **>= 18**
- npm **>= 9**
- Acesso à Internet (necessário para consumir a API pública do IPMA)

---

### 5.2 Variáveis de Ambiente

O projeto utiliza as seguintes variáveis de ambiente (ficheiro `.env`):

| Variável | Obrigatória | Default | Descrição | Exemplo |
|--------|-------------|---------|-----------|---------|
| `PORT` | Não | `3000` | Porta onde o servidor Express vai correr | `PORT=3000` |
| `DATABASE_URL` | Sim | — | Localização da base de dados SQLite usada pelo Prisma | `DATABASE_URL="file:./dev.db"` |
| `API_KEY` | Sim (admin/testes) | — | Chave para proteger endpoints administrativos | `API_KEY=123456` |
| `SYNC_CRON` | Não | `5 * * * *` | Expressão cron para sincronização automática | `SYNC_CRON="5 * * * *"` |
| `BASE_URL` | Não (testes) | `http://localhost:3000` | URL base usada nos testes automatizados | `BASE_URL=http://localhost:3000` |


## 6. Setup Inicial

### 6.1 Instalar Dependências

npm install

### 6.2 Criar Base de Dados

npx prisma migrate dev


### 6.3 Carregar a Base de Dados

npx prisma db seed


### 6.4 Sincronização Manual da Base de Dados

node src/sync-now.js


## 7. Executar o Servidor

node src/server.js


### 7.1 Aceder ao Website Local

Abrir o browser e ir para o link:

http://localhost:3000/


## 8. Testes Automatizados dos Endpoints

node tests/api_crud_tests.mjs


