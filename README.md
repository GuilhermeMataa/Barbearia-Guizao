# Guizao do Corte ✂️

Sistema web de gerenciamento de agendamentos para barbearia, desenvolvido como projeto acadêmico de desenvolvimento web. O cliente pode criar uma conta, fazer login, visualizar horários disponíveis, confirmar uma reserva e consultar ou cancelar seus agendamentos. O proprietário acessa um painel administrativo para acompanhar e cancelar reservas.

O agendamento é confirmado diretamente no site e registrado no **SQLite**, sem depender de WhatsApp.

## Funcionalidades

- **Cliente:** cadastro, login, agenda visual de 14 dias, horários livres ou ocupados, confirmação de reservas, histórico e cancelamento das próprias reservas.
- **Proprietário (administrador):** login, visualização de todos os agendamentos e cancelamento de reservas.
- **Serviços:** API REST com listagem, consulta, cadastro, atualização e desativação lógica (operações de escrita restritas ao administrador).
- **Disponibilidade:** consulta pública dos horários, sem revelar informações pessoais dos clientes; bloqueio de horários sobrepostos de acordo com a duração do serviço.
- **Segurança:** senhas protegidas com bcrypt, autenticação JWT, controle de acesso por perfil, consultas SQL parametrizadas, Helmet e limitação de requisições.

## Tecnologias

- **Frontend:** HTML5, CSS3 e JavaScript, com `fetch` para consumir a API.
- **Backend:** Node.js e Express.
- **Banco de dados:** SQLite com `better-sqlite3`.
- **Autenticação:** `bcrypt` e `jsonwebtoken` (JWT).
- **Segurança HTTP:** `helmet` e `express-rate-limit`.

## Pré-requisitos

- Git.
- Node.js e npm instalados.
- Navegador web atualizado.

## Instalação e execução

### 1. Clonar e instalar as dependências

```bash
git clone https://github.com/GuilhermeMataa/Barbearia-Guizao.git
cd Barbearia-Guizao
npm ci
```

### 2. Configurar o ambiente

Copie o arquivo `.env.example` para `.env`. No **PowerShell**:

```powershell
Copy-Item .env.example .env
```

Preencha o arquivo `.env` com valores próprios:

```dotenv
DB_PATH=dados/barbearia.sqlite
SEED_ADMIN_EMAIL=admin@guizao.test
SEED_ADMIN_PASSWORD=SUBSTITUA_POR_SENHA_FORTE
SEED_CLIENT_EMAIL=cliente@guizao.test
SEED_CLIENT_PASSWORD=SUBSTITUA_POR_OUTRA_SENHA_FORTE
JWT_SECRET=COLE_AQUI_UMA_CHAVE_SECRETA_ALEATORIA_SEGURA
PORT=3001
```

**Importante:** as senhas de seed devem ter pelo menos **12 caracteres** e no máximo **72 bytes**. `JWT_SECRET` precisa ter pelo menos **32 bytes**. Gere uma chave aleatória com:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Cole a saída como valor de `JWT_SECRET`. Não envie o `.env` ao GitHub; ele está protegido pelo `.gitignore`.

### 3. Criar o banco e inserir dados iniciais

```bash
npm run db:init
npm run db:seed
```

O banco utiliza as tabelas `usuarios`, `servicos` e `agendamentos`. O seed cadastra serviços de exemplo e usuários de teste com os e-mails e senhas definidos no `.env`. Os registros existentes não são sobrescritos pelo seed.

### 4. Iniciar o servidor

```bash
npm start
```

Com `PORT=3001` no `.env`, acesse:

| Página | Endereço |
| --- | --- |
| Página inicial e agenda pública | http://localhost:3001/ |
| Cadastro de cliente | http://localhost:3001/cadastro.html |
| Login e painel do cliente | http://localhost:3001/painel-cliente.html |
| Login e painel do proprietário | http://localhost:3001/painel-admin.html |
| Saúde da API | http://localhost:3001/api/saude |

Se `PORT` não for definido, o servidor usa a porta **3000**.

## Como utilizar

**Cliente:** acesse `Criar conta` ou `Entrar` na página inicial. Depois do login, escolha o serviço, o dia e um horário livre na grade. Clique em confirmar para registrar a reserva. O histórico de agendamentos permite visualizar o status e cancelar as próprias reservas.

**Proprietário:** entre na `Área do Proprietário` usando o usuário administrador configurado no seed. O painel mostra as reservas dos clientes e oferece opção de cancelamento.

O cadastro público sempre cria contas com o perfil **cliente**; ele não permite criar administradores.

## Regras de agendamento

