async function run() {
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: "yMat3us_", password: "85125514" })
  });
  
  if (!loginRes.ok) {
    console.error("Login failed:", await loginRes.text());
    return;
  }
  
  const cookies = loginRes.headers.get('set-cookie');
  console.log("Logged in. Cookies:", cookies);
  
  const bookRes = await fetch('http://localhost:3000/api/ai/bible-book', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': cookies
    },
    body: JSON.stringify({ bookName: "Gênesis" })
  });
  
  console.log("Book API status:", bookRes.status);
  console.log("Book API response:", await bookRes.text());
}
run();
