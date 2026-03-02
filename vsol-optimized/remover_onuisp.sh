#!/bin/bash
# Remove o menu do ONU ISP do MK-Auth
# Execute: bash remover_onuisp.sh

ADDON_JS="/opt/mk-auth/admin/addons/addon_onuisp.js"

if [ -f "$ADDON_JS" ]; then
    rm -f "$ADDON_JS"
    echo "OK - addon_onuisp.js removido de /opt/mk-auth/admin/addons/"
    echo "Limpe o cache do navegador (Ctrl+Shift+R) para o menu sumir."
else
    echo "OK - addon_onuisp.js já não existe."
fi

# Remove também possíveis resíduos
rm -f /opt/mk-auth/admin/addons/addon_onuisp.js 2>/dev/null
echo "Pronto!"
