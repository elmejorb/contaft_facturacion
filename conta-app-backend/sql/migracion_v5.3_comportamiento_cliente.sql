-- =====================================================================
-- Migración v5.3 — Comportamiento de cartera del cliente
-- =====================================================================
-- Permite clasificar automáticamente a los clientes por su puntualidad
-- de pago (excelente / puntual / regular / moroso / critico) y castigar
-- manualmente carteras incobrables (sin borrar saldos ni historial).
--
-- Tabla nueva, NO toca tblclientes para mantener compatibilidad con
-- instalaciones existentes (LEFT JOIN devuelve 'sin_datos' por default).
--
-- Idempotente.
-- =====================================================================
SET sql_mode = '';

CREATE TABLE IF NOT EXISTS tbl_clientes_comportamiento (
    id INT AUTO_INCREMENT PRIMARY KEY,
    CodigoClien INT NOT NULL UNIQUE,
    comportamiento ENUM(
        'sin_datos',
        'excelente',
        'puntual',
        'regular',
        'moroso',
        'critico'
    ) DEFAULT 'sin_datos',
    dias_mora_promedio INT NULL,
    facturas_evaluadas INT DEFAULT 0,
    comportamiento_calculado_at DATETIME NULL,

    cartera_castigada TINYINT(1) DEFAULT 0,
    fecha_castigo DATETIME NULL,
    motivo_castigo ENUM(
        'cliente_perdido',
        'empresa_cerrada',
        'no_localizable',
        'acuerdo_fallido',
        'otro'
    ) NULL,
    motivo_detalle VARCHAR(255) NULL,
    id_usuario_castigo INT NULL,

    nota_cobranza TEXT NULL,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    KEY idx_comportamiento (comportamiento),
    KEY idx_castigada (cartera_castigada),
    KEY idx_fecha_castigo (fecha_castigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SELECT '✓ v5.3 — tbl_clientes_comportamiento aplicada' AS resultado,
       (SELECT COUNT(*) FROM tbl_clientes_comportamiento) AS registros;
