// Estado global de la aplicación
const state = {
  stream: null,
  facingMode: 'environment', // 'environment' (trasera) o 'user' (frontal)
  isCameraActive: false,
  isAnalyzing: false,
  currency: 'MXN',
  predefinedObjects: [],
  isEditingObjects: false
};

// Referencias del DOM
const elements = {
  video: document.getElementById('cameraFeed'),
  canvas: document.getElementById('captureCanvas'),
  previewImg: document.getElementById('previewImage'),
  scannerOverlay: document.getElementById('scannerOverlay'),
  cameraPlaceholder: document.getElementById('cameraPlaceholder'),
  cameraStatus: document.getElementById('cameraStatus'),
  btnToggleCamera: document.getElementById('btnToggleCamera'),
  btnStartCameraPlaceholder: document.getElementById('btnStartCameraPlaceholder'),
  btnSwitchCamera: document.getElementById('btnSwitchCamera'),
  btnCaptureAnalyze: document.getElementById('btnCaptureAnalyze'),
  fileUpload: document.getElementById('fileUpload'),
  apiKeyBadge: document.getElementById('apiKeyBadge'),
  apiAlert: document.getElementById('apiAlert'),
  currencySelect: document.getElementById('currencySelect'),
  objectsList: document.getElementById('objectsList'),
  btnToggleEditObjects: document.getElementById('btnToggleEditObjects'),
  displayGrandTotal: document.getElementById('displayGrandTotal'),
  displayCoinsTotal: document.getElementById('displayCoinsTotal'),
  displayObjectsTotal: document.getElementById('displayObjectsTotal'),
  displayCurrencySymbol: document.getElementById('displayCurrencySymbol'),
  displayCurrencyCode: document.getElementById('displayCurrencyCode'),
  coinsCountBadge: document.getElementById('coinsCountBadge'),
  objectsCountBadge: document.getElementById('objectsCountBadge'),
  coinsContainer: document.getElementById('coinsContainer'),
  detectedObjectsContainer: document.getElementById('detectedObjectsContainer'),
  aiSummaryText: document.getElementById('aiSummaryText')
};

// ================= INICIALIZACIÓN =================
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await loadServerConfig();
});

function setupEventListeners() {
  // Controles de cámara
  elements.btnToggleCamera.addEventListener('click', toggleCamera);
  elements.btnStartCameraPlaceholder.addEventListener('click', startCamera);
  elements.btnSwitchCamera.addEventListener('click', switchCamera);
  elements.btnCaptureAnalyze.addEventListener('click', captureAndAnalyze);

  // Subida manual de archivo (alternativa a la cámara)
  elements.fileUpload.addEventListener('change', handleFileUpload);

  // Selector de divisa
  elements.currencySelect.addEventListener('change', (e) => {
    state.currency = e.target.value;
    updateCurrencySymbols();
  });

  // Edición de precios de objetos
  elements.btnToggleEditObjects.addEventListener('click', toggleEditObjectsMode);
}

// Cargar configuración inicial del servidor
async function loadServerConfig() {
  try {
    const res = await fetch('/api/config');
    const data = await res.json();

    state.predefinedObjects = data.predefinedObjects || [];
    renderPredefinedObjects();

    // Estado de la API Key
    if (data.isApiKeyConfigured) {
      elements.apiKeyBadge.className = 'badge badge-success';
      elements.apiKeyBadge.innerHTML = '<i class="fa-solid fa-check"></i> Gemini Conectado';
      elements.apiAlert.classList.add('hidden');
    } else {
      elements.apiKeyBadge.className = 'badge badge-danger';
      elements.apiKeyBadge.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Falta API Key';
      elements.apiAlert.classList.remove('hidden');
    }
  } catch (err) {
    console.warn('Error al conectar con /api/config:', err);
    elements.apiKeyBadge.className = 'badge badge-warning';
    elements.apiKeyBadge.innerHTML = '<i class="fa-solid fa-server"></i> Servidor local';
  }
}

