<div align="center">

# VSOL Manager Pro
### Addon para MK-Auth — Gerenciamento de OLTs GPON/EPON com IA e Rede FTTH

![MK-Auth](https://img.shields.io/badge/MK--Auth-23.05%2B-blue)
![PHP](https://img.shields.io/badge/PHP-7.3%2B-purple)
![React](https://img.shields.io/badge/React-19-61DAFB)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4-38BDF8)
![License](https://img.shields.io/badge/license-MIT-green)

</div>

---

## Sobre

Addon para MK-Auth que permite gerenciar OLTs VSOL, Huawei, ZTE e Intelbras diretamente no painel administrativo. Interface React moderna isolada do CSS do MK-Auth via iframe. Inclui coleta de dados via SSH nas OLTs, importação de rede FTTH via KMZ/KML e análise inteligente gratuita de anomalias.

---

## Recursos

### Dashboard
- Visão geral de ONUs, sinal e status das OLTs em tempo real
- Uptime da rede, contagem de ONUs online/offline
- Gráfico de distribuição de sinal por OLT

### Gerenciar OLTs
- Cadastro de OLTs com persistência no banco de dados (`vsol_olts`)
- Modelos suportados:
  - **VSOL GPON:** V1600G1, V1600G2, V1600G4, V1600G5, V1600G8, V1800G, V2802G, V2801RH
  - **VSOL EPON:** V1600D4, V1600D8
  - **Huawei:** MA5608T, MA5683T
  - **ZTE:** C320, C650
  - **Intelbras:** OLT-1200
- **Consulta SSH direta** — conecta na OLT, varre todas as portas PON e coleta status + sinal de cada ONU
- Auto-detecção de tecnologia: GPON (`show gpon onu state`) ou EPON (`show epon onu state`)
- Coleta de potência óptica: `show pon power attenuation`

### Lista de ONUs
- Exibe ONUs do banco `vsol_onus` (coletadas via SSH) ou `onuisp_onus` (ONU ISP addon)
- Filtros por OLT, PON, status e nível de sinal
- Classificação de sinal: Bom / Limite / Ruim / LOS / Nulo
- Exportação para CSV

### Rede FTTH & CTOs
- **Importar KMZ/KML** — arraste o arquivo do Google Earth e importe CTOs, CEOs, splitters, DIO e postes com nome, tipo e coordenadas
- Cadastro manual de CTOs com capacidade, OLT e porta PON associadas
- Barra de capacidade visual por CTO
- Associação de clientes do MK-Auth a CTOs e portas
- Mapa completo: OLTs + CTOs + clientes

### IA & Análise (gratuita, sem API externa)
- **Corte de fibra** — detecta quando ≥ 80% das ONUs de uma PON caem ao mesmo tempo
- **Splitter com defeito** — falha parcial de PON (30–80% offline)
- **Sinal degradado** — alerta quando sinal médio da PON está abaixo de -28 dBm
- **ONU instável** — variação de sinal > 2 dBm nos últimos 7 dias (análise histórica)
- **CTO lotada** — avisa CTOs com ≥ 80% de capacidade ocupada
- Histórico de sinal salvo automaticamente a cada consulta SSH

### Diagnóstico de Sinal
- Análise técnica local GPON/EPON baseada nos padrões ITU-T G.984
- Funciona 100% offline (sem conexão com OLT)
- Calcula budget óptico, margem e distância estimada

### Mapa da Rede
- Visualização geográfica de OLTs e CTOs
- Integração com Google Maps API (opcional)
- Geocodificação de endereços

### Telegram
- Alertas automáticos de ONU offline, sinal crítico e resumo diário
- Teste de conexão e envio manual pelo painel

### Configurações
- Banco de dados MySQL/MariaDB
- Parâmetros de operação: SSH timeout, keepalive, registros por página
- Níveis de sinal configuráveis (sinal bom / aceitável)
- Google Maps API Key
- Logs de atividade com histórico

---

## Requisitos

- MK-Auth 23.05 ou superior
- PHP 7.3+ com extensões: `curl`, `zip`, `simplexml`
- Node.js 18+ e npm (apenas para build)
- Composer

---

## Instalação

### 1. Clonar o repositório

```bash
cd /opt/mk-auth/admin/addons/
git clone https://github.com/charllesvale/vsol-manager vsol-optimized
cd vsol-optimized
```

### 2. Instalar dependências PHP (phpseclib para SSH)

```bash
composer require phpseclib/phpseclib:~3.0 --no-interaction
```

### 3. Instalar dependências Node e compilar o frontend

```bash
npm install
npm run build
```

### 4. Copiar arquivos PHP para o build

```bash
cp app.php index.php dist/
mkdir -p dist/api && cp api/index.php dist/api/
```

### 5. Criar tabelas no banco de dados

```bash
/usr/bin/php instalar.php
```

### 6. Criar symlink do MK-Auth

```bash
ln -sf /opt/mk-auth/include/addons.inc.hhvm addons.class.php
```

### 7. Ajustar permissões

```bash
chown -R www-data:www-data /opt/mk-auth/admin/addons/vsol-optimized/
```

### 8. Registrar no menu do MK-Auth

Adicione ao arquivo `/opt/mk-auth/admin/addons/addon.js`:

```js
$('.navbar-start').append('<div class="navbar-item has-dropdown is-hoverable"><a class="navbar-link is-size-7 has-text-weight-bold">VSOL Manager</a><div class="navbar-dropdown"><a href="/admin/addons/vsol-optimized/index.php" class="navbar-item">Abrir</a></div></div>');
```

### Acesso

```
http://SEU-SERVIDOR/admin/addons/vsol-optimized/index.php
```

> Pressione `Ctrl+Shift+R` para limpar o cache do navegador se o menu não aparecer.

---

## Atualização

```bash
cd /opt/mk-auth/admin/addons/vsol-optimized
git pull
npm run build
cp app.php index.php dist/
cp api/index.php dist/api/
chown -R www-data:www-data .
```

---

## Configuração inicial

Após instalar, acesse **Sistema & Instalação → Banco de Dados** e preencha:

| Campo | Valor padrão MK-Auth |
|---|---|
| IP/Host | `localhost` |
| Usuário | `root` |
| Senha | `vertrigo` |
| Banco | `mkradius` |

Clique em **Testar Conexão** para validar.

---

## Como usar o SSH nas OLTs

1. Acesse **Gerenciar OLTs** e cadastre sua OLT com IP, usuário e senha SSH
2. Clique em **Consultar via SSH**
3. O sistema conecta na OLT, varre todas as portas PON e salva os dados no banco
4. Acesse **Lista de ONUs** para ver o resultado

---

## Como importar a rede FTTH (KMZ/KML)

1. Acesse **Rede FTTH & CTOs**
2. Arraste seu arquivo `.kmz` ou `.kml` (exportado do Google Earth, Google Maps, etc.)
3. O sistema detecta automaticamente o tipo de cada elemento (CTO, CEO, Splitter, DIO)
4. Edite cada CTO para associar à OLT e porta PON correspondente
5. Associe os clientes do MK-Auth a cada CTO e porta

---

## Tabelas criadas no banco

| Tabela | Descrição |
|---|---|
| `vsol_config` | Configurações do addon |
| `vsol_logs` | Log de atividades |
| `vsol_olts` | OLTs cadastradas |
| `vsol_onus` | ONUs coletadas via SSH |
| `vsol_onus_historico` | Histórico de sinal por ONU (análise de IA) |
| `vsol_ctos` | CTOs, CEOs, splitters e elementos da rede FTTH |
| `vsol_cto_clientes` | Associação clientes → CTO → porta |

---

## Estrutura do projeto

```
vsol-optimized/
├── index.php              # Entry point com auth MK-Auth
├── app.php                # App React isolado via iframe
├── api/index.php          # API backend PHP (24 endpoints)
├── instalar.php           # Cria tabelas no banco via CLI
├── instalar.sh            # Script de instalação automatizada
├── deploy.sh              # Build rápido para atualizações
├── addon_vsol.js          # Registra menu no navbar do MK-Auth
├── composer.json          # Dependências PHP (phpseclib)
├── package.json           # Dependências Node
├── vite.config.ts         # Config do build
├── App.tsx                # Roteamento principal
├── types.ts               # Tipos e interfaces TypeScript
├── components/
│   ├── Navbar.tsx         # Barra de navegação
│   └── SignalChart.tsx    # Gráfico de sinal
├── pages/
│   ├── Dashboard.tsx      # Visão geral
│   ├── OLTManager.tsx     # Gerenciamento de OLTs
│   ├── ONUList.tsx        # Lista de ONUs
│   ├── CTOPage.tsx        # Rede FTTH & CTOs
│   ├── AIPage.tsx         # IA & Análise
│   ├── Diagnostics.tsx    # Diagnóstico de sinal
│   ├── MapView.tsx        # Mapa da rede
│   └── Settings.tsx       # Configurações
└── services/
    ├── api.ts             # Funções de chamada à API
    └── storage.ts         # Cache localStorage
```

---

## Autenticação

Segue o padrão do addon **ONU ISP**:

```php
include(dirname(__FILE__) . '/addons.class.php'); // carrega constantes MK-Auth
session_name('mka');
if (!isset($_SESSION['MKA_Logado'])) { /* redireciona */ }
```

---

## Licença

MIT © charllesvale
