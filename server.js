const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Ruta principal: proxy hacia Anthropic
app.post('/api/chat', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: { message: 'API Key no configurada en el servidor.' } });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: { message: 'Error al conectar con la IA: ' + err.message } });
  }
});

// Cualquier otra ruta → index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta de salud para el ping
app.get('/ping', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`BenjaZalaGPT corriendo en puerto ${PORT}`);

  // Auto-ping cada 14 minutos para que Render no duerma el servidor
  const APP_URL = process.env.RENDER_EXTERNAL_URL;
  if (APP_URL) {
    setInterval(async () => {
      try {
        await fetch(`${APP_URL}/ping`);
        console.log('Ping enviado - servidor activo');
      } catch(e) {
        console.log('Ping fallido:', e.message);
      }
    }, 14 * 60 * 1000);
  }
});
