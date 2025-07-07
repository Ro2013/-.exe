const SUPABASE_URL = 'https://你的專案.supabase.co';
const SUPABASE_KEY = '你的公開 anon key';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let currentMode = null; // 'friend' or 'group'
let currentTarget = null; // email or group_id

async function signUp() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const line_id = document.getElementById("line_id").value;

  const { data, error } = await supabase.auth.signUp({ email, password });
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
    const li = document.createElement("li");
    li.innerText = f.friend_email;
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
      const p = document.createElement("p");
      p.textContent = `${msg.sender}: ${msg.text}`;
      box.appendChild(p);
    }
  } else if (currentMode === "group") {
    const { data } = await supabase.from("group_messages")
      .select("*")
      .eq("group_id", currentTarget)
      .order("created_at");

    for (const msg of data) {
      const p = document.createElement("p");
      p.textContent = `${msg.sender}: ${msg.text}`;
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
