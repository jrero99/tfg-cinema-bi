"""
Generador de datos sintéticos para el Data Warehouse de Cinema BI.

Genera dimensiones y tablas de hechos con datos realistas para un
esquema en estrella (Kimball) desplegado en Google BigQuery.

Uso:
    Carga histórica:  python data_generator.py --modo historico --inicio 2025-01-01 --fin 2026-03-01
    Carga diaria:     python data_generator.py --modo diario --fecha 2026-03-15
"""

import argparse
import os
from datetime import date, timedelta
from typing import Optional

import numpy as np
import pandas as pd
from faker import Faker

# ---------------------------------------------------------------------------
# Configuración global y semillas
# ---------------------------------------------------------------------------
SEED: int = 42
fake = Faker("es_ES")
Faker.seed(SEED)
np.random.seed(SEED)

OUTPUT_DIR: str = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output_csv")

# ---------------------------------------------------------------------------
# Constantes de negocio
# ---------------------------------------------------------------------------
PROB_SOCIO: float = 0.20          # 20 % de ventas asociadas a socio
PROB_BAR: float = 0.40            # 40 % cross-selling en bar
PROB_BAR_VIP: float = 0.65        # 65 % de VIPs compran en bar (mayor)
PROB_BAR_JOVEN: float = 0.18      # 18 % cross-selling para socios <25 años
WEEKEND_MULTIPLIER: float = 1.8   # Factor de afluencia en fin de semana

PRECIOS_BASE: dict[str, float] = {
    "Normal": 8.50,
    "VIP": 14.00,
    "3D": 12.00,
    "IMAX": 15.50,
    "Reducida": 6.00,
}


# ===================================================================
# GENERACIÓN DE DIMENSIONES
# ===================================================================

def generar_dim_tiempo(fecha_inicio: date, fecha_fin: date) -> pd.DataFrame:
    """Genera Dim_Tiempo para el rango de fechas indicado."""
    fechas = pd.date_range(start=fecha_inicio, end=fecha_fin, freq="D")
    dias_semana_es = {
        0: "Lunes", 1: "Martes", 2: "Miércoles", 3: "Jueves",
        4: "Viernes", 5: "Sábado", 6: "Domingo",
    }

    df = pd.DataFrame({
        "id_tiempo": range(1, len(fechas) + 1),
        "fecha": fechas.date,
        "anio": fechas.year,
        "mes": fechas.month,
        "dia_semana": fechas.dayofweek.map(dias_semana_es),
        "es_fin_semana": fechas.dayofweek >= 5,
        "franja_horaria": np.nan,  # se asigna por sesión en hechos
    })

    # Asignar franjas horarias representativas
    franjas = ["Mañana (10-14)", "Tarde (16-19)", "Noche (20-23)"]
    df["franja_horaria"] = np.random.choice(franjas, size=len(df), p=[0.15, 0.35, 0.50])

    return df


def generar_dim_sala() -> pd.DataFrame:
    """Genera Dim_Sala con 3 complejos (~10 salas c/u)."""
    cines = [
        {"id_cine": 1, "nombre_cine": "Cinema Mataró Parc",       "ciudad": "Mataró",      "num_salas": 10},
        {"id_cine": 2, "nombre_cine": "Cinema Granollers Nord",    "ciudad": "Granollers",   "num_salas": 10},
        {"id_cine": 3, "nombre_cine": "Cinema BCN Diagonal",      "ciudad": "Barcelona",    "num_salas": 11},
    ]

    formatos = ["Estándar", "Estándar", "Estándar", "3D", "IMAX"]
    filas: list[dict] = []
    id_sala = 1

    for cine in cines:
        for n in range(1, cine["num_salas"] + 1):
            capacidad = int(np.random.choice([100, 150, 200, 250, 300]))
            tiene_vip = np.random.random() < 0.40
            butacas_vip = int(capacidad * np.random.uniform(0.10, 0.15)) if tiene_vip else 0

            filas.append({
                "id_sala": id_sala,
                "id_cine": cine["id_cine"],
                "nombre_cine": cine["nombre_cine"],
                "ciudad": cine["ciudad"],
                "nombre_sala": f"Sala {n}",
                "capacidad_total": capacidad,
                "num_butacas_vip": butacas_vip,
                "formato_proyeccion": np.random.choice(formatos),
            })
            id_sala += 1

    return pd.DataFrame(filas)


