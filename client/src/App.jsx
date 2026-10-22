import React from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import axios from "axios";
import { io } from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:9900";
const api = axios.create({ baseURL: `${API_URL}/api` });

function initials(name = "") {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export default function App() {
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem("chat-session") || "null"); } catch { return null; }
  });
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [authError, setAuthError] = useState("");
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [toast, setToast] = useState("");
  const socketRef = useRef(null);
  const bottomRef = useRef(null);

  const token = session?.token;
  const currentUser = session?.user;
  const visibleUsers = useMemo(() => users.filter((user) =>
    `${user.name} ${user.email}`.toLowerCase().includes(search.toLowerCase())
  ), [users, search]);

  useEffect(() => {
    if (!token) return;
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    api.get("/users")
      .then(({ data }) => setUsers(data))
      .catch(() => setToast("Could not load users. Check the server connection."));
    const socket = io(API_URL, { auth: { token } });
    socketRef.current = socket;
    socket.on("connect_error", () => setToast("Live connection failed. Check your server and token."));
    socket.on("new_message", (message) => {
      const otherId = message.sender?.id === currentUser?.id ? message.receiver?.id : message.sender?.id;
      if (selected?.id === otherId) {
        setMessages((previous) => previous.some((item) => item._id === message._id) ? previous : [...previous, message]);
      }
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, currentUser?.id, selected?.id]);

  useEffect(() => {
    if (!token || !selected) {
      setMessages([]);
      return;
    }
    let active = true;
    setLoadingMessages(true);
    api.get(`/messages/${selected.id}`)
      .then(({ data }) => { if (active) setMessages(data); })
      .catch(() => setToast("Could not load conversation history."))
      .finally(() => { if (active) setLoadingMessages(false); });
    return () => { active = false; };
  }, [token, selected?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function submitAuth(event) {
    event.preventDefault();
    setAuthError("");
    try {
      const path = authMode === "login" ? "/auth/login" : "/auth/register";
      const { data } = await api.post(path, authForm);
      localStorage.setItem("chat-session", JSON.stringify(data));
      setSession(data);
      setAuthForm({ name: "", email: "", password: "" });
    } catch (error) {
      setAuthError(error.response?.data?.message || "Unable to connect to the server.");
    }
  }

  function logout() {
    socketRef.current?.disconnect();
    localStorage.removeItem("chat-session");
    delete api.defaults.headers.common.Authorization;
    setSession(null);
    setUsers([]);
    setSelected(null);
    setMessages([]);
  }

  function sendMessage(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !selected || !socketRef.current) return;
    setDraft("");
    socketRef.current.emit("send_message", { receiverId: selected.id, text }, (result) => {
      if (result?.error) {
        setDraft(text);
        setToast(result.error);
      }
    });
  }

  if (!session) {
    return (
      <main className="auth-screen">
        <section className="auth-card">
          <div className="brand-mark">C<span>•</span></div>
          <p className="eyebrow">YOUR SPACE TO CONNECT</p>
          <h1>{authMode === "login" ? "Welcome back." : "Create your account."}</h1>
          <p className="muted auth-subtitle">Simple conversations, in real time.</p>
          <form className="auth-form" onSubmit={submitAuth}>
            {authMode === "register" && (
              <label>Full name<input value={authForm.name} onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })} placeholder="Your name" autoComplete="name" required minLength={2} /></label>
            )}
            <label>Email address<input type="email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} placeholder="you@example.com" autoComplete="email" required /></label>
            <label>Password<input type="password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} placeholder="At least 6 characters" autoComplete={authMode === "login" ? "current-password" : "new-password"} minLength={6} required /></label>
            {authError && <p className="error-text">{authError}</p>}
            <button className="primary-button" type="submit">{authMode === "login" ? "Sign in" : "Create account"} <span>↗</span></button>
          </form>
          <p className="auth-switch">{authMode === "login" ? "New to Connect?" : "Already have an account?"} <button onClick={() => { setAuthMode(authMode === "login" ? "register" : "login"); setAuthError(""); }}>{authMode === "login" ? "Create account" : "Sign in"}</button></p>
        </section>
        <div className="auth-decoration decoration-one" />
        <div className="auth-decoration decoration-two" />
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand-lockup"><div className="brand-mark small">C<span>•</span></div><div><strong>connect</strong><small>CHAT SPACE</small></div></div>
          <span className="online-pill"><i /> ONLINE</span>
        </div>
        <div className="sidebar-heading"><div><p className="eyebrow">MESSAGES</p><h2>Your conversations</h2></div><span className="count-badge">{users.length}</span></div>
        <div className="search-wrap"><span>⌕</span><input aria-label="Search people" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search people..." /></div>
        <div className="people-list">
          {visibleUsers.map((user) => (
            <button key={user.id} className={`person-row ${selected?.id === user.id ? "active" : ""}`} onClick={() => setSelected(user)}>
              <span className="avatar">{initials(user.name)}</span>
              <span className="person-copy"><strong>{user.name}</strong><small>{user.email}</small></span>
              <span className="person-arrow">›</span>
            </button>
          ))}
          {visibleUsers.length === 0 && <div className="empty-people">{users.length ? "No matching people." : "No other users yet. Register another account to start chatting."}</div>}
        </div>
        <div className="profile-panel"><span className="avatar current-avatar">{initials(currentUser?.name)}</span><div className="profile-copy"><strong>{currentUser?.name}</strong><small>{currentUser?.email}</small></div><button className="logout-button" onClick={logout} title="Sign out" aria-label="Sign out">↗</button></div>
      </aside>

      <section className="chat-panel">
        {selected ? (
          <>
            <header className="chat-header"><div className="chat-person"><span className="avatar">{initials(selected.name)}</span><div><h2>{selected.name}</h2><p><i /> Available to chat</p></div></div><div className="header-actions"><span className="secure-label">◈ Private conversation</span><button className="icon-button" title="Clear search" onClick={() => setSearch("")}>⌕</button></div></header>
            <div className="message-area">
              <div className="date-divider"><span>YOUR CONVERSATION</span></div>
              {loadingMessages && <p className="conversation-note">Loading messages...</p>}
              {!loadingMessages && messages.length === 0 && <div className="conversation-empty"><div className="empty-icon">✳</div><h3>Say hello to {selected.name.split(" ")[0]}.</h3><p>This is the beginning of your conversation. Send a message to get things going.</p></div>}
              {messages.map((message) => {
                const mine = (message.sender?.id || message.sender?._id) === currentUser?.id;
                return <div className={`message-row ${mine ? "mine" : "theirs"}`} key={message._id}><div className="message-content">{!mine && <span className="message-sender">{message.sender?.name}</span>}<div className="message-bubble">{message.text}</div><span className="message-time">{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div></div>;
              })}
              <div ref={bottomRef} />
            </div>
            <form className="composer" onSubmit={sendMessage}><div className="composer-box"><input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`Message ${selected.name.split(" ")[0]}...`} maxLength={2000} aria-label="Message" /><span className="composer-hint">ENTER ↵</span></div><button className="send-button" type="submit" disabled={!draft.trim()} aria-label="Send message">↗</button></form>
            <p className="composer-footnote">Be kind. Good conversations start with respect.</p>
          </>
        ) : (
          <div className="welcome-panel"><div className="welcome-orb"><span>✳</span></div><p className="eyebrow">A LITTLE CLOSER</p><h1>Good conversations<br />start here.</h1><p className="muted">Choose someone from your list and say hello. Your next great conversation is one message away.</p><div className="welcome-stats"><div><strong>{users.length}</strong><span>PEOPLE</span></div><div><strong>24/7</strong><span>AVAILABLE</span></div><div><strong>Live</strong><span>MESSAGING</span></div></div></div>
        )}
      </section>
      {toast && <button className="toast" onClick={() => setToast("")}>{toast} <span>×</span></button>}
    </main>
  );
}
