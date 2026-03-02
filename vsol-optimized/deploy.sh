#!/bin/bash
# Deploy rápido — apenas faz novo build (após já ter rodado instalar.sh)
set -e
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
DIR="$(cd "$(dirname "$0")" && pwd)"

echo -e "${GREEN}[VSOL] Atualizando build...${NC}"

npm install --silent
npm run build

rm -f "$DIR/dist/index.html"
cp "$DIR/index.php"  "$DIR/dist/index.php"
cp "$DIR/app.php"    "$DIR/dist/app.php"
mkdir -p "$DIR/dist/api" && cp "$DIR/api/index.php" "$DIR/dist/api/index.php"
cp -r "$DIR/dist/"* "$DIR/"

chown -R www-data:www-data "$DIR"
echo -e "${GREEN}✓ Build atualizado!${NC}"
echo -e "${YELLOW}  Limpe o cache: Ctrl+Shift+R${NC}"
