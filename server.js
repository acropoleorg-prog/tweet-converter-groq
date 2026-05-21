import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static('public'));

// Rota principal: proxy para a Groq
app.post('/api/generate', async (req, res) => {
  const { messages } = req.body;

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'GROQ_API_KEY não configurada.' });
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1000,
        messages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Erro na API.' });
    }

    // Converte resposta Groq para o formato que o frontend espera
    const content = data.choices?.[0]?.message?.content || '';
    res.json({ content: [{ type: 'text', text: content }] });

  } catch (err) {
    console.error('Erro ao chamar Groq:', err);
    res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

app.listen(PORT, () => {
  console.log(`Tweet Machine rodando em http://localhost:${PORT}`);
});

// Rota para buscar conteúdo de uma URL
app.post('/api/fetch-url', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL não informada.' });
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TweetMachine/1.0)' }
    });
    const html = await response.text();
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 8000);
    res.json({ text });
  } catch (err) {
    res.status(500).json({ error: 'Não foi possível acessar a URL.' });
  }
});