// ================= MANEJO DE CÁMARA =================
async function startCamera() {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Tu navegador no soporta acceso a la cámara. Puedes usar el botón "Subir Foto".');
      return;
    }

    // Detener stream previo si existe
    stopCameraStream();

    const constraints = {
      video: {
        facingMode: state.facingMode,
        width: { ideal: 1280 },
        height: { ideal: 960 }
      },
      audio: false
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    state.stream = stream;
    elements.video.srcObject = stream;

    await elements.video.play();

    // Actualizar interfaz
    state.isCameraActive = true;
    elements.cameraPlaceholder.classList.add('hidden');
    elements.previewImg.classList.add('hidden');
    elements.video.classList.remove('hidden');

    elements.cameraStatus.className = 'status-pill status-on';
    elements.cameraStatus.innerHTML = '<span class="dot"></span> En vivo';

    elements.btnToggleCamera.innerHTML = '<i class="fa-solid fa-video-slash"></i> Detener Cámara';
    elements.btnSwitchCamera.disabled = false;
    elements.btnCaptureAnalyze.disabled = false;
  } catch (err) {
    console.error('Error al iniciar la cámara:', err);
    let msg = 'No se pudo acceder a la cámara.';
    if (err.name === 'NotAllowedError') {
      msg = 'Permiso denegado. Permite el acceso a la cámara en los permisos de tu navegador.';
    } else if (err.name === 'NotFoundError') {
      msg = 'No se detectó ninguna cámara en este dispositivo.';
    }
    alert(msg + ' Puedes probar subiendo una imagen con "Subir Foto".');
  }
}

function stopCameraStream() {
  if (state.stream) {
    state.stream.getTracks().forEach(track => track.stop());
    state.stream = null;
  }
  if (elements.video.srcObject) {
    elements.video.srcObject = null;
  }
}

function stopCamera() {
  stopCameraStream();
  state.isCameraActive = false;
  elements.cameraPlaceholder.classList.remove('hidden');
  elements.cameraStatus.className = 'status-pill status-off';
  elements.cameraStatus.innerHTML = '<span class="dot"></span> Inactiva';
  elements.btnToggleCamera.innerHTML = '<i class="fa-solid fa-video"></i> Iniciar Cámara';
  elements.btnSwitchCamera.disabled = true;
  elements.btnCaptureAnalyze.disabled = true;
}

function toggleCamera() {
  if (state.isCameraActive) {
    stopCamera();
  } else {
    startCamera();
  }
}

async function switchCamera() {
  state.facingMode = state.facingMode === 'environment' ? 'user' : 'environment';
  await startCamera();
}

// Subir foto desde el disco / galería
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    // Detener cámara si estaba prendida
    if (state.isCameraActive) {
      stopCamera();
    }

    // Mostrar vista previa en la pantalla
    elements.previewImg.src = e.target.result;
    elements.previewImg.classList.remove('hidden');
    elements.video.classList.add('hidden');
    elements.cameraPlaceholder.classList.add('hidden');
    elements.btnCaptureAnalyze.disabled = false;
    elements.cameraStatus.className = 'status-pill status-on';
    elements.cameraStatus.innerHTML = '<span class="dot"></span> Foto cargada';
  };
  reader.readAsDataURL(file);
}

// ================= CAPTURA Y ANÁLISIS =================
async function captureAndAnalyze() {
  if (state.isAnalyzing) return;

  let base64Image = null;

  if (state.isCameraActive && elements.video.videoWidth > 0) {
    // Tomar fotograma del video
    const video = elements.video;
    const canvas = elements.canvas;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    base64Image = canvas.toDataURL('image/jpeg', 0.88);

    // Congelar fotograma en el preview
    elements.previewImg.src = base64Image;
    elements.previewImg.classList.remove('hidden');
  } else if (!elements.previewImg.classList.contains('hidden') && elements.previewImg.src) {
    // Usar la imagen subida previamente
    base64Image = elements.previewImg.src;
  } else {
    alert('Activa la cámara o sube una fotografía para analizar.');
    return;
  }

  // Activar estado de carga y animación de escáner
  state.isAnalyzing = true;
  elements.scannerOverlay.classList.remove('hidden');
  elements.btnCaptureAnalyze.disabled = true;
  elements.aiSummaryText.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Contactando con Google Gemini Vision para clasificar monedas y objetos...';

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: base64Image,
        currency: state.currency,
        customObjects: state.predefinedObjects
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Error en el servidor');
    }

    // Renderizar resultados en pantalla
    displayResults(data);

  } catch (error) {
    console.error('Error al analizar:', error);
    alert('⚠️ ' + error.message);
    elements.aiSummaryText.innerHTML = `<span style="color: #f87171;"><i class="fa-solid fa-circle-xmark"></i> ${error.message}</span>`;
  } finally {
    state.isAnalyzing = false;
    elements.scannerOverlay.classList.add('hidden');
    elements.btnCaptureAnalyze.disabled = false;
  }
}

