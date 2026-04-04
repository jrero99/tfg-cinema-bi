# CONTEXTO DEL PROYECTO

Actúa como un Senior Data Engineer experto en Google Cloud Platform (GCP) y Python.
Estoy desarrollando mi TFG de Ingeniería Informática sobre un sistema de Business Intelligence para cines.

Anteriormente ya me generaste un script que crea datos sintéticos y los exporta a 7 archivos CSV locales:

1. `dim_tiempo.csv`
2. `dim_pelicula.csv`
3. `dim_sala.csv`
4. `dim_socio.csv`
5. `dim_producto_bar.csv`
6. `fact_ventas_entradas.csv`
7. `fact_ventas_bar.csv`

Mi infraestructura en la nube ya está creada:

- Tengo un proyecto en Google Cloud.
- Tengo un Dataset en BigQuery llamado `dwh_cinema`.
- Tengo un archivo de credenciales de una Service Account llamado `credenciales_gcp.json` en mi directorio local.

# OBJETIVO

Necesito que programes un segundo script en Python (ej. `load_to_bigquery.py`) que se encargue exclusivamente de la ingesta (carga) de estos archivos CSV hacia las tablas de Google BigQuery correspondientes.

# REQUISITOS TÉCNICOS Y FUNCIONALIDADES ESPERADAS:

1. **Librerías:** Utiliza la librería oficial `google-cloud-bigquery` (y `pandas` si lo consideras estrictamente necesario, aunque prefiero el uso de `LoadJobConfig` directamente con los CSV para mayor rendimiento).
2. **Autenticación:** El script debe autenticarse usando el archivo local `credenciales_gcp.json`. Utiliza variables de entorno o constantes claras al principio del archivo para definir `PROJECT_ID` y `DATASET_ID`.
3. **Parámetros de ejecución (CLI):** Usa `argparse` para que el script acepte un argumento `--mode` con dos opciones:
   - `--mode full`: Realiza una carga histórica. Debe usar `WRITE_TRUNCATE` en BigQuery (borrar la tabla si existe y crearla de nuevo con los datos del CSV).
   - `--mode incremental`: Realiza una carga diaria. Debe usar `WRITE_APPEND` (añadir los nuevos datos del CSV respetando los que ya están en BigQuery).
4. **Configuración de los Load Jobs:**
   - Debe saltarse la primera fila de los CSV (cabeceras).
   - Debe usar `autodetect=True` para que BigQuery infiera el esquema directamente de los CSV.
5. **Robustez y Logging:**
   - El script debe iterar sobre un diccionario o lista que mapee el nombre del archivo CSV con el nombre de la tabla de destino en BigQuery.
   - Debe comprobar si el archivo CSV existe localmente antes de intentar subirlo (usando `os.path.exists`).
   - Debe imprimir por consola (logs) el inicio de la carga, el progreso, y mostrar un mensaje de éxito indicando cuántas filas se han insertado finalmente en la tabla de BigQuery.
   - Debe incluir un bloque `try-except` para capturar y mostrar errores de subida sin que el script se cuelgue por completo si falla una sola tabla.

# ENTREGABLE

Proporciona el código en Python limpio, modularizado, con tipado estricto (type hints) y documentado.
