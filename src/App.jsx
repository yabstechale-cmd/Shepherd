import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import youngSerifFont from "./assets/fonts/youngserif.medium.ttf";

const C = {
  bg: "#0f1117", surface: "#161b27", card: "#1c2333", border: "#2a3347",
  gold: "#c9a84c", goldDim: "#8a6f2e", goldGlow: "rgba(201,168,76,0.15)",
  text: "#e8e2d4", muted: "#7a8299", danger: "#e05252", success: "#52c87a",
  blue: "#5b8fe8", purple: "#9b72e8",
};

const TASK_CATEGORIES = ["Admin", "Events", "Services", "Worship", "Missions", "Men's", "Women's", "Young Adults", "Youth", "Kids", "Finances", "Operations"];
const SORTED_TASK_CATEGORIES = [...TASK_CATEGORIES].sort((a, b) => a.localeCompare(b));
const CATEGORY_STYLES = {
  Admin: { tag: "tag-admin", color: "#5b8fe8" },
  Events: { tag: "tag-events", color: "#e8a45b" },
  Services: { tag: "tag-services", color: "#c9a84c" },
  Worship: { tag: "tag-worship", color: "#9b72e8" },
  Missions: { tag: "tag-missions", color: "#52c87a" },
  "Men's": { tag: "tag-mens", color: "#4fb2a1" },
  "Women's": { tag: "tag-womens", color: "#ff7aa2" },
  "Young Adults": { tag: "tag-young-adults", color: "#7c83ff" },
  Youth: { tag: "tag-youth", color: "#52c87a" },
  Kids: { tag: "tag-kids", color: "#f0c94b" },
  Finances: { tag: "tag-finances", color: "#59b98a" },
  Operations: { tag: "tag-operations", color: "#9aa3b2" },
};

const getTag = (name) => CATEGORY_STYLES[name]?.tag || "tag-admin";
const fmt = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Math.abs(n || 0));
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—";
const CATEGORY_STORAGE_KEY = "shepherd-recent-task-categories";
const AUTH_CODE_LENGTH = 4;

