require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, 'public')));

// Lista por defecto de objetos predefinidos con precio asignado
const DEFAULT_PREDEFINED_OBJECTS = [
  {
    id: 'cuaderno',
    name: 'Libreta / Cuaderno',
    price: 35.0,
    icon: 'fa-book',
    description: 'Cuaderno, libreta de apuntes o libro'
  },
  {
    id: 'lapicero',
    name: 'Lapicero / Pluma',
    price: 10.0,
    icon: 'fa-pen',
    description: 'Bolígrafo, pluma, lapicero o lápiz'
  },
  {
    id: 'bebida',
    name: 'Refresco / Botella de agua',
    price: 18.0,
    icon: 'fa-bottle-water',
    description: 'Lata de refresco, jugo o botella con agua'
  }
];

// Endpoint de configuración e información inicial
app.get('/api/config', (req, res) => {
  const hasApiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 5);
  res.json({
    status: 'ok',
    isApiKeyConfigured: hasApiKey,
    predefinedObjects: DEFAULT_PREDEFINED_OBJECTS,
    defaultCurrency: 'MXN'
  });
});

// Endpoint principal: Análisis de imagen con Gemini AI
app.post('/api/analyze', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim().length === 0 || apiKey.includes('tu_clave_de_gemini_aqui')) {
      return res.status(400).json({
        error: 'API Key de Gemini no configurada',
        message: 'Por favor edita el archivo .env y agrega tu GEMINI_API_KEY gratuita de https://aistudio.google.com/'
      });
    }

    const { image, currency = 'MXN', customObjects } = req.body;

    if (!image) {
      return res.status(400).json({
        error: 'Imagen requerida',
        message: 'No se recibió ninguna captura para analizar.'
      });
    }

    // Extraer base64 y tipo MIME
    const mimeMatch = image.match(/^data:(image\/[a-zA-Z+]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const base64Data = image.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

    // Usar objetos personalizados si el cliente envió, o los predeterminados
    const targetObjects = (customObjects && Array.isArray(customObjects) && customObjects.length > 0)
      ? customObjects
      : DEFAULT_PREDEFINED_OBJECTS;

    const objectsListPrompt = targetObjects
      .map(o => `- "${o.name}" (ID: ${o.id}, Precio fijo: $${Number(o.price).toFixed(2)}): ${o.description || ''}`)
      .join('\n');

    // Inicializar cliente de Google Generative AI
    const genAI = new GoogleGenerativeAI(apiKey);

    // Modelos candidatos en orden de preferencia
    const primaryModel = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
    const candidateModels = Array.from(new Set([
      primaryModel,
      'gemini-3.6-flash',
      'gemini-3.1-flash-lite',
      'gemini-2.5-flash-image',
      'gemini-flash-latest'
    ]));

    const promptText = `
Eres un asistente de visión artificial especializado en reconocimiento y conteo de dinero (monedas) y detección de productos comerciales.

Analiza la imagen adjunta con atención a los detalles y realiza las siguientes tareas:
1. IDENTIFICACIÓN Y CONTEO DE MONEDAS:
   - Detecta cada moneda presente en la imagen.
   - Identifica su denominación numérica exacta y el tipo de divisa (prioriza la divisa indicada: ${currency}, por ejemplo en Pesos Mexicanos suelen ser $0.50, $1, $2, $5, $10, $20; o si son USD: $0.01, $0.05, $0.10, $0.25, $1.00; o EUR).
   - Agrupa las monedas por su denominación, indicando la cantidad de monedas detectadas de cada denominación.
   - Incluye una breve descripción visual de la moneda identificada.

2. DETECCIÓN DE OBJETOS PREESTABLECIDOS:
   - Revisa si en la imagen aparece alguno de los siguientes objetos predeterminados:
${objectsListPrompt}
   - Si detectas alguno de estos objetos, indica su nombre, el ID correspondiente, cuántas unidades visibles hay y usa exactamente su precio preestablecido indicado arriba.
   - No inventes precios para estos objetos, usa estrictamente los valores asignados. Si hay objetos distintos a los de la lista, ignóralos.

3. RESULTADO EN FORMATO JSON ESTRICTO:
Debes responder ÚNICAMENTE con una estructura JSON válida (sin texto adicional) con el siguiente formato:
{
  "currency": "${currency}",
  "coins": [
    {
      "name": "Moneda de $10",
      "denomination": 10.0,
      "count": 2,
      "subtotal": 20.0,
      "description": "Monedas bimetálicas de diez pesos con centro plateado y anillo dorado"
    }
  ],
  "objects": [
    {
      "id": "cuaderno",
      "name": "Libreta / Cuaderno",
      "count": 1,
      "unitPrice": 35.0,
      "subtotal": 35.0,
      "description": "Cuaderno espiral ubicado al lado de las monedas"
    }
  ],
  "totalCoins": 20.0,
  "totalObjects": 35.0,
  "grandTotal": 55.0,
  "summary": "Se detectaron 2 monedas de $10 y 1 libreta."
}
Si no se detectan monedas, el arreglo "coins" debe estar vacío [].
Si no se detectan los objetos preestablecidos, el arreglo "objects" debe estar vacío [].
`;

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType
      }
    };

    let responseText = null;
    let lastError = null;

    for (const currentModel of candidateModels) {
      try {
        console.log(`[Gemini AI] Intentando análisis con modelo: ${currentModel}`);
        const model = genAI.getGenerativeModel({
          model: currentModel,
          generationConfig: {
            responseMimeType: 'application/json'
          }
        });
        const result = await model.generateContent([promptText, imagePart]);
        responseText = result.response.text();
        if (responseText) {
          console.log(`[Gemini AI] Análisis exitoso con modelo: ${currentModel}`);
          break;
        }
      } catch (err) {
        console.warn(`[Gemini AI] Falló modelo ${currentModel}:`, err.message || err);
        lastError = err;

        // Si es 404, 503 (alta demanda / sobrecarga), 429 (límite temporal), reintentar con el siguiente modelo
        const isRetryable = err.status === 404 ||
          err.status === 503 ||
          err.status === 429 ||
          (err.message && (
            err.message.includes('not found') ||
            err.message.includes('overloaded') ||
            err.message.includes('high demand') ||
            err.message.includes('Resource has been exhausted')
          ));

        if (isRetryable) {
          console.log(`[Gemini AI] Modelo ${currentModel} ocupado o no disponible. Reintentando con modelo alternativo...`);
          await new Promise(resolve => setTimeout(resolve, 1200));
          continue;
        }
        throw err;
      }
    }

    if (!responseText) {
      throw lastError || new Error('No se pudo obtener respuesta de ningún modelo de Gemini disponible.');
    }

    // Parsear respuesta JSON de Gemini
    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch (parseErr) {
      console.error('Error parseando JSON de Gemini:', responseText);
      return res.status(500).json({
        error: 'Error al interpretar la respuesta de la IA',
        raw: responseText
      });
    }

    // Normalizar y verificar cálculos matemáticos en el servidor
    let totalCoins = 0;
    const normalizedCoins = (parsedData.coins || []).map(coin => {
      const denom = Number(coin.denomination) || 0;
      const count = Number(coin.count) || 0;
      const subtotal = Number((denom * count).toFixed(2));
      totalCoins += subtotal;
      return {
        name: coin.name || `Moneda de $${denom}`,
        denomination: denom,
        count: count,
        subtotal: subtotal,
        description: coin.description || ''
      };
    });

    let totalObjects = 0;
    const normalizedObjects = (parsedData.objects || []).map(obj => {
      const count = Number(obj.count) || 0;
      // Validar si coincide con precio preestablecido por id o nombre
      const matchedConfig = targetObjects.find(
        t => (obj.id && t.id === obj.id) || t.name.toLowerCase().includes((obj.name || '').toLowerCase())
      );
      const unitPrice = matchedConfig ? Number(matchedConfig.price) : (Number(obj.unitPrice) || 0);
      const subtotal = Number((unitPrice * count).toFixed(2));
      totalObjects += subtotal;
      return {
        id: matchedConfig ? matchedConfig.id : (obj.id || 'desconocido'),
        name: matchedConfig ? matchedConfig.name : (obj.name || 'Objeto'),
        count: count,
        unitPrice: unitPrice,
        subtotal: subtotal,
        description: obj.description || ''
      };
    });

    totalCoins = Number(totalCoins.toFixed(2));
    totalObjects = Number(totalObjects.toFixed(2));
    const grandTotal = Number((totalCoins + totalObjects).toFixed(2));

    return res.json({
      success: true,
      currency: parsedData.currency || currency,
      coins: normalizedCoins,
      objects: normalizedObjects,
      totalCoins: totalCoins,
      totalObjects: totalObjects,
      grandTotal: grandTotal,
      summary: parsedData.summary || 'Análisis completado.'
    });

  } catch (error) {
    console.error('Error en /api/analyze:', error);

    // Mensaje amigable si la API gratuita de Google está saturada por alta demanda
    if (error.status === 503 || (error.message && error.message.includes('overloaded'))) {
      return res.status(503).json({
        error: 'Servidor de IA con alta demanda',
        message: 'Los servidores de Google Gemini están experimentando alta demanda en el nivel gratuito. Espera unos segundos y vuelve a presionar "Capturar y Analizar".'
      });
    }

    return res.status(500).json({
      error: 'Error al procesar la imagen con IA',
      message: error.message || 'Ocurrió un error inesperado al contactar con la API de Gemini.'
    });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` Servidor Validador de Monedas y Objetos activo`);
  console.log(` URL: http://localhost:${PORT}`);
  console.log(` Modo: ${process.env.NODE_ENV || 'development'}`);
  console.log(`====================================================`);
});
