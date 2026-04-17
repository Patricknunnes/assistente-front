# Tribal Wars Assistant - Frontend

Frontend para visualizar relatórios de aldeias mais vulneráveis do Tribal Wars.

## Requisitos

- Node.js 18+
- npm

Ou, para rodar via container:

- Docker

## Como rodar

### Desenvolvimento

```bash
npm install
npm run dev
```

Acesse http://localhost:5173

### Docker

```bash
docker compose up --build
```

Acesse http://localhost:3000

## Configuração da API

O frontend consome a API do backend que roda na porta 8080. Para ajustar a URL da API:

1. Copie o arquivo de exemplo:
   ```bash
   cp .env.example .env
   ```

2. Edite o `.env`:
   ```
   VITE_API_URL=http://localhost:8080
   ```

Se estiver usando Docker, altere a variável `VITE_API_URL` no `docker-compose.yml`:

```yaml
services:
  frontend:
    build:
      args:
        VITE_API_URL: http://seu-host:8080
```

> Quando a API está fora do ar, o frontend exibe dados de exemplo automaticamente.

## Endpoint consumido

```
GET {VITE_API_URL}/api/reports/weakest?playerName=otavio10ta&limit=10&from=2026-04-16T12:00:00
```

### Parâmetros

| Parâmetro    | Tipo     | Descrição                           |
|-------------|----------|-------------------------------------|
| playerName  | string   | Nome do jogador                     |
| limit       | number   | Quantidade máxima de resultados     |
| from        | datetime | Data/hora mínima dos relatórios     |

## Estrutura do projeto

```
src/
├── api/           # Client HTTP e endpoints
├── components/    # Componentes React (common/ e reports/)
├── hooks/         # Custom hooks
├── mock/          # Dados de exemplo para fallback
├── pages/         # Páginas da aplicação
├── styles/        # CSS global
├── types/         # Interfaces TypeScript
└── utils/         # Funções utilitárias
```
