Actúa como un Senior Data Engineer experto en Python y modelado dimensional (Kimball). Estoy desarrollando mi Trabajo Final de Grado (TFG) de Ingeniería Informática: una plataforma de Business Intelligence para una cadena de cines.

El Data Warehouse utilizará un Esquema en Estrella (Star Schema) diseñado para ser desplegado en Google BigQuery. La base de datos tiene 5 dimensiones y 2 tablas de hechos.

**Este es el esquema SQL exacto (tómalo como única fuente de verdad):**

CREATE TABLE Dim_Tiempo (id_tiempo INT PRIMARY KEY, fecha DATE, anio INT, mes INT, dia_semana VARCHAR(15), es_fin_semana BOOLEAN, franja_horaria VARCHAR(20));
CREATE TABLE Dim_Pelicula (id_pelicula INT PRIMARY KEY, titulo VARCHAR(150), genero VARCHAR(50), clasificacion_edad VARCHAR(10), distribuidora VARCHAR(50), duracion_minutos INT, idioma_formato VARCHAR(30), es_reestreno BOOLEAN);
CREATE TABLE Dim_Sala (id_sala INT PRIMARY KEY, id_cine INT, nombre_cine VARCHAR(100), ciudad VARCHAR(50), nombre_sala VARCHAR(50), capacidad_total INT, num_butacas_vip INT, formato_proyeccion VARCHAR(20));
CREATE TABLE Dim_Socio (id_socio INT PRIMARY KEY, edad INT, genero VARCHAR(20), fecha_alta DATE, nivel_fidelidad VARCHAR(20));
CREATE TABLE Dim_Producto_Bar (id_producto INT PRIMARY KEY, nombre_producto VARCHAR(100), categoria VARCHAR(50), coste_proveedor DECIMAL(10, 2), precio_venta DECIMAL(10, 2));

CREATE TABLE Fact_Ventas_Entradas (id_ticket INT PRIMARY KEY, id_tiempo INT, id_sala INT, id_pelicula INT, id_socio INT NULL, tipo_entrada VARCHAR(30), cantidad_entradas INT, precio_unitario DECIMAL(10, 2), ingreso_total DECIMAL(10, 2));
CREATE TABLE Fact_Ventas_Bar (id_ticket_bar INT PRIMARY KEY, id_tiempo INT, id_sala INT, id_producto INT, id_pelicula INT, id_socio INT NULL, cantidad_productos INT, ingreso_total DECIMAL(10, 2));

**OBJETIVO DEL SCRIPT:**
Necesito que programes un script en Python (utilizando `pandas`, `Faker`, `numpy` y `random`) que genere datos sintéticos realistas y coherentes para todas estas tablas y los exporte a archivos CSV individuales.

**REQUISITOS TÉCNICOS Y REGLAS DE NEGOCIO A SIMULAR:**

1. **Gestión de Carga (Histórica vs Incremental):** El script debe aceptar parámetros por consola (usando `argparse`) para definir si se hace una carga histórica masiva (ej. del 01-01-2025 al 01-03-2026) o una carga diaria de un solo día.
2. **Generación de Dimensiones:**
   - Genera un catálogo realista de unas 50 películas, 3 complejos de cine (Mataró, Granollers, Barcelona) con unas 10 salas cada uno, 5000 socios fidelizados y 20 productos de bar.
   - La `Dim_Tiempo` debe generarse dinámicamente según las fechas indicadas.
3. **Lógica de Generación de Hechos (Crucial):**
   - **Afluencia temporal:** Debe haber un pico estadístico claro (más volumen de ventas) cuando `es_fin_semana == True`.
   - **Control de Aforo:** La suma de `cantidad_entradas` para una sala y un `id_tiempo` específicos nunca debe superar la `capacidad_total` de la `Dim_Sala`.
   - **Lógica VIP:** El `tipo_entrada` debe ser 'VIP' solo si la sala tiene `num_butacas_vip > 0`. Las entradas VIP y 3D/IMAX deben tener un `precio_unitario` mayor.
   - **Cross-Selling en el Bar (Fact_Ventas_Bar):** Aproximadamente el 40% de los tickets de entrada deben generar una compra en el bar vinculada. Asegúrate de que el `id_tiempo`, `id_sala`, `id_pelicula` y `id_socio` coincidan lógicamente con el ticket de entrada que generó esa venta.
   - **Comportamiento VIP en el Bar:** Los usuarios que compraron entradas 'VIP' tienen mayor probabilidad de comprar combos caros en el bar.
   - **Fidelización:** Aproximadamente un 30% de las ventas deben asociarse a un `id_socio`; el resto tendrán `id_socio` a NULL.

**ENTREGABLE ESPERADO:**
Escribe el código Python modularizado, documentado, con tipado (type hints) y estructurado en funciones limpias. Prioriza la eficiencia usando operaciones vectorizadas de Pandas donde sea posible para generar grandes volúmenes de datos rápidamente.
