// 🔧 把這裡改成你自己的 Supabase 專案資訊
const SUPABASE_URL = "https://你的專案.supabase.co";
const SUPABASE_KEY = "你的 anon 公鑰";
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;

async function signUp() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) return alert(error.message);
  alert("註冊成功，請登入！");
}

async function signIn() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return alert(error.message);
  currentUser = data.user;
  document.getElementById("login").style.display = "none";
  document.getElementById("chat").style.display = "block";
  loadOldMessages();
  subscribeToMessages();
}

async function loadOldMessages() {
  const { data, error } = await supabase.from("messages")
    .select("*")
    .order("created_at", { ascending: true });
  const box = document.getElementById("messages");
  box.innerHTML = "";
  data.forEach(msg => addMessageToUI(msg));
}

function addMessageToUI(msg) {
  const box = document.getElementById("messages");
  const line = document.createElement("p");
  line.innerHTML = `<strong>${msg.user_email}:</strong> ${msg.text}`;
  box.appendChild(line);
  box.scrollTop = box.scrollHeight;
}

async function sendMessage() {
  const text = document.getElementById("newMessage").value.trim();
  if (!text) return;
  await supabase.from("messages").insert([
    { user_email: currentUser.email, text }
  ]);
  document.getElementById("newMessage").value = "";
}

function subscribeToMessages() {
  supabase
    .channel("chat-channel")
    .on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "messages"
    }, payload => {
      addMessageToUI(payload.new);
    })
    .subscribe();
}
