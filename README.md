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
SEED_ADMIN_PASSWORD=AdminGuizao#2026!
SEED_CLIENT_EMAIL=cliente@guizao.test
SEED_CLIENT_PASSWORD=ClienteGuizao#2026!
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

### Contas de demonstração

Depois de executar `npm run db:seed` **num banco novo**, use estas credenciais de exemplo, que correspondem aos valores acima:

| Papel | E-mail | Senha de demonstração |
| --- | --- | --- |
| Administrador | `admin@guizao.test` | `AdminGuizao#2026!` |
| Cliente | `cliente@guizao.test` | `ClienteGuizao#2026!` |

**Importante:** são apenas credenciais fictícias destinadas à avaliação local. Em uso real, escolha senhas próprias e não publique o seu `.env`. O seed não altera contas previamente cadastradas; se o banco já existia, as senhas continuam sendo as configuradas quando essas contas foram criadas.


## Regras de agendamento

- Funcionamento: **09:00 às 18:00**, em horários de início a cada **30 minutos**.
- A duração de cada serviço é considerada ao calcular o horário final do atendimento.
- Não é possível agendar no passado nem iniciar um serviço que termine após as 18:00.
- Uma reserva com status `agendado` bloqueia todos os intervalos que se sobreponham a ela, inclusive para serviços com durações diferentes.
- A tela consulta a disponibilidade, mas o servidor verifica o conflito **novamente na gravação**, retornando `409` se o horário já estiver ocupado.
- O cancelamento é **lógico**: altera o status para `cancelado` e preserva o histórico; o intervalo volta a ficar disponível.
- Datas e horários dos atendimentos são tratados conforme `America/Fortaleza`.

## API REST

| Método | Rota | Papel exigido | Status HTTP possíveis | Finalidade |
| --- | --- | --- | --- | --- |
| GET | `/api/saude` | Público | 200 | Verificar funcionamento |
| POST | `/api/auth/cadastro` | Público | 201, 400, 409, 429 | Criar conta de cliente |
| POST | `/api/auth/login` | Público | 200, 400, 401, 429 | Entrar e obter JWT |
| GET | `/api/auth/me` | Autenticado | 200, 401 | Consultar conta atual |
| GET | `/api/servicos` | Público | 200 | Listar serviços ativos |
| GET | `/api/servicos/:id` | Público | 200, 400, 404 | Consultar um serviço |
| POST | `/api/servicos` | Administrador | 201, 400, 401, 403, 409 | Cadastrar serviço |
| PUT | `/api/servicos/:id` | Administrador | 200, 400, 401, 403, 404, 409 | Atualizar serviço |
| DELETE | `/api/servicos/:id` | Administrador | 204, 400, 401, 403, 404 | Desativar serviço |
| GET | `/api/agendamentos/disponibilidade?data=AAAA-MM-DD&servico_id=1` | Público | 200, 400, 404 | Consultar horários |
| GET | `/api/agendamentos` | Autenticado | 200, 401 | Ver reservas permitidas |
| POST | `/api/agendamentos` | Autenticado | 201, 400, 401, 404, 409 | Confirmar agendamento |
| DELETE | `/api/agendamentos/:id` | Autenticado | 204, 400, 401, 404 | Cancelar reserva permitida |

Os códigos acima indicam os resultados previstos pelo tratamento explícito de cada rota. Falhas inesperadas podem retornar `500`; requisições excessivas podem receber `429` pelos limitadores globais. Em caso de `204`, não há corpo de resposta.


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

Para executar **testes automatizados de integração da API** com banco SQLite temporário, sem tocar no banco local:

```bash
npm test
```

Os testes cobrem autenticação, cadastro, permissões, CRUD de serviços, conflitos de agendamento, isolamento entre clientes e cancelamento. Na validação local de 27/11/2026 foram aprovados 4 testes, com 0 falhas.

## Segurança e observações

- Nunca coloque senhas ou tokens no código-fonte ou no repositório.
- `.env` e arquivos `.sqlite` locais são ignorados pelo Git.
- O backend controla quais agendamentos cada usuário pode consultar ou cancelar; ocultar botões no frontend não substitui a autorização na API.
- O catálogo e a agenda pública não divulgam nomes de clientes nem dados pessoais.
- O projeto foi preparado para execução local e avaliação acadêmica. Para disponibilizá-lo publicamente, revise configurações de produção, HTTPS, persistência e estratégias de sessão.

