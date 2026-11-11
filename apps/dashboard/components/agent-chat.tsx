"use client";

import { FormEvent, useState } from "react";
import { Bot, LoaderCircle, Send, UserRound, RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type ChatMessage = { role: "user" | "assistant"; content: string };
export default function AgentChat({ agentId, welcomeMessage }: { agentId: string; welcomeMessage: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", content: welcomeMessage }]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || busy) return;
    setDraft("");
    setError("");
    setMessages(current => [...current, { role: "user", content: message }]);
    setBusy(true);
    try {
      const supabase = createClient();
      const { data, error: invokeError } = await supabase.functions.invoke("agent-chat", {
        body: { agent_id: agentId, message, conversation_id: conversationId },
      });
      if (invokeError) throw new Error(invokeError.message || "The agent request failed.");
      if (data?.error) throw new Error(data.error);
      setConversationId(data.conversation_id);
      setMessages(current => [...current, { role: "assistant", content: data.reply }]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not reach the agent runtime.");
      setMessages(current => current.filter((item, index) =>
        !(item.role === "user" && index === current.length - 1 && item.content === message)
      ));
    } finally {
      setBusy(false);
    }
  }

  function resetChat() {
    setConversationId(null);
    setMessages([{ role: "assistant", content: welcomeMessage }]);
    setError("");
  }

  return <div className="agent-chat">
    <div className="agent-chat-toolbar"><span><i/> Test session · private to admin</span><button type="button" onClick={resetChat}><RotateCcw size={13}/> New test</button></div>
    <div className="agent-chat-messages">
      {messages.map((message,index)=><div className={"chat-message " + message.role} key={index}>
        <span className="chat-message-avatar">{message.role==="assistant"?<Bot size={15}/>:<UserRound size={15}/>}</span>
        <div><small>{message.role==="assistant"?"Agent":"You"}</small><p>{message.content}</p></div>
      </div>)}
      {busy && <div className="chat-message assistant"><span className="chat-message-avatar"><Bot size={15}/></span><div><small>Agent is thinking</small><p className="typing"><i/><i/><i/></p></div></div>}
    </div>
    {error && <div className="agent-chat-error">{error}</div>}
    <form className="agent-chat-input" onSubmit={sendMessage}>
      <textarea value={draft} onChange={event=>setDraft(event.target.value)} placeholder="Ask your agent something..." rows={2} maxLength={4000} disabled={busy}/>
      <button type="submit" disabled={busy || !draft.trim()} aria-label="Send message">{busy?<LoaderCircle size={17} className="spin"/>:<Send size={17}/>}</button>
    </form>
    <div className="agent-chat-footnote">Responses use your configured provider API key. Keep sensitive customer data out of test prompts.</div>
  </div>;
}
