# 🪙 Validador de Monedas y Objetos con IA (Gemini Vision)

Una aplicación web moderna con visión artificial que activa la cámara de tu dispositivo (computadora o teléfono móvil), detecta automáticamente denominaciones de monedas, suma el valor acumulado e identifica objetos específicos preestablecidos asignándoles su precio de venta predeterminado.

Construido con **Node.js**, **Express**, **HTML5/CSS3/JavaScript Vanilla** y la API oficial gratuita de **Google Gemini**.

---

## 🚀 Características Principales

- 📷 **Uso de Cámara en Vivo:** Activa la cámara web o del smartphone (con selector de cámara frontal o trasera con un clic).
- 🖼️ **Alternativa de Carga:** Soporta subir fotografías guardadas directamente desde el disco/galería si no tienes cámara disponible.
- 🪙 **Detección y Conteo de Monedas:** Identifica denominaciones (ej. $10, $5, $2, $1, $0.50 en MXN; o USD y EUR) y calcula el valor subtotalizado de cada tipo y el total general.
- 🏷️ **Reconocimiento de Objetos con Precio Preestablecido:** Detecta productos de muestra (ej. Libreta: $35.00, Lapicero: $10.00, Refresco/Botella: $18.00) y suma su precio automáticamente.
- ✏️ **Precios Editables en Tiempo Real:** Puedes ajustar los precios de los objetos directamente en la interfaz.
- 🤖 **Resumen Diagnóstico con IA:** Explicación detallada en lenguaje natural generada por Gemini Vision sobre la composición de la escena.
- 🔒 **Preparado para GitHub:** Configurado con `.gitignore` para no subir accidentalmente tu API Key (`.env`) ni `node_modules/`.

---

## 📁 Estructura del Proyecto

```text
validador-monedas/
│
├── public/
│   ├── index.html       # Interfaz de usuario responsiva
│   ├── style.css        # Diseño moderno con tema oscuro y animaciones
│   └── app.js           # Lógica de cámara (MediaDevices), captura y renderizado
│
├── server.js            # Servidor Express y llamadas a Google Gemini Vision
├── package.json         # Dependencias y scripts
├── .env                 # Clave de API (NO se sube a GitHub)
├── .env.example         # Plantilla de variables de entorno para otros desarrolladores
├── .gitignore           # Archivos ignorados por Git
└── README.md            # Documentación del proyecto
```

---

## 🛠️ Requisitos Previos

1. **Node.js**: Versión 18 o superior instalada ([Descargar Node.js](https://nodejs.org/)).
2. **API Key Gratuita de Google Gemini**:
   - Ingresa a [Google AI Studio](https://aistudio.google.com/).
   - Inicia sesión con tu cuenta de Google.
   - Haz clic en **"Get API key"** y crea una nueva clave de acceso (el nivel estándar es gratuito).

---

## 💻 Instalación y Puesta en Marcha

### 1. Clonar o descargar el repositorio
```bash
cd validador-monedas
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar tu clave de API de Gemini
Copia el archivo `.env.example` a un nuevo archivo llamado `.env` (si no existe ya):
```bash
cp .env.example .env
```
Abre `.env` con un editor de texto y coloca tu clave:
```env
PORT=3000
GEMINI_API_KEY=AIzaSyTuClaveDeGoogleGeminiAqui
```

### 4. Iniciar la aplicación
```bash
npm start
```
O en modo desarrollo con recarga automática:
```bash
npm run dev
```

### 5. Abrir en tu navegador
Visita: [http://localhost:3000](http://localhost:3000)

---

## 📱 Uso de la Aplicación

1. Haz clic en **"Iniciar Cámara"** y acepta los permisos de acceso que solicite el navegador.
2. Coloca las monedas sobre una superficie bien iluminada (y si deseas, incluye una libreta, lapicero o botella).
3. Presiona el botón **"📸 Capturar y Analizar con IA"**.
4. En cuestión de segundos verás:
   - El desglose de cada denominación de moneda encontrada con su subtotal.
   - Los objetos reconocidos con su precio fijo aplicado.
   - El **Gran Total** sumado.
   - La explicación visual provista por la IA.

---

## 📤 Instrucciones para Subir a GitHub

Para publicar tu proyecto en tu cuenta de GitHub de forma segura:

1. **Inicializar el repositorio Git local**:
   ```bash
   git init
   ```

2. **Verificar que `.env` esté ignorado**:
   ```bash
   git status
   ```
   *(Asegúrate de que `.env` y `node_modules/` **NO** aparezcan en la lista de archivos a subir).*

3. **Añadir los archivos y realizar el primer commit**:
   ```bash
   git add .
   git commit -m "feat: Validador de monedas y objetos con Gemini AI"
   ```

4. **Vincular a tu repositorio de GitHub y subir**:
   ```bash
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/validador-monedas.git
   git push -u origin main
   ```

---

## 🛡️ Licencia
Proyecto libre bajo la licencia [MIT](LICENSE).
