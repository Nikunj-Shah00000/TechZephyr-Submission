import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { db, levelForXp, xpProgress } from "./db.js";
import { auth, hashPassword, verifyPassword, signToken } from "./auth.js";
dotenv.config();

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173" }));
app.use(express.json());

const today = () => new Date().toISOString().slice(0,10);
const publicUser = id => {
  const u = db.prepare("SELECT id,email,name,xp,level,gold,streak,last_completed_date FROM users WHERE id=?").get(id);
  const a = db.prepare("SELECT intellect,strength,discipline,creativity FROM attributes WHERE user_id=?").get(id);
  return {...u, progress: xpProgress(u.xp), attributes:a};
};

app.get("/api/health", (_,res)=>res.json({ok:true}));

app.post("/api/auth/signup", async (req,res)=>{
  const {email,password,name} = req.body;
  if (!email || !password || !name || password.length < 8) return res.status(400).json({error:"Name, email and an 8+ character password are required"});
  try {
    const info = db.prepare("INSERT INTO users(email,password_hash,name) VALUES(?,?,?)").run(email.trim().toLowerCase(), await hashPassword(password), name.trim());
    db.prepare("INSERT INTO attributes(user_id) VALUES(?)").run(info.lastInsertRowid);
    res.status(201).json({token:signToken(info.lastInsertRowid), user:publicUser(info.lastInsertRowid)});
  } catch { res.status(409).json({error:"An account with that email already exists"}); }
});

app.post("/api/auth/login", async (req,res)=>{
  const u = db.prepare("SELECT * FROM users WHERE email=?").get((req.body.email||"").trim().toLowerCase());
  if (!u || !(await verifyPassword(req.body.password||"", u.password_hash))) return res.status(401).json({error:"Invalid email or password"});
  res.json({token:signToken(u.id), user:publicUser(u.id)});
});

app.get("/api/me", auth, (req,res)=>res.json(publicUser(req.userId)));

app.get("/api/tasks", auth, (req,res)=>{
  res.json(db.prepare("SELECT * FROM tasks WHERE user_id=? ORDER BY completed ASC, created_at DESC").all(req.userId));
});

app.post("/api/tasks", auth, (req,res)=>{
  const {title,description="",attribute="Discipline",xp=25,gold=10}=req.body;
  if (!title?.trim()) return res.status(400).json({error:"Task title is required"});
  const allowed=["Intellect","Strength","Discipline","Creativity"];
  if (!allowed.includes(attribute)) return res.status(400).json({error:"Invalid attribute"});
  const info=db.prepare("INSERT INTO tasks(user_id,title,description,attribute,xp,gold) VALUES(?,?,?,?,?,?)")
    .run(req.userId,title.trim(),description,attribute,Math.max(1,Math.min(500,Number(xp))),Math.max(0,Math.min(500,Number(gold))));
  res.status(201).json(db.prepare("SELECT * FROM tasks WHERE id=? AND user_id=?").get(info.lastInsertRowid,req.userId));
});

app.patch("/api/tasks/:id", auth, (req,res)=>{
  const t=db.prepare("SELECT * FROM tasks WHERE id=? AND user_id=?").get(req.params.id,req.userId);
  if (!t) return res.status(404).json({error:"Task not found"});
  const title=req.body.title?.trim() || t.title, description=req.body.description ?? t.description, attribute=req.body.attribute || t.attribute;
  db.prepare("UPDATE tasks SET title=?,description=?,attribute=? WHERE id=? AND user_id=?").run(title,description,attribute,t.id,req.userId);
  res.json(db.prepare("SELECT * FROM tasks WHERE id=?").get(t.id));
});

app.delete("/api/tasks/:id", auth, (req,res)=>{
  const r=db.prepare("DELETE FROM tasks WHERE id=? AND user_id=?").run(req.params.id,req.userId);
  if (!r.changes) return res.status(404).json({error:"Task not found"});
  res.status(204).end();
});

app.post("/api/tasks/:id/complete", auth, (req,res)=>{
  const t=db.prepare("SELECT * FROM tasks WHERE id=? AND user_id=?").get(req.params.id,req.userId);
  if (!t) return res.status(404).json({error:"Task not found"});
  if (t.completed) return res.json({task:t,user:publicUser(req.userId),alreadyCompleted:true});
  const d=today(), u=db.prepare("SELECT * FROM users WHERE id=?").get(req.userId);
  let streak=u.streak;
  if (u.last_completed_date !== d) {
    const prev=new Date(Date.now()-86400000).toISOString().slice(0,10);
    streak = u.last_completed_date===prev ? u.streak+1 : 1;
  }
  const attr=t.attribute.toLowerCase();
  const tx=db.transaction(()=>{
    db.prepare("UPDATE tasks SET completed=1,completed_at=? WHERE id=? AND user_id=?").run(d,t.id,req.userId);
    db.prepare("UPDATE users SET xp=xp+?,gold=gold+?,streak=?,last_completed_date=? ,level=? WHERE id=?")
      .run(t.xp,t.gold,streak,d,levelForXp(u.xp+t.xp),req.userId);
    db.prepare(`UPDATE attributes SET ${attr}=${attr}+1 WHERE user_id=?`).run(req.userId);
  });
  tx();
  res.json({task:db.prepare("SELECT * FROM tasks WHERE id=?").get(t.id),user:publicUser(req.userId)});
});

const shop=[{name:"Focus Theme",cost:100},{name:"Dragon Badge",cost:250},{name:"Night Realm",cost:400}];
app.get("/api/shop",auth,(req,res)=>res.json(shop.map(x=>({...x,owned:!!db.prepare("SELECT 1 FROM inventory WHERE user_id=? AND item_name=?").get(req.userId,x.name)}))));
app.get("/api/inventory",auth,(req,res)=>res.json(db.prepare("SELECT * FROM inventory WHERE user_id=? ORDER BY purchased_at DESC").all(req.userId)));
app.post("/api/shop/buy",auth,(req,res)=>{
  const item=shop.find(x=>x.name===req.body.item);
  if(!item) return res.status(404).json({error:"Item not found"});
  const u=db.prepare("SELECT gold FROM users WHERE id=?").get(req.userId);
  if(u.gold<item.cost) return res.status(400).json({error:"Not enough gold"});
  try {
    db.transaction(()=>{
      db.prepare("UPDATE users SET gold=gold-? WHERE id=?").run(item.cost,req.userId);
      db.prepare("INSERT INTO inventory(user_id,item_name,cost) VALUES(?,?,?)").run(req.userId,item.name,item.cost);
    })();
  } catch { return res.status(409).json({error:"Item already owned"}); }
  res.json({user:publicUser(req.userId),inventory:db.prepare("SELECT * FROM inventory WHERE user_id=?").all(req.userId)});
});

const port=Number(process.env.PORT||4000);
app.listen(port,()=>console.log(`Life RPG API running on http://localhost:${port}`));
