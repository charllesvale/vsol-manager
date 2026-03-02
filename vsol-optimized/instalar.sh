#!/bin/bash
# =====================================================
# VSOL Manager Pro - Instalador/Atualizador
# Padrão idêntico ao ONU ISP (Bruno Alencar)
# Execute: bash instalar.sh
# =====================================================
clear
echo -e "\e[34m-------------------------------------------\e[0m"
echo -e "\e[34m- INSTALANDO/ATUALIZANDO VSOL MANAGER PRO -\e[0m"
echo -e "\e[34m- Addon para MK-Auth                      -\e[0m"
echo -e "\e[34m-------------------------------------------\e[0m"
echo ""
echo "Inicializando em 3 segundos..."
echo ""
sleep 3

# Variáveis — igual ONU ISP
BASE_ADDONS_MKAUTH="/opt/mk-auth/admin/addons"
BASE_ADDON_DIR_MKAUTH="/opt/mk-auth/admin/addons/vsol-optimized"
BASE_ADDON_FILE_MKAUTH="/opt/mk-auth/admin/addons/vsol-optimized/index.php"
BASE_ADDON_FILE_JS_MKAUTH="/opt/mk-auth/admin/addons/addon_vsol.js"
DATA_ATUAL=$(date +'%Y-%m-%d.%H%M%S')
RED="\e[31m"
GREEN="\e[32m"
ENDCOLOR="\e[0m"

# Verifica versão do PHP — igual ONU ISP
MIN_VERSION="5.6.0"
MAX_VERSION="8.4.0"
PHP_VERSION=$(php -r "echo PHP_VERSION;")
function php_version_compare() {
    COMPARE_OP=$1
    TEST_VERSION=$2
    RESULT=$(php -r 'echo version_compare(PHP_VERSION, "'${TEST_VERSION}'", "'${COMPARE_OP}'") ? "TRUE" : "";')
    test -n "${RESULT}"
}
if ( php_version_compare "<" "${MIN_VERSION}" || php_version_compare ">" "${MAX_VERSION}" ); then
    echo "ERRO: PHP ${PHP_VERSION} incompatível (aceitos: ${MIN_VERSION} ~ ${MAX_VERSION})"
    echo ""
    exit 1
else
    echo "OK - PHP $PHP_VERSION versão compatível"
    echo ""
fi

sleep 1

# Verifica se o script está sendo executado de dentro da pasta do addon
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ ! -f "$SCRIPT_DIR/package.json" ]; then
    echo "ERRO: Execute este script de dentro da pasta vsol-optimized/"
    echo "      cd /opt/mk-auth/admin/addons/vsol-optimized && bash instalar.sh"
    exit 1
fi

# Faz backup da versão anterior se já existir — igual ONU ISP
if [[ -f "$BASE_ADDON_FILE_MKAUTH" ]]; then
    echo "Fazendo backup da versão anterior em /root/vsol-optimized-$DATA_ATUAL.zip ..."
    zip -r "/root/vsol-optimized-$DATA_ATUAL.zip" "$BASE_ADDON_FILE_JS_MKAUTH" "$BASE_ADDON_DIR_MKAUTH" 2>/dev/null
    echo ""
fi

# Atualiza repositórios e instala dependências — igual ONU ISP
echo "Atualizando repositórios..."
apt update -qq
echo ""
echo "Instalando dependências PHP (snmp, curl, zip)..."
apt install -y snmp php-snmp php-curl zip
echo ""

# Instala Node.js se não existir
if ! command -v node &> /dev/null; then
    echo "Instalando Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - 2>/dev/null
    apt install -y nodejs
fi
echo "OK - Node.js $(node -v)"
echo ""

# Build da aplicação React
echo "Compilando aplicação React..."
cd "$SCRIPT_DIR"
# Força reinstalação para garantir que Tailwind e PostCSS estejam instalados
rm -rf node_modules package-lock.json 2>/dev/null
npm install --silent
npm run build

# Prepara para MK-Auth: substitui index.html pelo index.php com verificação de sessão
rm -f "$SCRIPT_DIR/dist/index.html"
cp "$SCRIPT_DIR/index.php"     "$SCRIPT_DIR/dist/index.php"
cp "$SCRIPT_DIR/app.php"       "$SCRIPT_DIR/dist/app.php"
mkdir -p "$SCRIPT_DIR/dist/api"
cp "$SCRIPT_DIR/api/index.php" "$SCRIPT_DIR/dist/api/index.php"

# Copia o build para a raiz do addon
cp -r "$SCRIPT_DIR/dist/"* "$SCRIPT_DIR/"
echo "OK - Build concluído."
echo ""

# Permissões — igual ONU ISP
chown -R "www-data:www-data" "$BASE_ADDON_DIR_MKAUTH"
echo "OK - Permissões ajustadas."
echo ""

# Cria o symlink addons.class.php → addons.inc.hhvm — EXATAMENTE igual ONU ISP
ln -sf /opt/mk-auth/include/addons.inc.hhvm "$BASE_ADDON_DIR_MKAUTH/addons.class.php"
echo "OK - Symlink addons.class.php criado."
echo ""

# Registra o menu no MK-Auth — igual addon_onuisp.js
cp "$SCRIPT_DIR/addon_vsol.js" "$BASE_ADDON_FILE_JS_MKAUTH"
echo "OK - Menu registrado em $BASE_ADDON_FILE_JS_MKAUTH"
echo ""

# Instala tabelas no banco de dados via PHP CLI — igual ONU ISP
echo "Criando tabelas no banco de dados..."
/usr/bin/php "$BASE_ADDON_DIR_MKAUTH/instalar.php"
echo ""

# Fim — igual ONU ISP
echo -e "${GREEN}VSOL MANAGER PRO INSTALADO/ATUALIZADO COM SUCESSO :)${ENDCOLOR}"
echo ""
echo -e "${RED}Acesse agora o painel administrativo do MK-Auth e veja o novo menu 'VSOL Manager'.${ENDCOLOR}"
echo -e "${RED}Limpe o cache do navegador (Ctrl+Shift+R) se o menu não aparecer.${ENDCOLOR}"
echo ""
exit 0
