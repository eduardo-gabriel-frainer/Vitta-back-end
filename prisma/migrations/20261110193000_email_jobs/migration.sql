CREATE TABLE `email_jobs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `destinatario` VARCHAR(320) NOT NULL,
    `dados` JSON NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pendente',
    `tentativas` INTEGER NOT NULL DEFAULT 0,
    `disponivel_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `bloqueado_em` DATETIME(3) NULL,
    `token_bloqueio` VARCHAR(36) NULL,
    `ultimo_erro` TEXT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `enviado_em` DATETIME(3) NULL,

    INDEX `email_jobs_status_disponivel_idx`(`status`, `disponivel_em`),
    INDEX `email_jobs_status_bloqueado_idx`(`status`, `bloqueado_em`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
