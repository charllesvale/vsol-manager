<div align="center">

# VSOL Manager Pro
### Addon para MK-Auth — Gerenciamento de OLTs GPON/EPON

![MK-Auth](https://img.shields.io/badge/MK--Auth-23.05%2B-blue)
![PHP](https://img.shields.io/badge/PHP-7.3%2B-purple)
![React](https://img.shields.io/badge/React-19-61DAFB)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4-38BDF8)
![License](https://img.shields.io/badge/license-MIT-green)

</div>

---

## 📋 Sobre

Addon para MK-Auth que permite gerenciar OLTs VSOL, Huawei, ZTE e Intelbras diretamente no painel administrativo. Interface React moderna com visual isolado do CSS do MK-Auth via iframe.

## ✨ Funcionalidades

- **Dashboard** — visão geral de ONUs, sinal e status das OLTs
- **Gerenciar OLTs** — cadastro, edição e remoção de OLTs com teste de conectividade
- **Diagnóstico de Sinal** — análise local GPON/EPON baseada nos padrões ITU-T G.984, 100% offline
- **Configurações** — banco de dados, operação e logs de atividade

## 📦 Instalação

### Requisitos
- MK-Auth 23.05 ou superior
- PHP 7.3+
- Node.js 18+

### Passo a passo

```bash
# 1. Clonar o repositório dentro dos addons do MK-Auth
cd /opt/mk-auth/admin/addons/
git clone https://github.com/charllesvale/vsol-manager vsol-optimized
cd vsol-optimized

# 2. Rodar o instalador (faz tudo automaticamente)
bash instalar.sh
```

O `instalar.sh` realiza automaticamente:
- Instalação das dependências PHP (`php-snmp`, `php-curl`, `zip`)
- Instalação do Node.js se necessário
- `npm install` + `npm run build`
- Criação do symlink `addons.class.php → addons.inc.hhvm` (padrão MK-Auth)
- Registro do menu em `/opt/mk-auth/admin/addons/addon_vsol.js`
- Criação das tabelas no banco de dados via `instalar.php`
- Ajuste de permissões `www-data`

### Acesso
```
http://SEU-SERVIDOR/admin/addons/vsol-optimized/index.php
```
> Limpe o cache do navegador (`Ctrl+Shift+R`) se o menu não aparecer.

## 🔄 Atualização

```bash
cd /opt/mk-auth/admin/addons/vsol-optimized
git pull
bash instalar.sh
```

## 🗂️ Estrutura

```
vsol-optimized/
├── index.php          # Entry point com auth MK-Auth (session mka / MKA_Logado)
├── app.php            # App React isolado via iframe (sem conflito com Bulma)
├── api/index.php      # API backend PHP
├── instalar.php       # Cria tabelas no banco via CLI
├── instalar.sh        # Instalador completo (padrão ONU ISP)
├── deploy.sh          # Build rápido para atualizações
├── addon_vsol.js      # Registra menu no navbar do MK-Auth
├── App.tsx            # Roteamento principal React
├── index.tsx          # Entry point React
├── index.css          # Tailwind CSS
├── tailwind.config.js
├── postcss.config.js
├── vite.config.ts
├── components/
│   ├── Navbar.tsx
│   └── SignalChart.tsx
├── pages/
│   ├── Dashboard.tsx
│   ├── OLTManager.tsx
│   ├── Diagnostics.tsx
│   └── Settings.tsx
└── services/
    ├── api.ts
    └── storage.ts
```

## ⚙️ Como funciona a autenticação

Segue o mesmo padrão do addon **ONU ISP**:

```php
// Symlink criado pelo instalar.sh (igual ONU ISP)
ln -sf /opt/mk-auth/include/addons.inc.hhvm addons.class.php

include(dirname(__FILE__) . '/addons.class.php'); // carrega constantes MK-Auth
session_name('mka');                              // nome de sessão do MK-Auth
if (!isset($_SESSION['MKA_Logado'])) { ... }     // verifica login
```

## 🗄️ Tabelas criadas

| Tabela | Descrição |
|--------|-----------|
| `vsol_config` | Configurações do addon |
| `vsol_logs` | Log de atividades |
| `vsol_olts` | OLTs cadastradas |

## 📄 Licença

MIT © charllesvale
