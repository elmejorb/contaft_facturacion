-- Migración: Agregar AUTO_INCREMENT a tblbancos.idBancos
-- Fecha: 2026-05-05
-- Problema: Al crear cuenta bancaria fallaba con "Field 'idBancos' doesn't have a default value"

ALTER TABLE tblbancos
  MODIFY COLUMN idBancos INT NOT NULL AUTO_INCREMENT;