- Funcionamento: **09:00 às 18:00**, em horários de início a cada **30 minutos**.
- A duração de cada serviço é considerada ao calcular o horário final do atendimento.
- Não é possível agendar no passado nem iniciar um serviço que termine após as 18:00.
- Uma reserva com status `agendado` bloqueia todos os intervalos que se sobreponham a ela, inclusive para serviços com durações diferentes.
- A tela consulta a disponibilidade, mas o servidor verifica o conflito **novamente na gravação**, retornando `409` se o horário já estiver ocupado.
- O cancelamento é **lógico**: altera o status para `cancelado` e preserva o histórico; o intervalo volta a ficar disponível.
- Datas e horários dos atendimentos são tratados conforme `America/Fortaleza`.

## API REST

| Método | Rota | Acesso | Finalidade |
| --- | --- | --- | --- |
| GET | `/api/saude` | Público | Verificar o funcionamento da API |
| POST | `/api/auth/cadastro` | Público | Cadastrar cliente |
| POST | `/api/auth/login` | Público | Autenticar e obter JWT |
| GET | `/api/auth/me` | Autenticado | Consultar a própria conta |
| GET | `/api/servicos` | Público | Listar serviços ativos |
| GET | `/api/servicos/:id` | Público | Consultar serviço |
| POST | `/api/servicos` | Administrador | Cadastrar serviço |
| PUT | `/api/servicos/:id` | Administrador | Atualizar serviço |
| DELETE | `/api/servicos/:id` | Administrador | Desativar serviço |
| GET | `/api/agendamentos/disponibilidade?data=AAAA-MM-DD&servico_id=1` | Público | Consultar horários livres e ocupados |
| GET | `/api/agendamentos` | Autenticado | Listar as próprias reservas ou todas, se administrador |
| POST | `/api/agendamentos` | Autenticado | Confirmar uma reserva |
| DELETE | `/api/agendamentos/:id` | Autenticado | Cancelar uma reserva permitida |

### Exemplo de criação de agendamento

Faça login em `/api/auth/login` com `email` e `senha` para receber um token JWT. Envie o token no cabeçalho `Authorization: Bearer <token>`.

```http
POST /api/agendamentos
Content-Type: application/json
Authorization: Bearer <token>

{
  "servico_id": 1,
  "data": "2026-12-05",
  "horario": "11:00"
}
```

Em caso de sucesso, a API responde **HTTP 201** e retorna os dados da reserva criada. Alguns outros códigos utilizados incluem `400` (dados inválidos), `401` (não autenticado), `403` (sem permissão), `404` (recurso indisponível ou não acessível), `409` (conflito) e `429` (limite de requisições).

## Estrutura do projeto

```text
Barbearia-Guizao/
├── dados/                 # Conexão, esquema SQL, seed e repositórios
├── middlewares/           # Autenticação e autorização JWT
├── publico/               # HTML, CSS e JavaScript do frontend
│   ├── css/
│   ├── js/
│   ├── index.html
│   ├── cadastro.html
│   ├── painel-cliente.html
│   └── painel-admin.html
├── rotas/                 # Endpoints Express
├── servicos/              # Regras de negócio
├── testes/                # Verificações e consultas SQL
├── esquema.js             # Inicialização das tabelas
├── servidor.js            # Servidor Express
├── .env.example           # Modelo de configuração
└── package.json
```

A aplicação organiza as responsabilidades em **rotas → serviços → repositórios de dados**, mantendo a lógica de negócio separada do acesso ao SQLite.

## Verificações e testes

Para executar as consultas SQL de demonstração, incluindo `JOIN` e agregação:

```bash
npm run db:consultas
```

Para conferir a sintaxe dos arquivos principais:

```bash
node --check servidor.js
node --check rotas/agendamentos.js
node --check servicos/agendamentosService.js
node --check publico/js/painel-cliente.js
```

**Cenários de validação manual:** cadastro de cliente; login de ambos os perfis; agendamento válido; bloqueio de horário ocupado; rejeição de data passada; listagem limitada ao cliente autenticado; cancelamento próprio; tentativa de cancelar reserva de outro usuário; atualização da disponibilidade após cancelamento.

> **Estado atual dos testes:** o script `npm test` ainda não executa uma suíte automatizada (é um placeholder no `package.json`). Os testes automatizados de integração serão adicionados em uma etapa posterior.

## Segurança e observações

- Nunca coloque senhas ou tokens no código-fonte ou no repositório.
- `.env` e arquivos `.sqlite` locais são ignorados pelo Git.
- O backend controla quais agendamentos cada usuário pode consultar ou cancelar; ocultar botões no frontend não substitui a autorização na API.
- O catálogo e a agenda pública não divulgam nomes de clientes nem dados pessoais.
- O projeto foi preparado para execução local e avaliação acadêmica. Para disponibilizá-lo publicamente, revise configurações de produção, HTTPS, persistência e estratégias de sessão.

## Repositório

[GitHub — GuilhermeMataa/Barbearia-Guizao](https://github.com/GuilhermeMataa/Barbearia-Guizao)
