(() => {
  const script = document.currentScript;
  const token = script?.dataset.agentosToken;
  if (!token || document.getElementById("agentos-widget-root")) return;
  const endpoint = "https://qisthhtqtvgvmhvqzsbx.supabase.co/functions/v1/public-chat";
  const host = document.createElement("div");
  host.id = "agentos-widget-root";
  document.body.appendChild(host);
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `
    <style>
      *{box-sizing:border-box;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      .launcher{position:fixed;right:22px;bottom:22px;z-index:2147483000;border:0;border-radius:999px;background:#6558d8;color:#fff;padding:14px 19px;font-size:14px;font-weight:650;box-shadow:0 8px 30px #17182735;cursor:pointer}
      .panel{position:fixed;right:22px;bottom:84px;width:min(370px,calc(100vw - 28px));height:min(520px,calc(100vh - 120px));z-index:2147483000;background:#fff;border:1px solid #e7e7ef;border-radius:16px;box-shadow:0 18px 60px #17182730;display:none;overflow:hidden}
      .panel.open{display:flex;flex-direction:column}.head{background:#25243d;color:#fff;padding:16px;display:flex;align-items:center;justify-content:space-between}
      .head strong{font-size:14px}.head small{display:block;color:#c9c7e5;font-size:11px;margin-top:4px}.close{border:0;background:transparent;color:#fff;font-size:22px;cursor:pointer}
      .messages{padding:14px;display:flex;flex:1;flex-direction:column;gap:10px;overflow:auto;background:#fafaff}
      .bubble{max-width:88%;padding:10px 12px;border-radius:12px;background:#eeeefa;color:#292940;font-size:13px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere}
      .bubble.user{align-self:flex-end;background:#6558d8;color:#fff}.bubble.error{background:#fff0f1;color:#ad3448}
      .form{display:flex;gap:8px;padding:12px;border-top:1px solid #eeeef4;background:#fff}.input{flex:1;min-width:0;border:1px solid #dedee9;border-radius:9px;padding:11px;font-size:13px;outline:none}.send{border:0;border-radius:9px;background:#6558d8;color:#fff;padding:0 14px;font-weight:650;cursor:pointer}.send:disabled{opacity:.5;cursor:wait}
      .typing{color:#888;font-size:12px;padding:3px 0}.foot{text-align:center;font-size:10px;color:#999;padding:0 8px 8px;background:#fff}
      @media(max-width:480px){.panel{right:10px;bottom:76px;width:calc(100vw - 20px);height:min(70vh,560px)}.launcher{right:14px;bottom:14px}}
    </style>
    <button class="launcher" type="button">Chat with us</button>
    <section class="panel" aria-label="Website assistant chat">
      <header class="head"><div><strong>Assistant</strong><small>Typically replies in a moment</small></div><button class="close" type="button" aria-label="Close chat">×</button></header>
      <div class="messages" aria-live="polite"></div>
      <form class="form"><input class="input" maxlength="2000" placeholder="Type your message…" autocomplete="off" required/><button class="send" type="submit">Send</button></form>
      <div class="foot">Powered by AgentOS</div>
    </section>`;
  const launcher = root.querySelector(".launcher");
  const panel = root.querySelector(".panel");
  const close = root.querySelector(".close");
  const messages = root.querySelector(".messages");
  const form = root.querySelector(".form");
  const input = root.querySelector(".input");
  const send = root.querySelector(".send");
  let conversationId = null;
  let greeted = false;
  function add(text, kind = "") {
    const item = document.createElement("div");
    item.className = "bubble " + kind;
    item.textContent = text;
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
  }
  launcher.addEventListener("click", () => {
    panel.classList.add("open");
    launcher.style.display = "none";
    if (!greeted) { add("Hello! How can I help you today?"); greeted = true; }
    input.focus();
  });
  close.addEventListener("click", () => { panel.classList.remove("open"); launcher.style.display = "block"; });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message || send.disabled) return;
    add(message, "user");
    input.value = "";
    send.disabled = true;
    const typing = document.createElement("div");
    typing.className = "typing"; typing.textContent = "Assistant is thinking…"; messages.appendChild(typing);
    try {
      const response = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ widget_token: token, message, conversation_id: conversationId }),
      });
      const result = await response.json();
      typing.remove();
      if (!response.ok) throw new Error(result.error || "Unable to send your message.");
      conversationId = result.conversation_id;
      add(result.reply || "I couldn't generate a response.");
    } catch (error) {
      typing.remove();
      add(error instanceof Error ? error.message : "Connection error. Please try again.", "error");
    } finally { send.disabled = false; input.focus(); }
  });
})();
