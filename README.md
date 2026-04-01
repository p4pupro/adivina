# Adivina la palabra

Juego web estático para niños de 3 a 5 años: ven una imagen y eligen entre dos palabras. HTML, CSS y JavaScript sin dependencias de build.

## Cómo jugar en local

Abre `index.html` con un servidor local (el `fetch` de `data/words.json` no funciona al abrir el archivo directamente con `file://`):

```bash
npx --yes serve .
```

Luego entra en la URL que muestre la terminal (por ejemplo `http://localhost:3000`).

## GitHub Pages

1. Sube este repositorio a GitHub.
2. En el repositorio: **Settings → Pages**.
3. **Source**: despliega la rama `main` (o la que uses) desde la carpeta raíz `/` (o `/docs` si mueves los archivos allí).

La URL del sitio será:

`https://<tu-usuario>.github.io/<nombre-del-repo>/`

Las rutas usan archivos relativos (`data/words.json`, `styles.css`, `app.js`), así que funcionan tanto en la raíz del dominio como en subcarpeta de proyecto.

## Contenido

Las palabras e imágenes están en [`data/words.json`](data/words.json). Las fotos enlazan a archivos de Wikimedia Commons (licencias abiertas). Si una imagen no carga, se muestra el emoji de respaldo.

## Licencia

El código del proyecto es tuyo para usar como quieras. Respeta las licencias de las imágenes enlazadas en Wikimedia Commons si las reutilizas fuera de este juego.