def generar_dim_pelicula() -> pd.DataFrame:
    """Genera 50 películas reales con reestrenos aleatorios (~20%)."""
    # Catálogo real: (titulo, genero, clasificacion, distribuidora, duracion_min)
    catalogo: list[tuple[str, str, str, str, int]] = [
        ("El Padrino",                    "Drama",            "+16", "Paramount",           175),
        ("Matrix",                         "Ciencia Ficción",  "+12", "Warner Bros",          136),
        ("Casablanca",                     "Drama",            "+7",  "Warner Bros",          102),
        ("Jurassic Park",                  "Ciencia Ficción",  "TP",  "Universal",            127),
        ("El Señor de los Anillos: La Comunidad del Anillo", "Acción", "+12", "Warner Bros", 178),
        ("Pulp Fiction",                   "Thriller",         "+18", "Independiente",        154),
        ("Alien: El Octavo Pasajero",      "Terror",           "+16", "Disney",               117),
        ("Gladiator",                      "Acción",           "+16", "Universal",            155),
        ("Titanic",                        "Drama",            "+12", "Paramount",            195),
        ("Avatar",                         "Ciencia Ficción",  "+7",  "Disney",               162),
        ("Oppenheimer",                    "Drama",            "+16", "Universal",            180),
        ("Barbie",                         "Comedia",          "TP",  "Warner Bros",          114),
        ("Spider-Man: Across the Spider-Verse", "Animación",   "+7",  "Sony Pictures",       140),
        ("Dune: Parte Dos",                "Ciencia Ficción",  "+12", "Warner Bros",          166),
        ("Inside Out 2",                   "Animación",        "TP",  "Disney",               100),
        ("Deadpool y Wolverine",           "Acción",           "+16", "Disney",               128),
        ("Wonka",                          "Comedia",          "TP",  "Warner Bros",          116),
        ("Pobres Criaturas",               "Drama",            "+18", "Disney",               141),
        ("Killers of the Flower Moon",     "Thriller",         "+16", "Paramount",            206),
        ("Napoleon",                       "Drama",            "+16", "Sony Pictures",        158),
        ("Wish",                           "Animación",        "TP",  "Disney",                95),
        ("The Batman",                     "Acción",           "+12", "Warner Bros",          176),
        ("Top Gun: Maverick",              "Acción",           "+7",  "Paramount",            131),
        ("Encanto",                        "Animación",        "TP",  "Disney",               102),
        ("No Time to Die",                 "Acción",           "+12", "Universal",            163),
        ("Interstellar",                   "Ciencia Ficción",  "+12", "Paramount",            169),
        ("El Caballero Oscuro",            "Acción",           "+12", "Warner Bros",          152),
        ("Parásitos",                      "Thriller",         "+16", "A Contracorriente",    132),
        ("Coco",                           "Animación",        "TP",  "Disney",               105),
        ("Vengadores: Endgame",            "Acción",           "+12", "Disney",               181),
        ("Joker",                          "Drama",            "+18", "Warner Bros",          122),
        ("La La Land",                     "Comedia",          "TP",  "Filmax",               128),
        ("El Renacido",                    "Drama",            "+16", "Disney",               156),
        ("Mad Max: Fury Road",             "Acción",           "+16", "Warner Bros",          120),
        ("Gravity",                        "Ciencia Ficción",  "+7",  "Warner Bros",           91),
        ("El Gran Hotel Budapest",         "Comedia",          "+12", "Disney",                99),
        ("Whiplash",                       "Drama",            "+12", "Sony Pictures",        107),
        ("John Wick 4",                    "Acción",           "+16", "Filmax",               169),
        ("Aquaman y el Reino Perdido",     "Acción",           "+7",  "Warner Bros",          124),
        ("La Sociedad de la Nieve",        "Drama",            "+16", "A Contracorriente",    144),
        ("Robot Salvaje",                  "Animación",        "TP",  "Universal",            101),
        ("Venom: El Último Baile",         "Acción",           "+12", "Sony Pictures",        109),
        ("Megalópolis",                    "Drama",            "+16", "Independiente",        138),
        ("Alien: Romulus",                 "Terror",           "+16", "Disney",               119),
        ("Beetlejuice Beetlejuice",        "Comedia",          "+12", "Warner Bros",          104),
        ("Twisters",                       "Acción",           "+7",  "Universal",            122),
        ("It Ends with Us",                "Drama",            "+12", "Sony Pictures",        130),
        ("Un Mundo Feliz",                 "Documental",       "+12", "Independiente",         96),
        ("El Último Mohicano",             "Documental",       "+7",  "A Contracorriente",     88),
        ("Monstruos: La Historia de Lyle y Erik Menéndez", "Thriller", "+16", "Filmax",      115),
    ]

    idiomas = ["Doblada Español", "Doblada Español", "Doblada Catalán", "VOSE"]

    filas: list[dict] = []
    for i, (titulo, genero, clasif, distrib, duracion) in enumerate(catalogo, start=1):
        # ~20% de probabilidad de ser reestreno (aleatorio)
        es_reestreno = bool(np.random.random() < 0.20)

        filas.append({
            "id_pelicula": i,
            "titulo": titulo,
            "genero": genero,
            "clasificacion_edad": clasif,
            "distribuidora": distrib,
            "duracion_minutos": duracion,
            "idioma_formato": np.random.choice(idiomas),
            "es_reestreno": es_reestreno,
        })

    return pd.DataFrame(filas)


