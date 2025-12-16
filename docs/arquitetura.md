# Desenho e Arquitetura do Sistema

## 1. Introdução

Este projeto tem como objetivo desenvolver um sistema de integração de informação meteorológica, recorrendo a dados públicos disponibilizados pelo IPMA (Instituto Português do Mar e da Atmosfera).

Os dados são consumidos por uma aplicação local, processados e armazenados numa base de dados, e posteriormente disponibilizados através de uma API REST, devidamente documentada e segura.

O sistema segue uma arquitetura em camadas, conforme recomendado para aplicações web modernas.

## 2. Arquitetura Geral do Sistema

A arquitetura do sistema é composta por três blocos principais:

- **Fonte de Dados Externa**
- **Sistema Local**
- **Camada de Exposição (API REST + Frontend)**

### 2.1 Visão Global da Arquitetura
┌─────────────────────────┐
│        IPMA API         │
│  (dados meteorológicos) │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│     Serviço de Sync     │
│  (Node.js + Axios)      │
│  - processamento        │
│  - normalização         │
│  - filtragem            │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│    Base de Dados        │
│  SQLite + Prisma ORM    │
│  - cities               │
│  - forecasts            │
│  - watchlist            │
│  - sync_runs            │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│       API REST          │
│   Express + Swagger     │
│   + API Key             │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│     Frontend Web        │
│   HTML + CSS + JS       │
│   (browser)             │
└─────────────────────────┘



## 3. Fonte de Dados Externa

### 3.1 API IPMA

O sistema consome dados públicos fornecidos pelo IPMA, em formato JSON, nomeadamente:

- Previsões meteorológicas diárias por cidade
- Temperatura mínima e máxima
- Probabilidade de precipitação
- Classe do vento
- Tipo de estado do tempo

**Endpoint utilizado (exemplo):**
https://api.ipma.pt/open-data/forecast/meteorology/cities/daily/hp-daily-forecast-day0.json


## 4. Sistema Local

### 4.1 Linguagens e Tecnologias

- Node.js
- Express
- Prisma ORM
- SQLite
- node-cron
- Swagger / OpenAPI

### 4.2 Base de Dados

A base de dados local utiliza SQLite, sendo gerida através do Prisma ORM.

**Principais entidades:**

- **cities**
  - Informação base das cidades
  - Proveniente do seed inicial do IPMA

- **forecasts**
  - Previsões meteorológicas por cidade e data
  - Inclui campos derivados (ex.: amplitude térmica)

- **watchlist**
  - Entidade local para demonstrar operações CRUD
  - Não depende da API externa

- **sync_runs**
  - Histórico das sincronizações
  - Permite auditoria e validação do sistema

## 5. Processamento de Dados

Durante a sincronização com o IPMA, são aplicadas as seguintes operações:

- Filtragem de cidades ativas
- Conversão de tipos (strings → números)
- Normalização de datas
- Cálculo de campos derivados:
  - amplitude = tMax - tMin
- Prevenção de duplicados usando upsert
- Registo do resultado da sincronização

Este processamento garante que os dados armazenados são consistentes, normalizados e reutilizáveis.

## 6. Sincronização de Dados

### 6.1 Sincronização Manual

Disponibilizada através do endpoint protegido:
POST /admin/sync


Requer autenticação via API Key.

### 6.2 Sincronização Automática

- Implementada com node-cron
- Executada periodicamente (ex.: de hora a hora)
- Configurável através de variável de ambiente

Este mecanismo garante atualização contínua dos dados.

## 7. API REST

A aplicação expõe uma API RESTful, desenvolvida com Express.

**Exemplos de endpoints:**

- `GET /cities`
- `GET /forecast?cityId=...&date=...`
- `GET /watchlist`
- `POST /watchlist`
- `DELETE /watchlist/:cityId`
- `POST /admin/sync`
- `GET /sync-runs`

## 8. Segurança

A segurança do sistema é garantida através de:

- API Key enviada no header `x-api-key`
- Proteção dos endpoints administrativos
- Separação entre endpoints públicos e privados

## 9. Documentação

A API encontra-se totalmente documentada utilizando Swagger/OpenAPI.

A documentação pode ser acedida em:
http://localhost:3000/docs


**Permite:**

- Visualizar todos os endpoints
- Testar pedidos diretamente no browser
- Consultar parâmetros e respostas

## 10. Frontend Web

Foi desenvolvido um frontend simples, servido pela própria API, que permite:

- Pesquisar cidades
- Visualizar previsões meteorológicas
- Apresentar dados de forma gráfica:
  - Cartões informativos
  - Barras de percentagem
  - Gráfico de variação horária estimada (24h)

Este frontend demonstra o consumo real da API REST.

## 11. Conclusão

A arquitetura adotada garante:

- Separação clara de responsabilidades
- Facilidade de manutenção
- Escalabilidade
- Cumprimento integral dos requisitos do projeto

O sistema implementa uma solução completa de integração, processamento, armazenamento e exposição de dados, suportada por boas práticas de desenvolvimento web.