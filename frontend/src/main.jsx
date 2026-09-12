import React,{useEffect,useState} from "react";
import {createRoot} from "react-dom/client";
import "./styles.css";

const API=import.meta.env.VITE_API_URL||"http://localhost:4000/api";
async function api(path,opts={}){const token=localStorage.getItem("token");const r=await fetch(API+path,{...opts,headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})}});const data=r.status===204?null:await r.json();if(!r.ok)throw Error(data?.error||"Request failed");return data}
const attrIcons={Intellect:"🧠",Strength:"⚔️",Discipline:"🛡️",Creativity:"✨"};

function Auth({onLogin}){const [mode,setMode]=useState("login"),[form,setForm]=useState({name:"",email:"",password:""}),[error,setError]=useState("");
async function submit(e){e.preventDefault();setError("");try{const d=await api(`/auth/${mode}`,{method:"POST",body:JSON.stringify(form)});localStorage.setItem("token",d.token);onLogin(d.user)}catch(e){setError(e.message)}}
return <main className="auth"><section className="auth-card"><div className="logo">⚡ LIFE RPG</div><p className="muted">Turn real-world progress into character progression.</p><form onSubmit={submit}>{mode==="signup"&&<input placeholder="Character name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>}<input type="email" placeholder="Email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/><input type="password" placeholder="Password (8+ characters)" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/>{error&&<div className="error">{error}</div>}<button className="primary">{mode==="login"?"Enter the Realm":"Create Character"}</button></form><button className="link" onClick={()=>setMode(mode==="login"?"signup":"login")}>{mode==="login"?"New here? Create an account":"Already have an account? Sign in"}</button></section></main>}

function App(){const [user,setUser]=useState(null),[tasks,setTasks]=useState([]),[shop,setShop]=useState([]),[error,setError]=useState(""),[title,setTitle]=useState(""),[attribute,setAttribute]=useState("Discipline"),[tab,setTab]=useState("quests");
async function refresh(){try{const [u,t,s]=await Promise.all([api("/me"),api("/tasks"),api("/shop")]);setUser(u);setTasks(t);setShop(s)}catch(e){localStorage.removeItem("token");setUser(null)}}
useEffect(()=>{if(localStorage.getItem("token"))refresh()},[]);
if(!user)return <Auth onLogin={u=>{setUser(u);refresh()}}/>;
async function add(e){e.preventDefault();if(!title.trim())return;try{const t=await api("/tasks",{method:"POST",body:JSON.stringify({title,attribute})});setTasks([t,...tasks]);setTitle("")}catch(e){setError(e.message)}}
async function complete(id){try{const d=await api(`/tasks/${id}/complete`,{method:"POST"});setTasks(tasks.map(t=>t.id===id?d.task:t));setUser(d.user)}catch(e){setError(e.message)}}
async function remove(id){await api(`/tasks/${id}`,{method:"DELETE"});setTasks(tasks.filter(t=>t.id!==id))}
async function buy(item){try{const d=await api("/shop/buy",{method:"POST",body:JSON.stringify({item})});setUser(d.user);refresh()}catch(e){setError(e.message)}}
const p=user.progress;
return <main className="app"><header><div className="logo">⚡ LIFE RPG</div><nav><button className={tab==="quests"?"active":""} onClick={()=>setTab("quests")}>Quests</button><button className={tab==="shop"?"active":""} onClick={()=>setTab("shop")}>Guild Shop</button></nav><button className="ghost" onClick={()=>{localStorage.removeItem("token");setUser(null)}}>Logout</button></header>
<section className="hero"><div><span className="eyebrow">LEVEL {user.level}</span><h1>Welcome, {user.name}</h1><p>Build your character one real-world action at a time.</p></div><div className="level-card"><div className="level-line"><b>XP</b><span>{p.current} / {p.needed}</span></div><div className="bar"><i style={{width:`${Math.min(100,p.current/p.needed*100)}%`}}/></div><small>🔥 {user.streak} day streak · 🪙 {user.gold} gold</small></div></section>
{error&&<div className="error banner">{error}<button onClick={()=>setError("")}>×</button></div>}
{tab==="quests"?<><section className="stats">{Object.entries(user.attributes).map(([k,v])=><article key={k}><span>{attrIcons[k[0].toUpperCase()+k.slice(1)]}</span><div><small>{k}</small><strong>{v}</strong></div></article>)}</section>
<form className="add" onSubmit={add}><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="What will you conquer today?"/><select value={attribute} onChange={e=>setAttribute(e.target.value)}>{Object.keys(attrIcons).map(x=><option key={x}>{x}</option>)}</select><button className="primary">+ Add Quest</button></form>
<section className="quests">{tasks.length===0?<div className="empty">No quests yet. Add one above and start your adventure.</div>:tasks.map(t=><article className={`quest ${t.completed?"done":""}`} key={t.id}><button className="check" disabled={t.completed} onClick={()=>complete(t.id)}>{t.completed?"✓":"○"}</button><div className="quest-main"><h3>{t.title}</h3><span>{attrIcons[t.attribute]} {t.attribute} · +{t.xp} XP · +{t.gold} 🪙</span></div><button className="delete" onClick={()=>remove(t.id)}>Delete</button></article>)}</section></>:<section className="shop">{shop.map(i=><article key={i.name}><div className="item-icon">✦</div><h3>{i.name}</h3><p>Unlock a collectible reward for your character.</p><button className="primary" disabled={i.owned||user.gold<i.cost} onClick={()=>buy(i)}>{i.owned?"Owned":`Buy · ${i.cost} 🪙`}</button></article>)}</section>}
<footer>Life RPG · Persistent full-stack progression</footer></main>}

createRoot(document.getElementById("root")).render(<App/>);
