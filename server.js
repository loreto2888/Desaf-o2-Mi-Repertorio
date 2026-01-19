const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_PATH = path.join(__dirname, 'repertorio.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// CORS simple para permitir abrir el cliente con file:// o desde otro puerto
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

async function readSongs() {
  try {
    const data = await fs.readFile(DATA_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function writeSongs(songs) {
  await fs.writeFile(DATA_PATH, JSON.stringify(songs, null, 2));
}

app.get('/canciones', async (req, res, next) => {
  try {
    const songs = await readSongs();
    res.json(songs);
  } catch (err) {
    next(err);
  }
});

app.post('/canciones', async (req, res, next) => {
  try {
    const { titulo, artista, tono, id } = req.body;
    if (!titulo || !artista || !tono) {
      return res.status(400).json({ message: 'Faltan campos requeridos.' });
    }

    const songs = await readSongs();
    const newId = id ?? (songs.length ? Math.max(...songs.map((s) => Number(s.id) || 0)) + 1 : 1);
    const song = { id: newId, titulo, artista, tono };
    songs.push(song);
    await writeSongs(songs);

    res.status(201).json(song);
  } catch (err) {
    next(err);
  }
});

app.put('/canciones/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { titulo, artista, tono } = req.body;
    if (!titulo || !artista || !tono) {
      return res.status(400).json({ message: 'Faltan campos requeridos.' });
    }

    const songs = await readSongs();
    const index = songs.findIndex((s) => String(s.id) === String(id));
    if (index === -1) return res.status(404).json({ message: 'Canción no encontrada.' });

    songs[index] = { ...songs[index], titulo, artista, tono };
    await writeSongs(songs);

    res.json(songs[index]);
  } catch (err) {
    next(err);
  }
});

app.delete('/canciones/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const songs = await readSongs();
    const index = songs.findIndex((s) => String(s.id) === String(id));
    if (index === -1) return res.status(404).json({ message: 'Canción no encontrada.' });

    const [removed] = songs.splice(index, 1);
    await writeSongs(songs);

    res.json({ message: 'Canción eliminada.', removed });
  } catch (err) {
    next(err);
  }
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Error interno del servidor.' });
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
