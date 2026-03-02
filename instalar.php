<?php
/**
 * VSOL Manager Pro - instalar.php
 * Chamado via CLI pelo instalar.sh: /usr/bin/php instalar.php
 * Cria as tabelas no banco de dados do MK-Auth
 * Padrão idêntico ao ONU ISP
 */

// Carrega o ambiente do MK-Auth (define CONHOSTNAME, CONUSERNAME, CONPASSWRD, CONDATABASE)
if (file_exists(dirname(__FILE__) . '/addons.class.php')) {
    include(dirname(__FILE__) . '/addons.class.php');
} elseif (file_exists('/opt/mk-auth/include/addons.inc.hhvm')) {
    include('/opt/mk-auth/include/addons.inc.hhvm');
} else {
    echo "ERRO: addons.class.php não encontrado. O symlink não foi criado.\n";
    exit(1);
}

// Conexão com o banco — usando as constantes do MK-Auth (igual ONU ISP)
$mysqli = new mysqli(CONHOSTNAME, CONUSERNAME, CONPASSWRD, CONDATABASE);
if ($mysqli->connect_errno) {
    echo "ERRO ao conectar no banco: ({$mysqli->connect_errno}) {$mysqli->connect_error}\n";
    exit(1);
}
$mysqli->set_charset('utf8');

echo "OK - Conexão com banco de dados estabelecida.\n";

// Cria tabela de configurações
$mysqli->query("CREATE TABLE IF NOT EXISTS `vsol_config` (
    `id`              int(11)       NOT NULL AUTO_INCREMENT,
    `registros`       int(11)       NOT NULL DEFAULT 30,
    `sinal_bom`       float         NOT NULL DEFAULT -27,
    `sinal_aceitavel` float         NOT NULL DEFAULT -30,
    `key_google_maps` varchar(200)  DEFAULT '',
    `telegram`        tinyint(1)    NOT NULL DEFAULT 0,
    `token_telegram`  varchar(200)  DEFAULT '',
    `grupo_telegram`  varchar(100)  DEFAULT '',
    `horas_check_onu` int(11)       NOT NULL DEFAULT 12,
    `qtd_check_onu`   int(11)       NOT NULL DEFAULT 50,
    `ssh_timeout`     int(11)       NOT NULL DEFAULT 10,
    `ssh_kepallive`   int(11)       NOT NULL DEFAULT 30,
    `ultimo_backup`   varchar(200)  DEFAULT '',
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;");

// Insere config padrão se não existir
$r = $mysqli->query("SELECT COUNT(*) as c FROM `vsol_config`");
if ($r && (int)$r->fetch_assoc()['c'] === 0) {
    $mysqli->query("INSERT INTO `vsol_config` (id) VALUES (1)");
}
echo "OK - Tabela vsol_config criada/verificada.\n";

// Cria tabela de logs
$mysqli->query("CREATE TABLE IF NOT EXISTS `vsol_logs` (
    `id`         int(11)      NOT NULL AUTO_INCREMENT,
    `mensagem`   text,
    `usuario`    varchar(100) DEFAULT 'admin',
    `created_at` datetime     DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;");
echo "OK - Tabela vsol_logs criada/verificada.\n";

// Cria tabela de OLTs
$mysqli->query("CREATE TABLE IF NOT EXISTS `vsol_olts` (
    `id`         int(11)      NOT NULL AUTO_INCREMENT,
    `nome`       varchar(100) NOT NULL,
    `ip`         varchar(50)  NOT NULL,
    `usuario`    varchar(100) DEFAULT 'admin',
    `senha`      varchar(200) DEFAULT '',
    `porta_ssh`  int(11)      NOT NULL DEFAULT 22,
    `modelo`     varchar(100) DEFAULT 'VSOL',
    `ativo`      tinyint(1)   NOT NULL DEFAULT 1,
    `endereco`   varchar(255) DEFAULT '',
    `lat`        decimal(10,7) DEFAULT NULL,
    `lng`        decimal(10,7) DEFAULT NULL,
    `created_at` datetime     DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;");

// Adiciona colunas de mapa em instâncias antigas (sem erro se já existirem)
@$mysqli->query("ALTER TABLE `vsol_olts` ADD COLUMN `endereco` varchar(255) DEFAULT '' AFTER `ativo`");
@$mysqli->query("ALTER TABLE `vsol_olts` ADD COLUMN `lat` decimal(10,7) DEFAULT NULL AFTER `endereco`");
@$mysqli->query("ALTER TABLE `vsol_olts` ADD COLUMN `lng` decimal(10,7) DEFAULT NULL AFTER `lat`");
echo "OK - Tabela vsol_olts criada/verificada.\n";

$mysqli->close();
echo "OK - Instalação do banco de dados concluída.\n";