// ================= RENDERIZADO DE RESULTADOS =================
function displayResults(data) {
  const currencySymbol = state.currency === 'EUR' ? '€' : '$';

  // 1. Gran Total y Subtotales
  elements.displayCurrencySymbol.textContent = currencySymbol;
  elements.displayGrandTotal.textContent = Number(data.grandTotal || 0).toFixed(2);
  elements.displayCurrencyCode.textContent = data.currency || state.currency;

  elements.displayCoinsTotal.textContent = `${currencySymbol}${Number(data.totalCoins || 0).toFixed(2)}`;
  elements.displayObjectsTotal.textContent = `${currencySymbol}${Number(data.totalObjects || 0).toFixed(2)}`;

  // 2. Monedas Detectadas
  const coins = data.coins || [];
  elements.coinsCountBadge.textContent = `${coins.reduce((acc, c) => acc + (c.count || 0), 0)} monedas`;

  if (coins.length === 0) {
    elements.coinsContainer.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-circle-exclamation"></i>
        <p>No se identificaron monedas en esta captura.</p>
      </div>`;
  } else {
    elements.coinsContainer.innerHTML = coins.map(coin => `
      <div class="item-row">
        <div class="item-left">
          <div class="coin-badge">${currencySymbol}${coin.denomination}</div>
          <div class="item-details">
            <h4>${coin.name} (${coin.count}x)</h4>
            <p>${coin.description || 'Denominación válida detectada'}</p>
          </div>
        </div>
        <div class="item-right">
          <span class="item-subtotal">${currencySymbol}${Number(coin.subtotal).toFixed(2)}</span>
          <span class="item-unit">${coin.count} × ${currencySymbol}${Number(coin.denomination).toFixed(2)}</span>
        </div>
      </div>
    `).join('');
  }

  // 3. Objetos Detectados
  const objects = data.objects || [];
  elements.objectsCountBadge.textContent = `${objects.reduce((acc, o) => acc + (o.count || 0), 0)} objetos`;

  if (objects.length === 0) {
    elements.detectedObjectsContainer.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-eye-slash"></i>
        <p>No se encontraron en la imagen los objetos preestablecidos.</p>
      </div>`;
  } else {
    elements.detectedObjectsContainer.innerHTML = objects.map(obj => {
      // Buscar icono configurado
      const cfg = state.predefinedObjects.find(p => p.id === obj.id);
      const icon = cfg ? cfg.icon : 'fa-box';

      return `
        <div class="item-row">
          <div class="item-left">
            <div class="object-badge">
              <i class="fa-solid ${icon}"></i>
            </div>
            <div class="item-details">
              <h4>${obj.name} (${obj.count}x)</h4>
              <p>${obj.description || 'Objeto preestablecido reconocido'}</p>
            </div>
          </div>
          <div class="item-right">
            <span class="item-subtotal">${currencySymbol}${Number(obj.subtotal).toFixed(2)}</span>
            <span class="item-unit">${obj.count} × ${currencySymbol}${Number(obj.unitPrice).toFixed(2)}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // 4. Resumen descriptivo de Gemini
  elements.aiSummaryText.textContent = data.summary || 'Análisis completado satisfactoriamente.';
}

// ================= OBJETOS PREESTABLECIDOS =================
function renderPredefinedObjects() {
  const currencySymbol = state.currency === 'EUR' ? '€' : '$';

  elements.objectsList.innerHTML = state.predefinedObjects.map((obj, idx) => `
    <div class="object-card-item">
      <div class="obj-card-top">
        <div class="obj-icon-circle">
          <i class="fa-solid ${obj.icon || 'fa-tag'}"></i>
        </div>
        <div class="obj-card-info">
          <h4>${obj.name}</h4>
          <span class="section-desc">${obj.description || ''}</span>
        </div>
      </div>
      <div class="obj-card-bottom">
        ${state.isEditingObjects ? `
          <input 
            type="number" 
            step="0.5" 
            min="0"
            class="obj-price-input" 
            value="${obj.price}" 
            data-index="${idx}"
            onchange="updateObjectPrice(${idx}, this.value)"
          />
        ` : `
          <span class="obj-price-tag">${currencySymbol}${Number(obj.price).toFixed(2)}</span>
        `}
      </div>
    </div>
  `).join('');
}

function toggleEditObjectsMode() {
  state.isEditingObjects = !state.isEditingObjects;
  elements.btnToggleEditObjects.innerHTML = state.isEditingObjects 
    ? '<i class="fa-solid fa-check"></i> Guardar Precios' 
    : '<i class="fa-solid fa-pen-to-square"></i> Editar Precios';
  renderPredefinedObjects();
}

window.updateObjectPrice = function(index, newPrice) {
  const val = parseFloat(newPrice);
  if (!isNaN(val) && val >= 0) {
    state.predefinedObjects[index].price = val;
  }
};

function updateCurrencySymbols() {
  const symbol = state.currency === 'EUR' ? '€' : '$';
  elements.displayCurrencySymbol.textContent = symbol;
  elements.displayCurrencyCode.textContent = state.currency;
  renderPredefinedObjects();
}
