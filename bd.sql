-- =================================================================
-- 1. LIMPIEZA PREVIA (Borrar tablas si ya existen)
-- Orden crítico: Primero los Hechos (que tienen FKs), luego Dimensiones
-- =================================================================
DROP TABLE IF EXISTS Fact_Ventas_Bar;
DROP TABLE IF EXISTS Fact_Ventas_Entradas;
DROP TABLE IF EXISTS Dim_Producto_Bar;
DROP TABLE IF EXISTS Dim_Socio;
DROP TABLE IF EXISTS Dim_Sala;
DROP TABLE IF EXISTS Dim_Pelicula;
DROP TABLE IF EXISTS Dim_Tiempo;

-- =================================================================
-- 2. CREACIÓN DE TABLAS DE DIMENSIONES (El Contexto)
-- =================================================================

-- Dimensión Tiempo
CREATE TABLE Dim_Tiempo (
    id_tiempo INT PRIMARY KEY, -- Formato: YYYYMMDDHH
    fecha DATE,
    anio INT,
    mes INT,
    dia_semana VARCHAR(15),
    es_fin_semana BOOLEAN,
    franja_horaria VARCHAR(20) -- Ej: 'Matinal', 'Tarde', 'Noche'
);

-- Dimensión Película (Con idiomas y reestrenos)
CREATE TABLE Dim_Pelicula (
    id_pelicula INT PRIMARY KEY,
    titulo VARCHAR(150),
    genero VARCHAR(50),
    clasificacion_edad VARCHAR(10),
    distribuidora VARCHAR(50),
    duracion_minutos INT,
    idioma_formato VARCHAR(30), -- 'VOSE', 'Doblada Español', 'Doblada Catalán'
    es_reestreno BOOLEAN        -- True/False
);

-- Dimensión Sala (Desnormalizada para agrupar Cine y Sala, e incluye VIP)
CREATE TABLE Dim_Sala (
    id_sala INT PRIMARY KEY,
    id_cine INT,
    nombre_cine VARCHAR(100),
    ciudad VARCHAR(50),
    nombre_sala VARCHAR(50),
    capacidad_total INT,
    num_butacas_vip INT,         -- Número de asientos reclinables
    formato_proyeccion VARCHAR(20) -- Ej: 'Estandar', '3D', 'IMAX'
);

-- Dimensión Socio (Anonimizada por LOPD)
CREATE TABLE Dim_Socio (
    id_socio INT PRIMARY KEY,
    edad INT,
    genero VARCHAR(20),
    fecha_alta DATE,
    nivel_fidelidad VARCHAR(20) -- Ej: 'Bronce', 'Plata', 'Oro'
);

-- Dimensión Producto de Bar
CREATE TABLE Dim_Producto_Bar (
    id_producto INT PRIMARY KEY,
    nombre_producto VARCHAR(100),
    categoria VARCHAR(50), -- Ej: 'Bebida', 'Palomitas', 'Snack', 'Combo'
    coste_proveedor DECIMAL(10, 2), -- Para calcular margen de beneficio
    precio_venta DECIMAL(10, 2)
);

-- =================================================================
-- 3. CREACIÓN DE TABLAS DE HECHOS (Las Métricas)
-- =================================================================

-- Tabla de Hechos: Ventas de Entradas
CREATE TABLE Fact_Ventas_Entradas (
    id_ticket INT PRIMARY KEY,
    id_tiempo INT,
    id_sala INT,
    id_pelicula INT,
    id_socio INT NULL, -- NULL si el cliente no es del club de fidelización
    tipo_entrada VARCHAR(30), -- 'Estándar', 'VIP', 'Día del Espectador'
    cantidad_entradas INT,
    precio_unitario DECIMAL(10, 2),
    ingreso_total DECIMAL(10, 2),
    
    -- Claves Foráneas
    FOREIGN KEY (id_tiempo) REFERENCES Dim_Tiempo(id_tiempo),
    FOREIGN KEY (id_sala) REFERENCES Dim_Sala(id_sala),
    FOREIGN KEY (id_pelicula) REFERENCES Dim_Pelicula(id_pelicula),
    FOREIGN KEY (id_socio) REFERENCES Dim_Socio(id_socio)
);

-- Tabla de Hechos: Ventas de Bar (Con Cross-Selling)
CREATE TABLE Fact_Ventas_Bar (
    id_ticket_bar INT PRIMARY KEY,
    id_tiempo INT,
    id_sala INT,
    id_producto INT,
    id_pelicula INT, -- ¡La clave para analizar el cross-selling!
    id_socio INT NULL,
    cantidad_productos INT,
    ingreso_total DECIMAL(10, 2),
    
    -- Claves Foráneas
    FOREIGN KEY (id_tiempo) REFERENCES Dim_Tiempo(id_tiempo),
    FOREIGN KEY (id_sala) REFERENCES Dim_Sala(id_sala),
    FOREIGN KEY (id_producto) REFERENCES Dim_Producto_Bar(id_producto),
    FOREIGN KEY (id_pelicula) REFERENCES Dim_Pelicula(id_pelicula),
    FOREIGN KEY (id_socio) REFERENCES Dim_Socio(id_socio)
);