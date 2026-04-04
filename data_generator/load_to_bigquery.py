"""
Carga de archivos CSV locales hacia Google BigQuery.

Ingesta los 7 CSVs generados por data_generator.py en el dataset
dwh_cinema de BigQuery, soportando carga completa (WRITE_TRUNCATE)
e incremental (WRITE_APPEND).

Uso:
    Carga completa:     python load_to_bigquery.py --mode full
    Carga incremental:  python load_to_bigquery.py --mode incremental
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
    write_disposition: str,
) -> None:
    """
    Carga un archivo CSV en una tabla de BigQuery.

    Args:
        client: Cliente de BigQuery autenticado.
        csv_filename: Nombre del archivo CSV (ej. 'Dim_Sala.csv').
        table_name: Nombre de la tabla destino en BigQuery.
        write_disposition: 'WRITE_TRUNCATE' (full) o 'WRITE_APPEND' (incremental).
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
        write_disposition=write_disposition,
    )

    log(f"Cargando {csv_filename} -> {DATASET_ID}.{table_name} ({write_disposition})...")

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
        description="Carga CSVs generados hacia Google BigQuery (dwh_cinema)"
    )
    parser.add_argument(
        "--mode",
        choices=["full", "incremental"],
        required=True,
        help="'full' = WRITE_TRUNCATE (sobreescribe). 'incremental' = WRITE_APPEND (anade).",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    write_disposition = (
        bigquery.WriteDisposition.WRITE_TRUNCATE
        if args.mode == "full"
        else bigquery.WriteDisposition.WRITE_APPEND
    )

    print(f"\n{'='*60}")
    print(f"  Cinema BI - Carga de datos a BigQuery")
    print(f"  Modo: {args.mode}  |  Dataset: {DATASET_ID}")
    print(f"{'='*60}\n")

    client = crear_cliente()

    exitos: int = 0
    errores: int = 0

    for csv_filename, table_name in CSV_TO_TABLE.items():
        try:
            cargar_csv(client, csv_filename, table_name, write_disposition)
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