def generar_dim_socio() -> pd.DataFrame:
    """Genera 5000 socios fidelizados."""
    n = 5000
    niveles = ["Bronce", "Bronce", "Bronce", "Plata", "Plata", "Oro"]

    df = pd.DataFrame({
        "id_socio": range(1, n + 1),
        "edad": np.random.randint(16, 76, size=n),
        "genero": np.random.choice(["M", "F", "Otro"], size=n, p=[0.48, 0.48, 0.04]),
        "fecha_alta": [fake.date_between(start_date="-3y", end_date="today") for _ in range(n)],
        "nivel_fidelidad": np.random.choice(niveles, size=n),
    })
    return df


def generar_dim_producto_bar() -> pd.DataFrame:
    """Genera 20 productos de bar/snack."""
    productos = [
        ("Palomitas Pequeñas",  "Palomitas", 0.50, 3.50),
        ("Palomitas Medianas",  "Palomitas", 0.80, 5.00),
        ("Palomitas Grandes",   "Palomitas", 1.00, 6.00),
        ("Palomitas Gigantes",  "Palomitas", 1.20, 6.50),
        ("Refresco Cola 50cl",  "Bebida",    0.40, 3.00),
        ("Refresco Naranja 50cl","Bebida",   0.40, 3.00),
        ("Refresco Limón 50cl", "Bebida",    0.40, 3.00),
        ("Agua Mineral 50cl",   "Bebida",    0.20, 2.00),
        ("Cerveza 33cl",        "Bebida",    0.60, 4.00),
        ("Zumo de Manzana",     "Bebida",    0.35, 2.50),
        ("Nachos con Queso",    "Snack",     1.00, 4.50),
        ("Hot Dog",             "Snack",     0.80, 4.00),
        ("Patatas Fritas",      "Snack",     0.50, 3.50),
        ("Gominolas 100g",      "Dulces",    0.30, 2.50),
        ("Chocolatina",         "Dulces",    0.50, 2.00),
        ("Helado Tarrina",      "Dulces",    0.70, 3.50),
        ("Combo Pareja",        "Combo",     1.60, 9.50),
        ("Combo Familiar",      "Combo",     2.50, 14.00),
        ("Combo Infantil",      "Combo",     2.00, 7.00),
        ("Combo Premium VIP",   "Combo",     3.00, 16.50),
    ]

    df = pd.DataFrame(productos, columns=["nombre_producto", "categoria",
                                           "coste_proveedor", "precio_venta"])
    df.insert(0, "id_producto", range(1, len(df) + 1))
    return df


# ===================================================================
# GENERACIÓN DE TABLAS DE HECHOS
# ===================================================================

def _determinar_sesiones_dia(es_fin_semana: bool) -> int:
    """Número de sesiones por sala según día de la semana."""
    if es_fin_semana:
        return int(np.random.choice([4, 5, 6], p=[0.2, 0.5, 0.3]))
    return int(np.random.choice([2, 3, 4], p=[0.3, 0.5, 0.2]))


def _precio_entrada(tipo_entrada: str, formato_sala: str) -> float:
    """Calcula precio unitario según tipo de entrada y formato de sala."""
    base = PRECIOS_BASE.get(tipo_entrada, PRECIOS_BASE["Normal"])
    # Recargo por formato premium de la sala
    if formato_sala == "3D" and tipo_entrada not in ("3D", "IMAX"):
        base += 2.00
    elif formato_sala == "IMAX" and tipo_entrada != "IMAX":
        base += 3.50
    return round(base + np.random.uniform(-0.50, 0.50), 2)


