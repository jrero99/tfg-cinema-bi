import pandas as pd
from faker import Faker
import random
import os

# Configuración inicial
fake = Faker('es_ES')
Faker.seed(42)
random.seed(42)

# Crear carpeta para los outputs si no existe
os.makedirs('output_csv', exist_ok=True)

print("Iniciando generacion de datos maestros (Dimensiones)...")

# ==========================================
# 1. GENERAR DIMENSIÓN CINE Y SALAS (Actualizado con VIP)
# ==========================================
cines_info = [
    {"id_cine": 1, "nombre_cine": "Cinema BCN Centro", "ciudad": "Barcelona", "salas": 8},
    {"id_cine": 2, "nombre_cine": "Cinema BCN Glòries", "ciudad": "Barcelona", "salas": 10},
    {"id_cine": 3, "nombre_cine": "Cinema Mataró Parc", "ciudad": "Mataró", "salas": 6},
    {"id_cine": 4, "nombre_cine": "Cinema Granollers Nord", "ciudad": "Granollers", "salas": 5}
]

formatos_sala = ['Estandar', 'Estandar', 'Estandar', '3D', 'IMAX']
salas_data = []
id_sala = 1

for cine in cines_info:
    for num_sala in range(1, cine['salas'] + 1):
        capacidad_total = random.choice([80, 120, 150, 200, 300])
        
        # Lógica de negocio: El 40% de las salas tienen zona VIP
        tiene_vip = random.random() < 0.40
        if tiene_vip:
            # Si tiene VIP, entre el 10% y 15% de las butacas son VIP
            porcentaje_vip = random.uniform(0.10, 0.15)
            num_butacas_vip = int(capacidad_total * porcentaje_vip)
        else:
            num_butacas_vip = 0
            
        salas_data.append({
            "id_sala": id_sala,
            "id_cine": cine["id_cine"],
            "nombre_cine": cine["nombre_cine"],
            "ciudad": cine["ciudad"],
            "nombre_sala": f"Sala {num_sala}",
            "capacidad_total": capacidad_total,
            "num_butacas_vip": num_butacas_vip,
            "formato_proyeccion": random.choice(formatos_sala)
        })
        id_sala += 1

df_salas = pd.DataFrame(salas_data)
df_salas.to_csv('output_csv/Dim_Sala.csv', index=False, encoding='utf-8')
print(f"Dim_Sala generada: {len(df_salas)} salas en 4 cines (Con gestion de Butacas VIP).")

# ==========================================
# 2. GENERAR DIMENSIÓN PELÍCULAS (80 Películas)
# ==========================================
generos = ['Acción', 'Comedia', 'Drama', 'Terror', 'Ciencia Ficción', 'Animación', 'Documental', 'Thriller']
edades = ['TP', '+7', '+12', '+16', '+18']
distribuidoras = ['Warner Bros', 'Disney', 'Universal', 'Sony Pictures', 'Paramount', 'A Contracorriente', 'Filmax', 'Independiente']
idiomas = ['Doblada Español', 'Doblada Español', 'Doblada Catalán', 'VOSE'] # Más peso al español por probabilidad estándar

# Lista de clásicos para reestrenos
clasicos = ["El Padrino", "Matrix", "Casablanca", "Jurassic Park", "El Señor de los Anillos", "Pulp Fiction", "Alien", "Gladiator", "Titanic", "Avatar"]

peliculas_data = []

for i in range(1, 81):
    es_reestreno = False
    
    # 15% de probabilidad de ser un clásico/reestreno
    if i <= len(clasicos):
        titulo = f"{clasicos[i-1]} (Reestreno)"
        es_reestreno = True
    else:
        # Generar nombres falsos pero realistas combinando palabras
        titulo = f"{fake.word().capitalize()} {fake.word().capitalize()}: {fake.catch_phrase().split(' ')[0]}"

    peliculas_data.append({
        "id_pelicula": i,
        "titulo": titulo,
        "genero": random.choice(generos),
        "clasificacion_edad": random.choice(edades),
        "distribuidora": random.choice(distribuidoras),
        "duracion_minutos": random.randint(85, 180),
        "idioma_formato": random.choice(idiomas),
        "es_reestreno": es_reestreno
    })

df_peliculas = pd.DataFrame(peliculas_data)
df_peliculas.to_csv('output_csv/Dim_Pelicula.csv', index=False, encoding='utf-8')
print(f"Dim_Pelicula generada: {len(df_peliculas)} peliculas (Incluyendo VOSE, Catalan y Reestrenos).")

# ==========================================
# 3. GENERAR DIMENSIÓN SOCIOS (1000 Socios)
# ==========================================
socios_data = []
niveles = ['Bronce', 'Bronce', 'Plata', 'Oro']

for i in range(1, 1001):
    socios_data.append({
        "id_socio": i,
        "edad": random.randint(16, 75),
        "genero": random.choice(['M', 'F', 'Otro']),
        "fecha_alta": fake.date_between(start_date='-3y', end_date='today'),
        "nivel_fidelidad": random.choice(niveles)
    })

df_socios = pd.DataFrame(socios_data)
df_socios.to_csv('output_csv/Dim_Socio.csv', index=False, encoding='utf-8')
print(f"Dim_Socio generada: {len(df_socios)} socios del programa de fidelizacion.")

# ==========================================
# 4. GENERAR DIMENSIÓN PRODUCTOS BAR
# ==========================================
productos = [
    ("Palomitas Pequeñas", "Palomitas", 0.50, 3.50), ("Palomitas Medianas", "Palomitas", 0.80, 5.00), ("Palomitas Gigantes", "Palomitas", 1.20, 6.50),
    ("Refresco Cola 50cl", "Bebida", 0.40, 3.00), ("Refresco Naranja 50cl", "Bebida", 0.40, 3.00), ("Agua Mineral 50cl", "Bebida", 0.20, 2.00),
    ("Nachos con Queso", "Snack", 1.00, 4.50), ("Gominolas 100g", "Dulces", 0.30, 2.50), ("Chocolatina", "Dulces", 0.50, 2.00),
    ("Combo Pareja (2 Refrescos + Palomitas L)", "Combo", 1.60, 9.50), ("Combo Infantil (Zumo + Palomitas S + Juguete)", "Combo", 2.00, 7.00)
]

productos_data = []
for i, prod in enumerate(productos, 1):
    productos_data.append({
        "id_producto": i,
        "nombre_producto": prod[0],
        "categoria": prod[1],
        "coste_proveedor": prod[2],
        "precio_venta": prod[3]
    })

df_productos = pd.DataFrame(productos_data)
df_productos.to_csv('output_csv/Dim_Producto_Bar.csv', index=False, encoding='utf-8')
print(f"Dim_Producto_Bar generada: {len(df_productos)} productos.")

print("Exportado")