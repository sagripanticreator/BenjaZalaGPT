const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Ruta de diagnóstico — muestra si la key está cargada (sin revelarla)
app.get('/api/status', (req, res) => {
  const key = process.env.GROQ_API_KEY;
  res.json({
    groq_key_cargada: !!key,
    primeros_chars: key ? key.substring(0, 8) + '...' : 'VACÍA'
  });
});

// Ruta principal: proxy hacia Groq
app.post('/api/chat', async (req, res) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API Key de Groq no configurada en el servidor.' });
  }

  try {
    const messages = [];

    if (req.body.system) {
      messages.push({ role: 'system', content: req.body.system });
    }

    for (const msg of (req.body.messages || [])) {
      let content = '';
      if (typeof msg.content === 'string') {
        content = msg.content;
      } else if (Array.isArray(msg.content)) {
        content = msg.content
          .filter(b => b.type === 'text')
          .map(b => b.text)
          .join('\n');
      }
      messages.push({ role: msg.role, content });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        max_tokens: 1024
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message || 'Error de Groq.' });
    }

    const reply = data.choices?.[0]?.message?.content || 'Sin respuesta.';
    res.json({ content: [{ type: 'text', text: reply }] });

  } catch (err) {
    res.status(500).json({ error: 'Error al conectar con Groq: ' + err.message });
  }
});

app.get('/ping', (req, res) => res.json({ status: 'ok' }));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`BenjaZalaGPT corriendo en puerto ${PORT}`);
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
