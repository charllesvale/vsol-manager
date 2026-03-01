# VSOL Manager Pro v2.0

> Addon para o sistema **MK-Auth** voltado ao gerenciamento de OLTs e ONUs em redes GPON/EPON.  
> 100% independente de serviços externos — sem IA, sem Gemini, sem dependência de internet para funcionar.

![TypeScript](https://img.shields.io/badge/TypeScript-93%25-blue?style=flat-square&logo=typescript)
![PHP](https://img.shields.io/badge/PHP-Backend-777BB4?style=flat-square&logo=php)
![MK-Auth](https://img.shields.io/badge/MK--Auth-Addon-orange?style=flat-square)
![Vite](https://img.shields.io/badge/Build-Vite-646CFF?style=flat-square&logo=vite)

---

## Paginas

| Pagina | Descricao |
|---|---|
| **Dashboard** | Visao geral com total de OLTs, ONUs online/offline e logs recentes |
| **Gerenciar OLTs** | Cadastro, edicao e remocao de OLTs com teste de conectividade (ping via PHP) |
| **ONUs / ONTs** | Lista completa de ONUs com status de sinal, cards de contagem, filtros e paginacao |
| **Diagnostico de Sinal** | Analise tecnica local de RX/TX/distancia baseada no padrao GPON ITU-T G.984 |
| **Configuracoes** | Banco de dados, parametros de operacao, alertas Telegram, backup e logs |

---

## Controle de Acesso

O arquivo `index.php` verifica a sessao do MK-Auth antes de servir o app.
Qualquer acesso sem login e redirecionado automaticamente para `/admin/login.php`.

```php
// Verifica $_SESSION['admin_login'] definida pelo MK-Auth
if (!isset($_SESSION['admin_login']) || empty($_SESSION['admin_login'])) {
    header('Location: /admin/login.php');
    exit;
}
```

---

## Estrutura de Arquivos

```
vsol-optimized/
├── index.php               <- Entry point com guard de autenticacao MK-Auth
├── index.html              <- Entry point HTML (apenas para desenvolvimento local)
├── index.tsx               <- Entry point React
├── App.tsx                 <- Roteamento principal
├── types.ts                <- Interfaces e enums TypeScript
├── vite.config.ts          <- Configuracao do build
├── package.json
├── api/
│   └── index.php           <- API backend (test_db, list_onus, ping_host, backup)
├── components/
│   ├── Navbar.tsx          <- Barra de navegacao responsiva
│   └── SignalChart.tsx     <- Grafico de sinal das OLTs
├── pages/
│   ├── Dashboard.tsx       <- Visao geral e estatisticas
│   ├── OLTManager.tsx      <- CRUD de OLTs com teste de ping
│   ├── ONUList.tsx         <- Listagem de ONUs com filtros e paginacao
│   ├── Diagnostics.tsx     <- Diagnostico de sinal optico (100% offline)
│   └── Settings.tsx        <- Configuracoes completas do sistema
└── services/
    ├── api.ts              <- Cliente HTTP para a API PHP
    └── storage.ts          <- Persistencia localStorage com fallback em memoria
```

---

## Instalacao no Servidor MK-Auth

### 1. Clonar ou enviar os arquivos

```bash
# Via Git
cd /opt/mk-auth/admin/addons/
git clone https://github.com/charllesvale/vsol-manager vsol-optimized

# Ou via SCP (do seu computador)
scp -r vsol-optimized/ root@IP_DO_SERVIDOR:/opt/mk-auth/admin/addons/
```

### 2. Compilar no servidor via SSH

```bash
cd /opt/mk-auth/admin/addons/vsol-optimized

npm install
npm run build

# MK-Auth serve PHP — renomear o index gerado
mv dist/index.html dist/index.php

# Copiar build para raiz do addon e ajustar permissoes
cp -r dist/* .
chown -R www-data:www-data .
```

### 3. Registrar no menu do MK-Auth

Edite `/opt/mk-auth/admin/addons/addon.js` e adicione:

```js
var addon_url = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ':' + window.location.port: '') + "/admin/";
add_menu.provedor('{"plink": "' + addon_url + 'addons/vsol-optimized/index.php", "ptext": "VSOL Manager Pro"}');
```

### 4. Limpar cache do navegador

Pressione `Ctrl + Shift + R` — o menu **VSOL Manager Pro** aparecera no painel do MK-Auth.

---

## Configuracao Inicial

Acesse **Configuracoes > Banco de Dados** e preencha:

| Campo | Padrao | Descricao |
|---|---|---|
| IP do Servidor | `172.31.255.2` | IP interno do MK-Auth |
| Banco de Dados | `mk_auth` | Nome do banco MySQL |
| Usuario MySQL | `root` | Usuario do banco |
| Senha MySQL | `vertrigo` | Senha do banco |

Clique em **Testar Conexao** para validar com o MySQL antes de salvar.

---

## Parametros de Operacao

Acesse **Configuracoes > Operacao**:

| Parametro | Padrao | Descricao |
|---|---|---|
| Registros por Pagina | `30` | Paginacao na listagem de ONUs |
| Registros por Cron | `50` | ONUs processadas por execucao do Cron |
| Tempo Check ONU Cron | `A cada 12 horas` | Frequencia de verificacao automatica |
| SSH Timeout | `10` | Timeout de conexao SSH nas OLTs |
| SSH Keepalive | `30` | Intervalo de keepalive SSH |
| Sinal Bom <= | `-27.00` | Limiar de sinal considerado bom (dBm) |
| Sinal Aceitavel <= | `-30.00` | Limiar de sinal aceitavel (dBm) |
| Token Telegram | — | Token do bot para alertas LOS/offline |
| Chat ID Telegram | — | ID do chat que recebe os alertas |

---

## Listagem de ONUs

A pagina **ONUs / ONTs** consulta o banco MySQL via `api/index.php` e exibe:

Cards de contagem clicaveis por categoria de sinal:

| Card | Descricao |
|---|---|
| Nulo | Sem sinal (RX = 0 ou menor que -40 dBm) |
| LOS / Offline | Perda de sinal ou ONU offline |
| Desligada | ONU desconectada manualmente |
| RX Bom | Sinal dentro da faixa ideal |
| RX Limite | Sinal na zona marginal |
| RX Ruim | Sinal abaixo do limiar aceitavel |

- Filtros por OLT, porta PON e busca livre por SN / nome / IP
- Paginacao configuravel (padrao: 30 registros/pagina)
- Quando o banco nao esta configurado, exibe dados de demonstracao

---

## Diagnostico de Sinal

Analise local baseada no padrao **GPON ITU-T G.984**, sem internet:

| Nivel | Faixa RX | Indicador |
|---|---|---|
| Excelente | -8 a -18 dBm | Verde |
| Bom | -18 a -24 dBm | Azul |
| Marginal | -24 a -27 dBm | Amarelo |
| Critico | abaixo de -27 dBm | Vermelho |
| LOS | abaixo de -40 dBm | Vermelho |

O diagnostico calcula automaticamente:
- **Link Budget** (TX menos RX em dB)
- **Atenuacao esperada** (0,35 dB/km x distancia)
- **Margem** disponivel no trecho
- **Possiveis causas** e **recomendacoes** tecnicas ordenadas por probabilidade

---

## Backup

Acesse **Configuracoes** e clique em **Gerar Backup** (topo da pagina).

- **Com backend PHP:** baixa JSON completo via `api/index.php?action=backup`
- **Sem backend (modo dev):** exporta dados do localStorage localmente

---

## API Backend PHP

Todos os endpoints em `api/index.php` exigem sessao valida do MK-Auth (`$_SESSION['admin_login']`).
Requisicoes sem sessao retornam `HTTP 401`.

| Endpoint | Metodo | Descricao |
|---|---|---|
| `?action=test_db` | POST | Testa conexao MySQL e retorna versao do servidor |
| `?action=list_onus` | GET | Lista todas as ONUs do banco `mk_auth` |
| `?action=ping_host&ip=X.X.X.X` | GET | Faz ping no host e retorna latencia |
| `?action=backup` | GET | Baixa backup JSON das configuracoes |

---

## Dependencias

| Pacote | Versao | Uso |
|---|---|---|
| `react` | ^19.2.0 | Interface |
| `react-dom` | ^19.2.0 | Renderizacao |
| `lucide-react` | ^0.555.0 | Icones |
| `recharts` | ^3.5.0 | Graficos |
| `vite` | ^6.2.0 | Build |
| `typescript` | ~5.8.2 | Tipagem |

Nenhuma dependencia de IA ou servicos externos.

---

## Licenca

Uso livre para provedores de internet utilizando MK-Auth.
