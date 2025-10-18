// Example login script
const loginForm = document.getElementById("loginForm");

loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();
  const role = document.getElementById("loginRole").value; // 'admin' or 'employee'

  const users = JSON.parse(localStorage.getItem("users")) || {};
  if (!users[email] || users[email].password !== password || users[email].role !== role) {
    return alert("Invalid credentials or role.");
  }

  localStorage.setItem("loggedInUser", email);
  localStorage.setItem("loggedRole", role);
  window.location.href = "ABB.html";
});
