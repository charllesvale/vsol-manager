#!/bin/bash
# =====================================================
# VSOL Manager Pro v2.0 — Deploy no MK-Auth
# Execute: bash deploy.sh
# =====================================================

set -e
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

ADDON_DIR="$(cd "$(dirname "$0")" && pwd)"
echo -e "${GREEN}[VSOL] Iniciando build em: $ADDON_DIR${NC}"

# 1. Instalar dependências
echo -e "${YELLOW}[1/4] npm install...${NC}"
npm install --silent

# 2. Build
echo -e "${YELLOW}[2/4] npm run build...${NC}"
npm run build

# 3. O Vite gera dist/index.html — substituir pelo index.php com guard de sessão
echo -e "${YELLOW}[3/4] Preparando index.php...${NC}"
# Copiar o index.php (guard de sessão) para dentro do dist
cp "$ADDON_DIR/index.php" "$ADDON_DIR/dist/index.php"
# Remover o index.html gerado pelo Vite (não precisa no MK-Auth)
rm -f "$ADDON_DIR/dist/index.html"

# 4. Copiar build para raiz do addon e ajustar permissões
echo -e "${YELLOW}[4/4] Copiando build e ajustando permissões...${NC}"
cp -r "$ADDON_DIR/dist/"* "$ADDON_DIR/"
chown -R www-data:www-data "$ADDON_DIR"

echo ""
echo -e "${GREEN}✓ Deploy concluído!${NC}"
echo -e "${GREEN}  Acesse: http://SEU_SERVIDOR/admin/addons/vsol-optimized/index.php${NC}"
echo -e "${YELLOW}  Pressione Ctrl+Shift+R no navegador para limpar cache.${NC}"
