-- CreateTable
CREATE TABLE `especialidades` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(150) NOT NULL,

    UNIQUE INDEX `nome_UNIQUE`(`nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profissionais` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(150) NOT NULL,
    `email` VARCHAR(300) NULL,
    `telefone` VARCHAR(20) NULL,

    UNIQUE INDEX `email_UNIQUE`(`email`),
    UNIQUE INDEX `telefone_UNIQUE`(`telefone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profissional_especialidade` (
    `profissional_id` INTEGER NOT NULL,
    `especialidade_id` INTEGER NOT NULL,
    `principal` BOOLEAN NOT NULL,
    `criado_em` DATE NOT NULL,

    INDEX `fk_profissional_has_especialidade_especialidade1_idx`(`especialidade_id`),
    INDEX `fk_profissional_has_especialidade_profissional_idx`(`profissional_id`),
    PRIMARY KEY (`profissional_id`, `especialidade_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usuarios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(150) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `senha_hash` TEXT NOT NULL,
    `telefone` VARCHAR(20) NULL,
    `tipo` VARCHAR(20) NOT NULL,
    `data_nascimento` DATE NOT NULL,
    `criado_em` DATE NOT NULL,

    UNIQUE INDEX `email_UNIQUE`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `agendas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `profissional_id` INTEGER NOT NULL,
    `horario_inicial` TIME(0) NOT NULL,
    `horario_final` TIME(0) NOT NULL,
    `criado_por` INTEGER NOT NULL,
    `criado_em` DATE NOT NULL,
    `atualizado_em` DATE NOT NULL,

    INDEX `fk_agendas_profissionais1_idx`(`profissional_id`),
    INDEX `fk_agendas_usuarios1_idx`(`criado_por`),
    PRIMARY KEY (`id`, `profissional_id`, `criado_por`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `consultas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `paciente_id` INTEGER NOT NULL,
    `profissional_id` INTEGER NOT NULL,
    `especialidade_id` INTEGER NOT NULL,
    `inicio_em` DATETIME(0) NOT NULL,
    `fim_em` DATETIME(0) NOT NULL,
    `status` VARCHAR(20) NOT NULL,
    `observacoes` TEXT NULL,
    `motivo_cancelamento` TEXT NULL,
    `cancelado_em` DATE NULL,
    `cancelador_por` INTEGER NULL,
    `criado_por` INTEGER NOT NULL,
    `criado_em` DATE NOT NULL,
    `atualizado_em` DATE NULL,

    INDEX `fk_consultas_usuarios1_idx`(`paciente_id`),
    INDEX `fk_consultas_profissionais1_idx`(`profissional_id`),
    INDEX `fk_consultas_especialidades1_idx`(`especialidade_id`),
    PRIMARY KEY (`id`, `paciente_id`, `profissional_id`, `especialidade_id`, `criado_por`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `profissional_especialidade` ADD CONSTRAINT `fk_profissional_has_especialidade_profissional` FOREIGN KEY (`profissional_id`) REFERENCES `profissionais`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `profissional_especialidade` ADD CONSTRAINT `fk_profissional_has_especialidade_especialidade1` FOREIGN KEY (`especialidade_id`) REFERENCES `especialidades`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `agendas` ADD CONSTRAINT `fk_agendas_profissionais1` FOREIGN KEY (`profissional_id`) REFERENCES `profissionais`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `agendas` ADD CONSTRAINT `fk_agendas_usuarios1` FOREIGN KEY (`criado_por`) REFERENCES `usuarios`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `consultas` ADD CONSTRAINT `fk_consultas_usuarios1` FOREIGN KEY (`paciente_id`) REFERENCES `usuarios`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `consultas` ADD CONSTRAINT `fk_consultas_profissionais1` FOREIGN KEY (`profissional_id`) REFERENCES `profissionais`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `consultas` ADD CONSTRAINT `fk_consultas_especialidades1` FOREIGN KEY (`especialidade_id`) REFERENCES `especialidades`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
