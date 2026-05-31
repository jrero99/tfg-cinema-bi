"""
Carga de archivos CSV locales hacia Google BigQuery.

Ingesta los 7 CSVs generados por data_generator.py en el dataset
dwh_cinema mediante WRITE_TRUNCATE: vacía las tablas y las rellena con
el contenido completo de los CSV. La operación es idempotente, lo que
elimina cualquier riesgo de duplicación al ejecutarla varias veces.

Diseño:
    El generador (data_generator.py) ya mantiene el CSV con el histórico
    completo, anexando los días nuevos cuando se ejecuta en modo diario o
    incremental. Por eso aquí solo necesitamos vaciar y rellenar la tabla
    destino — no existe un modo "append" porque, al leerse el CSV
    completo en cada carga, ese modo duplicaba el histórico anterior.

Uso:
    python load_to_bigquery.py
    python load_to_bigquery.py --mode full   # equivalente, explícito
"""

import argparse
import os
import sys
from datetime import datetime

from google.cloud import bigquery

# ---------------------------------------------------------------------------
# Configuracion del proyecto GCP
# ---------------------------------------------------------------------------
PROJECT_ID: str = "tfg-cinema-bi"          # <-- Cambia por tu Project ID
DATASET_ID: str = "dwh_cinema"
CREDENTIALS_PATH: str = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "credenciales_gcp.json"
)

# Directorio donde se encuentran los CSV generados
CSV_DIR: str = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output_csv")

# ---------------------------------------------------------------------------
# Mapeo: nombre del archivo CSV -> nombre de la tabla en BigQuery
# ---------------------------------------------------------------------------
CSV_TO_TABLE: dict[str, str] = {
    "Dim_Tiempo.csv":            "Dim_Tiempo",
    "Dim_Sala.csv":              "Dim_Sala",
    "Dim_Pelicula.csv":          "Dim_Pelicula",
    "Dim_Socio.csv":             "Dim_Socio",
    "Dim_Producto_Bar.csv":      "Dim_Producto_Bar",
    "Fact_Ventas_Entradas.csv":  "Fact_Ventas_Entradas",
    "Fact_Ventas_Bar.csv":       "Fact_Ventas_Bar",
}


# ---------------------------------------------------------------------------
# Funciones
# ---------------------------------------------------------------------------

def log(mensaje: str) -> None:
    """Imprime un mensaje con timestamp."""
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"  [{ts}] {mensaje}")


def crear_cliente() -> bigquery.Client:
    """Crea y devuelve un cliente de BigQuery autenticado."""
    if not os.path.exists(CREDENTIALS_PATH):
        raise FileNotFoundError(
            f"No se encuentra el archivo de credenciales: {CREDENTIALS_PATH}\n"
            "Coloca el archivo credenciales_gcp.json en el directorio data_generator/."
        )

    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = CREDENTIALS_PATH
    client = bigquery.Client(project=PROJECT_ID)
    log(f"Autenticado en proyecto: {PROJECT_ID}")
    return client


def cargar_csv(
    client: bigquery.Client,
    csv_filename: str,
    table_name: str,
) -> None:
    """
    Carga un archivo CSV en una tabla de BigQuery con WRITE_TRUNCATE.

    Args:
        client: Cliente de BigQuery autenticado.
        csv_filename: Nombre del archivo CSV (ej. 'Dim_Sala.csv').
        table_name: Nombre de la tabla destino en BigQuery.
    """
    csv_path = os.path.join(CSV_DIR, csv_filename)

    # Comprobar que el CSV existe
    if not os.path.exists(csv_path):
        log(f"WARN: {csv_filename} no encontrado en {CSV_DIR}. Saltando.")
        return

    table_id = f"{PROJECT_ID}.{DATASET_ID}.{table_name}"

    job_config = bigquery.LoadJobConfig(
        source_format=bigquery.SourceFormat.CSV,
        skip_leading_rows=1,
        autodetect=True,
        write_disposition=bigquery.WriteDisposition.WRITE_TRUNCATE,
    )

    log(f"Cargando {csv_filename} -> {DATASET_ID}.{table_name} (WRITE_TRUNCATE)...")

    with open(csv_path, "rb") as f:
        load_job = client.load_table_from_file(f, table_id, job_config=job_config)

    # Esperar a que el job termine
    load_job.result()

    # Obtener filas insertadas
    table = client.get_table(table_id)
    log(f"OK: {table_name} -> {table.num_rows:,} filas totales en BigQuery")


def parse_args() -> argparse.Namespace:
    """Parsea los argumentos de linea de comandos."""
    parser = argparse.ArgumentParser(
        description=(
            "Carga CSVs generados hacia Google BigQuery (dwh_cinema). "
            "La carga es siempre idempotente: WRITE_TRUNCATE vacía las "
            "tablas antes de insertar el contenido del CSV."
        )
    )
    # Se mantiene el flag --mode aceptando solo 'full' por compatibilidad
    # con scripts y documentación previos. El modo 'incremental' se eliminó
    # porque el loader lee el CSV completo en cada ejecución y, al usar
    # WRITE_APPEND, duplicaba todo el histórico anterior.
    parser.add_argument(
        "--mode",
        choices=["full"],
        default="full",
        help="Modo de carga. Solo 'full' (WRITE_TRUNCATE) está soportado.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    print(f"\n{'='*60}")
    print(f"  Cinema BI - Carga de datos a BigQuery")
    print(f"  Modo: {args.mode} (WRITE_TRUNCATE)  |  Dataset: {DATASET_ID}")
    print(f"{'='*60}\n")

    client = crear_cliente()

    exitos: int = 0
    errores: int = 0

    for csv_filename, table_name in CSV_TO_TABLE.items():
        try:
            cargar_csv(client, csv_filename, table_name)
            exitos += 1
        except Exception as e:
            log(f"ERROR en {csv_filename}: {e}")
            errores += 1

    print(f"\n{'='*60}")
    print(f"  RESULTADO: {exitos} tablas cargadas, {errores} errores")
    print(f"{'='*60}\n")

    if errores > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
