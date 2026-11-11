ALTER TABLE `agendas`
DROP FOREIGN KEY `fk_agendas_usuarios1`;

ALTER TABLE `agendas`
DROP PRIMARY KEY,
MODIFY `criado_por` INTEGER NULL,
ADD PRIMARY KEY (`id`);

ALTER TABLE `agendas`
ADD CONSTRAINT `fk_agendas_usuarios1`
FOREIGN KEY (`criado_por`) REFERENCES `usuarios`(`id`)
ON DELETE NO ACTION ON UPDATE NO ACTION;
