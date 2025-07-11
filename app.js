const SUPABASE_URL = 'https://xiepsvhpsdzdgzdhuvtc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpZXBzdmhwc2R6ZGd6ZGh1dnRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4NzU5MDUsImV4cCI6MjA2NzQ1MTkwNX0.G7O_cl099wt02_SnNRZ2iqa39zFqEtma9wL09t6vFoM';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let currentMode = null;
let currentTarget = null;

async function signUp() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const line_id = document.getElementById("line_id").value;

  const { error } = await supabase.auth.signUp({ email, password });
  if (error) return alert(error.message);

  await supabase.from("users").insert({ email, line_id });
  alert("註冊成功，請登入！");
}

async function signIn() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return alert(error.message);

  currentUser = data.user;
  document.getElementById("login").style.display = "none";
  document.getElementById("chat").style.display = "block";

  loadFriends();
  loadGroups();
}

function signOut() {
  location.reload();
}

async function addFriend() {
  const friendLineId = document.getElementById("searchId").value;
  const { data: friend } = await supabase.from("users").select("*").eq("line_id", friendLineId).single();
  if (!friend) return alert("找不到使用者");

  const { error } = await supabase.from("friends").insert({
    user_email: currentUser.email,
    friend_email: friend.email
  });
  if (error) return alert("加好友失敗：" + error.message);
  alert("好友已加入！");
  loadFriends();
}

async function loadFriends() {
  const { data, error } = await supabase.from("friends").select("friend_email").eq("user_email", currentUser.email);
  const ul = document.getElementById("friendList");
  ul.innerHTML = "";

  for (const f of data) {
    const { data: friendInfo } = await supabase
      .from("users")
      .select("line_id")
      .eq("email", f.friend_email)
      .single();

    const li = document.createElement("li");
    li.innerText = friendInfo?.line_id || f.friend_email;
    li.onclick = () => {
      currentMode = "friend";
      currentTarget = f.friend_email;
      loadMessages();
    };
    ul.appendChild(li);
  }
}

async function createGroup() {
  const name = document.getElementById("groupName").value;
  const { data, error } = await supabase.from("groups").insert({
    name: name,
    owner: currentUser.email
  }).select();

  if (error) return alert("建立失敗：" + error.message);

  await supabase.from("group_members").insert({
    group_id: data[0].id,
    user_email: currentUser.email
  });

  alert("群組建立成功！");
  loadGroups();
}

async function loadGroups() {
  const { data: groups } = await supabase
    .from("group_members")
    .select("group_id, groups(name)")
    .eq("user_email", currentUser.email);

  const ul = document.getElementById("groupList");
  ul.innerHTML = "";
  for (const g of groups) {
    const li = document.createElement("li");
    li.innerText = g.groups.name;
    li.onclick = () => {
      currentMode = "group";
      currentTarget = g.group_id;
      loadMessages();
    };
    ul.appendChild(li);
  }
}

async function loadMessages() {
  const box = document.getElementById("messages");
  box.innerHTML = "";

  if (currentMode === "friend") {
    const { data } = await supabase.from("private_messages")
      .select("*")
      .or(`sender.eq.${currentUser.email},receiver.eq.${currentUser.email}`)
      .order("created_at");

    for (const msg of data.filter(m => (m.sender === currentUser.email && m.receiver === currentTarget) || (m.receiver === currentUser.email && m.sender === currentTarget))) {
      const { data: userInfo } = await supabase
        .from("users")
        .select("line_id")
        .eq("email", msg.sender)
        .single();

      const p = document.createElement("p");
      p.textContent = `${userInfo?.line_id || msg.sender}: ${msg.text}`;
      box.appendChild(p);
    }
  } else if (currentMode === "group") {
    const { data } = await supabase.from("group_messages")
      .select("*")
      .eq("group_id", currentTarget)
      .order("created_at");

    for (const msg of data) {
      const { data: userInfo } = await supabase
        .from("users")
        .select("line_id")
        .eq("email", msg.sender)
        .single();

      const p = document.createElement("p");
      p.textContent = `${userInfo?.line_id || msg.sender}: ${msg.text}`;
      box.appendChild(p);
    }
  }

  box.scrollTop = box.scrollHeight;
}

async function sendMessage() {
  const text = document.getElementById("newMessage").value;
  if (!text) return;

  if (currentMode === "friend") {
    await supabase.from("private_messages").insert({
      sender: currentUser.email,
      receiver: currentTarget,
      text
    });
  } else if (currentMode === "group") {
    await supabase.from("group_messages").insert({
      sender: currentUser.email,
      group_id: currentTarget,
      text
    });
  }

  document.getElementById("newMessage").value = "";
  loadMessages();
}
