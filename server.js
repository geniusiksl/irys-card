const express = require('express');
const cors = require('cors');
const querystring = require('querystring');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));

// --- НАСТРОЙКИ ИЗ DISCORD DEVELOPER PORTAL ---
const CLIENT_ID = '1392017879855136788'; // Замените на свой Client ID
const CLIENT_SECRET = 'jKpISmkC-leYDrDp_WL3Q7SoJxIjay0b'; // Замените на свой Client Secret
const REDIRECT_URI = 'http://localhost:3000/callback'; // Должно совпадать с настройками в Discord App
const FRONTEND_URL = 'http://localhost:5500'; // URL вашего фронтенда (например, Live Server)
// -------------------------------------------

// Роут для начала процесса аутентификации в Discord
app.get('/auth/discord', (req, res) => {
  const authUrl = 'https://discord.com/api/oauth2/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      scope: 'identify', // Разрешение для получения ника и аватарки
      prompt: 'consent' // Запрашивать разрешение каждый раз
    });
  res.redirect(authUrl);
});

// Роут для обработки ответа после авторизации в Discord
app.get('/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('Отсутствует код авторизации');
  }

  try {
    // Шаг 1: Обмен кода авторизации на Access Token
    const tokenResponse = await axios.post(
      'https://discord.com/api/v10/oauth2/token',
      querystring.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const accessToken = tokenResponse.data.access_token;

    // Шаг 2: Получение данных профиля пользователя
    const userResponse = await axios.get(
      'https://discord.com/api/v10/users/@me',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    const userData = userResponse.data;
    // Формируем URL аватарки Discord
    const avatarUrl = userData.avatar
      ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`
      : 'https://cdn.discordapp.com/embed/avatars/0.png'; // Стандартная аватарка, если нет своей

    // Перенаправляем обратно на фронтенд с данными профиля
    res.redirect(`${FRONTEND_URL}/?username=${encodeURIComponent(userData.username)}&avatar=${encodeURIComponent(avatarUrl)}`);

  } catch (error) {
    console.error('Ошибка при аутентификации Discord:', error.response ? error.response.data : error.message);
    res.status(500).send('Ошибка при подключении к Discord. Проверьте консоль сервера.');
  }
});

// Запускаем сервер на порту 3000
app.listen(3000, () => {
  console.log('Сервер для авторизации Discord запущен на http://localhost:3000');
});