def generar_hechos(
    df_tiempo: pd.DataFrame,
    df_salas: pd.DataFrame,
    df_peliculas: pd.DataFrame,
    df_socios: pd.DataFrame,
    df_productos: pd.DataFrame,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Genera Fact_Ventas_Entradas y Fact_Ventas_Bar respetando:
      - Control de aforo por sala/día
      - Picos de fin de semana
      - Lógica VIP (butacas disponibles)
      - Cross-selling bar (~40 %, mayor para VIPs)
      - Asociación a socio (~30 %)
    """
    ids_socio = df_socios["id_socio"].values
    ids_pelicula = df_peliculas["id_pelicula"].values
    ids_producto = df_productos["id_producto"].values

    # Pesos de selección de socio por edad: los menores de 25 años
    # tienen menor poder adquisitivo y, por tanto, generan menos transacciones.
    edades_por_id = df_socios.set_index("id_socio")["edad"].to_dict()

    def _peso_socio(edad: int) -> float:
        if edad < 18:
            return 0.15
        if edad < 25:
            return 0.45
        if edad < 60:
            return 1.00
        return 0.90

    pesos_socios = np.array(
        [_peso_socio(edades_por_id[i]) for i in ids_socio], dtype=float
    )
    pesos_socios = pesos_socios / pesos_socios.sum()

    # Productos "caros" para VIPs (combos)
    productos_premium = df_productos.loc[
        df_productos["categoria"] == "Combo", "id_producto"
    ].values
    productos_normales = df_productos.loc[
        df_productos["categoria"] != "Combo", "id_producto"
    ].values

    salas_info = df_salas.set_index("id_sala")[
        ["capacidad_total", "num_butacas_vip", "formato_proyeccion"]
    ].to_dict("index")

    entradas_rows: list[dict] = []
    bar_rows: list[dict] = []
    id_ticket = 1
    id_ticket_bar = 1

    for _, dia in df_tiempo.iterrows():
        id_tiempo: int = int(dia["id_tiempo"])
        es_finde: bool = bool(dia["es_fin_semana"])

        for id_sala, info_sala in salas_info.items():
            capacidad: int = info_sala["capacidad_total"]
            vip_max: int = info_sala["num_butacas_vip"]
            formato: str = info_sala["formato_proyeccion"]

            sesiones = _determinar_sesiones_dia(es_finde)
            peliculas_dia = np.random.choice(ids_pelicula, size=sesiones, replace=False)

            for pelicula_id in peliculas_dia:
                # Cada sesión es independiente: tiene su propio aforo
                if es_finde:
                    # Fines de semana: ocupación media-alta (20-50%)
                    ocupacion = np.random.uniform(0.20, 0.50)
                else:
                    # Laborables: ocupación baja (5-20%)
                    ocupacion = np.random.uniform(0.05, 0.20)

                total_entradas = max(1, int(capacidad * ocupacion))
                vip_vendidas = 0

                # Repartir entradas en grupos (simula compras individuales/parejas)
                entradas_restantes = total_entradas
                while entradas_restantes > 0:
                    cantidad = min(int(np.random.choice([1, 1, 2, 2, 3, 4])), entradas_restantes)

                    # Asociar socio (con peso por edad). Se hace antes para que
                    # la edad influya en el tipo de entrada y en el cross-selling.
                    socio: Optional[int] = None
                    es_joven_socio: bool = False
                    if np.random.random() < PROB_SOCIO:
                        socio = int(np.random.choice(ids_socio, p=pesos_socios))
                        es_joven_socio = edades_por_id[socio] < 25

                    # Determinar tipo de entrada
                    if formato == "IMAX":
                        tipo = "IMAX"
                    elif formato == "3D":
                        tipo = "3D"
                    elif vip_max > 0 and vip_vendidas < vip_max and not es_joven_socio and np.random.random() < 0.20:
                        # Los socios jóvenes prácticamente nunca compran VIP
                        tipo = "VIP"
                        cantidad = min(cantidad, vip_max - vip_vendidas)
                        vip_vendidas += cantidad
                    elif es_joven_socio and np.random.random() < 0.55:
                        # Los socios <25 años usan tarifa reducida con frecuencia
                        tipo = "Reducida"
                    elif np.random.random() < 0.10:
                        tipo = "Reducida"
                    else:
                        tipo = "Normal"

                    precio = _precio_entrada(tipo, formato)

                    entradas_rows.append({
                        "id_ticket": id_ticket,
                        "id_tiempo": id_tiempo,
                        "id_sala": id_sala,
                        "id_pelicula": int(pelicula_id),
                        "id_socio": socio,
                        "tipo_entrada": tipo,
                        "cantidad_entradas": cantidad,
                        "precio_unitario": precio,
                        "ingreso_total": round(precio * cantidad, 2),
                    })

                    # --- Cross-selling bar ---
                    if es_joven_socio:
                        prob_bar = PROB_BAR_JOVEN
                    elif tipo == "VIP":
                        prob_bar = PROB_BAR_VIP
                    else:
                        prob_bar = PROB_BAR
                    if np.random.random() < prob_bar:
                        # VIPs tienden a combos premium
                        if tipo == "VIP" and len(productos_premium) > 0:
                            prod = int(np.random.choice(productos_premium))
                        else:
                            prod = int(np.random.choice(
                                ids_producto if np.random.random() < 0.25 else productos_normales
                            ))

                        cant_prod = int(np.random.choice([1, 1, 1, 2, 2, 3]))
                        # Los socios jóvenes consumen menos cantidad por compra
                        if es_joven_socio:
                            cant_prod = max(1, cant_prod - 1)
                        precio_prod = float(
                            df_productos.loc[df_productos["id_producto"] == prod, "precio_venta"].iloc[0]
                        )
                        bar_rows.append({
                            "id_ticket_bar": id_ticket_bar,
                            "id_tiempo": id_tiempo,
                            "id_sala": id_sala,
                            "id_producto": prod,
                            "id_pelicula": int(pelicula_id),
                            "id_socio": socio,
                            "cantidad_productos": cant_prod,
                            "ingreso_total": round(precio_prod * cant_prod, 2),
                        })
                        id_ticket_bar += 1

                    id_ticket += 1
                    entradas_restantes -= cantidad

    df_entradas = pd.DataFrame(entradas_rows)
    df_bar = pd.DataFrame(bar_rows)
    return df_entradas, df_bar


# ===================================================================
# EXPORTACIÓN
# ===================================================================

def exportar_csv(df: pd.DataFrame, nombre: str, append: bool = False) -> None:
    """Exporta un DataFrame a CSV. Si append=True, añade filas al fichero existente."""
    ruta = os.path.join(OUTPUT_DIR, f"{nombre}.csv")
    if append and os.path.exists(ruta):
        df.to_csv(ruta, mode="a", header=False, index=False, encoding="utf-8")
        total = len(pd.read_csv(ruta))
        print(f"  [OK] {nombre}.csv  ->  +{len(df):,} filas (total: {total:,})")
    else:
        df.to_csv(ruta, index=False, encoding="utf-8")
        print(f"  [OK] {nombre}.csv  ->  {len(df):,} filas")


def _leer_max_id(nombre_csv: str, columna_id: str) -> int:
    """Lee el ID máximo actual de un CSV existente, o devuelve 0."""
    ruta = os.path.join(OUTPUT_DIR, f"{nombre_csv}.csv")
    if os.path.exists(ruta):
        df = pd.read_csv(ruta, usecols=[columna_id])
        return int(df[columna_id].max())
    return 0


# ===================================================================
# PUNTO DE ENTRADA
# ===================================================================

def parse_args() -> argparse.Namespace:
    """Parsea argumentos de línea de comandos."""
    parser = argparse.ArgumentParser(
        description="Generador de datos sintéticos – Cinema BI Data Warehouse"
    )
    parser.add_argument(
        "--modo", choices=["historico", "diario"], required=True,
        help="Tipo de carga: 'historico' (rango) o 'diario' (un día).",
    )
    parser.add_argument(
        "--inicio", type=str, default=None,
        help="Fecha inicio (YYYY-MM-DD). Requerido en modo histórico.",
    )
    parser.add_argument(
        "--fin", type=str, default=None,
        help="Fecha fin (YYYY-MM-DD). Requerido en modo histórico.",
    )
    parser.add_argument(
        "--fecha", type=str, default=None,
        help="Fecha única (YYYY-MM-DD). Requerido en modo diario.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    # Determinar rango de fechas
    if args.modo == "historico":
        if not args.inicio or not args.fin:
            raise SystemExit("Error: --inicio y --fin son obligatorios en modo histórico.")
        fecha_inicio = date.fromisoformat(args.inicio)
        fecha_fin = date.fromisoformat(args.fin)
    else:
        if not args.fecha:
            raise SystemExit("Error: --fecha es obligatorio en modo diario.")
        fecha_inicio = date.fromisoformat(args.fecha)
        fecha_fin = fecha_inicio

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    dias = (fecha_fin - fecha_inicio).days + 1
    print(f"\n{'='*60}")
    print(f"  Cinema BI – Generador de datos sintéticos")
    print(f"  Modo: {args.modo}  |  Rango: {fecha_inicio} -> {fecha_fin} ({dias} dias)")
    print(f"{'='*60}\n")

    es_incremental = args.modo == "diario"

    # --- Dimensiones ---
    print("[1/6] Generando dimensiones...")
    df_salas = generar_dim_sala()
    df_peliculas = generar_dim_pelicula()
    df_socios = generar_dim_socio()
    df_productos = generar_dim_producto_bar()

    if es_incremental:
        # Modo diario: append a Dim_Tiempo, reusar dimensiones existentes
        offset_tiempo = _leer_max_id("Dim_Tiempo", "id_tiempo")
        df_tiempo = generar_dim_tiempo(fecha_inicio, fecha_fin)
        df_tiempo["id_tiempo"] = df_tiempo["id_tiempo"] + offset_tiempo
        exportar_csv(df_tiempo, "Dim_Tiempo", append=True)
        # Las dimensiones maestras no cambian, no se sobreescriben
        print("  [--] Dim_Sala, Dim_Pelicula, Dim_Socio, Dim_Producto_Bar (sin cambios)")
    else:
        # Modo historico: sobreescribir todo
        df_tiempo = generar_dim_tiempo(fecha_inicio, fecha_fin)
        exportar_csv(df_tiempo, "Dim_Tiempo")
        exportar_csv(df_salas, "Dim_Sala")
        exportar_csv(df_peliculas, "Dim_Pelicula")
        exportar_csv(df_socios, "Dim_Socio")
        exportar_csv(df_productos, "Dim_Producto_Bar")

    # --- Hechos ---
    print(f"\n[2/6] Generando tablas de hechos ({dias} dias x {len(df_salas)} salas)...")
    if not es_incremental:
        print("       Esto puede tardar unos minutos para cargas historicas largas.\n")

    # En modo incremental, continuar IDs desde el máximo existente
    offset_ticket = _leer_max_id("Fact_Ventas_Entradas", "id_ticket") if es_incremental else 0
    offset_bar = _leer_max_id("Fact_Ventas_Bar", "id_ticket_bar") if es_incremental else 0

    df_entradas, df_bar = generar_hechos(
        df_tiempo, df_salas, df_peliculas, df_socios, df_productos,
    )

    # Desplazar IDs para evitar duplicados
    if es_incremental and len(df_entradas) > 0:
        df_entradas["id_ticket"] = df_entradas["id_ticket"] + offset_ticket
        df_bar["id_ticket_bar"] = df_bar["id_ticket_bar"] + offset_bar

    exportar_csv(df_entradas, "Fact_Ventas_Entradas", append=es_incremental)
    exportar_csv(df_bar, "Fact_Ventas_Bar", append=es_incremental)

    # --- Resumen ---
    print(f"\n{'='*60}")
    print("  RESUMEN")
    print(f"{'='*60}")
    print(f"  Dimensiones:  Tiempo={len(df_tiempo)}, Salas={len(df_salas)}, "
          f"Peliculas={len(df_peliculas)}, Socios={len(df_socios)}, Productos={len(df_productos)}")
    print(f"  Hechos:       Entradas={len(df_entradas):,}  |  Bar={len(df_bar):,}")
    if len(df_entradas) > 0:
        pct_socio = df_entradas["id_socio"].notna().mean() * 100
        pct_bar = len(df_bar) / len(df_entradas) * 100
        pct_vip = (df_entradas["tipo_entrada"] == "VIP").mean() * 100
        ingreso_entradas = df_entradas["ingreso_total"].sum()
        ingreso_bar = df_bar["ingreso_total"].sum()
        print(f"  % con socio:  {pct_socio:.1f}%  |  % cross-sell bar: {pct_bar:.1f}%  |  % VIP: {pct_vip:.1f}%")
        print(f"  Ingresos:     Entradas={ingreso_entradas:,.2f}€  |  Bar={ingreso_bar:,.2f}€")
    print(f"\n  Archivos exportados en: {OUTPUT_DIR}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