## Modelo de dados e integridade

O arquivo `dados/schema.sql` cria três tabelas, todas com chave primária `id`:

| Tabela | Função | Restrições |
| --- | --- | --- |
| `usuarios` | Armazena contas, senha em hash e papel | `email UNIQUE`, `senha_hash NOT NULL`, `papel CHECK ('cliente','admin')` |
| `servicos` | Catálogo com preço, duração e estado ativo | `nome UNIQUE`, `duracao_minutos > 0`, `preco_centavos >= 0` |
| `agendamentos` | Relaciona cliente e serviço no intervalo escolhido | `usuario_id` e `servico_id` como FKs obrigatórias, `fim > inicio` e `status CHECK` |

Relações: `agendamentos.usuario_id → usuarios.id` e `agendamentos.servico_id → servicos.id` (com `FOREIGN KEY`, `NOT NULL` e restrição de exclusão). O banco protege integridade e unicidade de e-mails/nomes; a regra de **não sobrepor atendimentos** é garantida no servidor por consulta parametrizada e inserção na **mesma transação imediata** em `dados/repositorioAgendamentos.js`.

Em `dados/consultas.js`, `listarAgendamentos()` usa `INNER JOIN` entre as três tabelas, e `resumoServicos()` usa `LEFT JOIN`, `COUNT` e `GROUP BY`. Nenhuma consulta SQL concatena entradas de usuário.

## Regras de negócio no servidor

| Regra | Implementação |
| --- | --- |
| Não permitir horários sobrepostos entre clientes, considerando a duração | `servicos/agendamentosService.js` e `dados/repositorioAgendamentos.js` (transação; conflito → 409) |
| Não permitir início no passado nem conclusão após 18h | `servicos/agendamentosService.js` (dados inválidos → 400) |
| Cliente só pode listar/cancelar as próprias reservas | `servicos/agendamentosService.js` e `dados/repositorioAgendamentos.js` (filtro no SQL; acesso negado → 404) |
| Cadastro público jamais cria administrador | `servicos/autenticacaoService.js` e `dados/repositorioUsuarios.js` |
| Serviço inativo não pode ser reservado | `servicos/agendamentosService.js` e `dados/repositorioServicos.js` (404) |

## Medidas de segurança e arquivos

- `servicos/autenticacaoService.js`: hash de senha com `bcrypt` antes de salvar e conferência com `bcrypt.compare`.
- `servicos/autenticacaoService.js` e `middlewares/autenticacao.js`: emissão/verificação de JWT com algoritmo, emissor, público e validade definidos.
- `middlewares/autenticacao.js` e `rotas/servicos.js`: middleware de autenticação e autorização por papel.
- `dados/repositorioAgendamentos.js`: filtros por `usuario_id` no SQL para impedir IDOR e dados de outros clientes.
- `dados/repositorioServicos.js`, `dados/repositorioUsuarios.js` e `dados/repositorioAgendamentos.js`: parâmetros `?` em todas as consultas SQL, evitando injeção.
- `servidor.js`: `helmet()` para cabeçalhos HTTP, limite global de requisições e limite de JSON de 10 KB.
- `rotas/autenticacao.js`: limite especial de tentativas em login e cadastro para reduzir abuso.
- `publico/js/`: DOM com `textContent` para dados externos em vez de inserir HTML interpretável.
- `.gitignore` e `.env.example`: segredos e banco de dados local fora do controle de versão.

## Limitações conhecidas

- A agenda pressupõe um único profissional/recurso de atendimento: não há múltiplas cadeiras ou barbeiros em paralelo.
- Horário de funcionamento fixo (09h–18h), sem configuração de feriados, folgas individuais ou turnos especiais.
- O front mostra 14 dias; a API valida data, horário e conflitos mesmo em requisições diretas.
- Não há pagamento online, notificações por e-mail/WhatsApp nem recuperação de senha.
- Aplicação voltada à execução local acadêmica. Publicação na internet exigiria HTTPS, persistência, gestão de segredos e revisão de sessão.
- Senhas do seed só são aplicadas a contas ainda não cadastradas; `npm run db:seed` não redefine senhas existentes.

## Repositório

[GitHub — GuilhermeMataa/Barbearia-Guizao](https://github.com/GuilhermeMataa/Barbearia-Guizao)
