-- =============================================
-- Sistema de Custodia de Maletas - Terminal
-- Base de datos: terminales (MySQL)
-- =============================================

-- Crear la base de datos si no existe
CREATE DATABASE IF NOT EXISTS terminales CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE terminales;

-- =============================================
-- Tabla de casilleros
-- =============================================
CREATE TABLE IF NOT EXISTS casilleros (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(10) UNIQUE NOT NULL COMMENT 'Ejemplo: 0,A, 1,B, etc.',
    fila INT NOT NULL,
    columna CHAR(1) NOT NULL,
    estado ENUM('disponible', 'ocupado', 'mantenimiento') DEFAULT 'disponible',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_casilleros_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Tabla de tamaños de equipaje con precios
-- =============================================
CREATE TABLE IF NOT EXISTS tamanos_equipaje (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(10) UNIQUE NOT NULL COMMENT 'S, M, L, XL, XXL',
    nombre VARCHAR(50) NOT NULL,
    descripcion VARCHAR(100),
    precio DECIMAL(10, 2) NOT NULL DEFAULT 0,
    activo TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Tabla de cajas (sesiones de caja)
-- =============================================
CREATE TABLE IF NOT EXISTS cajas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fecha_apertura TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_cierre TIMESTAMP NULL,
    monto_inicial DECIMAL(10, 2) NOT NULL DEFAULT 0,
    monto_ventas DECIMAL(10, 2) DEFAULT 0,
    monto_esperado DECIMAL(10, 2) DEFAULT 0,
    monto_contado DECIMAL(10, 2) NULL,
    diferencia DECIMAL(10, 2) NULL,
    total_transacciones INT DEFAULT 0,
    estado ENUM('abierta', 'cerrada') DEFAULT 'abierta',
    notas_apertura TEXT,
    notas_cierre TEXT,
    usuario_apertura VARCHAR(100),
    usuario_cierre VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_cajas_estado (estado),
    INDEX idx_cajas_fecha_apertura (fecha_apertura)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Tabla de custodias (registros de equipaje)
-- =============================================
CREATE TABLE IF NOT EXISTS custodias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL COMMENT 'Codigo unico para el codigo de barras',
    casillero_id INT,
    casillero_codigo VARCHAR(10) NOT NULL,
    documento_cliente VARCHAR(50) NOT NULL COMMENT 'RUT/DNI/Pasaporte',
    tamano_id INT,
    tamano_codigo VARCHAR(10) NOT NULL,
    fecha_entrada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_salida TIMESTAMP NULL,
    estado ENUM('custodia', 'entregado', 'cancelado') DEFAULT 'custodia',
    valor DECIMAL(10, 2) NOT NULL DEFAULT 0,
    notas TEXT,
    caja_id INT COMMENT 'Referencia a la caja donde se registro',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (casillero_id) REFERENCES casilleros(id) ON DELETE SET NULL,
    FOREIGN KEY (tamano_id) REFERENCES tamanos_equipaje(id) ON DELETE SET NULL,
    FOREIGN KEY (caja_id) REFERENCES cajas(id) ON DELETE SET NULL,
    INDEX idx_custodias_documento (documento_cliente),
    INDEX idx_custodias_estado (estado),
    INDEX idx_custodias_fecha_entrada (fecha_entrada),
    INDEX idx_custodias_caja_id (caja_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Tabla de transacciones de caja
-- =============================================
CREATE TABLE IF NOT EXISTS transacciones_caja (
    id INT AUTO_INCREMENT PRIMARY KEY,
    caja_id INT NOT NULL,
    tipo ENUM('ingreso', 'egreso', 'apertura', 'cierre') NOT NULL,
    monto DECIMAL(10, 2) NOT NULL,
    concepto VARCHAR(200),
    custodia_id INT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (caja_id) REFERENCES cajas(id) ON DELETE CASCADE,
    FOREIGN KEY (custodia_id) REFERENCES custodias(id) ON DELETE SET NULL,
    INDEX idx_transacciones_caja_id (caja_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Insertar tamaños de equipaje predeterminados
-- =============================================
INSERT IGNORE INTO tamanos_equipaje (codigo, nombre, descripcion, precio) VALUES
    ('S', 'Bolso Pequeno', 'Bolsos de mano, mochilas pequenas', 1500.00),
    ('M', 'Maleta Mediana', 'Maletas de cabina, mochilas grandes', 2500.00),
    ('L', 'Maleta Grande', 'Maletas de bodega estandar', 3500.00),
    ('XL', 'Equipaje Extra Grande', 'Maletas grandes, equipos deportivos', 4500.00),
    ('XXL', 'Sacos / Fardos', 'Bultos grandes, cajas', 5500.00);

-- =============================================
-- Insertar casilleros (grid 6x8)
-- =============================================
INSERT IGNORE INTO casilleros (codigo, fila, columna, estado) VALUES
    ('0,A', 0, 'A', 'disponible'), ('0,B', 0, 'B', 'disponible'), ('0,C', 0, 'C', 'disponible'), ('0,D', 0, 'D', 'disponible'),
    ('0,E', 0, 'E', 'disponible'), ('0,F', 0, 'F', 'disponible'), ('0,G', 0, 'G', 'disponible'), ('0,H', 0, 'H', 'disponible'),
    ('1,A', 1, 'A', 'disponible'), ('1,B', 1, 'B', 'disponible'), ('1,C', 1, 'C', 'disponible'), ('1,D', 1, 'D', 'disponible'),
    ('1,E', 1, 'E', 'disponible'), ('1,F', 1, 'F', 'disponible'), ('1,G', 1, 'G', 'disponible'), ('1,H', 1, 'H', 'disponible'),
    ('2,A', 2, 'A', 'disponible'), ('2,B', 2, 'B', 'disponible'), ('2,C', 2, 'C', 'disponible'), ('2,D', 2, 'D', 'disponible'),
    ('2,E', 2, 'E', 'disponible'), ('2,F', 2, 'F', 'disponible'), ('2,G', 2, 'G', 'disponible'), ('2,H', 2, 'H', 'disponible'),
    ('3,A', 3, 'A', 'disponible'), ('3,B', 3, 'B', 'disponible'), ('3,C', 3, 'C', 'disponible'), ('3,D', 3, 'D', 'disponible'),
    ('3,E', 3, 'E', 'disponible'), ('3,F', 3, 'F', 'disponible'), ('3,G', 3, 'G', 'disponible'), ('3,H', 3, 'H', 'disponible'),
    ('4,A', 4, 'A', 'disponible'), ('4,B', 4, 'B', 'disponible'), ('4,C', 4, 'C', 'disponible'), ('4,D', 4, 'D', 'disponible'),
    ('4,E', 4, 'E', 'disponible'), ('4,F', 4, 'F', 'disponible'), ('4,G', 4, 'G', 'disponible'), ('4,H', 4, 'H', 'disponible'),
    ('5,A', 5, 'A', 'disponible'), ('5,B', 5, 'B', 'disponible'), ('5,C', 5, 'C', 'disponible'), ('5,D', 5, 'D', 'disponible'),
    ('5,E', 5, 'E', 'disponible'), ('5,F', 5, 'F', 'disponible'), ('5,G', 5, 'G', 'disponible'), ('5,H', 5, 'H', 'disponible');

-- =============================================
-- Vistas utiles (opcional)
-- =============================================

-- Vista de custodias activas con detalles
CREATE OR REPLACE VIEW v_custodias_activas AS
SELECT 
    c.id,
    c.codigo,
    c.casillero_codigo,
    c.documento_cliente,
    t.nombre AS tamano_nombre,
    t.codigo AS tamano_codigo,
    c.fecha_entrada,
    c.valor,
    c.estado
FROM custodias c
LEFT JOIN tamanos_equipaje t ON c.tamano_id = t.id
WHERE c.estado = 'custodia';

-- Vista de resumen de caja actual
CREATE OR REPLACE VIEW v_caja_actual AS
SELECT 
    c.id,
    c.fecha_apertura,
    c.monto_inicial,
    c.monto_ventas,
    (c.monto_inicial + c.monto_ventas) AS monto_esperado,
    c.total_transacciones,
    c.estado
FROM cajas c
WHERE c.estado = 'abierta'
ORDER BY c.fecha_apertura DESC
LIMIT 1;

-- =============================================
-- Procedimientos almacenados (opcional)
-- =============================================

DELIMITER //

-- Procedimiento para registrar una custodia
CREATE PROCEDURE IF NOT EXISTS sp_registrar_custodia(
    IN p_codigo VARCHAR(50),
    IN p_casillero_codigo VARCHAR(10),
    IN p_documento VARCHAR(50),
    IN p_tamano_codigo VARCHAR(10),
    IN p_valor DECIMAL(10,2),
    IN p_caja_id INT
)
BEGIN
    DECLARE v_casillero_id INT;
    DECLARE v_tamano_id INT;
    DECLARE v_custodia_id INT;
    
    -- Obtener IDs
    SELECT id INTO v_casillero_id FROM casilleros WHERE codigo = p_casillero_codigo;
    SELECT id INTO v_tamano_id FROM tamanos_equipaje WHERE codigo = p_tamano_codigo;
    
    -- Insertar custodia
    INSERT INTO custodias (codigo, casillero_id, casillero_codigo, documento_cliente, tamano_id, tamano_codigo, valor, caja_id)
    VALUES (p_codigo, v_casillero_id, p_casillero_codigo, p_documento, v_tamano_id, p_tamano_codigo, p_valor, p_caja_id);
    
    SET v_custodia_id = LAST_INSERT_ID();
    
    -- Actualizar estado del casillero
    UPDATE casilleros SET estado = 'ocupado' WHERE id = v_casillero_id;
    
    -- Registrar transaccion en caja
    IF p_caja_id IS NOT NULL THEN
        INSERT INTO transacciones_caja (caja_id, tipo, monto, concepto, custodia_id)
        VALUES (p_caja_id, 'ingreso', p_valor, CONCAT('Custodia ', p_codigo), v_custodia_id);
        
        UPDATE cajas 
        SET monto_ventas = monto_ventas + p_valor,
            monto_esperado = monto_inicial + monto_ventas + p_valor,
            total_transacciones = total_transacciones + 1
        WHERE id = p_caja_id;
    END IF;
    
    SELECT v_custodia_id AS custodia_id;
END //

-- Procedimiento para entregar custodia
CREATE PROCEDURE IF NOT EXISTS sp_entregar_custodia(
    IN p_codigo VARCHAR(50)
)
BEGIN
    DECLARE v_casillero_id INT;
    
    -- Obtener casillero
    SELECT casillero_id INTO v_casillero_id FROM custodias WHERE codigo = p_codigo;
    
    -- Actualizar custodia
    UPDATE custodias 
    SET estado = 'entregado', fecha_salida = CURRENT_TIMESTAMP 
    WHERE codigo = p_codigo;
    
    -- Liberar casillero
    UPDATE casilleros SET estado = 'disponible' WHERE id = v_casillero_id;
END //

DELIMITER ;