const Icon = ({ d, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const Icons = {
  home:     () => <Icon d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />,
  tasks:    () => <Icon d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />,
  heart:    () => <Icon d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />,
  budget:   () => <Icon d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />,
  ministry: () => <Icon d="M3 21V7l9-4 9 4v14M9 21V12h6v9" />,
  calendar: () => <Icon d="M3 4h18v18H3zM16 2v4M8 2v4M3 10h18" />,
  logout:   () => <Icon d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />,
  plus:     () => <Icon d="M12 5v14M5 12h14" />,
  eye:      () => <Icon d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z" />,
  eyeOff:   () => <Icon d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" />,
  menu:     () => <Icon d="M3 12h18M3 6h18M3 18h18" />,
  x:        () => <Icon d="M18 6L6 18M6 6l12 12" />,
  pen:      () => <Icon d="M12 20h9M16.5 3.5a2.12 2.12 0 113 3L7 19l-4 1 1-4 12.5-12.5z" />,
};

const GS = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
    @font-face{
      font-family:'Young Serif Medium';
      src:url(${youngSerifFont}) format('truetype');
      font-weight:500;
      font-style:normal;
      font-display:swap;
    }
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{background:${C.bg};color:${C.text};font-family:'DM Sans',sans-serif;min-height:100vh}
    input,textarea,select,button{font-family:'DM Sans',sans-serif}
    @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    @keyframes spin{to{transform:rotate(360deg)}}
    .fadeIn{animation:fadeIn 0.3s ease forwards}
    .nav-item{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;cursor:pointer;color:${C.muted};font-size:14px;font-weight:500;border:1px solid transparent;margin-bottom:2px}
    .nav-item:hover{background:${C.card};color:${C.text}}
    .nav-item.active{background:${C.goldGlow};color:${C.gold};border-color:${C.goldDim}}
    .btn-gold{background:linear-gradient(135deg,${C.gold},${C.goldDim});color:#0f1117;font-weight:600;border:none;border-radius:10px;padding:10px 20px;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:14px;display:inline-flex;align-items:center;gap:8px}
    .btn-gold:hover{filter:brightness(1.1)}
    .btn-outline{background:transparent;color:${C.text};border:1px solid ${C.border};border-radius:10px;padding:9px 18px;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:14px;display:inline-flex;align-items:center;gap:8px}
    .btn-outline:hover{border-color:${C.gold};color:${C.gold}}
    .card{background:${C.card};border:1px solid ${C.border};border-radius:14px}
    .input-field{background:${C.surface};border:1px solid ${C.border};border-radius:10px;padding:11px 14px;color:${C.text};font-size:14px;width:100%;outline:none}
    .input-field:focus{border-color:${C.gold};box-shadow:0 0 0 3px ${C.goldGlow}}
    .input-field::placeholder{color:${C.muted}}
    .badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase}
    .tag-worship{background:rgba(155,114,232,.15);color:#b89af0;border:1px solid rgba(155,114,232,.3)}
    .tag-youth{background:rgba(82,200,122,.15);color:#52c87a;border:1px solid rgba(82,200,122,.3)}
    .tag-admin{background:rgba(91,143,232,.15);color:#5b8fe8;border:1px solid rgba(91,143,232,.3)}
    .tag-pastoral{background:rgba(201,168,76,.15);color:#c9a84c;border:1px solid rgba(201,168,76,.3)}
    .tag-board{background:rgba(224,82,82,.15);color:#e05252;border:1px solid rgba(224,82,82,.3)}
    .tag-outreach{background:rgba(232,164,91,.15);color:#e8a45b;border:1px solid rgba(232,164,91,.3)}
    .tag-events{background:rgba(232,164,91,.15);color:#e8a45b;border:1px solid rgba(232,164,91,.3)}
    .tag-services{background:rgba(201,168,76,.15);color:#c9a84c;border:1px solid rgba(201,168,76,.3)}
    .tag-missions{background:rgba(82,200,122,.15);color:#52c87a;border:1px solid rgba(82,200,122,.3)}
    .tag-mens{background:rgba(79,178,161,.15);color:#4fb2a1;border:1px solid rgba(79,178,161,.3)}
    .tag-womens{background:rgba(255,122,162,.15);color:#ff7aa2;border:1px solid rgba(255,122,162,.3)}
    .tag-young-adults{background:rgba(124,131,255,.15);color:#7c83ff;border:1px solid rgba(124,131,255,.3)}
    .tag-kids{background:rgba(240,201,75,.15);color:#f0c94b;border:1px solid rgba(240,201,75,.3)}
    .tag-finances{background:rgba(89,185,138,.15);color:#59b98a;border:1px solid rgba(89,185,138,.3)}
    .tag-operations{background:rgba(154,163,178,.15);color:#9aa3b2;border:1px solid rgba(154,163,178,.3)}
    .stat-card{background:${C.card};border:1px solid ${C.border};border-radius:14px;padding:20px;position:relative;overflow:hidden}
    .stat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,${C.gold},transparent);opacity:.5}
    .progress-bar{background:${C.border};border-radius:4px;height:6px;overflow:hidden}
    .progress-fill{height:100%;border-radius:4px;background:linear-gradient(90deg,${C.goldDim},${C.gold})}
    .table-row{display:grid;padding:14px 18px;border-bottom:1px solid ${C.border};align-items:center;gap:12px}
    .table-row:hover{background:rgba(255,255,255,.02)}
    .table-row:last-child{border-bottom:none}
    .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);backdrop-filter:blur(4px);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px}
    .modal{background:${C.card};border:1px solid ${C.border};border-radius:18px;width:100%;max-width:520px;padding:28px;max-height:90vh;overflow-y:auto}
  `}</style>
);

const normalizeAccessUser = (record) => ({
  ...record,
  ministries: Array.isArray(record?.ministries) ? record.ministries : [],
  canSeeTeamOverview: record?.can_see_team_overview ?? record?.canSeeTeamOverview ?? false,
  canSeeAdminOverview: record?.can_see_admin_overview ?? record?.canSeeAdminOverview ?? false,
  readOnlyOversight: record?.read_only_oversight ?? record?.readOnlyOversight ?? false,
});
const normalizeTask = (task) => ({
  ...task,
  status: ["todo", "in-progress", "in-review", "done"].includes(task?.status) ? task.status : "todo",
  reviewers: Array.isArray(task?.reviewers) ? task.reviewers : [],
  review_approvals: Array.isArray(task?.review_approvals) ? task.review_approvals : [],
  review_required: task?.review_required ?? false,
});
const normalizeName = (value) => (value || "").trim().toLowerCase();
const samePerson = (left, right) => normalizeName(left) !== "" && normalizeName(left) === normalizeName(right);
const listIncludesPerson = (list, fullName) => Array.isArray(list) && list.some((entry) => samePerson(entry, fullName));

const roleLabel = (profile) => profile?.title || profile?.role || "Staff";
const canManageAllTasks = (profile) => profile?.canSeeAdminOverview || profile?.role === "senior_pastor";
const canEditTask = (profile, task) => canManageAllTasks(profile) || samePerson(task?.assignee, profile?.full_name);
const canReviewTask = (profile, task) => task?.review_required && listIncludesPerson(task?.reviewers, profile?.full_name);
const canManagePeople = (profile) => profile?.canSeeAdminOverview || profile?.role === "senior_pastor";
const canManageBudget = (profile) => profile?.canSeeAdminOverview || profile?.role === "senior_pastor" || profile?.full_name === "Joel";
const isTaskForUser = (task, fullName) => samePerson(task?.assignee, fullName) || listIncludesPerson(task?.reviewers, fullName);
const getStoredCategoryOrder = () => {
  if (typeof window === "undefined") return TASK_CATEGORIES;
  const raw = window.localStorage.getItem(CATEGORY_STORAGE_KEY);
  if (!raw) return TASK_CATEGORIES;
  const recent = JSON.parse(raw).filter((name) => TASK_CATEGORIES.includes(name));
  return [...recent, ...TASK_CATEGORIES.filter((name) => !recent.includes(name))];
};
const rememberCategory = (category) => {
  if (typeof window === "undefined") return;
  const current = getStoredCategoryOrder().filter((name) => name !== category);
  window.localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify([category, ...current].slice(0, TASK_CATEGORIES.length)));
};
const createProfilePayload = (authUserId, churchId, staffUser, email) => ({
  id: authUserId,
  church_id: churchId,
  staff_id: staffUser.id,
  full_name: staffUser.full_name,
  role: staffUser.role,
  title: staffUser.title,
  email,
  ministries: staffUser.ministries || [],
  can_see_team_overview: staffUser.can_see_team_overview ?? staffUser.canSeeTeamOverview ?? false,
  can_see_admin_overview: staffUser.can_see_admin_overview ?? staffUser.canSeeAdminOverview ?? false,
  read_only_oversight: staffUser.read_only_oversight ?? staffUser.readOnlyOversight ?? false,
});
const claimStaffProfile = async (staffId, churchId) => {
  if (!staffId || !churchId) return;
  const { error } = await supabase.rpc("claim_staff_profile", {
    p_staff_id: staffId,
    p_church_id: churchId,
  });
  if (error) throw error;
};
const fetchChurchAccess = async (code) => {
  const { data: church, error: churchError } = await supabase.from("churches").select("*").eq("code", code).maybeSingle();
  if (churchError) throw churchError;
  if (!church) throw new Error("That church code was not found.");
  const { data: users, error: usersError } = await supabase.from("church_staff").select("*").eq("church_id", church.id).order("full_name");
  if (usersError) throw usersError;
  return { church, users: (users || []).map(normalizeAccessUser) };
};
const getTimeOfDayGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};
const GOOGLE_CALENDAR_EMBED_URL = import.meta.env.VITE_GOOGLE_CALENDAR_EMBED_URL || "";
const DAILY_VERSES = [
  { text: "Commit your works to the Lord, and your thoughts will be established.", reference: "Proverbs 16:3 NKJV" },
  { text: "Let all that you do be done with love.", reference: "1 Corinthians 16:14 NKJV" },
  { text: "Whatever you do, do it heartily, as to the Lord and not to men.", reference: "Colossians 3:23 NKJV" },
  { text: "Be steadfast, immovable, always abounding in the work of the Lord.", reference: "1 Corinthians 15:58 NKJV" },
  { text: "God is not unjust to forget your work and labor of love.", reference: "Hebrews 6:10 NKJV" },
  { text: "Let us not grow weary while doing good, for in due season we shall reap.", reference: "Galatians 6:9 NKJV" },
  { text: "Unless the Lord builds the house, they labor in vain who build it.", reference: "Psalm 127:1 NKJV" },
  { text: "Trust in the Lord with all your heart, and lean not on your own understanding.", reference: "Proverbs 3:5 NKJV" },
];
const getDailyVerse = () => {
  const now = new Date();
  const rotationDate = new Date(now);
  if (now.getHours() < 7) rotationDate.setDate(rotationDate.getDate() - 1);
  rotationDate.setHours(7, 0, 0, 0);
  const dayIndex = Math.floor(rotationDate.getTime() / 86400000);
  return DAILY_VERSES[Math.abs(dayIndex) % DAILY_VERSES.length];
};
const displayHeadingStyle = {
  fontFamily: "'Young Serif Medium', Georgia, serif",
  fontWeight: 500,
  letterSpacing: "0.01em",
};
const STATUS_STYLES = {
  todo: { label: "Not Started", accent: C.gold, surface: "rgba(201,168,76,0.08)" },
  "in-progress": { label: "In Progress", accent: C.blue, surface: "rgba(91,143,232,0.08)" },
  "in-review": { label: "In Review", accent: C.purple, surface: "rgba(155,114,232,0.08)" },
  done: { label: "Done", accent: C.success, surface: "rgba(82,200,122,0.08)" },
};

// ── Auth ───────────────────────────────────────────────────────────────────
function AuthScreen() {
  const [mode, setMode] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [churchCode, setChurchCode] = useState("");
  const [churchAccess, setChurchAccess] = useState({ church: null, users: [] });
  const [form, setForm] = useState({ userId: "", email: "", password: "", confirmPassword: "" });
  const isLogin = mode === "login";
  const isForgotPassword = mode === "forgot";

  useEffect(() => {
    let active = true;
    const code = churchCode.trim();

    if (code.length < AUTH_CODE_LENGTH) {
      setChurchAccess({ church: null, users: [] });
      setError("");
      return () => {
        active = false;
      };
    }

    setLookupLoading(true);
    setError("");

    fetchChurchAccess(code)
      .then((result) => {
        if (!active) return;
        setChurchAccess(result);
      })
      .catch((err) => {
        if (!active) return;
        setChurchAccess({ church: null, users: [] });
        setError(err.message || "We couldn't find that church code.");
      })
      .finally(() => {
        if (!active) return;
        setLookupLoading(false);
      });

    return () => {
      active = false;
    };
  }, [churchCode]);

  const submit = async () => {
    setError("");
    setMessage("");
    setLoading(true);
    try {
      if (isForgotPassword) {
        if (!churchAccess.church) throw new Error("Enter a valid church code first.");
        if (!form.userId) throw new Error("Select your name first.");
        const selected = churchAccess.users.find((user) => user.id === form.userId);
        if (!selected?.email) throw new Error("That person has not registered yet. Use First Time to create the account.");
        const redirectTo = typeof window !== "undefined" ? window.location.origin : undefined;
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(selected.email, redirectTo ? { redirectTo } : undefined);
        if (resetError) throw resetError;
        setMessage("Password reset email sent. Use the link in that email to choose a new password.");
        setMode("login");
        setForm((current) => ({ ...current, password: "", confirmPassword: "" }));
      } else if (isLogin) {
        if (!churchAccess.church) throw new Error("Enter a valid church code first.");
        if (!form.userId) throw new Error("Select your name first.");
        const selected = churchAccess.users.find((user) => user.id === form.userId);
        if (!selected) throw new Error("Select your name first.");
        if (!selected.email) throw new Error("That person has not registered yet. Use First Time to create the account.");
        if (!form.password) throw new Error("Enter your password.");
        const { error: loginError } = await supabase.auth.signInWithPassword({ email: selected.email, password: form.password });
        if (loginError) throw loginError;
        await claimStaffProfile(selected.id, churchAccess.church.id);
      } else {
        if (!churchAccess.church) throw new Error("Enter a valid church code first.");
        if (!form.userId) throw new Error("Select your name first.");
        const selected = churchAccess.users.find((user) => user.id === form.userId);
        if (!selected) throw new Error("Select your name first.");
        if (selected.auth_user_id || selected.email) throw new Error("That person has already registered. Use Log In instead.");
        if (!form.email || !form.password) throw new Error("Fill in every registration field.");
        if (form.password.length < 6) throw new Error("Use a password with at least 6 characters.");
        if (form.password !== form.confirmPassword) throw new Error("Your passwords do not match.");

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
            data: {
              church_id: churchAccess.church.id,
              staff_id: selected.id,
              full_name: selected.full_name,
              role: selected.role,
            },
          },
        });
        if (signUpError) throw signUpError;
        if (!data.user?.id) throw new Error("We couldn't finish creating that account.");

        const { error: reserveError } = await supabase.rpc("reserve_staff_registration", {
          p_staff_id: selected.id,
          p_church_id: churchAccess.church.id,
          p_email: form.email,
        });
        if (reserveError) throw reserveError;

        setMessage(data.session
          ? "Account created. If verification is enabled, check your email to confirm the account."
          : "Account created. Check your email, verify your account, then log in.");
        setMode("login");
        setForm({ userId: selected.id, email: "", password: "", confirmPassword: "" });
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    }
    setLoading(false);
  };

  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:C.bg,position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",inset:0,opacity:.03}}>
        {[...Array(20)].map((_,i)=>(
          <div key={i} style={{position:"absolute",left:`${(i%5)*25}%`,top:`${Math.floor(i/5)*25}%`,width:60,height:60}}>
            <svg viewBox="0 0 60 60" fill={C.gold}><path d="M25 0h10v25h25v10H35v25H25V35H0V25h25z"/></svg>
          </div>
        ))}
      </div>
      <div style={{position:"absolute",top:"20%",left:"50%",transform:"translateX(-50%)",width:600,height:600,background:`radial-gradient(circle,${C.goldGlow} 0%,transparent 70%)`,pointerEvents:"none"}}/>
      <div className="fadeIn" style={{width:"100%",maxWidth:440,padding:"0 20px",position:"relative",zIndex:1}}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{width:64,height:64,borderRadius:18,background:C.goldGlow,border:`1px solid ${C.goldDim}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill={C.gold}><path d="M13 0h6v13h13v6H19v13h-6V19H0v-6h13z"/></svg>
          </div>
          <h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:36,fontWeight:600,color:C.text}}>Shepherd</h1>
          <p style={{color:C.muted,fontSize:13,marginTop:4}}>
            {isForgotPassword
              ? "Input your church's code, select who you are, and we'll email you a password reset link."
              : isLogin
              ? "Input your church's code, select who you are, then enter your password."
              : "Input your church's code, select who you are, then create your account."}
          </p>
        </div>
        <div style={{display:"flex",background:C.surface,borderRadius:12,padding:4,marginBottom:24,border:`1px solid ${C.border}`}}>
          {["Log In","First Time"].map((label,index)=>(
            <button key={label} onClick={()=>{setMode(index===0?"login":"signup");setError("");setMessage("");}} style={{flex:1,padding:"9px 0",borderRadius:9,border:"none",cursor:"pointer",fontSize:14,fontWeight:500,background:((mode==="login"&&index===0)||(mode==="signup"&&index===1))?C.card:"transparent",color:((mode==="login"&&index===0)||(mode==="signup"&&index===1))?C.text:C.muted}}>{label}</button>
          ))}
        </div>
        {error && <div style={{background:"rgba(224,82,82,.1)",border:"1px solid rgba(224,82,82,.3)",borderRadius:10,padding:"10px 14px",fontSize:13,color:C.danger,marginBottom:14}}>{error}</div>}
        {message && <div style={{background:"rgba(82,200,122,.1)",border:"1px solid rgba(82,200,122,.3)",borderRadius:10,padding:"10px 14px",fontSize:13,color:C.success,marginBottom:14}}>{message}</div>}
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <input
            className="input-field"
            placeholder="Church code"
            value={churchCode}
            onChange={(e) => {
              setChurchCode(e.target.value);
              setForm({ userId: "", email: "", password: "", confirmPassword: "" });
            }}
          />
          <select className="input-field" value={form.userId} onChange={e=>setForm({...form,userId:e.target.value})} style={{background:C.surface}} disabled={!churchAccess.church || lookupLoading}>
            <option value="">{lookupLoading ? "Looking up church..." : "Select your name"}</option>
            {churchAccess.users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.full_name} • {user.title}
              </option>
            ))}
          </select>
          {mode === "signup" && (
            <input className="input-field" placeholder="Email address" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
          )}
          {!isForgotPassword && (
            <div style={{position:"relative"}}>
              <input className="input-field" placeholder={isLogin ? "Password" : "Create password"} type={showPassword?"text":"password"} value={form.password} onChange={e=>setForm({...form,password:e.target.value})} style={{paddingRight:44}}/>
              <button onClick={()=>setShowPassword(!showPassword)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:C.muted}}>
                {showPassword?<Icons.eyeOff/>:<Icons.eye/>}
              </button>
            </div>
          )}
          {mode === "signup" && (
            <input className="input-field" placeholder="Confirm password" type="password" value={form.confirmPassword} onChange={e=>setForm({...form,confirmPassword:e.target.value})}/>
          )}
          <button className="btn-gold" onClick={submit} style={{width:"100%",justifyContent:"center",padding:"13px",fontSize:15,marginTop:4}}>
            {loading ? <span style={{display:"inline-block",width:18,height:18,border:"2px solid rgba(0,0,0,.3)",borderTopColor:"#0f1117",borderRadius:"50%",animation:"spin .8s linear infinite"}}/> : isForgotPassword ? "Send reset email" : isLogin ? "Log In" : "Register this account"}
          </button>
          {isLogin && (
            <button
              onClick={() => {
                setMode("forgot");
                setError("");
                setMessage("");
                setForm((current) => ({ ...current, password: "", confirmPassword: "" }));
              }}
              style={{background:"none",border:"none",cursor:"pointer",color:C.gold,fontSize:13,marginTop:4}}
            >
              Forgot password?
            </button>
          )}
          {isForgotPassword && (
            <button
              onClick={() => {
                setMode("login");
                setError("");
                setMessage("");
              }}
              style={{background:"none",border:"none",cursor:"pointer",color:C.gold,fontSize:13,marginTop:4}}
            >
              Back to Log In
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sidebar ────────────────────────────────────────────────────────────────
function Sidebar({ active, setActive, profile, church, onLogout, collapsed, setCollapsed }) {
  const nav = [
    {id:"dashboard",label:"Dashboard",I:Icons.home},
    {id:"tasks",label:"Tasks",I:Icons.tasks},
    {id:"members",label:"People Care",I:Icons.heart},
    {id:"budget",label:"Budget",I:Icons.budget},
    {id:"ministries",label:"Ministries",I:Icons.ministry},
    {id:"calendar",label:"Calendar",I:Icons.calendar},
  ];
  return (
    <div style={{width:collapsed?64:220,minHeight:"100vh",background:C.surface,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",flexShrink:0,position:"relative",overflow:"hidden"}}>
      <svg style={{position:"absolute",bottom:40,right:collapsed?-10:20,width:80,opacity:.05}} viewBox="0 0 80 80" fill={C.gold}><path d="M30 0h20v30h30v20H50v30H30V50H0V30h30z"/></svg>
      <div style={{padding:collapsed?"20px 16px":"20px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:collapsed?"center":"space-between"}}>
        {!collapsed && <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,borderRadius:8,background:C.goldGlow,border:`1px solid ${C.goldDim}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill={C.gold}><path d="M5.5 0h3v5.5H14v3H8.5V14h-3V8.5H0v-3h5.5z"/></svg>
          </div>
          <span style={{fontFamily:"'Young Serif Medium', Georgia, serif",fontSize:20,fontWeight:500,color:C.text,letterSpacing:"0.02em"}}>Shepherd</span>
        </div>}
        <button onClick={()=>setCollapsed(!collapsed)} style={{background:"none",border:"none",cursor:"pointer",color:C.muted,padding:4}}><Icons.menu/></button>
      </div>
      <nav style={{padding:"12px 10px",flex:1}}>
        {nav.map(({id,label,I: iconComponent})=>(
          <div key={id} className={`nav-item${active===id?" active":""}`} onClick={()=>setActive(id)} title={collapsed?label:""} style={{justifyContent:collapsed?"center":"flex-start"}}>
            {iconComponent()}{!collapsed&&<span>{label}</span>}
          </div>
        ))}
      </nav>
      <div style={{padding:"12px 10px",borderTop:`1px solid ${C.border}`}}>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:10}}>
          <div style={{width:32,height:32,borderRadius:"50%",background:`linear-gradient(135deg,${C.goldDim},${C.gold})`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:13,fontWeight:600,color:"#0f1117"}}>
            {profile?.full_name?.[0]||"U"}
          </div>
          {!collapsed && <>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:500,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{profile?.full_name||"User"}</div>
              <div style={{fontSize:11,color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{roleLabel(profile)} • {church?.name||""}</div>
            </div>
            <button onClick={onLogout} style={{background:"none",border:"none",cursor:"pointer",color:C.muted}}><Icons.logout/></button>
          </>}
        </div>
      </div>
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────
function Dashboard({ tasks, people, setActive, profile, previewUsers }) {
  const greeting = getTimeOfDayGreeting();
  const dailyVerse = getDailyVerse();
  const today = new Date();
  const teamSummary = previewUsers.map((user) => {
    const assigned = tasks.filter((task) => samePerson(task.assignee, user.full_name));
    const currentTask =
      assigned.find((task) => task.status === "in-progress")
      || assigned
        .filter((task) => task.status !== "done")
        .sort((a, b) => new Date(a.due_date || 0) - new Date(b.due_date || 0))[0]
      || null;
    return {
      ...user,
      openTasks: assigned.filter((task) => task.status !== "done").length,
      inProgressTasks: assigned.filter((task) => task.status === "in-progress").length,
      currentTask,
      nextTask: assigned
        .filter((task) => task.status !== "done")
        .sort((a, b) => new Date(a.due_date || 0) - new Date(b.due_date || 0))[0],
    };
  });
  const recentAdminWork = tasks
    .filter((task) => ["Admin", "Operations", "Finances"].includes(task.ministry))
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 4);
  const notifications = [
    ...tasks
      .filter((task) => samePerson(task.assignee, profile?.full_name) && task.status !== "done" && task.due_date && new Date(task.due_date) < today)
      .map((task) => ({
        id: `overdue-${task.id}`,
        tone: C.danger,
        title: "Overdue task",
        detail: `${task.title} was due ${fmtDate(task.due_date)}.`,
      })),
    ...tasks
      .filter((task) => samePerson(task.assignee, profile?.full_name) && task.status === "todo")
      .slice(0, 3)
      .map((task) => ({
        id: `todo-${task.id}`,
        tone: C.blue,
        title: "Ready to start",
        detail: `${task.title} is waiting in ${task.ministry}.`,
      })),
    ...people
      .filter((person) => person.status === "follow-up" || person.prayer_request)
      .slice(0, 2)
      .map((person) => ({
        id: `person-${person.id}`,
        tone: C.gold,
        title: "People care follow-up",
        detail: `${person.full_name} needs attention${person.prayer_request ? `: ${person.prayer_request}` : "."}`,
      })),
  ].slice(0, 5);

  return (
    <div className="fadeIn" style={{padding:"32px 36px",maxWidth:1200}}>
      <div style={{marginBottom:28}}>
        <h2 style={{fontFamily:"'Young Serif Medium', Georgia, serif",fontSize:42,fontWeight:500,color:C.text,letterSpacing:"0.01em"}}>{greeting}, {profile?.full_name?.split(" ")[0] || "team"}.</h2>
        <p style={{color:C.muted,marginTop:4,fontStyle:profile?.canSeeTeamOverview && !profile?.readOnlyOversight?"italic":"normal"}}>
          {profile?.canSeeTeamOverview
            ? profile?.readOnlyOversight
              ? "You can see the whole church team's workload this week in read-only mode."
              : `${dailyVerse.text} ${dailyVerse.reference}`
            : profile?.canSeeAdminOverview
              ? "You can see the full church workload with an administrative operations lens."
              : `Here is your ministry workload and the shared church picture for ${roleLabel(profile)}.`}
        </p>
      </div>
      {previewUsers.length > 0 && (
        <div className="card" style={{padding:22,marginBottom:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <h3 style={{...displayHeadingStyle,fontSize:24,color:C.text}}>
              {profile?.canSeeAdminOverview ? "Administrative Team Snapshot" : "Leadership Team Snapshot"}
            </h3>
            <button className="btn-outline" onClick={()=>setActive("tasks")} style={{padding:"5px 12px",fontSize:12}}>Open task board</button>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {teamSummary.map((member) => (
              <div
                key={member.id}
                style={{
                  padding:16,
                  border:`1px solid ${member.currentTask?.status === "in-progress" ? C.goldDim : C.border}`,
                  borderRadius:12,
                  background:member.currentTask?.status === "in-progress" ? C.goldGlow : C.surface,
                  display:"grid",
                  gridTemplateColumns:"minmax(180px, 220px) minmax(220px, 1fr) 110px",
                  gap:16,
                  alignItems:"center"
                }}
              >
                <div>
                  <div style={{fontSize:14,fontWeight:600,color:C.text}}>{member.full_name}</div>
                  <div style={{fontSize:11,color:C.muted,marginTop:2}}>{member.title}</div>
                </div>
                <div>
                  <div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:".08em",marginBottom:6}}>
                    Working on now
                  </div>
                  {member.currentTask ? (
                    <>
                      <div style={{fontSize:14,color:C.text,fontWeight:500}}>{member.currentTask.title}</div>
                      <div style={{display:"flex",gap:8,alignItems:"center",marginTop:6,flexWrap:"wrap"}}>
                        <span className={`badge ${getTag(member.currentTask.ministry)}`}>{member.currentTask.ministry}</span>
                        <span className="badge" style={{background:"rgba(255,255,255,.04)",color:member.currentTask.status === "in-progress" ? C.blue : C.muted,border:`1px solid ${C.border}`}}>
                          {member.currentTask.status === "in-progress" ? "In Progress" : "To Do"}
                        </span>
                        {member.currentTask.due_date && <span style={{fontSize:11,color:C.muted}}>Due {fmtDate(member.currentTask.due_date)}</span>}
                      </div>
                    </>
                  ) : (
                    <div style={{fontSize:13,color:C.muted}}>No active task right now.</div>
                  )}
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:28,fontFamily:"'Young Serif Medium', Georgia, serif",color:member.inProgressTasks ? C.blue : C.gold}}>
                    {member.openTasks}
                  </div>
                  <div style={{fontSize:11,color:C.muted}}>open tasks</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="card" style={{padding:22,marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <h3 style={{...displayHeadingStyle,fontSize:24,color:C.text}}>Notifications</h3>
          <button className="btn-outline" onClick={()=>setActive("tasks")} style={{padding:"5px 12px",fontSize:12}}>Open tasks</button>
        </div>
        {notifications.length === 0 && <p style={{color:C.muted,fontSize:13}}>No new notifications right now.</p>}
        {notifications.map((item) => (
          <div key={item.id} style={{display:"flex",gap:12,marginBottom:14,paddingBottom:14,borderBottom:`1px solid ${C.border}`}}>
            <div style={{width:10,height:10,borderRadius:"50%",background:item.tone,marginTop:5,flexShrink:0}} />
            <div>
              <div style={{fontSize:13,fontWeight:500,color:C.text}}>{item.title}</div>
              <div style={{fontSize:12,color:C.muted,marginTop:3,lineHeight:1.5}}>{item.detail}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="card" style={{padding:22,marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <h3 style={{...displayHeadingStyle,fontSize:24,color:C.text}}>Calendar</h3>
          <button className="btn-outline" onClick={()=>setActive("calendar")} style={{padding:"5px 12px",fontSize:12}}>Open calendar</button>
        </div>
        {GOOGLE_CALENDAR_EMBED_URL ? (
          <div style={{border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden",background:C.surface}}>
            <iframe
              title="Church Calendar"
              src={GOOGLE_CALENDAR_EMBED_URL}
              style={{width:"100%",height:560,border:"0",display:"block",background:"#fff"}}
            />
          </div>
        ) : (
          <div style={{border:`1px dashed ${C.border}`,borderRadius:12,padding:20,background:C.surface}}>
            <div style={{fontSize:13,fontWeight:500,color:C.text,marginBottom:8}}>Google Calendar not connected yet.</div>
            <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>
              Add `VITE_GOOGLE_CALENDAR_EMBED_URL` to your local `.env` and Vercel environment settings with your church Google Calendar embed link to show it here.
            </div>
          </div>
        )}
      </div>
      <div>
        <div className="card" style={{padding:22}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <h3 style={{...displayHeadingStyle,fontSize:24,color:C.text}}>
              {profile?.canSeeAdminOverview ? "Admin Watchlist" : "Pastoral Follow-ups"}
            </h3>
            <button className="btn-outline" onClick={()=>setActive("members")} style={{padding:"5px 12px",fontSize:12}}>View all</button>
          </div>
          {profile?.canSeeAdminOverview ? (
            <>
              {recentAdminWork.map((task) => (
                <div key={task.id} style={{display:"flex",gap:12,marginBottom:14,paddingBottom:14,borderBottom:`1px solid ${C.border}`}}>
                  <div style={{width:36,height:36,borderRadius:"50%",background:C.goldGlow,border:`1px solid ${C.goldDim}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:C.gold,flexShrink:0}}>
                    {task.assignee?.split(" ").map((part) => part[0]).join("").slice(0,2)}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:500,color:C.text}}>{task.title}</div>
                    <div style={{fontSize:12,color:C.muted,marginTop:2}}>{task.assignee} • {task.ministry}</div>
                  </div>
                  <span className={`badge ${getTag(task.ministry)}`}>{task.status}</span>
                </div>
              ))}
              {recentAdminWork.length===0&&<p style={{color:C.muted,fontSize:13}}>No admin watchlist items right now.</p>}
            </>
          ) : (
            <>
              {people.filter(p=>p.status==="follow-up"||p.prayer_request).map(p=>(
                <div key={p.id} style={{display:"flex",gap:12,marginBottom:14,paddingBottom:14,borderBottom:`1px solid ${C.border}`}}>
                  <div style={{width:36,height:36,borderRadius:"50%",background:C.goldGlow,border:`1px solid ${C.goldDim}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:600,color:C.gold,flexShrink:0}}>
                    {p.full_name?.[0]}
                  </div>
                  <div>
                    <div style={{fontSize:13,fontWeight:500,color:C.text}}>{p.full_name}</div>
                    {p.prayer_request&&<div style={{fontSize:12,color:C.muted,marginTop:2}}>{p.prayer_request}</div>}
                  </div>
                  {p.status==="follow-up"&&<span className="badge tag-board" style={{marginLeft:"auto",alignSelf:"flex-start"}}>Follow-up</span>}
                </div>
              ))}
              {people.filter(p=>p.status==="follow-up"||p.prayer_request).length===0&&<p style={{color:C.muted,fontSize:13}}>No follow-ups needed right now.</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tasks ──────────────────────────────────────────────────────────────────
function Tasks({ tasks, setTasks, churchId, profile, previewUsers }) {
  const isPreview = churchId === "preview";
  const canCreateTasks = true;
  const canAssignToAnyone = profile?.full_name === "Shannan";
  const [mFilter, setMFilter] = useState("All");
  const [aFilter, setAFilter] = useState("mine");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const blank = {title:"",ministry:"Admin",assignee:profile?.full_name || "",due_date:"",status:"todo",notes:"",review_required:false,reviewers:[],review_approvals:[]};
  const [form, setForm] = useState(blank);
  const [orderedCategories, setOrderedCategories] = useState(() => getStoredCategoryOrder());
  const teamNames = previewUsers?.map((user) => user.full_name) || [];
  const allowedAssignees = canAssignToAnyone ? teamNames : [profile?.full_name].filter(Boolean);

  const filtered = tasks.filter((t) => {
    const ministryMatch = mFilter === "All" || t.ministry === mFilter;
    const isMine = isTaskForUser(t, profile?.full_name);
    const assigneeMatch =
      aFilter === "all" ||
      (aFilter === "mine" && isMine) ||
      (aFilter === "team" && !isMine);
    return ministryMatch && assigneeMatch;
  });

  const openNew = () => {
    setEditing(null);
    setForm({ ...blank, ministry: orderedCategories[0] || "Admin", assignee: profile?.full_name || blank.assignee });
    setShowModal(true);
  };
  const openEdit = (t) => { setEditing(t); setForm(normalizeTask(t)); setShowModal(true); };

  const save = async () => {
    if (!form.title) return;
    rememberCategory(form.ministry);
    setOrderedCategories(getStoredCategoryOrder());
    const safeAssignee = canAssignToAnyone ? form.assignee : profile?.full_name;
    const safeReviewers = form.review_required
      ? form.reviewers.filter((name) => !samePerson(name, safeAssignee))
      : [];
    const safeApprovals = (form.review_approvals || []).filter((name) => listIncludesPerson(safeReviewers, name));
    const safeForm = normalizeTask({ ...form, assignee: safeAssignee, reviewers: safeReviewers, review_approvals: safeApprovals });
    if (isPreview) {
      const record = editing
        ? { ...editing, ...safeForm }
        : { ...safeForm, id: `task-${Date.now()}`, church_id: churchId };
      setTasks(editing ? tasks.map((t) => t.id === editing.id ? normalizeTask(record) : t) : [...tasks, normalizeTask(record)]);
      setShowModal(false);
      return;
    }
    const dbPayload = { ...safeForm, church_id: churchId };
    if (editing) {
      let result = await supabase.from("tasks").update(safeForm).eq("id",editing.id).select().single();
      if (result.error && /review_required|reviewers|review_approvals/i.test(result.error.message || "")) {
        const fallbackPayload = {
          title: safeForm.title,
          ministry: safeForm.ministry,
          assignee: safeForm.assignee,
          due_date: safeForm.due_date,
          status: safeForm.status,
          notes: safeForm.notes,
        };
        result = await supabase.from("tasks").update(fallbackPayload).eq("id", editing.id).select().single();
      }
      if (result.data) setTasks(tasks.map(t=>t.id===editing.id?normalizeTask(result.data):t));
    } else {
      let result = await supabase.from("tasks").insert(dbPayload).select().single();
      if (result.error && /review_required|reviewers|review_approvals/i.test(result.error.message || "")) {
        const fallbackPayload = {
          title: safeForm.title,
          ministry: safeForm.ministry,
          assignee: safeForm.assignee,
          due_date: safeForm.due_date,
          status: safeForm.status,
          notes: safeForm.notes,
          church_id: churchId,
        };
        result = await supabase.from("tasks").insert(fallbackPayload).select().single();
      }
      if (result.data) setTasks([...tasks,normalizeTask(result.data)]);
    }
    setShowModal(false);
  };

  const cycleStatus = async (task) => {
    const next = {
      todo: "in-progress",
      "in-progress": task.review_required ? "in-review" : "done",
      "in-review": "done",
      done: "todo",
    }[task.status];
    await setTaskStatus(task, next);
  };

  const setTaskStatus = async (task, nextStatus) => {
    if (nextStatus === "done" && task.review_required && task.reviewers.some((name) => !listIncludesPerson(task.review_approvals, name))) {
      return;
    }
    if (isPreview) {
      setTasks(tasks.map((t) => t.id === task.id ? { ...t, status: nextStatus } : t));
      return;
    }
    const { data } = await supabase.from("tasks").update({status:nextStatus}).eq("id",task.id).select().single();
    setTasks(tasks.map(t=>t.id===task.id?normalizeTask(data):t));
  };

  const toggleReviewer = (name) => {
    const current = form.reviewers || [];
    const next = listIncludesPerson(current, name) ? current.filter((entry) => !samePerson(entry, name)) : [...current, name];
    setForm({
      ...form,
      reviewers: next,
      review_approvals: (form.review_approvals || []).filter((entry) => listIncludesPerson(next, entry)),
    });
  };

  const approveReview = async (task) => {
    const approvals = [...new Set([...(task.review_approvals || []), profile?.full_name].filter(Boolean))];
    if (isPreview) {
      setTasks(tasks.map((entry) => entry.id === task.id ? normalizeTask({ ...entry, review_approvals: approvals }) : entry));
      return;
    }
    const { data } = await supabase.from("tasks").update({ review_approvals: approvals }).eq("id", task.id).select().single();
    setTasks(tasks.map((entry) => entry.id === task.id ? normalizeTask(data) : entry));
  };

  const del = async (id) => {
    if (isPreview) {
      setTasks(tasks.filter((t) => t.id !== id));
      return;
    }
    await supabase.from("tasks").delete().eq("id",id);
    setTasks(tasks.filter(t=>t.id!==id));
  };

  const groupedTasks = {
    todo: filtered.filter((task) => task.status === "todo"),
    "in-progress": filtered.filter((task) => task.status === "in-progress"),
    "in-review": filtered.filter((task) => task.status === "in-review"),
    done: filtered.filter((task) => task.status === "done"),
  };

  return (
    <div className="fadeIn" style={{padding:"32px 36px",maxWidth:1100}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr auto",alignItems:"start",gap:16,marginBottom:24}}>
        <div style={{justifySelf:"start",textAlign:"left"}}>
          <h2 style={{...displayHeadingStyle,fontSize:52,color:C.text}}>Tasks</h2>
          <p style={{color:C.muted,fontSize:13,marginTop:4}}>
            {tasks.filter(t=>t.status!=="done").length} open tasks across the church team
          </p>
          <p style={{color:C.gold,fontSize:12,marginTop:6}}>
            {tasks.filter((task) => task.status !== "done" && isTaskForUser(task, profile?.full_name)).length} open items involve you
          </p>
        </div>
        {canCreateTasks && <button className="btn-gold" onClick={openNew}><Icons.plus/>New Task</button>}
      </div>
      <div style={{display:"flex",gap:10,marginBottom:22,flexWrap:"wrap"}}>
        <div style={{display:"flex",background:C.surface,borderRadius:10,padding:3,border:`1px solid ${C.border}`,gap:2}}>
          {[
            { id: "mine", label: "My Tasks" },
            { id: "team", label: "Others" },
            { id: "all", label: "Everyone" },
          ].map((option) => (
            <button
              key={option.id}
              onClick={() => setAFilter(option.id)}
              style={{padding:"6px 14px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:500,background:aFilter===option.id?C.card:"transparent",color:aFilter===option.id?C.text:C.muted}}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div style={{display:"flex",background:C.surface,borderRadius:10,padding:3,border:`1px solid ${C.border}`,gap:2}}>
          {["All", ...SORTED_TASK_CATEGORIES].map(m=>(
            <button key={m} onClick={()=>setMFilter(m)} style={{padding:"6px 10px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:500,background:mFilter===m?C.card:"transparent",color:mFilter===m?C.text:C.muted}}>{m}</button>
          ))}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr",gap:16,alignItems:"start"}}>
        {["todo","in-progress","in-review","done"].map((statusKey) => (
          <div key={statusKey} className="card" style={{padding:16,minHeight:420,borderTop:`3px solid ${STATUS_STYLES[statusKey].accent}`,background:`linear-gradient(180deg, ${STATUS_STYLES[statusKey].surface} 0%, ${C.card} 24%)`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,paddingBottom:12,borderBottom:`1px solid ${C.border}`}}>
              <div>
                <div style={{fontSize:15,fontWeight:600,color:STATUS_STYLES[statusKey].accent}}>{STATUS_STYLES[statusKey].label}</div>
                <div style={{fontSize:11,color:C.muted,marginTop:2}}>{groupedTasks[statusKey].length} tasks</div>
              </div>
              <div style={{width:10,height:10,borderRadius:"50%",background:STATUS_STYLES[statusKey].accent,flexShrink:0}} />
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {groupedTasks[statusKey].map((task) => (
                <div key={task.id} style={{padding:14,border:`1px solid ${C.border}`,borderRadius:12,background:C.surface,display:"flex",flexDirection:"column",minHeight:220}}>
                  <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start"}}>
                    <div style={{textAlign:"left"}}>
                      <div style={{fontSize:14,fontWeight:600,color:task.status==="done"?C.muted:C.text,textDecoration:task.status==="done"?"line-through":"none"}}>{task.title}</div>
                      <div style={{fontSize:11,color:C.muted,marginTop:4}}>Assigned to {task.assignee}</div>
                      <div style={{fontSize:11,color:C.muted,marginTop:3}}>Due {fmtDate(task.due_date)}</div>
                      {task.notes && <div style={{fontSize:11,color:C.muted,marginTop:6,lineHeight:1.5}}>{task.notes}</div>}
                    </div>
                    {canEditTask(profile, task) && (
                      <button onClick={()=>openEdit(task)} style={{background:"none",border:"none",cursor:"pointer",color:C.muted,padding:0,display:"inline-flex",alignItems:"center"}}>
                        <Icons.pen />
                      </button>
                    )}
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",gap:12,marginTop:"auto",paddingTop:12}}>
                    {canEditTask(profile, task) ? (
                      <div style={{display:"flex",justifyContent:"flex-start",gap:16,fontSize:12}}>
                        <button onClick={()=>cycleStatus(task)} style={{background:"none",border:"none",cursor:"pointer",color:C.gold,fontSize:12,padding:0}}>
                          Move to next
                        </button>
                        <button onClick={()=>del(task.id)} style={{background:"none",border:"none",cursor:"pointer",color:C.muted,fontSize:12,padding:0}}>
                          Delete
                        </button>
                      </div>
                    ) : <div />}
                    <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"flex-end"}}>
                      <span className={`badge ${getTag(task.ministry)}`}>{task.ministry}</span>
                      {listIncludesPerson(task.reviewers, profile?.full_name) && !samePerson(task.assignee, profile?.full_name) && (
                        <span className="badge" style={{background:"rgba(91,143,232,.12)",color:C.blue,border:`1px solid rgba(91,143,232,.3)`}}>
                          Reviewer
                        </span>
                      )}
                      {task.review_required && (
                        <span className="badge" style={{background:C.goldGlow,color:C.gold,border:`1px solid ${C.goldDim}`}}>
                          Review {task.review_approvals.length}/{task.reviewers.length}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{display:"flex",justifyContent:"flex-end",alignItems:"center",marginTop:12,fontSize:12,color:C.muted}}>
                    {canEditTask(profile, task) ? (
                      <select className="input-field" value={task.status} onChange={(e)=>setTaskStatus(task, e.target.value)} style={{width:132,background:C.card,padding:"6px 10px",fontSize:12}}>
                        <option value="todo">Not Started</option>
                        <option value="in-progress">In Progress</option>
                        <option value="in-review">In Review</option>
                        <option value="done" disabled={task.review_required && task.reviewers.some((name) => !listIncludesPerson(task.review_approvals, name))}>Done</option>
                      </select>
                    ) : (
                      <span>{STATUS_STYLES[task.status]?.label || "Not Started"}</span>
                    )}
                  </div>
                  {canReviewTask(profile, task) && !listIncludesPerson(task.review_approvals, profile?.full_name) && (
                    <div style={{marginTop:10}}>
                      <button onClick={()=>approveReview(task)} style={{background:"none",border:"none",cursor:"pointer",color:C.blue,fontSize:12,padding:0}}>
                        Approve Review
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {groupedTasks[statusKey].length===0 && <div style={{padding:"28px 12px",textAlign:"center",color:C.muted,fontSize:13,border:`1px dashed ${C.border}`,borderRadius:12}}>No tasks in {STATUS_STYLES[statusKey].label.toLowerCase()}.</div>}
            </div>
          </div>
        ))}
      </div>
      {showModal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="modal fadeIn">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
              <h3 style={{...displayHeadingStyle,fontSize:28,color:C.text}}>{editing?"Edit Task":"New Task"}</h3>
              <button onClick={()=>setShowModal(false)} style={{background:"none",border:"none",cursor:"pointer",color:C.muted}}><Icons.x/></button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <label style={{fontSize:12,color:C.muted,textAlign:"left"}}>Task Title</label>
                <input className="input-field" placeholder="Task title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  <label style={{fontSize:12,color:C.muted,textAlign:"left"}}>Ministry</label>
                  <select className="input-field" value={form.ministry} onChange={e=>setForm({...form,ministry:e.target.value})} style={{background:C.surface}}>
                    {orderedCategories.map(m=><option key={m}>{m}</option>)}
                  </select>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  <label style={{fontSize:12,color:C.muted,textAlign:"left"}}>Assigned To</label>
                  <select className="input-field" value={canAssignToAnyone ? form.assignee : (profile?.full_name || "")} onChange={e=>setForm({...form,assignee:e.target.value})} style={{background:C.surface}} disabled={!canAssignToAnyone}>
                    {allowedAssignees.map((name) => <option key={name} value={name}>{name}</option>)}
                  </select>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"flex-start",textAlign:"left"}}>
                  <label style={{fontSize:12,color:C.muted,textAlign:"left",width:"100%"}}>Due Date</label>
                  <input className="input-field" type="date" value={form.due_date} onChange={e=>setForm({...form,due_date:e.target.value})}/>
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <label style={{fontSize:12,color:C.muted,textAlign:"left"}}>Review Workflow</label>
                <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:C.text}}>
                  <input
                    type="checkbox"
                    checked={form.review_required}
                    onChange={(e)=>setForm({...form,review_required:e.target.checked,reviewers:e.target.checked ? form.reviewers : [],review_approvals:[]})}
                  />
                  Requires Review Before Completion
                </label>
                {form.review_required && (
                  <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10,padding:14,border:`1px solid ${C.border}`,borderRadius:12,background:C.surface}}>
                    {teamNames.filter((name) => !samePerson(name, canAssignToAnyone ? form.assignee : profile?.full_name)).map((name) => (
                      <label key={name} style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:C.text}}>
                        <input type="checkbox" checked={listIncludesPerson(form.reviewers || [], name)} onChange={()=>toggleReviewer(name)} />
                        {name}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <label style={{fontSize:12,color:C.muted,textAlign:"left"}}>Notes</label>
                <textarea className="input-field" placeholder="Notes (optional)" rows={3} value={form.notes||""} onChange={e=>setForm({...form,notes:e.target.value})} style={{resize:"vertical"}}/>
              </div>
            </div>
            <div style={{display:"flex",gap:10,marginTop:22,justifyContent:"flex-end"}}>
              <button className="btn-outline" onClick={()=>setShowModal(false)}>Cancel</button>
              <button className="btn-gold" onClick={save}>Save Task</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── People Care ────────────────────────────────────────────────────────────
function Members({ people, setPeople, churchId, profile }) {
  const isPreview = churchId === "preview";
  const canEditPeople = canManagePeople(profile);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const blank = {full_name:"",role:"",ministry:"Admin",email:"",phone:"",tier:"volunteer",status:"active",prayer_request:"",last_contact:""};
  const [form, setForm] = useState(blank);

  const filtered = people.filter(p=>p.full_name?.toLowerCase().includes(search.toLowerCase())||p.ministry?.toLowerCase().includes(search.toLowerCase()));

  const openNew = () => { setSelected(null); setForm(blank); setShowModal(true); };
  const openEdit = (p) => { setSelected(p); setForm(p); setShowModal(true); };

  const save = async () => {
    if (!form.full_name) return;
    if (isPreview) {
      const record = selected?.id
        ? { ...selected, ...form }
        : { ...form, id: `person-${Date.now()}`, church_id: churchId };
      setPeople(selected?.id ? people.map((p) => p.id === selected.id ? record : p) : [...people, record]);
      setShowModal(false);
      return;
    }
    if (selected?.id) {
      const { data } = await supabase.from("people").update(form).eq("id",selected.id).select().single();
      setPeople(people.map(p=>p.id===selected.id?data:p));
    } else {
      const { data } = await supabase.from("people").insert({...form,church_id:churchId}).select().single();
      setPeople([...people,data]);
    }
    setShowModal(false);
  };

  const toggleFollowUp = async (p) => {
    const next = p.status==="follow-up"?"active":"follow-up";
    if (isPreview) {
      setPeople(people.map((x) => x.id === p.id ? { ...x, status: next } : x));
      return;
    }
    const { data } = await supabase.from("people").update({status:next}).eq("id",p.id).select().single();
    setPeople(people.map(x=>x.id===p.id?data:x));
  };

  return (
    <div className="fadeIn" style={{padding:"32px 36px",maxWidth:1100}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
        <div>
          <h2 style={{...displayHeadingStyle,fontSize:38,color:C.text}}>People Care</h2>
          <p style={{color:C.muted,fontSize:13,marginTop:4}}>Track pastoral care, prayer requests & follow-ups</p>
        </div>
        {canEditPeople && <button className="btn-gold" onClick={openNew}><Icons.plus/>Add Person</button>}
      </div>
      <input className="input-field" placeholder="Search by name or ministry…" value={search} onChange={e=>setSearch(e.target.value)} style={{maxWidth:380,marginBottom:20}}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
        {filtered.map(p=>(
          <div key={p.id} className="card" style={{padding:20,cursor:canEditPeople?"pointer":"default",borderColor:p.status==="follow-up"?C.goldDim:C.border}} onClick={()=>canEditPeople && openEdit(p)}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
              <div style={{width:44,height:44,borderRadius:"50%",background:p.status==="follow-up"?`linear-gradient(135deg,${C.goldDim},${C.gold})`:C.surface,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:600,color:p.status==="follow-up"?"#0f1117":C.gold}}>
                {p.full_name?.[0]}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:600,color:C.text}}>{p.full_name}</div>
                <div style={{fontSize:12,color:C.muted}}>{p.role}</div>
              </div>
              <span style={{fontSize:18}}>{p.tier==="staff"?"👔":p.tier==="elder"?"🕊️":"🙋"}</span>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
              <span className={`badge ${getTag(p.ministry)}`}>{p.ministry}</span>
              <span className="badge" style={{background:p.status==="follow-up"?"rgba(201,168,76,.15)":"rgba(82,200,122,.15)",color:p.status==="follow-up"?C.gold:C.success,border:`1px solid ${p.status==="follow-up"?C.goldDim:"rgba(82,200,122,.3)"}`}}>{p.status==="follow-up"?"Follow-up":"Active"}</span>
            </div>
              {p.prayer_request&&<div style={{background:C.goldGlow,border:`1px solid ${C.goldDim}`,borderRadius:8,padding:"8px 12px",fontSize:12,color:C.text}}><em>{p.prayer_request}</em></div>}
            {p.last_contact&&<div style={{fontSize:11,color:C.muted,marginTop:10}}>Last contact: {fmtDate(p.last_contact)}</div>}
          </div>
        ))}
        {filtered.length===0&&<div style={{color:C.muted,fontSize:13,gridColumn:"1/-1",padding:"40px 0",textAlign:"center"}}>No people found. Add someone!</div>}
      </div>
      {showModal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="modal fadeIn">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <h3 style={{...displayHeadingStyle,fontSize:28,color:C.text}}>{selected?"Edit Person":"Add Person"}</h3>
              <button onClick={()=>setShowModal(false)} style={{background:"none",border:"none",cursor:"pointer",color:C.muted}}><Icons.x/></button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <input className="input-field" placeholder="Full name" value={form.full_name||""} onChange={e=>setForm({...form,full_name:e.target.value})}/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <input className="input-field" placeholder="Role (e.g. Worship Leader)" value={form.role||""} onChange={e=>setForm({...form,role:e.target.value})}/>
                <select className="input-field" value={form.ministry||"Admin"} onChange={e=>setForm({...form,ministry:e.target.value})} style={{background:C.surface}}>
                  {TASK_CATEGORIES.map(m=><option key={m}>{m}</option>)}
                </select>
                <input className="input-field" placeholder="Email" value={form.email||""} onChange={e=>setForm({...form,email:e.target.value})}/>
                <input className="input-field" placeholder="Phone" value={form.phone||""} onChange={e=>setForm({...form,phone:e.target.value})}/>
                <select className="input-field" value={form.tier||"volunteer"} onChange={e=>setForm({...form,tier:e.target.value})} style={{background:C.surface}}>
                  <option value="staff">Staff 👔</option>
                  <option value="elder">Elder 🕊️</option>
                  <option value="volunteer">Volunteer 🙋</option>
                  <option value="member">Member</option>
                </select>
                <input className="input-field" type="date" placeholder="Last contact" value={form.last_contact||""} onChange={e=>setForm({...form,last_contact:e.target.value})}/>
              </div>
              <textarea className="input-field" placeholder="Prayer request (optional)" rows={2} value={form.prayer_request||""} onChange={e=>setForm({...form,prayer_request:e.target.value})} style={{resize:"vertical"}}/>
            </div>
            <div style={{display:"flex",gap:10,marginTop:22,justifyContent:"flex-end"}}>
              {selected&&<button className="btn-outline" onClick={()=>{toggleFollowUp(selected);setShowModal(false);}} style={{borderColor:selected.status==="follow-up"?C.success:C.gold,color:selected.status==="follow-up"?C.success:C.gold}}>{selected.status==="follow-up"?"Mark Active":"Flag Follow-up"}</button>}
              <button className="btn-outline" onClick={()=>setShowModal(false)}>Cancel</button>
              <button className="btn-gold" onClick={save}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Budget ─────────────────────────────────────────────────────────────────
function Budget({ transactions, setTransactions, churchId, profile }) {
  const isPreview = churchId === "preview";
  const canEditBudget = canManageBudget(profile);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({description:"",amount:"",ministry:"Admin",category:"Operations",date:new Date().toISOString().split("T")[0],type:"expense"});

  const income = transactions.filter(t=>t.amount>0).reduce((s,t)=>s+t.amount,0);
  const expense = transactions.filter(t=>t.amount<0).reduce((s,t)=>s+Math.abs(t.amount),0);

  const save = async () => {
    if (!form.description||!form.amount) return;
    const amt = parseFloat(form.amount)*(form.type==="expense"?-1:1);
    if (isPreview) {
      setTransactions([{ ...form, id: `txn-${Date.now()}`, amount: amt, church_id: churchId }, ...transactions]);
      setShowModal(false);
      setForm({description:"",amount:"",ministry:"Admin",category:"Operations",date:new Date().toISOString().split("T")[0],type:"expense"});
      return;
    }
    const { data } = await supabase.from("transactions").insert({description:form.description,amount:amt,ministry:form.ministry,category:form.category,date:form.date,church_id:churchId}).select().single();
    setTransactions([data,...transactions]);
    setShowModal(false);
    setForm({description:"",amount:"",ministry:"Admin",category:"Operations",date:new Date().toISOString().split("T")[0],type:"expense"});
  };

  return (
    <div className="fadeIn" style={{padding:"32px 36px",maxWidth:1100}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
        <div>
          <h2 style={{...displayHeadingStyle,fontSize:38,color:C.text}}>Budget & Finance</h2>
          <p style={{color:C.muted,fontSize:13,marginTop:4}}>Track ministry spending and income</p>
        </div>
        {canEditBudget && <button className="btn-gold" onClick={()=>setShowModal(true)}><Icons.plus/>Add Transaction</button>}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,marginBottom:28}}>
        {[
          {label:"Total Income",value:fmt(income),color:C.success},
          {label:"Total Expenses",value:fmt(expense),color:C.danger},
          {label:"Net Balance",value:fmt(income-expense),color:income>=expense?C.success:C.danger},
        ].map(s=>(
          <div key={s.label} className="stat-card">
            <div style={{fontSize:28,fontWeight:600,color:s.color,fontFamily:"'Cormorant Garamond',serif"}}>{s.value}</div>
            <div style={{fontSize:13,color:C.text,marginTop:4}}>{s.label}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{overflow:"hidden"}}>
        <div style={{padding:"16px 18px",borderBottom:`1px solid ${C.border}`,background:C.surface}}>
          <h3 style={{...displayHeadingStyle,fontSize:24,color:C.text}}>Recent Transactions</h3>
        </div>
        {transactions.length===0&&<div style={{padding:"40px",textAlign:"center",color:C.muted}}>No transactions yet.</div>}
        {transactions.map(t=>(
          <div key={t.id} className="table-row" style={{gridTemplateColumns:"1fr 110px 100px 90px"}}>
            <div>
              <div style={{fontSize:13,color:C.text}}>{t.description}</div>
              <div style={{fontSize:11,color:C.muted,marginTop:2}}>{t.category}</div>
            </div>
            <span className={`badge ${getTag(t.ministry)}`}>{t.ministry}</span>
            <span style={{fontSize:12,color:C.muted}}>{fmtDate(t.date)}</span>
            <span style={{fontSize:14,fontWeight:600,color:t.amount>0?C.success:C.danger,textAlign:"right"}}>
              {t.amount>0?"+":"−"}{fmt(t.amount)}
            </span>
          </div>
        ))}
      </div>
      {showModal&& canEditBudget &&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="modal fadeIn">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <h3 style={{...displayHeadingStyle,fontSize:28,color:C.text}}>Add Transaction</h3>
              <button onClick={()=>setShowModal(false)} style={{background:"none",border:"none",cursor:"pointer",color:C.muted}}><Icons.x/></button>
            </div>
            <div style={{display:"flex",background:C.surface,borderRadius:10,padding:3,marginBottom:14,border:`1px solid ${C.border}`}}>
              {["expense","income"].map(type=>(
                <button key={type} onClick={()=>setForm({...form,type})} style={{flex:1,padding:"8px 0",borderRadius:8,border:"none",cursor:"pointer",fontSize:13,fontWeight:500,background:form.type===type?C.card:"transparent",color:form.type===type?(type==="income"?C.success:C.danger):C.muted}}>
                  {type==="expense"?"↓ Expense":"↑ Income"}
                </button>
              ))}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <input className="input-field" placeholder="Description" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <input className="input-field" placeholder="Amount ($)" type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/>
                <input className="input-field" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/>
                <select className="input-field" value={form.ministry} onChange={e=>setForm({...form,ministry:e.target.value})} style={{background:C.surface}}>
                  {TASK_CATEGORIES.map(m=><option key={m}>{m}</option>)}
                </select>
                <select className="input-field" value={form.category} onChange={e=>setForm({...form,category:e.target.value})} style={{background:C.surface}}>
                  {["Operations","Equipment","Events","Programs","Facilities","Resources","Licensing","Income","Other"].map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div style={{display:"flex",gap:10,marginTop:20,justifyContent:"flex-end"}}>
              <button className="btn-outline" onClick={()=>setShowModal(false)}>Cancel</button>
              <button className="btn-gold" onClick={save}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Ministries ─────────────────────────────────────────────────────────────
function Ministries({ ministries }) {
  return (
    <div className="fadeIn" style={{padding:"32px 36px",maxWidth:1100}}>
      <div style={{marginBottom:24}}>
        <h2 style={{...displayHeadingStyle,fontSize:38,color:C.text}}>Ministries</h2>
        <p style={{color:C.muted,fontSize:13,marginTop:4}}>Overview of all ministry departments</p>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:18}}>
        {ministries.map(m=>(
          <div key={m.id} className="card" style={{padding:24,borderTop:`3px solid ${CATEGORY_STYLES[m.name]?.color||C.gold}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
              <h3 style={{...displayHeadingStyle,fontSize:24,color:C.text}}>{m.name}</h3>
              <span className={`badge ${getTag(m.name)}`}>{m.name}</span>
            </div>
            <div style={{marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:6}}>
                <span style={{color:C.muted}}>Budget</span>
                <span style={{color:C.text}}>{fmt(m.spent)} / {fmt(m.budget)}</span>
              </div>
              <div className="progress-bar" style={{height:8}}>
                <div className="progress-fill" style={{width:`${Math.min(((m.spent||0)/(m.budget||1))*100,100)}%`,background:`linear-gradient(90deg,${CATEGORY_STYLES[m.name]?.color||C.gold}88,${CATEGORY_STYLES[m.name]?.color||C.gold})`}}/>
              </div>
            </div>
            <div style={{fontSize:12,color:C.muted}}>{Math.round(((m.spent||0)/(m.budget||1))*100)}% of annual budget used</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Calendar ───────────────────────────────────────────────────────────────
function CalendarView({ tasks }) {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const today = new Date();
  const days = Array.from({length:35},(_,i)=>{
    const d = new Date(today.getFullYear(),today.getMonth(),1);
    d.setDate(d.getDate()-d.getDay()+i);
    return d;
  });
  const upcoming = [...tasks].filter(t=>t.status!=="done").sort((a,b)=>new Date(a.due_date)-new Date(b.due_date));

  return (
    <div className="fadeIn" style={{padding:"32px 36px",maxWidth:1100}}>
      <div style={{marginBottom:24}}>
        <h2 style={{...displayHeadingStyle,fontSize:38,color:C.text}}>Calendar</h2>
        <p style={{color:C.muted,fontSize:13,marginTop:4}}>{months[today.getMonth()]} {today.getFullYear()}</p>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:24}}>
        <div className="card" style={{padding:20}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:10}}>
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=>(
              <div key={d} style={{textAlign:"center",fontSize:11,color:C.muted,fontWeight:600,padding:"4px 0"}}>{d}</div>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
            {days.map((d,i)=>{
              const isToday = d.toDateString()===today.toDateString();
              const isMonth = d.getMonth()===today.getMonth();
              const dt = tasks.filter(t=>new Date(t.due_date).toDateString()===d.toDateString()&&t.status!=="done");
              return (
                <div key={i} style={{minHeight:60,borderRadius:8,padding:"6px 8px",background:isToday?C.goldGlow:"transparent",border:`1px solid ${isToday?C.goldDim:"transparent"}`,opacity:isMonth?1:0.35}}>
                  <div style={{fontSize:12,fontWeight:isToday?700:400,color:isToday?C.gold:C.text,marginBottom:4}}>{d.getDate()}</div>
                  {dt.slice(0,2).map(t=>(
                    <div key={t.id} style={{fontSize:9,background:(CATEGORY_STYLES[t.ministry]?.color||C.blue)+"33",color:CATEGORY_STYLES[t.ministry]?.color||C.blue,borderRadius:3,padding:"1px 4px",marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.title}</div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
        <div className="card" style={{padding:20,height:"fit-content"}}>
          <h3 style={{...displayHeadingStyle,fontSize:24,color:C.text,marginBottom:16}}>Upcoming</h3>
          {upcoming.length===0&&<p style={{color:C.muted,fontSize:13}}>No upcoming tasks.</p>}
          {upcoming.slice(0,8).map(t=>(
            <div key={t.id} style={{display:"flex",gap:12,marginBottom:14,paddingBottom:14,borderBottom:`1px solid ${C.border}`}}>
              <div style={{textAlign:"center",minWidth:36}}>
                <div style={{fontSize:18,fontWeight:700,color:C.gold,fontFamily:"'Young Serif Medium', Georgia, serif",lineHeight:1}}>{new Date(t.due_date).getDate()}</div>
                <div style={{fontSize:10,color:C.muted}}>{months[new Date(t.due_date).getMonth()]}</div>
              </div>
              <div>
                <div style={{fontSize:13,color:C.text}}>{t.title}</div>
                <span className={`badge ${getTag(t.ministry)}`} style={{fontSize:9,marginTop:4}}>{t.ministry}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [church, setChurch] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [people, setPeople] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [ministries, setMinistries] = useState([]);
  const [previewUsers, setPreviewUsers] = useState([]);
  const [active, setActive] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async (uid) => {
    setLoading(true);
    let { data: profileRow } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
    let prof = profileRow;

    if (!prof) {
      const { data: authState } = await supabase.auth.getUser();
      const staffId = authState?.user?.user_metadata?.staff_id;
      const churchId = authState?.user?.user_metadata?.church_id;

      if (staffId && churchId) {
        try {
          await claimStaffProfile(staffId, churchId);
          const retry = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
          profileRow = retry.data;
          prof = retry.data;
        } catch {
          // Fall back to legacy recovery if profile claiming hasn't completed yet.
        }
      }
    }

    if (!prof) {
      const { data: staffRow } = await supabase.from("church_staff").select("*").eq("auth_user_id", uid).maybeSingle();
      if (staffRow) {
        prof = createProfilePayload(uid, staffRow.church_id, staffRow, staffRow.email || "");
        await supabase.from("profiles").upsert(prof);
      }
    }

    setProfile(prof ? normalizeAccessUser(prof) : null);
    if (prof?.church_id) {
      const [ch, t, p, tr, m, staff] = await Promise.all([
        supabase.from("churches").select("*").eq("id", prof.church_id).single(),
        supabase.from("tasks").select("*").eq("church_id", prof.church_id).order("created_at", { ascending: false }),
        supabase.from("people").select("*").eq("church_id", prof.church_id).order("full_name"),
        supabase.from("transactions").select("*").eq("church_id", prof.church_id).order("date", { ascending: false }),
        supabase.from("ministries").select("*").eq("church_id", prof.church_id),
        supabase.from("church_staff").select("*").eq("church_id", prof.church_id).order("full_name"),
      ]);
      setChurch(ch.data);
      setTasks((t.data || []).map(normalizeTask));
      setPeople(p.data || []);
      setTransactions(tr.data || []);
      setMinistries(m.data || []);
      setPreviewUsers((staff.data || []).map(normalizeAccessUser));
    } else {
      setChurch(null);
      setTasks([]);
      setPeople([]);
      setTransactions([]);
      setMinistries([]);
      setPreviewUsers([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadData(session.user.id);
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session);
      if (session) loadData(session.user.id);
      else {
        setProfile(null);
        setChurch(null);
        setTasks([]);
        setPeople([]);
        setTransactions([]);
        setMinistries([]);
        setPreviewUsers([]);
        setLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);
  const logout = () => supabase.auth.signOut();

  if (loading) return (
    <>
      <GS/>
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:C.bg}}>
        <div style={{textAlign:"center"}}>
          <svg width="48" height="48" viewBox="0 0 32 32" fill={C.gold} style={{marginBottom:16}}><path d="M13 0h6v13h13v6H19v13h-6V19H0v-6h13z"/></svg>
          <div style={{width:32,height:32,border:`2px solid ${C.border}`,borderTopColor:C.gold,borderRadius:"50%",animation:"spin .8s linear infinite",margin:"0 auto"}}/>
        </div>
      </div>
    </>
  );

  if (!session) {
    return (
      <>
        <GS/>
        <AuthScreen/>
      </>
    );
  }

  const pages = {
    dashboard:  <Dashboard tasks={tasks} people={people} setActive={setActive} profile={profile} previewUsers={previewUsers}/>,
    tasks:      <Tasks tasks={tasks} setTasks={setTasks} churchId={church?.id} profile={profile} previewUsers={previewUsers}/>,
    members:    <Members people={people} setPeople={setPeople} churchId={church?.id} profile={profile}/>,
    budget:     <Budget transactions={transactions} setTransactions={setTransactions} churchId={church?.id} profile={profile}/>,
    ministries: <Ministries ministries={ministries}/>,
    calendar:   <CalendarView tasks={tasks}/>,
  };

  return (
    <>
      <GS/>
      <div style={{display:"flex",minHeight:"100vh"}}>
        <Sidebar active={active} setActive={setActive} profile={profile} church={church} onLogout={logout} collapsed={collapsed} setCollapsed={setCollapsed}/>
        <main style={{flex:1,overflowY:"auto",background:C.bg}}>{pages[active]}</main>
      </div>
    </>
  );
}
