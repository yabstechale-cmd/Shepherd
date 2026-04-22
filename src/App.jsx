import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { supabase } from "./supabase";
import youngSerifFont from "./assets/fonts/youngserif.medium.ttf";

const C = {
  bg: "#0f1117", surface: "#161b27", card: "#1c2333", border: "#2a3347",
  gold: "#c9a84c", goldDim: "#8a6f2e", goldGlow: "rgba(201,168,76,0.15)",
  text: "#e8e2d4", muted: "#7a8299", danger: "#e05252", success: "#52c87a",
  blue: "#5b8fe8", purple: "#9b72e8",
};

const TASK_CATEGORIES = ["Admin", "Content/Art", "Events", "Services", "Worship", "Missions", "Men's", "Women's", "Young Adults", "Youth", "Kids", "Finances", "Operations"];
const SORTED_TASK_CATEGORIES = [...TASK_CATEGORIES].sort((a, b) => a.localeCompare(b));
const CATEGORY_STYLES = {
  Admin: { tag: "tag-admin", color: "#5b8fe8" },
  "Content/Art": { tag: "tag-content-art", color: "#d98952" },
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
const parseAppDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const raw = String(value).trim();
  const dateOnlyMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};
const getDateSortValue = (value) => parseAppDate(value)?.getTime() || 0;
const fmt = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Math.abs(n || 0));
const fmtDate = (d) => {
  const parsed = parseAppDate(d);
  return parsed ? parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—";
};
const fmtShortDate = (d) => {
  const parsed = parseAppDate(d);
  return parsed ? parsed.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" }) : "—";
};
const fmtActivityDate = (d) => {
  const parsed = d ? new Date(d) : null;
  return parsed && !Number.isNaN(parsed.getTime())
    ? parsed.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : "—";
};
const stripGoogleCalendarMetadata = (notes) => String(notes || "")
  .split(/\n+/)
  .filter((line) => {
    const trimmed = line.trim();
    return !trimmed.startsWith("google-calendar-id:")
      && !trimmed.startsWith("google-event-id:")
      && !trimmed.startsWith("google-calendar-title:")
      && !trimmed.startsWith("google-calendar:");
  })
  .join("\n")
  .replace(/\n{3,}/g, "\n\n")
  .trim();
const startOfWeekMonday = (value) => {
  const parsed = parseAppDate(value) || new Date();
  const base = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  const offset = (base.getDay() + 6) % 7;
  base.setDate(base.getDate() - offset);
  return base;
};
const toAppDateValue = (value) => {
  const parsed = parseAppDate(value);
  return parsed
    ? `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`
    : "";
};
const fmtWeekRange = (value) => {
  const weekStart = startOfWeekMonday(value);
  const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6);
  return `${fmtShortDate(weekStart)}-${fmtShortDate(weekEnd)}`;
};
const CATEGORY_STORAGE_KEY = "shepherd-recent-task-categories";
const AUTH_CODE_LENGTH = 4;
const NOTIFICATION_STORAGE_PREFIX = "shepherd-notifications";
const ARCHIVED_NOTIFICATION_STORAGE_PREFIX = "shepherd-archived-notifications";
const TRASH_STORAGE_PREFIX = "shepherd-trash";
const ACTIVE_PAGE_STORAGE_KEY = "shepherd-active-page";
const STAFF_NOTEPAD_STORAGE_PREFIX = "shepherd-staff-notepad";
const TASK_COLUMN_STATE_STORAGE_PREFIX = "shepherd-task-columns";
const DASHBOARD_SECTION_STATE_STORAGE_PREFIX = "shepherd-dashboard-sections";
const TASK_DISCUSSION_STATE_STORAGE_PREFIX = "shepherd-task-discussion-sections";
const PURCHASE_ORDER_DISCUSSION_STATE_STORAGE_PREFIX = "shepherd-po-discussion-sections";
const CURRENT_WORK_FOCUS_STORAGE_PREFIX = "shepherd-current-work-focus";
const FORM_DRAFT_STORAGE_PREFIX = "shepherd-form-draft";
const GOOGLE_CALENDAR_OAUTH_STATE_STORAGE_PREFIX = "shepherd-google-calendar-oauth-state";
const ACCOUNT_SETTINGS_BRANCH_STORAGE_KEY = "shepherd-account-settings-branch";
const TUTORIAL_COMPLETED_STORAGE_PREFIX = "shepherd-tutorial-completed";
const TUTORIAL_PROMPT_COUNT_STORAGE_PREFIX = "shepherd-tutorial-prompt-count";
const TUTORIAL_AUTO_PROMPT_LIMIT = 10;
const NOTIFICATION_RETENTION_MS = 40 * 24 * 60 * 60 * 1000;
const EVENT_LOCATION_AREA_OPTIONS = ["Youth Room", "Kids Rooms", "Sanctuary", "Kitchen / Dining Area"];
const ACTIVITY_LOG_ALLOWED_USER_IDS = ["725a6cc4-106d-4c7f-9819-b994c1927f53"];

const getGoogleCalendarOAuthStateStorageKey = (churchId) => `${GOOGLE_CALENDAR_OAUTH_STATE_STORAGE_PREFIX}:${churchId || "anon"}`;
const getTutorialCompletedStorageKey = (userId) => `${TUTORIAL_COMPLETED_STORAGE_PREFIX}:${userId || "anon"}`;
const getTutorialPromptCountStorageKey = (userId) => `${TUTORIAL_PROMPT_COUNT_STORAGE_PREFIX}:${userId || "anon"}`;
const getChurchAccountManagerUserIds = (church) => (
  Array.isArray(church?.account_manager_user_ids) && church.account_manager_user_ids.length
    ? church.account_manager_user_ids
    : (church?.account_admin_user_id ? [church.account_admin_user_id] : [])
);
const getChurchAccountManagerEmails = (church) => (
  Array.isArray(church?.account_manager_emails) && church.account_manager_emails.length
    ? church.account_manager_emails
    : (church?.account_admin_email ? [church.account_admin_email] : [])
);
const hasStoredGoogleCalendarOAuthState = (state) => {
  if (typeof window === "undefined" || !state) return false;
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key || !key.startsWith(`${GOOGLE_CALENDAR_OAUTH_STATE_STORAGE_PREFIX}:`)) continue;
      if ((window.localStorage.getItem(key) || "") === state) return true;
    }
  } catch {
    return false;
  }
  return false;
};
const confirmDestructiveAction = (message = "Are you sure you want to delete this?") => {
  if (typeof window === "undefined") return true;
  return window.confirm(message);
};

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
  workspace:() => <Icon d="M9 3L7 21M17 3l-2 18M3 9h18M1 17h18" />,
  people:   () => <Icon d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />,
  spark:    () => <Icon d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2zM19 16l.9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9L19 16zM5 15l.7 1.6L7.3 17l-1.6.7L5 19.3l-.7-1.6L2.7 17l1.6-.7L5 15z" />,
  logout:   () => <Icon d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />,
  plus:     () => <Icon d="M12 5v14M5 12h14" />,
  eye:      () => <Icon d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z" />,
  eyeOff:   () => <Icon d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" />,
  menu:     () => <Icon d="M3 12h18M3 6h18M3 18h18" />,
  x:        () => <Icon d="M18 6L6 18M6 6l12 12" />,
  pen:      () => <Icon d="M12 20h9M16.5 3.5a2.12 2.12 0 113 3L7 19l-4 1 1-4 12.5-12.5z" />,
  bell:     () => <Icon d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />,
  trash:    () => <Icon d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v6M14 11v6" />,
  settings: () => <Icon d="M12 3l1.8 2.3 2.8-.3.9 2.7 2.6 1.1-1 2.6 1 2.6-2.6 1.1-.9 2.7-2.8-.3L12 21l-1.8-2.3-2.8.3-.9-2.7-2.6-1.1 1-2.6-1-2.6 2.6-1.1.9-2.7 2.8.3L12 3zM12 9a3 3 0 100 6 3 3 0 000-6z" />,
  refresh:  () => <Icon d="M21 12a9 9 0 11-2.64-6.36M21 4v6h-6" />,
  lock:     () => <Icon d="M7 11V8a5 5 0 0110 0v3M5 11h14v10H5z" />,
  help:     () => <Icon d="M9.1 9a3 3 0 115.8 1c-.5 1.7-2.9 2.1-2.9 4M12 18h.01M12 22a10 10 0 110-20 10 10 0 010 20z" />,
};
const BrandMark = ({ size = 32, color = C.gold, opacity = 1 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 120 120"
    fill="none"
    aria-hidden="true"
    style={{ display: "block", opacity }}
  >
    {[
      [60, 6, 60, 24],
      [78, 10, 74, 26],
      [96, 18, 86, 32],
      [108, 32, 92, 44],
      [114, 50, 96, 54],
      [114, 70, 96, 66],
      [108, 88, 92, 76],
      [96, 102, 86, 88],
      [78, 110, 74, 94],
      [60, 114, 60, 96],
      [42, 110, 46, 94],
      [24, 102, 34, 88],
      [12, 88, 28, 76],
      [6, 70, 24, 66],
      [6, 50, 24, 54],
      [12, 32, 28, 44],
      [24, 18, 34, 32],
      [42, 10, 46, 26],
    ].map(([x1, y1, x2, y2], index) => (
      <line
        key={index}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    ))}
    <rect x="47" y="14" width="26" height="96" rx="3" fill={color} />
    <rect x="18" y="40" width="84" height="22" rx="3" fill={color} />
  </svg>
);

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
    .btn-gold,.btn-outline{background:linear-gradient(135deg,${C.gold},${C.goldDim});color:#0f1117;font-weight:600;border:none;border-radius:10px;padding:10px 20px;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:14px;display:inline-flex;align-items:center;gap:8px;box-shadow:0 10px 24px rgba(201,168,76,.18)}
    .btn-gold:hover,.btn-outline:hover{filter:brightness(1.08)}
    .btn-gold-compact{background:linear-gradient(135deg,${C.gold},${C.goldDim});color:#0f1117;font-weight:600;border:none;border-radius:10px;padding:6px 12px;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:12px;display:inline-flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 8px 20px rgba(201,168,76,.18)}
    .btn-gold-compact:hover{filter:brightness(1.08)}
    .card{background:${C.card};border:1px solid ${C.border};border-radius:14px}
    .tutorial-backdrop{position:fixed;inset:0;background:rgba(4,6,12,.74);backdrop-filter:blur(10px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:24px;overflow:auto}
    .tutorial-card{width:min(960px,100%);max-height:calc(100dvh - 48px);overflow:hidden;display:flex;flex-direction:column;background:radial-gradient(circle at top left,rgba(201,168,76,.18),transparent 32%),${C.card};border:1px solid ${C.goldDim};border-radius:24px;box-shadow:0 28px 80px rgba(0,0,0,.42)}
    .tutorial-body{min-height:0;overflow:auto}
    .tutorial-step-card{border:1px solid ${C.border};border-radius:16px;background:rgba(15,17,23,.42);padding:14px;text-align:left;cursor:pointer;transition:transform .16s ease,border-color .16s ease,background .16s ease}
    .tutorial-step-card:hover{transform:translateY(-2px);border-color:${C.goldDim};background:${C.goldGlow}}
    .tutorial-step-card.active{border-color:${C.gold};background:${C.goldGlow}}
    .input-field{background:${C.surface};border:1px solid ${C.border};border-radius:10px;padding:11px 14px;color:${C.text};font-size:14px;width:100%;max-width:100%;min-width:0;outline:none}
    input.input-field[type="date"],input.input-field[type="time"]{-webkit-appearance:none;appearance:none;display:block}
    .input-field:focus{border-color:${C.gold};box-shadow:0 0 0 3px ${C.goldGlow}}
    .input-field::placeholder{color:${C.muted}}
    .badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase}
    .tag-worship{background:rgba(155,114,232,.15);color:#b89af0;border:1px solid rgba(155,114,232,.3)}
    .tag-youth{background:rgba(82,200,122,.15);color:#52c87a;border:1px solid rgba(82,200,122,.3)}
    .tag-admin{background:rgba(91,143,232,.15);color:#5b8fe8;border:1px solid rgba(91,143,232,.3)}
    .tag-content-art{background:rgba(217,137,82,.15);color:#d98952;border:1px solid rgba(217,137,82,.3)}
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
    @media (max-width: 760px){
      .app-shell{flex-direction:column}
      .app-sidebar{width:100% !important;min-height:auto !important;border-right:none !important;border-bottom:1px solid ${C.border}}
      .app-sidebar-nav{display:flex;gap:8px;overflow-x:auto;padding:10px 12px !important;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain;touch-action:pan-x}
      .app-sidebar-nav .nav-item{margin-bottom:0;flex-shrink:0}
      .app-sidebar-footer{padding:10px 12px !important}
      .section-header{flex-direction:row;align-items:flex-start !important;justify-content:space-between;flex-wrap:wrap;gap:12px}
      .section-header > :first-child{flex:1;min-width:0}
      .section-header .btn-outline,.section-header .btn-gold{justify-content:center}
      .dashboard-note-row{flex-direction:column}
      .dashboard-note-row .btn-outline{margin-left:0 !important;width:100%;justify-content:center}
      .dashboard-followup-row{flex-wrap:wrap}
      .page-header{grid-template-columns:1fr !important}
      .calendar-page-header{grid-template-columns:minmax(0,1fr) auto !important;align-items:center !important;gap:10px !important}
      .page-actions{justify-content:flex-start !important}
      .calendar-page-header .page-actions{justify-content:flex-end !important}
      .calendar-add-button{padding:9px 11px !important;font-size:11px !important;white-space:nowrap}
      .calendar-add-button svg{width:14px;height:14px}
      .calendar-card-heading{flex-wrap:nowrap !important;align-items:center !important;gap:8px !important}
      .calendar-card-heading h3{font-size:25px !important;line-height:1.05 !important;min-width:0;letter-spacing:-.03em;white-space:nowrap}
      .calendar-jump-controls{gap:4px !important;flex-wrap:nowrap !important;flex-shrink:0}
      .calendar-jump-label{display:none !important}
      .calendar-jump-selects{width:148px !important;grid-template-columns:82px 62px !important;gap:4px !important}
      .calendar-jump-selects select{padding:7px 6px !important;font-size:11px !important;border-radius:10px !important}
      .mobile-stack{grid-template-columns:1fr !important}
      .mobile-three-stack{grid-template-columns:1fr !important}
      .mobile-two-stack{grid-template-columns:1fr !important}
      .frameworks-grid{grid-template-columns:1fr !important}
      .framework-card{width:100%;max-width:100%;min-width:0}
      .framework-card-title{font-size:26px !important;overflow-wrap:anywhere}
      .content-board-shell{padding:16px !important}
      .content-board-column{min-height:auto !important;width:100%;max-width:100%;min-width:0;overflow:hidden}
      .content-task-row{grid-template-columns:1fr !important}
      .content-task-meta{align-items:flex-start !important;text-align:left !important}
      .tutorial-backdrop{align-items:flex-start;padding:10px 10px 24px}
      .tutorial-card{max-height:none;min-height:auto;border-radius:18px}
      .tutorial-layout{grid-template-columns:1fr !important}
      .tutorial-step-detail{order:1;padding:18px !important}
      .tutorial-step-list{order:2;border-right:none !important;border-top:1px solid ${C.border};display:flex !important;overflow-x:auto;padding:12px !important;gap:10px !important}
      .tutorial-step-card{min-width:180px}
      .tutorial-actions{flex-direction:column;align-items:stretch !important}
      .tutorial-actions > div{justify-content:stretch !important}
      .tutorial-actions button{justify-content:center}
      .mobile-calendar-layout{grid-template-columns:1fr !important}
      .dashboard-team-row{grid-template-columns:1fr !important}
      .dashboard-team-row-right{text-align:left !important}
      .table-row{grid-template-columns:1fr !important}
      .table-row > *{text-align:left !important}
      .task-toolbar{flex-direction:column;align-items:stretch !important}
      .task-filter-group{overflow-x:auto;max-width:100%;padding-bottom:4px}
      .task-filter-group::-webkit-scrollbar{height:6px}
      .task-form-grid{grid-template-columns:1fr !important}
      .member-form-grid{grid-template-columns:1fr !important}
      .budget-form-grid{grid-template-columns:1fr !important}
      .calendar-embed{height:420px !important}
      .calendar-day-grid{gap:2px !important}
      .calendar-day-cell{min-height:52px !important;padding:6px !important}
      .events-board-header{flex-direction:column;gap:16px}
      .events-board-actions{width:100%;justify-content:flex-start !important}
      .event-request-row{grid-template-columns:1fr !important}
      .event-request-meta{align-items:flex-start !important;text-align:left !important}
      .request-details-grid{grid-template-columns:1fr !important}
      .mobile-pad{padding:24px 18px !important}
      .mobile-auth-glow{width:360px !important;height:360px !important;top:10% !important}
    }
  `}</style>
);

const normalizeAccessUser = (record) => ({
  ...record,
  ministries: Array.isArray(record?.ministries) ? record.ministries : [],
  staff_roles: Array.isArray(record?.staff_roles) ? record.staff_roles : (record?.role ? [record.role] : []),
  photo_url: record?.photo_url || "",
  canSeeTeamOverview: record?.can_see_team_overview ?? record?.canSeeTeamOverview ?? false,
  canSeeAdminOverview: record?.can_see_admin_overview ?? record?.canSeeAdminOverview ?? false,
  readOnlyOversight: record?.read_only_oversight ?? record?.readOnlyOversight ?? false,
  current_focus_task_id: record?.current_focus_task_id || record?.currentFocusTaskId || null,
  current_focus_updated_at: record?.current_focus_updated_at || record?.currentFocusUpdatedAt || null,
  walkthrough_prompt_count: Number.parseInt(record?.walkthrough_prompt_count || 0, 10) || 0,
  walkthrough_completed_at: record?.walkthrough_completed_at || null,
});
const normalizeTask = (task) => ({
  ...task,
  status: ["todo", "in-progress", "in-review", "done"].includes(task?.status) ? task.status : "todo",
  reviewers: Array.isArray(task?.reviewers) ? task.reviewers : [],
  review_approvals: Array.isArray(task?.review_approvals) ? task.review_approvals : [],
  review_required: task?.review_required ?? false,
  comments: Array.isArray(task?.comments) ? task.comments : [],
  review_history: Array.isArray(task?.review_history) ? task.review_history : [],
});
const normalizePurchaseOrder = (order) => ({
  ...order,
  status: ["pending", "in-review", "approved", "denied"].includes(order?.status) ? order.status : "pending",
  required_approvers: Array.isArray(order?.required_approvers) ? order.required_approvers : [],
  approvals: Array.isArray(order?.approvals) ? order.approvals : [],
  comments: Array.isArray(order?.comments) ? order.comments : [],
  approval_history: Array.isArray(order?.approval_history) ? order.approval_history : [],
});
const normalizeActivityLog = (entry) => ({
  ...entry,
  actor_name: entry?.actor_name || "Shepherd",
  action: entry?.action || "updated",
  entity_type: entry?.entity_type || "system",
  entity_title: entry?.entity_title || "",
  summary: entry?.summary || "",
  metadata: entry?.metadata && typeof entry.metadata === "object" ? entry.metadata : {},
  created_at: entry?.created_at || new Date().toISOString(),
});
const normalizeStaffAvailabilityRequest = (request) => ({
  ...request,
  status: ["pending_review", "submitted", "approved", "denied"].includes(request?.status) ? request.status : "submitted",
  required_approvers: Array.isArray(request?.required_approvers) ? request.required_approvers : [],
  approvals: Array.isArray(request?.approvals) ? request.approvals : [],
  approval_history: Array.isArray(request?.approval_history) ? request.approval_history : [],
  calendar_event_ids: Array.isArray(request?.calendar_event_ids) ? request.calendar_event_ids : [],
});
const normalizeChurchLockupAssignment = (assignment) => ({
  ...assignment,
  assignee_names: Array.isArray(assignment?.assignee_names) ? assignment.assignee_names : [],
});
const normalizeEventWorkflow = (workflow) => ({
  ...workflow,
  event_name: workflow?.event_name || workflow?.title || "",
  visibility: "shared",
  location: workflow?.location || "",
  main_contact: workflow?.main_contact || "",
  timeline_items: Array.isArray(workflow?.timeline_items) ? workflow.timeline_items : [],
  checklist_items: Array.isArray(workflow?.checklist_items) ? workflow.checklist_items : [],
  notes_entries: Array.isArray(workflow?.notes_entries) ? workflow.notes_entries : [],
  steps: Array.isArray(workflow?.steps) ? workflow.steps : [],
  ...getEventWorkflowMeta(workflow),
});
const normalizeBudgetItems = (items) => Array.isArray(items)
  ? items
      .map((item) => ({
        label: String(item?.label || "").trim(),
        amount: Number.parseFloat(item?.amount || 0) || 0,
      }))
      .filter((item) => item.label)
  : [];
const normalizeExternalUrl = (value) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};
const normalizeName = (value) => (value || "").trim().toLowerCase();
const tokenizeName = (value) => normalizeName(value).split(/\s+/).filter(Boolean);
const isPotentialDuplicateStaffName = (left, right) => {
  const leftTokens = tokenizeName(left);
  const rightTokens = tokenizeName(right);
  if (leftTokens.length === 0 || rightTokens.length === 0) return false;
  if (leftTokens.join(" ") === rightTokens.join(" ")) return true;
  if (leftTokens[0] !== rightTokens[0]) return false;
  if (leftTokens.length === 1 || rightTokens.length === 1) return true;
  return leftTokens.some((token) => rightTokens.includes(token)) && (leftTokens.length <= 2 || rightTokens.length <= 2);
};
const samePerson = (left, right) => normalizeName(left) !== "" && normalizeName(left) === normalizeName(right);
const listIncludesPerson = (list, fullName) => Array.isArray(list) && list.some((entry) => samePerson(entry, fullName));
const profileHasMinistry = (profile, ministry) => Array.isArray(profile?.ministries) && profile.ministries.some((entry) => samePerson(entry, ministry));

const roleLabel = (profile) => profile?.title || profile?.role || "Staff";
const isChurchAccountAdmin = (profile, church) =>
  !!profile?.id && (
    getChurchAccountManagerUserIds(church).includes(profile.id)
    || getChurchAccountManagerEmails(church).some((email) => samePerson(email, profile.email))
    || profile?.is_account_admin
  );
const isStaffAccountAdmin = (staffUser, church) =>
  !!staffUser && (
    !!staffUser?.is_account_admin
    || getChurchAccountManagerUserIds(church).includes(staffUser.auth_user_id)
    || getChurchAccountManagerEmails(church).some((email) => samePerson(email, staffUser.email))
  );
const hasChurchAdminRole = (profile) =>
  ["church_administrator", "admin", "senior_pastor"].includes(profile?.role)
  || samePerson(profile?.title, "Church Administrator")
  || samePerson(profile?.title, "Senior Pastor");
const isChurchAdministrator = (profile) =>
  profile?.role === "church_administrator"
  || (profile?.staff_roles || []).includes("church_administrator")
  || samePerson(profile?.title, "Church Administrator");
const canManageCalendarSettings = (profile) =>
  profile?.role === "church_administrator"
  || (profile?.staff_roles || []).includes("church_administrator")
  || samePerson(profile?.title, "Church Administrator");
const hasAdministrativeOversight = (profile, church) =>
  !!profile && (
    profile?.canSeeAdminOverview
    || profile?.can_see_admin_overview
    || hasChurchAdminRole(profile)
    || isChurchAccountAdmin(profile, church)
  );
const getChurchTeamAccessLabel = (user, church) => {
  if (isStaffAccountAdmin(user, church)) return "Shepherd Account Manager";
  if (user?.can_see_admin_overview || user?.canSeeAdminOverview) return "Administrative Oversight";
  return "Standard Access";
};
const shouldShowChurchTeam = (profile, church) =>
  canManageChurchTeam(profile, church)
  || canEditChurchTeam(profile, church)
  || (getChurchAccountManagerUserIds(church).length === 0 && getChurchAccountManagerEmails(church).length === 0);
const canManageChurchTeam = (profile, church) =>
  isChurchAccountAdmin(profile, church);
const canEditChurchTeam = (profile, church) => hasAdministrativeOversight(profile, church);
const canDeleteChurchAccount = (profile, church) => isChurchAccountAdmin(profile, church);
const canManageAllTasks = (profile, church) => hasAdministrativeOversight(profile, church);
const canEditTask = (profile, church, task) => canManageAllTasks(profile, church) || samePerson(task?.assignee, profile?.full_name);
const canViewActivityLog = (profile) => ACTIVITY_LOG_ALLOWED_USER_IDS.includes(profile?.id);
const getChurchDeletionApprovals = (church) => Array.isArray(church?.deletion_approvals) ? church.deletion_approvals : [];
const getChurchDeletionApprovalCount = (church) => getChurchDeletionApprovals(church).filter((approval) => approval?.reviewer_id && approval?.approved_at && approval.reviewer_id !== church?.deletion_requested_by).length;
const isChurchDeletionPending = (church) => !!church?.deletion_requested_at;
const getChurchDeletionHoldUntil = (church) => church?.deletion_hold_until || null;
const getChurchDeletionRequiredApprovalCount = (church) => Array.isArray(church?.deletion_reviewer_user_ids) ? church.deletion_reviewer_user_ids.length : 0;
const canReviewTask = (profile, task) => task?.review_required && task?.status === "in-review" && listIncludesPerson(task?.reviewers, profile?.full_name);
const getTaskReviewerDecision = (task, reviewer) => {
  if (!reviewer) return null;
  const history = Array.isArray(task?.review_history) ? [...task.review_history] : [];
  const match = history
    .sort((left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0))
    .find((entry) => samePerson(entry?.reviewer, reviewer));
  if (!match) return null;
  return {
    action: match.action === "denied" ? "denied" : match.action === "approved" ? "approved" : "pending",
    created_at: match.created_at || "",
  };
};
const canApproveTaskReview = (profile, task) =>
  canReviewTask(profile, task)
  && !listIncludesPerson(task?.review_approvals, profile?.full_name)
  && ["in-review"].includes(task?.status || "todo");
const isFinanceUser = (profile) => profileHasMinistry(profile, "Finances") || (profile?.staff_roles || []).includes("finance_director") || profile?.role === "finance_director";
const isFinanceDirector = (profile) => (profile?.staff_roles || []).includes("finance_director") || profile?.role === "finance_director";
const isSeniorPastor = (profile) => (profile?.staff_roles || []).includes("senior_pastor") || profile?.role === "senior_pastor";
const isMinistryLedgerLead = (profile) => (profile?.staff_roles || [profile?.role]).some((roleValue) => MINISTRY_LEDGER_ROLE_VALUES.has(roleValue));
const getBudgetScopeMinistries = (profile) => {
  if (!profile) return [];
  if (isFinanceUser(profile)) return TASK_CATEGORIES;
  const assignedMinistries = Array.isArray(profile?.ministries) ? [...new Set(profile.ministries.filter(Boolean))] : [];
  if (assignedMinistries.length > 0) return assignedMinistries;
  if (!isMinistryLedgerLead(profile)) return [];
  return assignedMinistries;
};
const canViewBudget = (profile) => isFinanceUser(profile) || getBudgetScopeMinistries(profile).length > 0;
const canApproveEventRequests = (profile) => isChurchAdministrator(profile);
const isTaskForUser = (task, fullName) => samePerson(task?.assignee, fullName) || listIncludesPerson(task?.reviewers, fullName);
const isContentTask = (task) => task?.ministry === "Content/Art";
const isEventApplicant = (profile, request) => {
  if (!profile || !request) return false;
  const profileEmail = normalizeName(profile.email);
  const requestEmail = normalizeName(request.email);
  if (profileEmail && requestEmail && profileEmail === requestEmail) return true;
  return samePerson(profile.full_name, request.contact_name);
};
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
  staff_roles: Array.isArray(staffUser.staff_roles) ? staffUser.staff_roles : (staffUser.role ? [staffUser.role] : []),
  ministries: staffUser.ministries || [],
  photo_url: staffUser.photo_url || "",
  can_see_team_overview: staffUser.can_see_team_overview ?? staffUser.canSeeTeamOverview ?? false,
  can_see_admin_overview: staffUser.can_see_admin_overview ?? staffUser.canSeeAdminOverview ?? false,
  read_only_oversight: staffUser.read_only_oversight ?? staffUser.readOnlyOversight ?? false,
  current_focus_task_id: null,
  current_focus_updated_at: null,
});
const claimStaffProfile = async (staffId, churchId) => {
  if (!staffId || !churchId) return;
  const { error } = await supabase.rpc("claim_staff_profile", {
    p_staff_id: staffId,
    p_church_id: churchId,
  });
  if (error) throw error;
};
const fetchChurchByCode = async (code) => {
  const { data, error } = await supabase.rpc("get_public_church_by_code", { p_code: code });
  if (error) throw error;
  if (!data?.id) throw new Error("That church code was not found.");
  return data;
};
const fetchChurchList = async () => {
  const { data, error } = await supabase.rpc("list_public_churches");
  if (error) throw error;
  return data || [];
};
const fetchChurchAccessById = async (churchId) => {
  if (!churchId) return { church: null, users: [] };
  const { data, error } = await supabase.rpc("get_public_church_access", { p_church_id: churchId });
  if (error) throw error;
  const church = data?.church || null;
  if (!church) throw new Error("That church could not be found.");
  return { church, users: (data?.users || []).map(normalizeAccessUser) };
};
const generateChurchCode = () => `${Math.floor(100000 + Math.random() * 900000)}`;
const getTimeOfDayGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};
const GOOGLE_CALENDAR_EMBED_URL = import.meta.env.VITE_GOOGLE_CALENDAR_EMBED_URL || "";
const getGoogleCalendarDirectUrl = (embedUrl) => {
  if (!embedUrl) return "";
  try {
    const parsed = new URL(embedUrl);
    const src = parsed.searchParams.get("src");
    const ctz = parsed.searchParams.get("ctz");
    if (src) {
      const direct = new URL("https://calendar.google.com/calendar/u/0/r");
      direct.searchParams.set("cid", src);
      if (ctz) direct.searchParams.set("ctz", ctz);
      return direct.toString();
    }
    return embedUrl;
  } catch {
    return embedUrl;
  }
};
const GOOGLE_CALENDAR_DIRECT_URL = getGoogleCalendarDirectUrl(GOOGLE_CALENDAR_EMBED_URL);
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
  lineHeight: 1.12,
};
const pageTitleStyle = {
  ...displayHeadingStyle,
  fontSize: 46,
  color: C.text,
};
const sectionTitleStyle = {
  ...displayHeadingStyle,
  fontSize: 30,
  color: C.text,
};
const widePageStyle = { padding: "32px 36px", width: "100%", maxWidth: "none", margin: 0 };
const STATUS_STYLES = {
  todo: { label: "Not Started", accent: C.gold, surface: "rgba(201,168,76,0.08)" },
  "in-progress": { label: "In Progress", accent: C.blue, surface: "rgba(91,143,232,0.08)" },
  "in-review": { label: "In Review", accent: C.purple, surface: "rgba(155,114,232,0.08)" },
  done: { label: "Done", accent: C.success, surface: "rgba(82,200,122,0.08)" },
};
const getNotificationStorageKey = (profileId) => `${NOTIFICATION_STORAGE_PREFIX}:${profileId}`;
const getArchivedNotificationStorageKey = (profileId) => `${ARCHIVED_NOTIFICATION_STORAGE_PREFIX}:${profileId}`;
const getTrashStorageKey = (churchId) => `${TRASH_STORAGE_PREFIX}:${churchId || "global"}`;
const getStaffNotepadStorageKey = (profileId) => `${STAFF_NOTEPAD_STORAGE_PREFIX}:${profileId || "anonymous"}`;
const getTaskColumnStateStorageKey = (profileId) => `${TASK_COLUMN_STATE_STORAGE_PREFIX}:${profileId || "anonymous"}`;
const getDashboardSectionStateStorageKey = (profileId) => `${DASHBOARD_SECTION_STATE_STORAGE_PREFIX}:${profileId || "anonymous"}`;
const getTaskDiscussionStateStorageKey = (profileId) => `${TASK_DISCUSSION_STATE_STORAGE_PREFIX}:${profileId || "anonymous"}`;
const getPurchaseOrderDiscussionStateStorageKey = (profileId) => `${PURCHASE_ORDER_DISCUSSION_STATE_STORAGE_PREFIX}:${profileId || "anonymous"}`;
const getCurrentWorkFocusStorageKey = (profileId) => `${CURRENT_WORK_FOCUS_STORAGE_PREFIX}:${profileId || "anonymous"}`;
const getFormDraftStorageKey = (profileId, draftName) => `${FORM_DRAFT_STORAGE_PREFIX}:${profileId || "anonymous"}:${draftName}`;
const readStoredFormDraft = (storageKey, fallback) => {
  if (typeof window === "undefined" || !storageKey) return fallback;
  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
};
const writeStoredFormDraft = (storageKey, value) => {
  if (typeof window === "undefined" || !storageKey) return;
  window.localStorage.setItem(storageKey, JSON.stringify(value));
};
const clearStoredFormDraft = (storageKey) => {
  if (typeof window === "undefined" || !storageKey) return;
  window.localStorage.removeItem(storageKey);
};
const hasMeaningfulDraftValue = (value) => {
  if (Array.isArray(value)) return value.some(hasMeaningfulDraftValue);
  if (value && typeof value === "object") return Object.values(value).some(hasMeaningfulDraftValue);
  if (typeof value === "boolean") return value;
  return String(value ?? "").trim().length > 0;
};
const hasMeaningfulFormDraft = (value, ignoredKeys = []) => Object.entries(value || {})
  .filter(([key]) => !ignoredKeys.includes(key))
  .some(([, entry]) => hasMeaningfulDraftValue(entry));
const PAGE_PATHS = {
  dashboard: "/dashboard",
  workspaces: "/frameworks",
  tasks: "/tasks",
  calendar: "/calendar",
  "church-team": "/church-team",
  budget: "/finances",
  faq: "/faq",
  trash: "/trash",
  account: "/account",
  "events-board": "/events",
  "content-media-board": "/content-media",
  "operations-board": "/operations",
  ministries: "/ministries",
};
const PATH_PAGES = Object.entries(PAGE_PATHS).reduce((accumulator, [page, path]) => {
  accumulator[path] = page;
  return accumulator;
}, {});
const getPageFromPath = () => {
  if (typeof window === "undefined") return "";
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  return PATH_PAGES[path] || "";
};
const getStoredActivePage = () => {
  if (typeof window === "undefined") return "dashboard";
  return getPageFromPath() || window.localStorage.getItem(ACTIVE_PAGE_STORAGE_KEY) || "dashboard";
};
const STAFF_ROLE_OPTIONS = [
  { value: "senior_pastor", label: "Senior Pastor", title: "Senior Pastor", ministries: ["Services", "Operations"], canSeeTeamOverview: true, canSeeAdminOverview: true },
  { value: "youth_pastor", label: "Youth Pastor", title: "Youth Pastor", ministries: ["Youth"], canSeeTeamOverview: true, canSeeAdminOverview: false },
  { value: "kids_pastor", label: "Kids Pastor", title: "Kids Pastor", ministries: ["Kids"], canSeeTeamOverview: true, canSeeAdminOverview: false },
  { value: "young_adults_pastor", label: "Young Adults Pastor", title: "Young Adults Pastor", ministries: ["Young Adults"], canSeeTeamOverview: true, canSeeAdminOverview: false },
  { value: "worship_pastor", label: "Worship Pastor", title: "Worship Pastor", ministries: ["Worship", "Services"], canSeeTeamOverview: true, canSeeAdminOverview: false },
  { value: "art_director", label: "Art Director", title: "Art Director", ministries: ["Content/Art"], canSeeTeamOverview: true, canSeeAdminOverview: false },
  { value: "website_app_director", label: "Website/App", title: "Website/App", ministries: ["Content/Art", "Operations"], canSeeTeamOverview: true, canSeeAdminOverview: false },
  { value: "church_administrator", label: "Church Administrator", title: "Church Administrator", ministries: ["Admin", "Operations"], canSeeTeamOverview: true, canSeeAdminOverview: true },
  { value: "finance_director", label: "Finance Director", title: "Finance Director", ministries: ["Finances"], canSeeTeamOverview: true, canSeeAdminOverview: false },
  { value: "intern", label: "Intern", title: "Intern", ministries: [], canSeeTeamOverview: true, canSeeAdminOverview: false },
];
const MINISTRY_LEDGER_ROLE_VALUES = new Set([
  "youth_pastor",
  "kids_pastor",
  "young_adults_pastor",
  "worship_pastor",
  "art_director",
  "website_app_director",
]);
const STAFF_ROLE_VALUES = new Set(STAFF_ROLE_OPTIONS.map((option) => option.value));
const getRoleTemplate = (roleValue) => STAFF_ROLE_OPTIONS.find((option) => option.value === roleValue) || null;
const getRoleLabel = (roleValue) => getRoleTemplate(roleValue)?.label || null;
const normalizeSelectedRoles = (roleValues) => {
  const validRoles = [...new Set((roleValues || []).filter((roleValue) => STAFF_ROLE_VALUES.has(roleValue)))];
  return validRoles.length > 0 ? validRoles : ["youth_pastor"];
};
const formatRoleTitles = (roleValues) => {
  const labels = [...new Set(normalizeSelectedRoles(roleValues).map(getRoleLabel).filter(Boolean))];
  if (labels.length === 0) return "Staff";
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} & ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")} & ${labels.at(-1)}`;
};
const buildRoleBundle = (roleValues) => {
  const selectedRoles = normalizeSelectedRoles(roleValues);
  const templates = selectedRoles.map(getRoleTemplate).filter(Boolean);
  return {
    selectedRoles,
    primaryRole: selectedRoles[0] || "youth_pastor",
    title: formatRoleTitles(selectedRoles),
    ministries: [...new Set(templates.flatMap((template) => template.ministries || []))],
    canSeeTeamOverview: templates.some((template) => template.canSeeTeamOverview),
    canSeeAdminOverview: templates.some((template) => template.canSeeAdminOverview),
  };
};
const createEventRequestBlank = (profile = null) => ({
  event_name: "",
  event_format: "single",
  event_timing: "",
  single_date: "",
  single_start_time: "",
  single_end_time: "",
  multi_start_date: "",
  multi_end_date: "",
  multi_start_time: "",
  multi_end_time: "",
  recurring_start_date: "",
  recurring_start_time: "",
  recurring_end_time: "",
  recurring_frequency: "",
  setup_datetime: "",
  description: "",
  contact_name: profile?.full_name || "",
  phone: "",
  email: profile?.email || "",
  location_scope: "",
  location_areas: [],
  graphics_reference: "",
  av_request: false,
  av_request_details: "",
  tables_needed: "",
  tables_6ft_rectangular: "0",
  tables_8ft_rectangular: "0",
  tables_5ft_round: "0",
  black_vinyl_tablecloths: "",
  white_linen_tablecloths: "",
  white_linen_agreement: false,
  pipe_and_drape: "",
  metal_folding_chairs_requested: false,
  metal_folding_chairs: "",
  sanctuary_chairs: "",
  kitchen_use: false,
  drip_coffee_only: false,
  espresso_drinks: false,
  additional_information: "",
  submitted_on: new Date().toISOString().split("T")[0],
  signature: profile?.full_name || "",
});
const eventRequestToForm = (request = {}) => ({
  ...createEventRequestBlank(),
  ...Object.fromEntries(Object.keys(createEventRequestBlank()).map((key) => [key, request?.[key] ?? createEventRequestBlank()[key]])),
  location_areas: Array.isArray(request?.location_areas) ? request.location_areas : [],
  av_request: !!request?.av_request,
  white_linen_agreement: !!request?.white_linen_agreement,
  metal_folding_chairs_requested: !!request?.metal_folding_chairs_requested,
  kitchen_use: !!request?.kitchen_use,
  drip_coffee_only: !!request?.drip_coffee_only,
  espresso_drinks: !!request?.espresso_drinks,
  tables_6ft_rectangular: String(request?.tables_6ft_rectangular ?? "0"),
  tables_8ft_rectangular: String(request?.tables_8ft_rectangular ?? "0"),
  tables_5ft_round: String(request?.tables_5ft_round ?? "0"),
  metal_folding_chairs: request?.metal_folding_chairs ? String(request.metal_folding_chairs) : "",
});
const createPublicAccessToken = () => {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
};
const buildEventTimingSummary = (form) => {
  if (form.event_format === "single") {
    if (!form.single_date || !form.single_start_time || !form.single_end_time) return "";
    return `${form.single_date} • ${form.single_start_time} - ${form.single_end_time}`;
  }
  if (form.event_format === "multi") {
    if (!form.multi_start_date || !form.multi_end_date || !form.multi_start_time || !form.multi_end_time) return "";
    return `${form.multi_start_date} to ${form.multi_end_date} • ${form.multi_start_time} - ${form.multi_end_time}`;
  }
  if (form.event_format === "recurring") {
    if (!form.recurring_start_date || !form.recurring_start_time || !form.recurring_end_time || !form.recurring_frequency) return "";
    return `${form.recurring_start_date} • ${form.recurring_start_time} - ${form.recurring_end_time} • ${form.recurring_frequency}`;
  }
  return "";
};
const buildTablesSummary = (form) => {
  const selections = [
    { label: "6ft rectangular", value: parseInt(form.tables_6ft_rectangular || "0", 10) || 0 },
    { label: "8ft rectangular", value: parseInt(form.tables_8ft_rectangular || "0", 10) || 0 },
    { label: "5ft round", value: parseInt(form.tables_5ft_round || "0", 10) || 0 },
  ].filter((entry) => entry.value > 0);

  if (selections.length === 0) return "";
  return selections.map((entry) => `${entry.value} ${entry.label}`).join(", ");
};
const getEventLocationSummary = (request) => {
  if (request.location_scope === "building") {
    if (Array.isArray(request.location_areas) && request.location_areas.length > 0) {
      return `Building use requested: ${request.location_areas.join(", ")}`;
    }
    return "Building use requested";
  }
  if (request.location_scope === "off-campus") {
    return "Off-campus event: announcement and graphics support only";
  }
  return request.location_scope || "Location not specified";
};
const getEventDateSummary = (request) => {
  if (request.event_format === "single") {
    return request.single_date ? `${fmtShortDate(request.single_date)}${request.single_start_time && request.single_end_time ? ` • ${request.single_start_time} - ${request.single_end_time}` : ""}` : (request.event_timing || "—");
  }
  if (request.event_format === "multi") {
    return request.multi_start_date && request.multi_end_date
      ? `${fmtShortDate(request.multi_start_date)} - ${fmtShortDate(request.multi_end_date)}${request.multi_start_time && request.multi_end_time ? ` • ${request.multi_start_time} - ${request.multi_end_time}` : ""}`
      : (request.event_timing || "—");
  }
  if (request.event_format === "recurring") {
    return request.recurring_start_date
      ? `${fmtShortDate(request.recurring_start_date)}${request.recurring_start_time && request.recurring_end_time ? ` • ${request.recurring_start_time} - ${request.recurring_end_time}` : ""}${request.recurring_frequency ? ` • ${request.recurring_frequency}` : ""}`
      : (request.event_timing || "—");
  }
  return request.event_timing || "—";
};
const getEventPrimaryDate = (request) =>
  request?.setup_datetime
  || request?.single_date
  || request?.multi_start_date
  || request?.recurring_start_date
  || null;
const getEventStartDate = (request) =>
  request?.single_date
  || request?.multi_start_date
  || request?.recurring_start_date
  || request?.setup_datetime
  || null;
const getEventEndDate = (request) =>
  request?.multi_end_date
  || request?.single_date
  || request?.recurring_start_date
  || getEventStartDate(request);
const getEventStartTime = (request) =>
  request?.single_start_time
  || request?.multi_start_time
  || request?.recurring_start_time
  || "";
const getEventEndTime = (request) =>
  request?.single_end_time
  || request?.multi_end_time
  || request?.recurring_end_time
  || "";
const hasEventOpsNeeds = (request) =>
  request?.location_scope === "building"
  || Array.isArray(request?.location_areas) && request.location_areas.length > 0
  || !!request?.tables_needed
  || Number.parseInt(request?.tables_6ft_rectangular || "0", 10) > 0
  || Number.parseInt(request?.tables_8ft_rectangular || "0", 10) > 0
  || Number.parseInt(request?.tables_5ft_round || "0", 10) > 0
  || !!request?.black_vinyl_tablecloths
  || !!request?.white_linen_tablecloths
  || !!request?.pipe_and_drape
  || !!request?.metal_folding_chairs_requested
  || !!request?.kitchen_use
  || !!request?.drip_coffee_only
  || !!request?.espresso_drinks;
const eventNeedsFinanceReview = (request) => /fee|fees|payment|payments|paid|ticket|tickets|registration|cost|budget|reimburse/i.test(String(request?.additional_information || ""));
const findStaffLead = (staff, matcher) => (staff || []).find((user) => matcher(user))?.full_name || "";
const findStaffByEventRequester = (staff, request) => {
  const email = normalizeName(request?.email);
  if (email) {
    const emailMatch = (staff || []).find((user) => normalizeName(user?.email) === email);
    if (emailMatch) return emailMatch;
  }
  return (staff || []).find((user) => samePerson(user?.full_name, request?.contact_name) || samePerson(user?.full_name, request?.requested_by)) || null;
};
const createDefaultEventChecklist = () => ([]);
const getEventWorkflowMeta = (workflow) => {
  const metaEntry = Array.isArray(workflow?.steps)
    ? workflow.steps.find((entry) => entry?.type === "event_meta")
    : null;
  return {
    start_time: metaEntry?.start_time || "",
    end_time: metaEntry?.end_time || "",
  };
};
const createEventPlanningBlank = (profile, request = null) => ({
  id: null,
  eventName: request?.event_name || "",
  startDate: getEventStartDate(request) || "",
  endDate: getEventEndDate(request) || "",
  startTime: getEventStartTime(request),
  endTime: getEventEndTime(request),
  location: request ? getEventLocationSummary(request) : "",
  mainContact: request?.contact_name || profile?.full_name || "",
  linkedRequestId: request?.id || "",
});
const buildEventWorkflowFromRequest = (request, churchId, ownerName) => {
  const startDate = getEventStartDate(request);
  const endDate = getEventEndDate(request);
  const timelineItems = [
    {
      id: crypto.randomUUID(),
      title: "Confirm event details",
      date: startDate,
      details: `Review the approved request details, confirm the event scope, and clarify anything still missing with ${request.contact_name || "the requester"}.`,
      done: false,
      linked_task_id: null,
      linked_task_assignee: null,
      linked_task_review_required: false,
      linked_task_reviewers: [],
    },
  ];

  if (request.graphics_reference || request.location_scope === "off-campus") {
    timelineItems.push({
      id: crypto.randomUUID(),
      title: "Coordinate graphics and announcements",
      date: startDate,
      details: `Graphics direction from request:\n${request.graphics_reference || "Announcement and graphics support requested."}`,
      done: false,
      linked_task_id: null,
      linked_task_assignee: null,
      linked_task_review_required: false,
      linked_task_reviewers: [],
    });
  }

  if (request.av_request) {
    timelineItems.push({
      id: crypto.randomUUID(),
      title: "Review A/V needs",
      date: startDate,
      details: request.av_request_details || "A/V support was requested. Confirm sound, slides, and tech needs before the event.",
      done: false,
      linked_task_id: null,
      linked_task_assignee: null,
      linked_task_review_required: false,
      linked_task_reviewers: [],
    });
  }

  if (hasEventOpsNeeds(request)) {
    timelineItems.push({
      id: crypto.randomUUID(),
      title: "Confirm room setup and facilities",
      date: request.setup_datetime || startDate,
      details: `Location: ${getEventLocationSummary(request)}\nTables: ${buildTablesSummary(request) || "None requested"}\nKitchen: ${request.kitchen_use ? "Yes" : "No"}\nCoffee: ${request.espresso_drinks ? "Espresso drinks" : request.drip_coffee_only ? "Drip coffee only" : "None"}`,
      done: false,
      linked_task_id: null,
      linked_task_assignee: null,
      linked_task_review_required: false,
      linked_task_reviewers: [],
    });
  }

  return {
    church_id: churchId,
    linked_event_request_id: request.id,
    title: request.event_name || "Approved Event",
    event_name: request.event_name || "Approved Event",
    owner_name: ownerName || request.contact_name || "Staff Member",
    visibility: "shared",
    summary: `Created automatically from approved event request submitted by ${request.contact_name || request.requested_by || "the requester"}.`,
    target_date: startDate,
    start_date: startDate,
    end_date: endDate,
    location: getEventLocationSummary(request),
    main_contact: request.contact_name || request.requested_by || "",
    timeline_items: timelineItems,
    checklist_items: createDefaultEventChecklist(),
    notes_entries: [
      {
        id: crypto.randomUUID(),
        author: "Shepherd",
        body: `Approved event request imported into Event Planning.\n\nEvent timing: ${request.event_timing || "Not provided"}\nContact: ${request.contact_name || "Not provided"}${request.phone ? `\nPhone: ${request.phone}` : ""}${request.email ? `\nEmail: ${request.email}` : ""}\n\nDescription:\n${request.description || "No description provided."}${request.additional_information ? `\n\nAdditional information:\n${request.additional_information}` : ""}`,
        created_at: new Date().toISOString(),
      },
    ],
    steps: [
      {
        type: "event_meta",
        start_time: getEventStartTime(request),
        end_time: getEventEndTime(request),
      },
    ],
  };
};
const getEventWorkflowPrimaryDate = (workflow) => workflow?.start_date || workflow?.target_date || workflow?.end_date || "";
const getEventCountdownLabel = (workflow) => {
  const primaryDate = getEventWorkflowPrimaryDate(workflow);
  if (!primaryDate) return "Date not set";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDate = new Date(primaryDate);
  eventDate.setHours(0, 0, 0, 0);
  const diffDays = Math.round((eventDate - today) / (1000 * 60 * 60 * 24));
  if (Number.isNaN(diffDays)) return "Date not set";
  if (diffDays > 1) return `${diffDays} days away`;
  if (diffDays === 1) return "1 day away";
  if (diffDays === 0) return "Today";
  if (diffDays === -1) return "Happened yesterday";
  return `${Math.abs(diffDays)} days ago`;
};
const getEventTimelineSummary = (workflow) => {
  const items = Array.isArray(workflow?.timeline_items) ? workflow.timeline_items : [];
  const openItems = items.filter((item) => !item.done);
  if (openItems.length === 0) return "Timeline is clear";
  const nextItem = [...openItems]
    .sort((left, right) => new Date(left.date || 0) - new Date(right.date || 0))[0];
  if (!nextItem?.date) return `${openItems.length} timeline items remaining`;
  return `Next: ${nextItem.title} on ${fmtShortDate(nextItem.date)}`;
};
const buildApprovedEventTaskChain = (request, churchId, staff) => {
  if (!request || !churchId) return [];
  const dueDate = getEventPrimaryDate(request);
  const adminLead =
    findStaffLead(staff, (user) => user?.can_see_admin_overview || /administrator|senior pastor/i.test(user?.title || ""))
    || "Church Administration";
  const creativeLead =
    findStaffLead(staff, (user) => profileHasMinistry(user, "Content/Art") || /creative|art|design|website\/app/i.test(user?.title || ""))
    || "Creative Team";
  const avLead =
    findStaffLead(staff, (user) => profileHasMinistry(user, "Worship") || profileHasMinistry(user, "Services") || /worship|av|audio|visual/i.test(user?.title || ""))
    || "Worship / AV";
  const operationsLead =
    findStaffLead(staff, (user) => profileHasMinistry(user, "Operations") || profileHasMinistry(user, "Admin") || /administrator|operations/i.test(user?.title || ""))
    || adminLead;
  const financeLead =
    findStaffLead(staff, (user) => profileHasMinistry(user, "Finances") || /finance/i.test(user?.title || ""))
    || adminLead;

  const tasks = [
    {
      church_id: churchId,
      title: `Coordinate ${request.event_name}`,
      ministry: "Events",
      assignee: adminLead,
      due_date: dueDate,
      status: "todo",
      review_required: false,
      reviewers: [],
      review_approvals: [],
      notes: `Approved event request.\n\nEvent: ${request.event_name}\nContact: ${request.contact_name}\nEvent date: ${request.event_timing}\nLocation: ${getEventLocationSummary(request)}\nAdditional notes: ${request.additional_information || "None provided."}`,
    },
  ];

  if (request.graphics_reference || request.location_scope === "off-campus") {
    tasks.push({
      church_id: churchId,
      title: `Create communications for ${request.event_name}`,
      ministry: "Content/Art",
      assignee: creativeLead,
      due_date: dueDate,
      status: "todo",
      review_required: false,
      reviewers: [],
      review_approvals: [],
      notes: `Communications handoff from approved event.\n\nEvent: ${request.event_name}\nSubmitted by: ${request.contact_name}\nEvent date: ${request.event_timing}\nGraphics direction: ${request.graphics_reference || "Announcement support requested."}`,
    });
  }

  if (request.av_request) {
    tasks.push({
      church_id: churchId,
      title: `Review A/V needs for ${request.event_name}`,
      ministry: "Services",
      assignee: avLead,
      due_date: dueDate,
      status: "todo",
      review_required: false,
      reviewers: [],
      review_approvals: [],
      notes: `A/V support requested for approved event.\n\nEvent: ${request.event_name}\nEvent date: ${request.event_timing}\nA/V details: ${request.av_request_details || "No additional A/V details were provided."}`,
    });
  }

  if (hasEventOpsNeeds(request)) {
    tasks.push({
      church_id: churchId,
      title: `Prepare facilities for ${request.event_name}`,
      ministry: "Operations",
      assignee: operationsLead,
      due_date: dueDate,
      status: "todo",
      review_required: false,
      reviewers: [],
      review_approvals: [],
      notes: `Operations support requested for approved event.\n\nLocation: ${getEventLocationSummary(request)}\nTables: ${buildTablesSummary(request) || "None requested"}\nKitchen: ${request.kitchen_use ? "Yes" : "No"}\nCoffee: ${request.espresso_drinks ? "Espresso drinks" : request.drip_coffee_only ? "Drip coffee only" : "None"}\nPipe and drape: ${request.pipe_and_drape || "None requested"}\nMetal folding chairs: ${request.metal_folding_chairs_requested ? request.metal_folding_chairs || "Requested" : "No"}`,
    });
  }

  if (eventNeedsFinanceReview(request)) {
    tasks.push({
      church_id: churchId,
      title: `Review finances for ${request.event_name}`,
      ministry: "Finances",
      assignee: financeLead,
      due_date: dueDate,
      status: "todo",
      review_required: false,
      reviewers: [],
      review_approvals: [],
      notes: `Finance review requested from approved event.\n\nEvent: ${request.event_name}\nAdditional details: ${request.additional_information || "No extra finance details were provided."}`,
    });
  }

  return tasks;
};
const getRelativeDueLabel = (date) => {
  if (!date) return "No due date";
  const today = new Date();
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const due = parseAppDate(date);
  if (!due) return "No due date";
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diff = Math.round((dueDay - base) / 86400000);
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  if (diff < 0) return `Overdue since ${fmtDate(date)}`;
  return `Due ${fmtDate(date)}`;
};
const isAfterDueDate = (date, reference = new Date()) => {
  if (!date) return false;
  const due = parseAppDate(date);
  if (!due) return false;
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const referenceDay = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  return referenceDay.getTime() > dueDay.getTime();
};
const buildEventPlanTaskNotes = (workflow, details, nodeId) => [
  `Linked from event plan: ${workflow?.event_name || workflow?.title || "Event Plan"}`,
  nodeId ? `Event plan node ID: ${nodeId}` : null,
  details?.trim() || null,
].filter(Boolean).join("\n\n");
const getLinkedEventPlanName = (task) => {
  const match = String(task?.notes || "").match(/^Linked from event plan:\s*(.+?)(?:\n|$)/);
  return match?.[1]?.trim() || "";
};
const findLinkedEventPlanTask = (tasks, nodeId) =>
  (tasks || []).find((task) => typeof task?.notes === "string" && task.notes.includes(`Event plan node ID: ${nodeId}`)) || null;
const commentMentionsProfile = (comment, profile) => {
  if (!comment?.body || !profile?.full_name) return false;
  const body = String(comment.body || "");
  const token = getStaffMentionToken(profile.full_name);
  return [token].filter(Boolean).some((name) => {
    const escaped = escapeRegExp(name);
    return new RegExp(`@${escaped}(?=$|[^a-zA-Z])`, "i").test(body);
  });
};
const canManageComment = (comment, profile) => samePerson(comment?.author, profile?.full_name);
const getStaffMentionToken = (name) => String(name || "").replace(/\s+/g, "").trim();
const getMentionContext = (value, cursor) => {
  const beforeCursor = value.slice(0, cursor);
  const match = beforeCursor.match(/(?:^|\s)@([a-zA-Z][a-zA-Z]*)$/);
  if (!match) return null;
  const query = match[1];
  const tokenStart = cursor - query.length - 1;
  return {
    query,
    start: tokenStart,
    end: cursor,
  };
};
const escapeRegExp = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const getMentionCandidates = (names = []) => {
  const seen = new Set();
  return names
    .map((name) => getStaffMentionToken(name))
    .filter(Boolean)
    .filter((name) => {
      const key = name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.length - a.length);
};
const renderCommentBody = (body, mentionableNames = []) => {
  const text = String(body || "");
  const mentionCandidates = getMentionCandidates(mentionableNames);
  if (mentionCandidates.length === 0) return text;

  const pattern = new RegExp(`@(?:${mentionCandidates.map(escapeRegExp).join("|")})(?=$|[^a-zA-Z])`, "gi");
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={`text-${lastIndex}`}>{text.slice(lastIndex, match.index)}</span>);
    }
    parts.push(
      <span
        key={`mention-${match.index}`}
        style={{
          color: C.gold,
          fontWeight: 600,
          background: C.goldGlow,
          borderRadius: 6,
          padding: "1px 5px",
          display: "inline-block",
          margin: "0 1px",
        }}
      >
        {match[0].trim()}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(<span key={`text-${lastIndex}`}>{text.slice(lastIndex)}</span>);
  }

  return parts;
};
const canReviewPurchaseOrders = (profile) => isFinanceDirector(profile) || isSeniorPastor(profile);
const getPurchaseOrderReviewerDecision = (order, reviewer) => {
  if (!reviewer) return null;
  const history = Array.isArray(order?.approval_history) ? [...order.approval_history] : [];
  const match = history
    .sort((left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0))
    .find((entry) => samePerson(entry?.reviewer, reviewer));
  if (!match) return null;
  return {
    action: match.action === "denied" ? "denied" : match.action === "approved" ? "approved" : "pending",
    note: match.note || "",
    created_at: match.created_at || "",
  };
};
const canApprovePurchaseOrder = (profile, order) =>
  listIncludesPerson(order?.required_approvers, profile?.full_name)
  && !getPurchaseOrderReviewerDecision(order, profile?.full_name)
  && ["pending", "in-review"].includes(order?.status || "pending");
const getAvailabilityReviewerDecision = (request, reviewer) => {
  if (!reviewer) return null;
  const history = Array.isArray(request?.approval_history) ? [...request.approval_history] : [];
  const match = history
    .sort((left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0))
    .find((entry) => samePerson(entry?.reviewer, reviewer));
  if (!match) return null;
  return {
    action: match.action === "denied" ? "denied" : match.action === "approved" ? "approved" : "pending",
    created_at: match.created_at || "",
  };
};
const canApproveAvailabilityRequest = (profile, request) =>
  request?.request_type === "PTO Request"
  && listIncludesPerson(request?.required_approvers, profile?.full_name)
  && !getAvailabilityReviewerDecision(request, profile?.full_name)
  && request?.status === "pending_review";
const canDeletePurchaseOrder = (profile, order) =>
  !!order && (
    (order.requester_id === profile?.id && ["pending", "in-review"].includes(order.status || "pending"))
    || canReviewPurchaseOrders(profile)
  );
const getNotificationTone = (type) => {
  if (String(type || "").includes("approved")) return C.success;
  if (String(type || "").includes("denied") || String(type || "").includes("overdue")) return C.danger;
  if (String(type || "").includes("comment") || String(type || "").includes("assigned") || String(type || "").includes("mention")) return C.blue;
  return C.gold;
};
const normalizePersistentNotification = (notification) => ({
  id: notification?.source_key
    ? `${notification.type}-${notification.source_key}`
    : notification?.type === "task_assigned" && notification?.task_id
      ? `assigned-${notification.task_id}`
      : notification?.id,
  rowId: notification?.id,
  persistent: true,
  tone: getNotificationTone(notification?.type),
  title: notification?.title || "Shepherd notification",
  detail: notification?.detail || "",
  target: notification?.target || "dashboard",
  taskId: notification?.task_id || notification?.data?.taskId || null,
  createdAt: notification?.created_at ? new Date(notification.created_at).getTime() : Date.now(),
  readAt: notification?.read_at || null,
  archivedAt: notification?.archived_at || null,
});
const getStaffProfileId = (user) => user?.auth_user_id || user?.profile_id || null;
const findStaffByName = (users, name) => (users || []).find((user) => samePerson(user?.full_name, name));
const getMentionedStaffNames = (body, users = []) => {
  const text = String(body || "");
  return [...new Set((users || [])
    .filter((user) => {
      const token = getStaffMentionToken(user?.full_name);
      if (!token) return false;
      return new RegExp(`@${escapeRegExp(token)}(?=$|[^a-zA-Z])`, "i").test(text);
    })
    .map((user) => user.full_name)
    .filter(Boolean))];
};
const createPersistentNotification = async ({
  churchId,
  actorProfile,
  recipientProfileId,
  type,
  title,
  detail,
  target = "dashboard",
  taskId = null,
  sourceKey = "",
  data = {},
  sendEmail = true,
}) => {
  if (!churchId || !actorProfile?.id || !recipientProfileId || !type || !title || !detail) return null;
  if (recipientProfileId === actorProfile.id && !["task_due_soon", "task_overdue", "team_task_due_soon", "team_task_overdue"].includes(type)) return null;
  const payload = {
    church_id: churchId,
    recipient_profile_id: recipientProfileId,
    actor_profile_id: actorProfile.id,
    type,
    title,
    detail,
    target,
    task_id: taskId,
    source_key: sourceKey || null,
    data,
    read_at: null,
    archived_at: null,
  };
  const query = sourceKey
    ? supabase.from("notifications").upsert(payload, { onConflict: "recipient_profile_id,type,source_key", ignoreDuplicates: true })
    : supabase.from("notifications").insert(payload);
  const { data: saved, error } = await query.select().maybeSingle();
  if (error) return null;
  if (sendEmail && saved?.id) {
    supabase.functions.invoke("send-notification-email", {
      body: { notificationId: saved.id },
    }).then(() => {});
  }
  return saved || null;
};
const createNotificationsForNames = async ({ users, names, actorProfile, churchId, ...notification }) => {
  const recipients = [...new Map((names || [])
    .map((name) => findStaffByName(users, name))
    .filter((user) => getStaffProfileId(user))
    .map((user) => [getStaffProfileId(user), user])).values()];
  await Promise.all(recipients.map((user) => createPersistentNotification({
    ...notification,
    churchId,
    actorProfile,
    recipientProfileId: getStaffProfileId(user),
  })));
};
const createActivityLog = async ({
  churchId,
  actorProfile,
  action,
  entityType,
  entityId = "",
  entityTitle = "",
  summary,
  metadata = {},
}) => {
  if (!churchId || churchId === "preview" || !actorProfile?.id || !action || !entityType || !summary) return null;
  const payload = {
    church_id: churchId,
    actor_profile_id: actorProfile.id,
    actor_name: actorProfile.full_name || actorProfile.email || "Staff",
    action,
    entity_type: entityType,
    entity_id: entityId ? String(entityId) : null,
    entity_title: entityTitle || null,
    summary,
    metadata,
  };
  const { data, error } = await supabase.from("activity_logs").insert(payload).select().maybeSingle();
  if (error) return null;
  return data ? normalizeActivityLog(data) : null;
};
const dedupeNotifications = (items) => {
  const seen = new Set();
  return (items || [])
    .filter((item) => {
      if (!item?.id || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
};
const buildNotifications = (tasks, eventRequests, purchaseOrders, staffAvailabilityRequests, profile) => {
  if (!profile?.full_name) return [];
  const fullName = profile.full_name;
  const isAdminViewer = hasAdministrativeOversight(profile, null);
  const seniorPastorViewer =
    profile?.role === "senior_pastor"
    || (profile?.staff_roles || []).includes("senior_pastor")
    || samePerson(profile?.title, "Senior Pastor");
  const financeDirectorViewer = isFinanceDirector(profile);
  const purchaseOrderReviewer = canReviewPurchaseOrders(profile);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfTomorrow = new Date(startOfToday);
  endOfTomorrow.setDate(endOfTomorrow.getDate() + 2);

  const items = [];

  tasks.forEach((task) => {
    const assignedToMe = samePerson(task.assignee, fullName);
    const reviewerForMe = listIncludesPerson(task.reviewers, fullName) && !listIncludesPerson(task.review_approvals, fullName);
    const createdAt = task.created_at ? new Date(task.created_at) : null;
    const dueDate = parseAppDate(task.due_date);
    const dueDay = dueDate ? new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()) : null;

    if (assignedToMe && task.status !== "done" && createdAt && now.getTime() - createdAt.getTime() < 3 * 86400000) {
      items.push({
        id: `assigned-${task.id}`,
        tone: C.blue,
        title: "New task assigned",
        detail: `${task.title} was assigned to you.`,
        target: "tasks",
        taskId: task.id,
        createdAt: createdAt.getTime(),
      });
    }

    if (assignedToMe && task.status !== "done" && isAfterDueDate(task.due_date, now)) {
      items.push({
        id: `overdue-${task.id}`,
        tone: C.danger,
        title: "Task overdue",
        detail: `${task.title} is overdue.`,
        target: "tasks",
        taskId: task.id,
        createdAt: dueDay.getTime(),
      });
    } else if (assignedToMe && task.status !== "done" && dueDay && dueDay.getTime() >= startOfToday.getTime() && dueDay.getTime() < endOfTomorrow.getTime()) {
      items.push({
        id: `due-${task.id}`,
        tone: C.gold,
        title: getRelativeDueLabel(task.due_date),
        detail: `${task.title} needs attention soon.`,
        target: "tasks",
        taskId: task.id,
        createdAt: dueDay.getTime(),
      });
    }

    if (seniorPastorViewer && task.status !== "done" && isAfterDueDate(task.due_date, now) && !assignedToMe) {
      items.push({
        id: `admin-overdue-${task.id}`,
        tone: C.danger,
        title: "Team Task Needs Attention",
        detail: `${task.title} assigned to ${task.assignee || "a team member"} is overdue.`,
        target: "tasks",
        taskId: task.id,
        createdAt: dueDay.getTime(),
      });
    } else if (seniorPastorViewer && task.status !== "done" && dueDay && dueDay.getTime() >= startOfToday.getTime() && dueDay.getTime() < endOfTomorrow.getTime() && !assignedToMe) {
      items.push({
        id: `admin-due-${task.id}`,
        tone: C.gold,
        title: "Team task due soon",
        detail: `${task.title} assigned to ${task.assignee || "a team member"} is ${getRelativeDueLabel(task.due_date).toLowerCase()}.`,
        target: "tasks",
        taskId: task.id,
        createdAt: dueDay.getTime(),
      });
    }

    if (reviewerForMe && task.status === "in-review") {
      const reviewCycleKey = `${task.review_approvals?.length || 0}-${task.review_history?.length || 0}-${task.status || "todo"}`;
      items.push({
        id: `review-${task.id}-${normalizeName(fullName)}-${reviewCycleKey}`,
        tone: C.purple,
        title: "Review requested",
        detail: `${task.title} is waiting on your review.`,
        target: "tasks",
        taskId: task.id,
        createdAt: dueDay?.getTime() || createdAt?.getTime() || now.getTime(),
      });
    }

    (task.comments || []).forEach((comment) => {
      const commentDate = comment.created_at ? new Date(comment.created_at) : null;
      if (!commentDate) return;
      if (now.getTime() - commentDate.getTime() > 14 * 86400000) return;

      if (assignedToMe && !samePerson(comment.author, fullName)) {
        items.push({
          id: `task-comment-${task.id}-${comment.id}-${normalizeName(fullName)}`,
          tone: C.blue,
          title: "New comment on your task",
          detail: `${comment.author} commented on ${task.title}.`,
          target: "tasks",
          taskId: task.id,
          commentId: comment.id,
          createdAt: commentDate.getTime(),
        });
      }

      if (!commentMentionsProfile(comment, profile)) return;
      if (samePerson(comment.author, fullName)) return;
      items.push({
        id: `comment-mention-${task.id}-${comment.id}-${normalizeName(fullName)}`,
        tone: C.blue,
        title: "You were mentioned in a task",
        detail: `${comment.author} mentioned you in ${task.title}.`,
        target: "tasks",
        taskId: task.id,
        commentId: comment.id,
        createdAt: commentDate.getTime(),
      });
    });
  });

  (purchaseOrders || []).forEach((order) => {
    const createdAt = order.created_at ? new Date(order.created_at) : null;
    const neededBy = order.needed_by ? new Date(order.needed_by) : null;
    const reminderThreshold = neededBy ? new Date(neededBy.getTime() - (48 * 60 * 60 * 1000)) : null;
    const isAwaitingDecision = ["pending", "in-review"].includes(order.status || "pending");
    const isRequester = order.requester_id === profile?.id || samePerson(order.requested_by, fullName);
    const reviewRequestedForMe = canApprovePurchaseOrder(profile, order);

    if (purchaseOrderReviewer && reviewRequestedForMe) {
      items.push({
        id: `purchase-order-new-${order.id}-${normalizeName(fullName)}`,
        tone: C.blue,
        title: "New purchase order request",
        detail: `${order.requested_by || "A staff member"} submitted ${order.title}.`,
        target: "budget",
        createdAt: createdAt?.getTime() || now.getTime(),
      });
    }

    if (financeDirectorViewer && isAwaitingDecision && reminderThreshold && now.getTime() >= reminderThreshold.getTime()) {
      items.push({
        id: `purchase-order-reminder-${order.id}`,
        tone: C.gold,
        title: "Purchase order needs a decision",
        detail: `${order.title} is still awaiting review and is needed by ${fmtDate(order.needed_by)}.`,
        target: "budget",
        createdAt: reminderThreshold.getTime(),
      });
    }

    if (isRequester && order.status === "approved") {
      items.push({
        id: `purchase-order-approved-${order.id}`,
        tone: C.success,
        title: "Purchase order approved",
        detail: `${order.title} was approved${order.decided_by ? ` by ${order.decided_by}` : ""}.`,
        target: "budget",
        createdAt: new Date(order.decided_at || order.created_at || now).getTime(),
      });
    }

    if (isRequester && order.status === "denied") {
      items.push({
        id: `purchase-order-denied-${order.id}`,
        tone: C.danger,
        title: "Purchase order denied",
        detail: `${order.title} was denied${order.decided_by ? ` by ${order.decided_by}` : ""}.`,
        target: "budget",
        createdAt: new Date(order.decided_at || order.created_at || now).getTime(),
      });
    }

    (order.comments || []).forEach((comment) => {
      if (!commentMentionsProfile(comment, profile)) return;
      if (samePerson(comment.author, fullName)) return;
      const commentDate = comment.created_at ? new Date(comment.created_at) : null;
      if (!commentDate) return;
      if (now.getTime() - commentDate.getTime() > 14 * 86400000) return;
      items.push({
        id: `purchase-order-comment-mention-${order.id}-${comment.id}-${normalizeName(fullName)}`,
        tone: C.blue,
        title: "You were mentioned in a purchase order",
        detail: `${comment.author} mentioned you in ${order.title}.`,
        target: "budget",
        createdAt: commentDate.getTime(),
      });
    });
  });

  if (isAdminViewer) {
    (eventRequests || []).forEach((request) => {
      if (request.status !== "new") return;
      const createdAt = request.created_at ? new Date(request.created_at) : null;
      if (!createdAt) return;
      if (now.getTime() - createdAt.getTime() > 7 * 86400000) return;
      items.push({
        id: `event-request-${request.id}`,
        tone: C.gold,
        title: "New event request submitted",
        detail: `${request.contact_name} submitted ${request.event_name}.`,
        target: "events-board",
        createdAt: createdAt.getTime(),
      });
    });
  }

  (eventRequests || []).forEach((request) => {
    if (!isEventApplicant(profile, request)) return;
    if (!["approved", "declined"].includes(request.status)) return;
    const decisionAt = request.decided_at ? new Date(request.decided_at) : null;
    if (!decisionAt) return;
    if (now.getTime() - decisionAt.getTime() > 14 * 86400000) return;
    items.push({
      id: `event-decision-${request.id}-${request.status}`,
      tone: request.status === "approved" ? C.success : C.danger,
      title: request.status === "approved" ? "Event request approved" : "Event request denied",
      detail: `${request.event_name} has been ${request.status === "approved" ? "approved" : "denied"}.`,
      target: "events-board",
      createdAt: decisionAt.getTime(),
    });
  });

  (staffAvailabilityRequests || []).forEach((request) => {
    const createdAt = request.created_at ? new Date(request.created_at) : null;
    const decidedAt = request.decided_at ? new Date(request.decided_at) : null;
    const isRequester = request.requester_id === profile?.id || samePerson(request.requested_by, fullName);
    const reviewRequestedForMe = canApproveAvailabilityRequest(profile, request);

    if (reviewRequestedForMe && createdAt) {
      items.push({
        id: `availability-review-${request.id}-${normalizeName(fullName)}`,
        tone: C.gold,
        title: "PTO request needs review",
        detail: `${request.requested_by || "A staff member"} submitted a PTO request.`,
        target: "operations-board",
        createdAt: createdAt.getTime(),
      });
    }

    if (isRequester && request.status === "approved" && decidedAt) {
      items.push({
        id: `availability-approved-${request.id}`,
        tone: C.success,
        title: "PTO request approved",
        detail: `${request.request_type} was approved${request.decided_by ? ` by ${request.decided_by}` : ""}.`,
        target: "operations-board",
        createdAt: decidedAt.getTime(),
      });
    }

    if (isRequester && request.status === "denied" && decidedAt) {
      items.push({
        id: `availability-denied-${request.id}`,
        tone: C.danger,
        title: "PTO request denied",
        detail: `${request.request_type} was denied${request.decided_by ? ` by ${request.decided_by}` : ""}.`,
        target: "operations-board",
        createdAt: decidedAt.getTime(),
      });
    }
  });

  return items
    .filter((item) => (now.getTime() - Number(item.createdAt || 0)) <= NOTIFICATION_RETENTION_MS)
    .sort((a, b) => b.createdAt - a.createdAt);
};

// ── Auth ───────────────────────────────────────────────────────────────────
function AuthScreen() {
  const [mode, setMode] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [churches, setChurches] = useState([]);
  const [selectedChurchId, setSelectedChurchId] = useState("");
  const [churchAccess, setChurchAccess] = useState({ church: null, users: [] });
  const [form, setForm] = useState({ userId: "", email: "", password: "", confirmPassword: "", churchName: "", adminFirstName: "", adminLastName: "", adminRole: "church_administrator" });
  const isLogin = mode === "login";
  const isForgotPassword = mode === "forgot";
  const isChurchRegistration = mode === "church";

  useEffect(() => {
    let active = true;
    fetchChurchList()
      .then((list) => {
        if (!active) return;
        setChurches(list);
      })
      .catch(() => {
        if (!active) return;
        setChurches([]);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    if (isChurchRegistration) {
      setChurchAccess({ church: null, users: [] });
      setLookupLoading(false);
      setError("");
      return () => {
        active = false;
      };
    }

    if (!selectedChurchId) {
      setChurchAccess({ church: null, users: [] });
      setError("");
      return () => {
        active = false;
      };
    }

    setLookupLoading(true);
    setError("");

    fetchChurchAccessById(selectedChurchId)
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
  }, [selectedChurchId, isChurchRegistration]);

  const submit = async () => {
    setError("");
    setMessage("");
    setLoading(true);
    try {
      if (isChurchRegistration) {
        if (!form.churchName.trim()) throw new Error("Enter your church name.");
        if (!form.adminFirstName.trim() || !form.adminLastName.trim()) throw new Error("Enter the primary leader's first and last name.");
        if (!form.email || !form.password) throw new Error("Fill in every registration field.");
        if (form.password.length < 6) throw new Error("Use a password with at least 6 characters.");
        if (form.password !== form.confirmPassword) throw new Error("Your passwords do not match.");
        const generatedCode = generateChurchCode();
        const adminFullName = `${form.adminFirstName.trim()} ${form.adminLastName.trim()}`.trim();

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: {
            emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
            data: {
              full_name: adminFullName,
              role: "admin",
            },
          },
        });
        if (signUpError) throw signUpError;
        if (!data.user?.id) throw new Error("We couldn't finish creating that church account.");

        const { error: setupError } = await supabase.rpc("create_church_with_admin", {
          p_church_name: form.churchName.trim(),
          p_code: generatedCode,
          p_admin_name: adminFullName,
          p_admin_role: form.adminRole,
          p_admin_title: getRoleTemplate(form.adminRole).title,
          p_email: form.email.trim(),
          p_user_id: data.user.id,
        });
        if (setupError) throw setupError;

        setMessage(data.session
          ? `Church registered. Your church framework is ready to use. Internal church code: ${generatedCode}.`
              : `Church registered. Check your email to verify the primary administrator account, then log in. Internal church code: ${generatedCode}.`);
      } else if (isForgotPassword) {
        if (!churchAccess.church) throw new Error("Select your church first.");
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
        if (!churchAccess.church) throw new Error("Select your church first.");
        if (!form.userId) throw new Error("Select your name first.");
        const selected = churchAccess.users.find((user) => user.id === form.userId);
        if (!selected) throw new Error("Select your name first.");
        if (!selected.email) throw new Error("That person has not registered yet. Use First Time to create the account.");
        if (!form.password) throw new Error("Enter your password.");
        const { error: loginError } = await supabase.auth.signInWithPassword({ email: selected.email, password: form.password });
        if (loginError) throw loginError;
        await claimStaffProfile(selected.id, churchAccess.church.id);
      } else {
        if (!churchAccess.church) throw new Error("Select your church first.");
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
            <BrandMark size={60} color={C.gold} opacity={1}/>
          </div>
        ))}
      </div>
      <div className="mobile-auth-glow" style={{position:"absolute",top:"20%",left:"50%",transform:"translateX(-50%)",width:600,height:600,background:`radial-gradient(circle,${C.goldGlow} 0%,transparent 70%)`,pointerEvents:"none"}}/>
      <div className="fadeIn" style={{width:"100%",maxWidth:440,padding:"0 20px",position:"relative",zIndex:1}}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{width:64,height:64,borderRadius:18,background:C.goldGlow,border:`1px solid ${C.goldDim}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
            <BrandMark size={32} color={C.gold}/>
          </div>
          <h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:36,fontWeight:600,color:C.text}}>Shepherd</h1>
          <p style={{color:C.muted,fontSize:13,marginTop:4}}>
            {isChurchRegistration
              ? "Register your church, create the first administrator account, and start with Shepherd's framework for your own team."
              : isForgotPassword
              ? "Select your church, choose who you are, and we'll email you a password reset link."
              : isLogin
              ? "Select your church, choose who you are, then enter your password."
              : "Select your church, choose who you are, then create your account."}
          </p>
        </div>
        <div style={{display:"flex",background:C.surface,borderRadius:12,padding:4,marginBottom:24,border:`1px solid ${C.border}`}}>
          {[
            { id: "login", label: "Log In" },
            { id: "signup", label: "First Time Login" },
            { id: "church", label: "Register Your Church" },
          ].map((tab)=>(
            <button key={tab.id} onClick={()=>{setMode(tab.id);setError("");setMessage("");}} style={{flex:1,padding:"9px 0",borderRadius:9,border:"none",cursor:"pointer",fontSize:14,fontWeight:500,background:mode===tab.id?C.card:"transparent",color:mode===tab.id?C.text:C.muted}}>{tab.label}</button>
          ))}
        </div>
        {error && <div style={{background:"rgba(224,82,82,.1)",border:"1px solid rgba(224,82,82,.3)",borderRadius:10,padding:"10px 14px",fontSize:13,color:C.danger,marginBottom:14}}>{error}</div>}
        {message && <div style={{background:"rgba(82,200,122,.1)",border:"1px solid rgba(82,200,122,.3)",borderRadius:10,padding:"10px 14px",fontSize:13,color:C.success,marginBottom:14}}>{message}</div>}
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {!isChurchRegistration && (
            <select
              className="input-field"
              value={selectedChurchId}
              onChange={(e) => {
                setSelectedChurchId(e.target.value);
                setForm((current) => ({ ...current, userId: "" }));
              }}
              style={{background:C.surface}}
            >
              <option value="">Select your church</option>
              {churches.map((church) => (
                <option key={church.id} value={church.id}>{church.name}</option>
              ))}
            </select>
          )}
          {isChurchRegistration ? (
            <>
              <input className="input-field" placeholder="Church name" value={form.churchName} onChange={e=>setForm({...form,churchName:e.target.value})}/>
              <div className="mobile-two-stack" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <input className="input-field" placeholder="First name" value={form.adminFirstName} onChange={e=>setForm({...form,adminFirstName:e.target.value})}/>
                <input className="input-field" placeholder="Last name" value={form.adminLastName} onChange={e=>setForm({...form,adminLastName:e.target.value})}/>
              </div>
              <select className="input-field" value={form.adminRole} onChange={e=>{
                setForm({...form,adminRole:e.target.value});
              }} style={{background:C.surface}}>
                {STAFF_ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </>
          ) : (
            <select className="input-field" value={form.userId} onChange={e=>setForm({...form,userId:e.target.value})} style={{background:C.surface}} disabled={!churchAccess.church || lookupLoading || churchAccess.users.length === 0}>
              <option value="">{lookupLoading ? "Looking up church..." : "Select your name"}</option>
              {churchAccess.users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name} • {user.title}
                </option>
              ))}
            </select>
          )}
          {!isChurchRegistration && selectedChurchId && churchAccess.church && churchAccess.users.length === 0 && (
            <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>
              No staff have been added to this church yet. Ask the church account admin to add the team in <span style={{color:C.text}}>Church Team</span> before anyone else uses First Time Login.
            </div>
          )}
          {(mode === "signup" || isChurchRegistration) && (
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
          {(mode === "signup" || isChurchRegistration) && (
            <input className="input-field" placeholder="Confirm password" type="password" value={form.confirmPassword} onChange={e=>setForm({...form,confirmPassword:e.target.value})}/>
          )}
          <button className="btn-gold" onClick={submit} style={{width:"100%",justifyContent:"center",padding:"13px",fontSize:15,marginTop:4}}>
            {loading ? <span style={{display:"inline-block",width:18,height:18,border:"2px solid rgba(0,0,0,.3)",borderTopColor:"#0f1117",borderRadius:"50%",animation:"spin .8s linear infinite"}}/> : isForgotPassword ? "Send reset email" : isLogin ? "Log In" : isChurchRegistration ? "Register Church" : "Register this account"}
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

function getTutorialSteps(profile, church) {
  const steps = [
    {
      id: "dashboard",
      title: "Start On Your Dashboard",
      page: "dashboard",
      eyebrow: "Your daily home base",
      body: "Begin here when you open Shepherd. Check unread notifications first, confirm who is locking up this week, then use the Focus Bar to show the task that has your attention right now.",
      tip: "Good rhythm: open Dashboard, clear new alerts, choose your current focus, then move into the board that needs action.",
      action: "Open Dashboard",
    },
    {
      id: "focus",
      title: "Choose Your Current Focus",
      page: "dashboard",
      eyebrow: "For live team clarity",
      body: "In the Focus Bar, click the task you are actively working on. Shepherd keeps that task marked until you choose another one or unselect it.",
      tip: "This is manual on purpose. It helps your Senior Pastor see present focus without guessing from due dates or old activity.",
      action: "Go To Focus Bar",
    },
    {
      id: "planning",
      title: "Use Frameworks",
      page: "workspaces",
      eyebrow: "Boards and workflows",
      body: "Use Frameworks when you are not sure which board you need. Choose Event Planning for building an event, Event Requests for approvals, Operations for staff availability and lock-up, or Content/Media for communication work.",
      tip: "Think of this as the hallway. It does not replace the boards; it helps people enter the right room.",
      action: "Open Frameworks",
    },
    {
      id: "tasks",
      title: "Keep Tasks Moving",
      page: "tasks",
      eyebrow: "Assignments and reviews",
      body: "Open Tasks when something needs ownership. Create a task, assign it, set a due date, update the status from the top-right selector, and use comments when decisions need context.",
      tip: "If a task is connected to an event plan, keep the task title clear and use the event name as context instead of stuffing every detail into the title.",
      action: "Open Tasks",
    },
    {
      id: "calendar",
      title: "Check The Shared Calendar",
      page: "calendar",
      eyebrow: "Church rhythm",
      body: "Use Calendar to see the week in motion. Toggle imported Google calendars and My Tasks, move week to week, and click an item when you need to review or edit its details.",
      tip: "Staff time off appears after approval. Church events can come from approved event requests, direct calendar entries, or imported Google calendars.",
      action: "Open Calendar",
    },
    {
      id: "operations",
      title: "Use Operations For Staff Availability",
      page: "operations-board",
      eyebrow: "PTO, out of office, sick days, lock-up",
      body: "Use Operations for practical staff coverage. PTO requests go through review, while Out Of Office and Sick Day entries can be logged directly. Church Lock Up assigns who closes after services for the selected week.",
      tip: "If a PTO request is approved, Shepherd adds it to the shared calendar automatically so the whole team can plan around it.",
      action: "Open Operations",
    },
  ];

  if (shouldShowChurchTeam(profile, church)) {
    steps.push({
      id: "church-team",
      title: "Manage The Church Team",
      page: "church-team",
      eyebrow: "People and access",
      body: "Use Church Team to keep real staff accounts clean. Edit roles, ministries, contact details, and visibility so access matches what each person actually needs.",
      tip: "If someone should see finances or manage church settings, make sure their staff record is linked to their real Shepherd login.",
      action: "Open Church Team",
    });
  }

  if (canViewBudget(profile)) {
    steps.push({
      id: "finances",
      title: "Review Finances",
      page: "budget",
      eyebrow: "Budgets and purchase orders",
      body: "Use Finances to view assigned ministry budgets, create purchase orders, and track spending against the approved amount for this year.",
      tip: "Most staff only see finances for ministries assigned to them, while finance leaders can see the broader church budget picture.",
      action: "Open Finances",
    });
  }

  if (canManageCalendarSettings(profile)) {
    steps.push({
      id: "calendar-settings",
      title: "Maintain Calendar Settings",
      page: "account",
      branch: "calendar",
      eyebrow: "Admin setup",
      body: "Calendar Settings is where an admin connects Google once for the church, chooses which Google calendars Shepherd imports, refreshes shared calendars, or disconnects Google when needed.",
      tip: "This is church-level setup. Staff can view the shared calendar, but admins maintain the connection so everyone sees the same source of truth.",
      action: "Open Calendar Settings",
    });
  }

  steps.push({
    id: "account",
    title: "Update Your Account",
    page: "account",
    branch: "my-account",
    eyebrow: "Profile and password",
    body: "Use Account for your profile photo, email, password, and recovery options. You can also reopen this walkthrough from the sidebar whenever someone needs a refresher.",
    tip: "Admins will also see church-level settings here, including Calendar Settings and Shepherd Account Managers.",
    action: "Open Account",
  });

  return steps;
}

function ShepherdTutorial({ profile, church, onClose, onComplete }) {
  const steps = useMemo(() => getTutorialSteps(profile, church), [profile, church]);
  const [hasStarted, setHasStarted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = steps[stepIndex] || steps[0];
  const isLastStep = stepIndex >= steps.length - 1;

  const finishTutorial = () => {
    if (typeof window !== "undefined" && profile?.id) {
      window.localStorage.setItem(getTutorialCompletedStorageKey(profile.id), "true");
    }
    onComplete?.();
    onClose?.();
  };

  if (!currentStep) return null;

  if (!hasStarted) {
    return (
      <div className="tutorial-backdrop" role="dialog" aria-modal="true" aria-label="Shepherd walkthrough prompt">
        <div className="tutorial-card fadeIn" style={{width:"min(560px,100%)"}}>
          <div style={{padding:28,display:"grid",gap:18,textAlign:"left"}}>
            <div style={{display:"inline-flex",alignItems:"center",gap:8,color:C.gold,fontSize:12,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase"}}>
              <BrandMark size={18} color={C.gold}/>
              Shepherd Walkthrough
            </div>
            <div style={{display:"grid",gap:10}}>
              <h2 style={{fontFamily:"'Young Serif Medium', Georgia, serif",fontSize:34,fontWeight:500,color:C.text,lineHeight:1.1}}>
                Would You Like A Quick Walkthrough?
              </h2>
              <p style={{fontSize:14,color:C.muted,lineHeight:1.8}}>
                Shepherd can show you where the main tools live in about a minute. You can skip this now and reopen it anytime from the Walkthrough button.
              </p>
            </div>
            <div className="tutorial-actions" style={{display:"flex",justifyContent:"flex-end",gap:10,flexWrap:"wrap"}}>
              <button className="btn-gold" onClick={() => setHasStarted(true)}>Yes, Show Me</button>
              <button className="btn-outline" onClick={finishTutorial}>Skip</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tutorial-backdrop" role="dialog" aria-modal="true" aria-label="Shepherd walkthrough">
      <div className="tutorial-card fadeIn">
        <div style={{padding:24,borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16}}>
          <div style={{display:"grid",gap:8,textAlign:"left"}}>
            <div style={{display:"inline-flex",alignItems:"center",gap:8,color:C.gold,fontSize:12,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase"}}>
              <BrandMark size={16} color={C.gold}/>
              Shepherd Walkthrough
            </div>
            <h2 style={{fontFamily:"'Young Serif Medium', Georgia, serif",fontSize:34,fontWeight:500,color:C.text,lineHeight:1.1}}>
              Welcome To Shepherd
            </h2>
            <p style={{fontSize:13,color:C.muted,lineHeight:1.7,maxWidth:640}}>
              This quick guide shows where the main pieces live. Move through it with Next, skip it when you are ready, or reopen it later from the Walkthrough button.
            </p>
          </div>
          <button className="btn-outline" onClick={finishTutorial} style={{padding:"8px 12px",flexShrink:0}}>Skip</button>
        </div>

        <div className="tutorial-body tutorial-layout" style={{display:"grid",gridTemplateColumns:"minmax(220px,320px) 1fr",gap:0}}>
          <div className="tutorial-step-list" style={{padding:18,borderRight:`1px solid ${C.border}`,display:"grid",gap:10,alignContent:"start"}}>
            {steps.map((step, index) => (
              <button
                key={step.id}
                className={`tutorial-step-card${index === stepIndex ? " active" : ""}`}
                onClick={() => setStepIndex(index)}
              >
                <div style={{fontSize:11,color:index === stepIndex ? C.gold : C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:".08em"}}>
                  Step {index + 1}
                </div>
                <div style={{marginTop:5,fontSize:14,fontWeight:700,color:C.text}}>{step.title}</div>
                <div style={{marginTop:4,fontSize:12,color:C.muted,lineHeight:1.5}}>{step.eyebrow}</div>
              </button>
            ))}
          </div>

          <div className="tutorial-step-detail" style={{padding:28,display:"grid",gap:22,alignContent:"start",textAlign:"left"}}>
            <div style={{display:"grid",gap:10}}>
              <div style={{fontSize:12,color:C.gold,fontWeight:700,textTransform:"uppercase",letterSpacing:".08em"}}>
                {currentStep.eyebrow}
              </div>
              <h3 style={{fontFamily:"'Young Serif Medium', Georgia, serif",fontSize:30,fontWeight:500,color:C.text,lineHeight:1.15}}>
                {currentStep.title}
              </h3>
              <p style={{fontSize:14,color:C.muted,lineHeight:1.8,maxWidth:620}}>
                {currentStep.body}
              </p>
              {currentStep.tip && (
                <div style={{marginTop:6,padding:"12px 14px",border:`1px solid ${C.goldDim}`,borderRadius:14,background:C.goldGlow,fontSize:13,color:C.text,lineHeight:1.7}}>
                  <span style={{color:C.gold,fontWeight:700}}>Tip: </span>
                  {currentStep.tip}
                </div>
              )}
            </div>

            <div style={{height:8,borderRadius:999,background:C.surface,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${((stepIndex + 1) / steps.length) * 100}%`,background:`linear-gradient(90deg,${C.goldDim},${C.gold})`,borderRadius:999}} />
            </div>

            <div className="tutorial-actions" style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginTop:4}}>
              <button
                className="btn-outline"
                onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
                disabled={stepIndex === 0}
                style={{opacity:stepIndex === 0 ? .55 : 1}}
              >
                Back
              </button>
              <div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"flex-end"}}>
                <button
                  className="btn-gold"
                  onClick={() => isLastStep ? finishTutorial() : setStepIndex((current) => Math.min(steps.length - 1, current + 1))}
                >
                  {isLastStep ? "Finish Tour" : "Next"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sidebar ────────────────────────────────────────────────────────────────
function Sidebar({ active, setActive, profile, church, onLogout, collapsed, setCollapsed, unreadCount, onStartTutorial }) {
  const nav = [
    {id:"dashboard",label:"Dashboard",I:Icons.home},
    {id:"workspaces",label:"Frameworks",I:Icons.workspace},
    {id:"tasks",label:"Tasks",I:Icons.tasks},
    {id:"calendar",label:"Calendar",I:Icons.calendar},
    ...(shouldShowChurchTeam(profile, church) ? [{id:"church-team",label:"Church Team",I:Icons.people}] : []),
    ...(canViewBudget(profile) ? [{id:"budget",label:"Finances",I:Icons.budget}] : []),
    {id:"faq",label:"FAQ",I:Icons.help},
    {id:"trash",label:"Trash",I:Icons.trash},
  ];
  return (
    <div className="app-sidebar" style={{width:collapsed?64:220,minHeight:"100vh",background:C.surface,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",flexShrink:0,position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",bottom:40,right:collapsed?-10:20,width:80,opacity:.05}}>
        <BrandMark size={80} color={C.gold}/>
      </div>
      <div style={{padding:collapsed?"20px 16px":"20px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:collapsed?"center":"space-between"}}>
        <button
          onClick={() => setActive("dashboard")}
          title="Go to dashboard"
          style={{display:"flex",alignItems:"center",gap:10,background:"none",border:"none",padding:0,cursor:"pointer",minWidth:0,textAlign:"left"}}
        >
          <div style={{width:32,height:32,borderRadius:8,background:C.goldGlow,border:`1px solid ${C.goldDim}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <BrandMark size={14} color={C.gold}/>
          </div>
          {!collapsed && <span style={{fontFamily:"'Young Serif Medium', Georgia, serif",fontSize:20,fontWeight:500,color:C.text,letterSpacing:"0.02em"}}>Shepherd</span>}
        </button>
        <button onClick={()=>setCollapsed(!collapsed)} style={{background:"none",border:"none",cursor:"pointer",color:C.muted,padding:4}}><Icons.menu/></button>
      </div>
      <nav className="app-sidebar-nav" style={{padding:"12px 10px",flex:1}}>
        {nav.map(({id,label,I: iconComponent})=>(
          <div key={id} className={`nav-item${active===id?" active":""}`} onClick={()=>setActive(id)} title={collapsed?label:""} style={{justifyContent:collapsed?"center":"flex-start"}}>
            <div style={{position:"relative",display:"inline-flex",alignItems:"center"}}>
              {iconComponent()}
              {id === "dashboard" && unreadCount > 0 && (
                <span style={{position:"absolute",top:-6,right:-8,minWidth:16,height:16,borderRadius:999,background:C.gold,color:"#0f1117",fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 4px"}}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            {!collapsed&&<span>{label}</span>}
          </div>
        ))}
      </nav>
      <div className="app-sidebar-footer" style={{padding:"12px 10px",borderTop:`1px solid ${C.border}`}}>
        <button
          onClick={onStartTutorial}
          title="Open Shepherd walkthrough"
          style={{
            width:"100%",
            display:"flex",
            alignItems:"center",
            justifyContent:collapsed ? "center" : "flex-start",
            gap:10,
            marginBottom:10,
            padding:collapsed ? 8 : "10px 12px",
            borderRadius:12,
            border:`1px solid ${C.goldDim}`,
            background:C.goldGlow,
            color:C.text,
            cursor:"pointer",
            textAlign:"left",
          }}
        >
          <span style={{width:26,height:26,borderRadius:"50%",background:C.gold,color:"#0f1117",display:"inline-flex",alignItems:"center",justifyContent:"center",fontWeight:800,flexShrink:0}}>?</span>
          {!collapsed && (
            <span style={{display:"grid",gap:2,minWidth:0}}>
              <span style={{fontSize:12,fontWeight:700,color:C.text,lineHeight:1.2}}>Need a walkthrough?</span>
              <span style={{fontSize:11,color:C.muted,lineHeight:1.3}}>Start the quick guide</span>
            </span>
          )}
        </button>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:10}}>
          <button
            onClick={()=>setActive("account")}
            style={{display:"flex",alignItems:"center",gap:10,flex:1,minWidth:0,background:"none",border:"none",padding:0,cursor:"pointer",textAlign:"left"}}
          >
          <div style={{width:32,height:32,borderRadius:"50%",background:`linear-gradient(135deg,${C.goldDim},${C.gold})`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:13,fontWeight:600,color:"#0f1117",overflow:"hidden"}}>
            {profile?.photo_url ? (
              <img src={profile.photo_url} alt={profile.full_name || "User"} style={{width:"100%",height:"100%",objectFit:"cover"}} />
            ) : (
              profile?.full_name?.[0]||"U"
            )}
          </div>
          {!collapsed && <>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:500,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{profile?.full_name||"User"}</div>
              <div style={{fontSize:11,color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{roleLabel(profile)} • {church?.name||""}</div>
            </div>
          </>}
          </button>
          {!collapsed && <>
            <button onClick={onLogout} style={{background:"none",border:"none",cursor:"pointer",color:C.muted}}><Icons.logout/></button>
          </>}
        </div>
      </div>
    </div>
  );
}

function CalendarSettingsPanel({ profile, church, setChurch, calendarEvents, setCalendarEvents, session }) {
  const [googleCalendarLinked, setGoogleCalendarLinked] = useState(false);
  const [googleCalendarActionMessage, setGoogleCalendarActionMessage] = useState("");
  const [googleCalendarActionError, setGoogleCalendarActionError] = useState("");
  const [googleCalendars, setGoogleCalendars] = useState([]);
  const [googleCalendarsLoading, setGoogleCalendarsLoading] = useState(false);
  const [googleConnectionEmail, setGoogleConnectionEmail] = useState("");
  const [selectedGoogleCalendarIds, setSelectedGoogleCalendarIds] = useState(() => (
    Array.isArray(church?.google_calendar_ids) && church.google_calendar_ids.length
      ? church.google_calendar_ids
      : (church?.google_calendar_id ? [church.google_calendar_id] : [])
  ));
  const [googleSyncLoading, setGoogleSyncLoading] = useState(false);
  const [googleCalendarSaving, setGoogleCalendarSaving] = useState(false);
  const [showAvailableGoogleCalendars, setShowAvailableGoogleCalendars] = useState(false);
  const officialGoogleCalendarIds = Array.isArray(church?.google_calendar_ids) && church.google_calendar_ids.length
    ? church.google_calendar_ids
    : (church?.google_calendar_id ? [church.google_calendar_id] : []);
  const officialGoogleCalendarTitles = Array.isArray(church?.google_calendar_titles) && church.google_calendar_titles.length
    ? church.google_calendar_titles
    : (church?.google_calendar_title ? [church.google_calendar_title] : []);
  const officialGoogleCalendarTitleMap = Object.fromEntries(
    officialGoogleCalendarIds.map((id, index) => [id, officialGoogleCalendarTitles[index] || "Imported Calendar"])
  );
  const churchId = church?.id || profile?.church_id || null;
  const canManageSettings = canManageCalendarSettings(profile);
  const getGoogleCalendarIdFromNotes = (notes) => {
    const text = String(notes || "");
    const safeMatch = text.match(/google-calendar-id:([^\n]+)/);
    if (safeMatch?.[1]) {
      try {
        return decodeURIComponent(safeMatch[1].trim());
      } catch {
        return safeMatch[1].trim();
      }
    }
    const legacyMatch = text.match(/google-calendar:(.+):([^\n]+)/);
    return legacyMatch?.[1]?.trim() || "";
  };
  const getGoogleEventIdFromNotes = (notes) => {
    const text = String(notes || "");
    const safeMatch = text.match(/google-event-id:([^\n]+)/);
    if (safeMatch?.[1]) return safeMatch[1].trim();
    const legacyMatch = text.match(/google-calendar:(.+):([^\n]+)/);
    return legacyMatch?.[2]?.trim() || "";
  };
  const getGoogleEventDate = (value) => {
    if (!value) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
  };
  const formatGoogleTime = (value) => {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    return `${String(parsed.getHours()).padStart(2, "0")}:${String(parsed.getMinutes()).padStart(2, "0")}`;
  };
  const invokeGoogleCalendarSync = useCallback(async (body) => {
    const { data, error } = await supabase.functions.invoke("google-calendar-sync", {
      body,
      headers: session?.access_token
        ? {
            Authorization: `Bearer ${session.access_token}`,
          }
        : undefined,
    });
    if (error) {
      const detailedError = error?.context && typeof error.context.json === "function"
        ? await error.context.json().catch(() => null)
        : null;
      throw new Error(detailedError?.error || error?.message || "We couldn't reach the Google calendar service.");
    }
    return data;
  }, [session?.access_token]);

  useEffect(() => {
    let active = true;
    const loadGoogleCalendarConnection = async () => {
      if (!canManageSettings || !churchId) {
        if (active) {
          setGoogleCalendarLinked(false);
          setGoogleConnectionEmail("");
        }
        return;
      }
      try {
        const { data, error } = await supabase
          .from("church_google_connections")
          .select("church_id, google_account_email")
          .eq("church_id", churchId)
          .maybeSingle();
        if (error) throw error;
        if (!active) return;
        setGoogleCalendarLinked(!!data?.church_id);
        setGoogleConnectionEmail(data?.google_account_email || "");
      } catch (error) {
        if (!active) return;
        setGoogleCalendarLinked(false);
        setGoogleConnectionEmail("");
        setGoogleCalendarActionError(error?.message || "We couldn't load the saved Google connection for this church yet.");
      }
    };
    loadGoogleCalendarConnection();
    return () => {
      active = false;
    };
  }, [canManageSettings, churchId, invokeGoogleCalendarSync]);

  useEffect(() => {
    let active = true;
    const completeGoogleCalendarConnection = async () => {
      if (!canManageSettings || !churchId || typeof window === "undefined") return;
      const url = new URL(window.location.href);
      const state = url.searchParams.get("state");
      const isGoogleCalendarOauth = url.searchParams.get("google_calendar_oauth") === "1"
        || hasStoredGoogleCalendarOAuthState(state);
      const code = url.searchParams.get("code");
      if (!isGoogleCalendarOauth || !code || !state) return;

      const stateStorageKey = getGoogleCalendarOAuthStateStorageKey(churchId);
      const expectedState = window.localStorage.getItem(stateStorageKey) || "";
      if (!expectedState || expectedState !== state) {
        if (!active) return;
        setGoogleCalendarActionError("The Google calendar connection could not be verified for this church. Try Connect Google again.");
        return;
      }

      try {
        setGoogleCalendarSaving(true);
        setGoogleCalendarActionError("");
        const redirectUri = `${window.location.origin}${window.location.pathname}?google_calendar_oauth=1`;
        const data = await invokeGoogleCalendarSync({
          action: "completeConnection",
          code,
          redirectUri,
        });
        if (!active) return;
        setGoogleCalendarLinked(true);
        setGoogleConnectionEmail(data?.connectedEmail || "");
        setGoogleCalendarActionMessage("Google is now connected for this church.");
        window.localStorage.removeItem(stateStorageKey);
        url.searchParams.delete("google_calendar_oauth");
        url.searchParams.delete("code");
        url.searchParams.delete("state");
        url.searchParams.delete("scope");
        url.searchParams.delete("authuser");
        url.searchParams.delete("prompt");
        window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
      } catch (error) {
        if (!active) return;
        setGoogleCalendarActionError(error?.message || "We couldn't finish connecting Google for this church.");
      } finally {
        if (active) setGoogleCalendarSaving(false);
      }
    };
    completeGoogleCalendarConnection();
    return () => {
      active = false;
    };
  }, [canManageSettings, churchId, invokeGoogleCalendarSync]);

  useEffect(() => {
    setSelectedGoogleCalendarIds(
      Array.isArray(church?.google_calendar_ids) && church.google_calendar_ids.length
        ? church.google_calendar_ids
        : (church?.google_calendar_id ? [church.google_calendar_id] : [])
    );
  }, [church?.google_calendar_id, church?.google_calendar_ids]);

  useEffect(() => {
    setShowAvailableGoogleCalendars(!(Array.isArray(church?.google_calendar_ids) && church.google_calendar_ids.length));
  }, [church?.google_calendar_ids]);

  useEffect(() => {
    let active = true;
    const loadGoogleCalendars = async () => {
      if (!googleCalendarLinked) {
        if (!active) return;
        setGoogleCalendars([]);
        setGoogleCalendarsLoading(false);
        return;
      }
      setGoogleCalendarsLoading(true);
      setGoogleCalendarActionError("");
      try {
        const data = await invokeGoogleCalendarSync({
          action: "listCalendars",
        });
        if (!active) return;
        const calendars = Array.isArray(data?.items)
          ? data.items.map((entry) => ({
              id: entry.id,
              title: entry.summary || "Untitled calendar",
              primary: !!entry.primary,
            }))
          : [];
        setGoogleCalendars(calendars);
        setSelectedGoogleCalendarIds((current) => {
          const churchSelection = Array.isArray(church?.google_calendar_ids) && church.google_calendar_ids.length
            ? church.google_calendar_ids.filter((id) => calendars.some((entry) => entry.id === id))
            : (church?.google_calendar_id && calendars.some((entry) => entry.id === church.google_calendar_id) ? [church.google_calendar_id] : []);
          if (churchSelection.length) return churchSelection;
          const currentSelection = Array.isArray(current)
            ? current.filter((id) => calendars.some((entry) => entry.id === id))
            : [];
          return currentSelection.length ? currentSelection : [];
        });
      } catch (error) {
        if (!active) return;
        setGoogleCalendars([]);
        setGoogleCalendarActionError(error?.message || "We couldn't load your Google calendars yet.");
      } finally {
        if (active) setGoogleCalendarsLoading(false);
      }
    };
    loadGoogleCalendars();
    return () => {
      active = false;
    };
  }, [googleCalendarLinked, church?.google_calendar_id, church?.google_calendar_ids, invokeGoogleCalendarSync]);

  const connectGoogleCalendar = async () => {
    setGoogleCalendarActionError("");
    setGoogleCalendarActionMessage("");
    try {
      if (typeof window === "undefined" || !churchId) {
        throw new Error("We couldn't start Google connection for this church yet.");
      }
      window.localStorage.setItem(ACCOUNT_SETTINGS_BRANCH_STORAGE_KEY, "calendar");
      const state = `${churchId}:${crypto.randomUUID()}`;
      window.localStorage.setItem(getGoogleCalendarOAuthStateStorageKey(churchId), state);
      const redirectUri = `${window.location.origin}${window.location.pathname}?google_calendar_oauth=1`;
      const data = await invokeGoogleCalendarSync({
        action: "getAuthUrl",
        redirectUri,
        state,
      });
      if (!data?.authUrl) {
        throw new Error("We couldn't create the Google authorization link for this church yet.");
      }
      setGoogleCalendarActionMessage("Google is opening so you can connect Google Calendar for this church.");
      window.location.href = data.authUrl;
    } catch (error) {
      setGoogleCalendarActionError(error?.message || "We couldn't start the Google connection just yet.");
    }
  };

  const disconnectGoogleCalendar = async () => {
    setGoogleCalendarActionError("");
    setGoogleCalendarActionMessage("");
    if (!church?.id) {
      setGoogleCalendarActionError("We couldn't find this church account.");
      return;
    }
    try {
      const { error: connectionError } = await supabase
        .from("church_google_connections")
        .delete()
        .eq("church_id", church.id);
      if (connectionError) throw connectionError;
      const { error: calendarEventError } = await supabase
        .from("calendar_events")
        .delete()
        .eq("church_id", church.id)
        .not("google_calendar_source_id", "is", null);
      if (calendarEventError) throw calendarEventError;
      const { data: churchData, error: churchError } = await supabase
        .from("churches")
        .update({
          google_calendar_id: null,
          google_calendar_title: null,
          google_calendar_ids: [],
          google_calendar_titles: [],
        })
        .eq("id", church.id)
        .select()
        .single();
      if (churchError) throw churchError;
      if (churchData) setChurch?.(churchData);
      setGoogleCalendarLinked(false);
      setGoogleConnectionEmail("");
      setGoogleCalendars([]);
      setCalendarEvents((current) => (current || []).filter((event) => !event.google_calendar_source_id));
      setSelectedGoogleCalendarIds([]);
      setShowAvailableGoogleCalendars(false);
      setGoogleCalendarActionMessage("Google has been disconnected from this church.");
    } catch (error) {
      setGoogleCalendarActionError(error?.message || "We couldn't disconnect Google from this church yet.");
    }
  };

  const importGoogleCalendar = async () => {
    if (!churchId || !profile?.id) {
      setGoogleCalendarActionError("We couldn't find your church profile yet.");
      return;
    }
    if (!officialGoogleCalendarIds.length) {
      setGoogleCalendarActionError("Choose and save at least one church Google calendar first.");
      return;
    }
    setGoogleSyncLoading(true);
    setGoogleCalendarActionError("");
    setGoogleCalendarActionMessage("");
    try {
      const today = new Date();
      const startWindow = new Date(today.getFullYear(), 0, 1).toISOString();
      const endWindow = new Date(today.getFullYear() + 2, 0, 1).toISOString();
      const existingEvents = Array.isArray(calendarEvents) ? calendarEvents : [];
      const imports = [];
      for (const calendarId of officialGoogleCalendarIds) {
        const data = await invokeGoogleCalendarSync({
          action: "listEvents",
          calendarId,
          timeMin: startWindow,
          timeMax: endWindow,
        });
        const sourceTitle = googleCalendars.find((calendar) => calendar.id === calendarId)?.title
          || officialGoogleCalendarTitleMap[calendarId]
          || "Imported Calendar";
        const calendarImports = (data?.items || [])
          .map((entry) => {
            const eventDate = getGoogleEventDate(entry.start?.dateTime || entry.start?.date);
            if (!eventDate) return null;
            const existing = existingEvents.find((event) => (
              (event.google_calendar_source_id || getGoogleCalendarIdFromNotes(event.notes)) === calendarId
              && (event.google_calendar_source_event_id || getGoogleEventIdFromNotes(event.notes)) === entry.id
            ));
            return {
              ...(existing?.id ? { id: existing.id } : {}),
              church_id: churchId,
              created_by: profile.id,
              title: entry.summary || "Google calendar event",
              event_date: eventDate,
              start_time: entry.start?.dateTime ? formatGoogleTime(entry.start.dateTime) : null,
              end_time: entry.end?.dateTime ? formatGoogleTime(entry.end.dateTime) : null,
              location: entry.location || null,
              google_calendar_source_id: calendarId,
              google_calendar_source_title: sourceTitle,
              google_calendar_source_event_id: entry.id,
              notes: stripGoogleCalendarMetadata(entry.description || "") || null,
            };
          })
          .filter(Boolean);
        imports.push(...calendarImports);
      }
      if (!imports.length) {
        setGoogleCalendarActionMessage("Those Google calendars do not have any events in this year or next year yet.");
        setGoogleSyncLoading(false);
        return;
      }
      const updates = imports.filter((entry) => entry.id);
      const inserts = imports.filter((entry) => !entry.id).map((entry) => {
        const nextEntry = { ...entry };
        delete nextEntry.id;
        return nextEntry;
      });
      const savedRows = [];
      if (updates.length) {
        const { data, error } = await supabase.from("calendar_events").upsert(updates).select();
        if (error) throw error;
        savedRows.push(...(data || []));
      }
      if (inserts.length) {
        const { data, error } = await supabase.from("calendar_events").insert(inserts).select();
        if (error) throw error;
        savedRows.push(...(data || []));
      }
      setCalendarEvents((current) => {
        const others = (current || []).filter((event) => !savedRows.some((saved) => saved.id === event.id));
        return [...savedRows, ...others].sort((a, b) => getDateSortValue(a.event_date) - getDateSortValue(b.event_date));
      });
      setGoogleCalendarActionMessage(`Imported ${savedRows.length} Google calendar event${savedRows.length === 1 ? "" : "s"} into the shared church calendar.`);
    } catch (error) {
      setGoogleCalendarActionError(error?.message || "We couldn't import those Google calendars yet.");
    } finally {
      setGoogleSyncLoading(false);
    }
  };

  const saveOfficialGoogleCalendar = async () => {
    if (!church?.id || !selectedGoogleCalendarIds.length) {
      setGoogleCalendarActionError("Choose at least one Google calendar first.");
      return;
    }
    setGoogleCalendarSaving(true);
    setGoogleCalendarActionError("");
    setGoogleCalendarActionMessage("");
    try {
      const selectedCalendars = googleCalendars.filter((entry) => selectedGoogleCalendarIds.includes(entry.id));
      const payload = {
        google_calendar_id: selectedGoogleCalendarIds[0] || null,
        google_calendar_title: selectedCalendars[0]?.title || officialGoogleCalendarTitles[0] || "Church Calendar",
        google_calendar_ids: selectedGoogleCalendarIds,
        google_calendar_titles: selectedCalendars.map((entry) => entry.title),
      };
      const { data, error } = await supabase.from("churches").update(payload).eq("id", church.id).select().single();
      if (error) throw error;
      if (data) setChurch?.(data);
      setGoogleCalendarActionMessage(`Saved ${selectedCalendars.length} official church Google calendar${selectedCalendars.length === 1 ? "" : "s"}.`);
    } catch (error) {
      setGoogleCalendarActionError(error?.message || "We couldn't save that church calendar yet.");
    } finally {
      setGoogleCalendarSaving(false);
    }
  };

  const removeImportedGoogleCalendar = async (calendarId) => {
    if (!church?.id || !canManageSettings) return;
    if (!confirmDestructiveAction("Remove this imported Google calendar and clear its events from the shared calendar view?")) return;
    const nextIds = officialGoogleCalendarIds.filter((id) => id !== calendarId);
    const nextTitles = officialGoogleCalendarIds
      .map((id, index) => ({ id, title: officialGoogleCalendarTitles[index] || "" }))
      .filter((entry) => entry.id !== calendarId)
      .map((entry) => entry.title);
    setGoogleCalendarSaving(true);
    setGoogleCalendarActionError("");
    setGoogleCalendarActionMessage("");
    try {
      const { error: deleteError } = await supabase
        .from("calendar_events")
        .delete()
        .eq("church_id", church.id)
        .eq("google_calendar_source_id", calendarId);
      if (deleteError) throw deleteError;
      const payload = {
        google_calendar_id: nextIds[0] || null,
        google_calendar_title: nextTitles[0] || null,
        google_calendar_ids: nextIds,
        google_calendar_titles: nextTitles,
      };
      const { data, error } = await supabase.from("churches").update(payload).eq("id", church.id).select().single();
      if (error) throw error;
      if (data) setChurch?.(data);
      setCalendarEvents((current) => (current || []).filter((event) => event.google_calendar_source_id !== calendarId));
      setSelectedGoogleCalendarIds(nextIds);
      setGoogleCalendarActionMessage("Imported calendar removed from the shared view.");
    } catch (error) {
      setGoogleCalendarActionError(error?.message || "We couldn't remove that calendar yet.");
    } finally {
      setGoogleCalendarSaving(false);
    }
  };

  const googleCalendarSelectionUnchanged =
    selectedGoogleCalendarIds.length === officialGoogleCalendarIds.length
    && selectedGoogleCalendarIds.every((id) => officialGoogleCalendarIds.includes(id))
    && officialGoogleCalendarIds.every((id) => selectedGoogleCalendarIds.includes(id));
  const primaryButtonStyle = { minHeight: 42, fontSize: 14, justifyContent: "center" };
  const secondaryButtonStyle = { padding: "8px 12px", fontSize: 14, minHeight: 42 };

  if (!canManageSettings) {
    return (
      <div className="card" style={{padding:22,textAlign:"left"}}>
        <h3 style={sectionTitleStyle}>Calendar Settings</h3>
        <p style={{fontSize:12,color:C.muted,marginTop:6,lineHeight:1.7}}>
          Shared church calendar setup is only available to the Church Administrator account. Once it is configured, the rest of the team can still view the shared calendars from the main calendar page.
        </p>
      </div>
    );
  }

  return (
    <div className="card" style={{padding:22,textAlign:"left",display:"grid",gap:14}}>
      <div style={{display:"grid",gap:6,maxWidth:680,textAlign:"left"}}>
        <h3 style={{...sectionTitleStyle,margin:0}}>Calendar Settings</h3>
        <div style={{fontSize:12,color:C.muted,lineHeight:1.7}}>
          Set up one shared Google calendar connection for your church, choose which calendars Shepherd should display, then refresh the shared calendar whenever you need the latest items.
        </div>
        <div style={{fontSize:12,color:googleCalendarLinked ? C.gold : C.muted,lineHeight:1.6}}>
          {googleCalendarLinked
            ? officialGoogleCalendarIds.length
              ? `${officialGoogleCalendarIds.length} shared calendar${officialGoogleCalendarIds.length === 1 ? "" : "s"} selected${googleConnectionEmail ? ` • ${googleConnectionEmail}` : ""}`
              : `Google connected for this church${googleConnectionEmail ? ` • ${googleConnectionEmail}` : ""}. Choose the calendars your church wants to use.`
            : "Google is not connected yet."}
        </div>
      </div>
      <div style={{height:1,background:C.border,opacity:.75}} />
      <div style={{display:"grid",gap:14}}>
        <div className="card" style={{padding:16,display:"grid",gap:12,background:C.surface}}>
          <div style={{display:"grid",gap:4}}>
            <div style={{fontSize:11,color:C.gold,letterSpacing:".08em",textTransform:"uppercase",fontWeight:700}}>Step 1</div>
            <div style={{fontSize:15,color:C.text,fontWeight:600}}>Connect Google</div>
            <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>
              Connect the church’s Google account once so Shepherd can load and refresh the shared calendars for the whole team.
            </div>
          </div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
            <button className="btn-gold" onClick={connectGoogleCalendar} style={primaryButtonStyle}>
              Connect Google
            </button>
            {googleCalendarLinked && (
              <button
                className="btn-outline"
                onClick={disconnectGoogleCalendar}
                disabled={googleCalendarSaving || googleCalendarsLoading}
                style={secondaryButtonStyle}
                title="Disconnect Google from this church"
              >
                Disconnect Google
              </button>
            )}
          </div>
        </div>
        <div className="card" style={{padding:16,display:"grid",gap:12,background:C.surface}}>
          <div style={{display:"grid",gap:4}}>
            <div style={{fontSize:11,color:C.gold,letterSpacing:".08em",textTransform:"uppercase",fontWeight:700}}>Step 2</div>
            <div style={{fontSize:15,color:C.text,fontWeight:600}}>Choose Shared Calendars</div>
            <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>
              Pick the Google calendars your church wants everyone to see in Shepherd, then save that shared selection.
            </div>
          </div>
          {officialGoogleCalendarIds.length > 0 && (
            <div style={{display:"grid",gap:8}}>
              <label style={{fontSize:12,color:C.muted}}>Current Imported Calendars</label>
              <div style={{display:"grid",gap:8,padding:"12px 14px",border:`1px solid ${C.border}`,borderRadius:12,background:C.card}}>
                {officialGoogleCalendarIds.map((id, index) => (
                  <div key={id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                    <div style={{fontSize:13,color:C.text}}>
                      {officialGoogleCalendarTitleMap[id] || `Calendar ${index + 1}`}
                    </div>
                    <button
                      className="btn-outline"
                      onClick={() => removeImportedGoogleCalendar(id)}
                      disabled={googleCalendarSaving}
                      style={secondaryButtonStyle}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{display:"grid",gap:8}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
              <label style={{fontSize:12,color:C.muted}}>Available Google Calendars</label>
              <button
                className="btn-outline"
                onClick={() => setShowAvailableGoogleCalendars((current) => !current)}
                style={secondaryButtonStyle}
              >
                {showAvailableGoogleCalendars ? "Hide Calendar List" : "Choose Calendars"}
              </button>
            </div>
            {showAvailableGoogleCalendars && (
              <div style={{display:"grid",gap:8,padding:"12px 14px",border:`1px solid ${C.border}`,borderRadius:12,background:C.card}}>
                {!googleCalendars.length && !googleCalendarActionError && (
                  <div style={{fontSize:12,color:C.muted}}>
                    {googleCalendarsLoading ? "Loading calendars..." : "No calendars found"}
                  </div>
                )}
                {googleCalendars.map((entry) => {
                  const checked = selectedGoogleCalendarIds.includes(entry.id);
                  return (
                    <label key={entry.id} style={{display:"flex",alignItems:"center",gap:10,fontSize:13,color:C.text,cursor:"pointer"}}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => setSelectedGoogleCalendarIds((current) => (
                          checked
                            ? current.filter((id) => id !== entry.id)
                            : [...current, entry.id]
                        ))}
                      />
                      <span>{entry.title}{entry.primary ? " (Primary)" : ""}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",gap:10,flexWrap:"wrap"}}>
            <button
              className="btn-gold"
              onClick={saveOfficialGoogleCalendar}
              disabled={googleCalendarSaving || googleCalendarsLoading || !selectedGoogleCalendarIds.length || googleCalendarSelectionUnchanged}
              style={primaryButtonStyle}
            >
              {googleCalendarSaving ? "Saving..." : "Set Calendars"}
            </button>
          </div>
        </div>
        <div className="card" style={{padding:16,display:"grid",gap:12,background:C.surface}}>
          <div style={{display:"grid",gap:4}}>
            <div style={{fontSize:11,color:C.gold,letterSpacing:".08em",textTransform:"uppercase",fontWeight:700}}>Step 3</div>
            <div style={{fontSize:15,color:C.text,fontWeight:600}}>Refresh Shared Calendar</div>
            <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>
              Pull the latest items from the saved Google calendars into Shepherd’s shared calendar view.
            </div>
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",gap:10,flexWrap:"wrap"}}>
            <button
              className="btn-gold"
              onClick={importGoogleCalendar}
              disabled={googleSyncLoading || !officialGoogleCalendarIds.length}
              style={primaryButtonStyle}
            >
              {googleSyncLoading ? "Refreshing..." : "Refresh Shared Calendars"}
            </button>
          </div>
        </div>
      </div>
      {googleCalendarActionMessage && <div style={{fontSize:12,color:C.success}}>{googleCalendarActionMessage}</div>}
      {googleCalendarActionError && <div style={{fontSize:12,color:C.danger}}>{googleCalendarActionError}</div>}
    </div>
  );
}

function AccountPage({ profile, setProfile, church, setChurch, previewUsers, calendarEvents, setCalendarEvents, session, onStartTutorial, activityLogs, refreshActivityLogs, recordActivity }) {
  const canSeeCalendarSettings = canManageCalendarSettings(profile);
  const canManageAccountManagers = canManageChurchTeam(profile, church);
  const canSeeActivityLog = canViewActivityLog(profile);
  const canReviewChurchDeletion = isChurchDeletionPending(church)
    && Array.isArray(church?.deletion_reviewer_user_ids)
    && church.deletion_reviewer_user_ids.includes(profile?.id);
  const canSeeChurchAccount = canManageAccountManagers || canDeleteChurchAccount(profile, church) || canReviewChurchDeletion || canSeeActivityLog;
  const [settingsBranch, setSettingsBranch] = useState(() => {
    if (typeof window === "undefined") return "my-account";
    const stored = window.localStorage.getItem(ACCOUNT_SETTINGS_BRANCH_STORAGE_KEY);
    return ["my-account", "church-account", "calendar"].includes(stored) ? stored : "my-account";
  });
  const [photoMessage, setPhotoMessage] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [photoSaving, setPhotoSaving] = useState(false);
  const [emailForm, setEmailForm] = useState({ nextEmail: profile?.email || "", currentPassword: "" });
  const [emailMessage, setEmailMessage] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", password: "", confirmPassword: "" });
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [resetError, setResetError] = useState("");
  const [emailPreviewMessage, setEmailPreviewMessage] = useState("");
  const [emailPreviewError, setEmailPreviewError] = useState("");
  const [emailPreviewSending, setEmailPreviewSending] = useState(false);
  const [authEmail, setAuthEmail] = useState(profile?.email || "");
  const [deleteForm, setDeleteForm] = useState({ churchName: "", currentPassword: "" });
  const [deleteMessage, setDeleteMessage] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deletingChurch, setDeletingChurch] = useState(false);
  const [selectedAccountManagerIds, setSelectedAccountManagerIds] = useState(() => getChurchAccountManagerUserIds(church));
  const [accountManagerMessage, setAccountManagerMessage] = useState("");
  const [accountManagerError, setAccountManagerError] = useState("");
  const [accountManagerSaving, setAccountManagerSaving] = useState(false);
  const activeSettingsBranch = !canSeeCalendarSettings && settingsBranch === "calendar"
    ? "my-account"
    : !canSeeChurchAccount && settingsBranch === "church-account"
      ? "my-account"
      : settingsBranch;
  const currentAccountManagerIds = useMemo(() => (
    Array.isArray(church?.account_manager_user_ids) && church.account_manager_user_ids.length
      ? church.account_manager_user_ids
      : (church?.account_admin_user_id ? [church.account_admin_user_id] : [])
  ), [church?.account_admin_user_id, church?.account_manager_user_ids]);
  const currentAccountManagerEmails = Array.isArray(church?.account_manager_emails) && church.account_manager_emails.length
    ? church.account_manager_emails
    : (church?.account_admin_email ? [church.account_admin_email] : []);
  const managerCandidates = (previewUsers || []).filter((user) => user?.auth_user_id || user?.email);
  const currentManagerUsers = managerCandidates.filter((user) => currentAccountManagerIds.includes(user.auth_user_id));
  const selectedManagerUsers = managerCandidates.filter((user) => selectedAccountManagerIds.includes(user.auth_user_id));
  const availableManagerCandidates = managerCandidates.filter((user) => !selectedAccountManagerIds.includes(user.auth_user_id));
  const deletionReviewerCandidates = managerCandidates.filter((user) => user.auth_user_id && user.auth_user_id !== profile?.id && isStaffAccountAdmin(user, church));
  const deletionReviewerCandidateIds = deletionReviewerCandidates.map((user) => user.auth_user_id).filter(Boolean);
  const deletionPending = isChurchDeletionPending(church);
  const deletionApprovals = getChurchDeletionApprovals(church);
  const deletionApprovalCount = getChurchDeletionApprovalCount(church);
  const deletionReviewerIds = Array.isArray(church?.deletion_reviewer_user_ids) ? church.deletion_reviewer_user_ids : [];
  const deletionRequiredApprovalCount = getChurchDeletionRequiredApprovalCount(church);
  const deletionDraftReviewerIds = deletionPending ? deletionReviewerIds : deletionReviewerCandidateIds;
  const deletionDraftReviewerCount = deletionDraftReviewerIds.length;
  const currentUserCanApproveDeletion = deletionPending
    && deletionReviewerIds.includes(profile?.id)
    && profile?.id !== church?.deletion_requested_by
    && !deletionApprovals.some((approval) => approval?.reviewer_id === profile?.id);
  const deletionHoldUntil = getChurchDeletionHoldUntil(church);
  const deletionHoldDate = deletionHoldUntil ? new Date(deletionHoldUntil) : null;
  const deletionApprovalRequirementMet = deletionApprovalCount >= deletionRequiredApprovalCount;
  const deletionReadyToFinalize = deletionApprovalRequirementMet && deletionHoldDate && deletionHoldDate.getTime() <= Date.now();
  const deletionHoldLabel = deletionHoldDate && !Number.isNaN(deletionHoldDate.getTime())
    ? deletionHoldDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "";
  const currentUserCanBeManager = !!profile?.id && managerCandidates.some((user) => user.auth_user_id === profile.id);
  const currentUserMissingFromSelection = !!profile?.id && currentUserCanBeManager && !selectedAccountManagerIds.includes(profile.id);
  const accountManagerSelectionUnchanged =
    selectedAccountManagerIds.length === currentAccountManagerIds.length
    && selectedAccountManagerIds.every((id) => currentAccountManagerIds.includes(id))
    && currentAccountManagerIds.every((id) => selectedAccountManagerIds.includes(id));
  const [activityLogOpen, setActivityLogOpen] = useState(true);
  const [activityMonthOpen, setActivityMonthOpen] = useState({});
  const activityMonthGroups = useMemo(() => {
    const groups = new Map();
    (activityLogs || []).forEach((entry) => {
      const parsed = entry?.created_at ? new Date(entry.created_at) : new Date();
      const safeDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
      const key = `${safeDate.getFullYear()}-${String(safeDate.getMonth() + 1).padStart(2, "0")}`;
      const label = safeDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      if (!groups.has(key)) groups.set(key, { key, label, entries: [] });
      groups.get(key).entries.push(entry);
    });
    return [...groups.values()]
      .map((group) => ({
        ...group,
        entries: group.entries.sort((left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0)),
      }))
      .sort((left, right) => right.key.localeCompare(left.key));
  }, [activityLogs]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ACCOUNT_SETTINGS_BRANCH_STORAGE_KEY, activeSettingsBranch);
  }, [activeSettingsBranch]);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      const liveEmail = data?.user?.email || "";
      if (liveEmail) setAuthEmail(liveEmail);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setSelectedAccountManagerIds(currentAccountManagerIds);
  }, [currentAccountManagerIds]);

  useEffect(() => {
    if (!profile?.id || !currentUserCanBeManager) return;
    setSelectedAccountManagerIds((current) => (
      current.includes(profile.id) ? current : [...current, profile.id]
    ));
  }, [profile?.id, currentUserCanBeManager]);

  const addAccountManager = (authUserId) => {
    if (!authUserId) return;
    setAccountManagerError("");
    setAccountManagerMessage("");
    setSelectedAccountManagerIds((current) => current.includes(authUserId) ? current : [...current, authUserId]);
  };

  const isActivityMonthOpen = (monthKey, index) => (
    Object.prototype.hasOwnProperty.call(activityMonthOpen, monthKey)
      ? activityMonthOpen[monthKey]
      : index === 0
  );

  const toggleActivityMonth = (monthKey, index) => {
    const currentOpen = isActivityMonthOpen(monthKey, index);
    setActivityMonthOpen((current) => ({ ...current, [monthKey]: !currentOpen }));
  };

  const removeAccountManager = (authUserId) => {
    setAccountManagerError("");
    setAccountManagerMessage("");
    if (!authUserId) return;
    if (selectedAccountManagerIds.length <= 1) {
      setAccountManagerError("Shepherd needs at least one account manager.");
      return;
    }
    if (authUserId === profile?.id) {
      setAccountManagerError("You can’t remove yourself here by accident. Add another manager first, then transfer intentionally.");
      return;
    }
    setSelectedAccountManagerIds((current) => current.filter((id) => id !== authUserId));
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhotoMessage("");
    setPhotoError("");
    if (!profile?.id) {
      setPhotoError("We couldn't find your account yet.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setPhotoError("Choose an image file for your profile picture.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setPhotoError("Keep profile pictures under 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const photoUrl = String(reader.result || "");
      setPhotoSaving(true);
      try {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ photo_url: photoUrl })
          .eq("id", profile.id);
        if (profileError) throw profileError;
        if (profile?.staff_id) {
          const { error: staffError } = await supabase
            .from("church_staff")
            .update({ photo_url: photoUrl })
            .eq("id", profile.staff_id);
          if (staffError) throw staffError;
        }
        if (typeof window !== "undefined" && profile?.id) {
          window.localStorage.setItem(`shepherd-profile-photo:${profile.id}`, photoUrl);
        }
        setProfile((current) => current ? normalizeAccessUser({ ...current, photo_url: photoUrl }) : current);
        setPhotoMessage("Profile photo updated.");
      } catch (error) {
        setPhotoError(error?.message || "We couldn't save that profile photo yet.");
      } finally {
        setPhotoSaving(false);
        event.target.value = "";
      }
    };
    reader.readAsDataURL(file);
  };

  const removeProfilePhoto = async () => {
    setPhotoMessage("");
    setPhotoError("");
    if (!profile?.id) {
      setPhotoError("We couldn't find your account yet.");
      return;
    }
    setPhotoSaving(true);
    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ photo_url: null })
        .eq("id", profile.id);
      if (profileError) throw profileError;
      if (profile?.staff_id) {
        const { error: staffError } = await supabase
          .from("church_staff")
          .update({ photo_url: null })
          .eq("id", profile.staff_id);
        if (staffError) throw staffError;
      }
      if (typeof window !== "undefined" && profile?.id) {
        window.localStorage.removeItem(`shepherd-profile-photo:${profile.id}`);
      }
      setProfile((current) => current ? normalizeAccessUser({ ...current, photo_url: "" }) : current);
      setPhotoMessage("Profile photo removed.");
    } catch (error) {
      setPhotoError(error?.message || "We couldn't remove that profile photo yet.");
    } finally {
      setPhotoSaving(false);
    }
  };

  const saveAccountManagers = async () => {
    setAccountManagerError("");
    setAccountManagerMessage("");
    if (!church?.id) {
      setAccountManagerError("We couldn't find this church account yet.");
      return;
    }
    if (!selectedAccountManagerIds.length) {
      setAccountManagerError("Choose at least one Shepherd Account Manager.");
      return;
    }
    const selected = managerCandidates.filter((user) => selectedAccountManagerIds.includes(user.auth_user_id));
    const managerEmails = [...new Set(selected.map((user) => String(user.email || "").trim()).filter(Boolean))];
    setAccountManagerSaving(true);
    try {
      const payload = {
        account_admin_user_id: selectedAccountManagerIds[0] || null,
        account_admin_email: managerEmails[0] || null,
        account_manager_user_ids: selectedAccountManagerIds,
        account_manager_emails: managerEmails,
      };
      const { data, error } = await supabase.from("churches").update(payload).eq("id", church.id).select().single();
      if (error) throw error;
      if (data) setChurch?.(data);
      const savedNames = selected.map((user) => user.full_name).filter(Boolean).join(", ");
      await recordActivity?.({
        action: "updated",
        entityType: "church_account",
        entityId: church.id,
        entityTitle: church.name,
        summary: `${profile?.full_name || "A staff member"} updated Shepherd Account Managers${savedNames ? `: ${savedNames}` : ""}.`,
        metadata: { manager_count: selected.length },
      });
      setAccountManagerMessage(`Saved ${selected.length} Shepherd Account Manager${selected.length === 1 ? "" : "s"}.`);
    } catch (error) {
      setAccountManagerError(error?.message || "We couldn't update the Shepherd Account Managers yet.");
    } finally {
      setAccountManagerSaving(false);
    }
  };

  const sendNotificationPreviewEmails = async () => {
    setEmailPreviewMessage("");
    setEmailPreviewError("");
    setEmailPreviewSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-notification-preview", {
        body: {},
      });
      if (error) throw error;
      setEmailPreviewMessage(`Sent ${data?.sent?.length || 0} preview emails to ${data?.recipientEmail || profile?.email || "your Shepherd profile email"}.`);
    } catch (error) {
      setEmailPreviewError(error?.message || "We couldn't send the preview emails yet.");
    } finally {
      setEmailPreviewSending(false);
    }
  };

  const updateEmail = async () => {
    setEmailError("");
    setEmailMessage("");
    if (!emailForm.nextEmail.trim()) {
      setEmailError("Enter a new email address.");
      return;
    }
    if (!emailForm.currentPassword) {
      setEmailError("Enter your current password to verify this change.");
      return;
    }
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: profile?.email || "",
      password: emailForm.currentPassword,
    });
    if (verifyError) {
      setEmailError("Your current password was incorrect.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ email: emailForm.nextEmail.trim() });
    if (error) {
      setEmailError(error.message || "We couldn't update that email.");
      return;
    }
    await supabase.from("profiles").update({ email: emailForm.nextEmail.trim() }).eq("id", profile.id);
    if (profile?.staff_id) {
      await supabase.from("church_staff").update({ email: emailForm.nextEmail.trim() }).eq("id", profile.staff_id);
    }
    setProfile((current) => current ? { ...current, email: emailForm.nextEmail.trim() } : current);
    setEmailForm({ nextEmail: emailForm.nextEmail.trim(), currentPassword: "" });
    setEmailMessage("Email update started. Check the new inbox and complete the verification step before the change is finalized.");
  };

  const updatePassword = async () => {
    setPasswordError("");
    setPasswordMessage("");
    if (!passwordForm.currentPassword) {
      setPasswordError("Enter your current password to verify this change.");
      return;
    }
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: profile?.email || "",
      password: passwordForm.currentPassword,
    });
    if (verifyError) {
      setPasswordError("Your current password was incorrect.");
      return;
    }
    if (!passwordForm.password || passwordForm.password.length < 6) {
      setPasswordError("Use a password with at least 6 characters.");
      return;
    }
    if (passwordForm.password !== passwordForm.confirmPassword) {
      setPasswordError("Your passwords do not match.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: passwordForm.password });
    if (error) {
      setPasswordError(error.message || "We couldn't update that password.");
      return;
    }
    setPasswordForm({ currentPassword: "", password: "", confirmPassword: "" });
    setPasswordMessage("Password updated after verification.");
  };

  const sendPasswordReset = async () => {
    setResetError("");
    setResetMessage("");
    const recoveryEmail = authEmail || profile?.email || "";
    if (!recoveryEmail) {
      setResetError("There is no email attached to this account yet.");
      return;
    }
    const redirectTo = typeof window !== "undefined" ? window.location.origin : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(
      recoveryEmail,
      redirectTo ? { redirectTo } : undefined
    );
    if (error) {
      setResetError(error.message || "We couldn't send that reset email.");
      return;
    }
    setResetMessage("Password reset email sent. Use the link in that email to choose a new password.");
  };

  const requestChurchDeletion = async () => {
    setDeleteError("");
    setDeleteMessage("");
    if (!canDeleteChurchAccount(profile, church)) {
      setDeleteError("Only Shepherd Account Managers can request church account deletion.");
      return;
    }
    if (!church?.id) {
      setDeleteError("We couldn't find this church account.");
      return;
    }
    if (deletionPending) {
      setDeleteError("A deletion request is already pending for this church account.");
      return;
    }
    if (!deleteForm.churchName.trim() || deleteForm.churchName.trim() !== (church?.name || "")) {
      setDeleteError("Type the church name exactly to confirm deletion.");
      return;
    }
    if (!deleteForm.currentPassword) {
      setDeleteError("Enter your current password to start this deletion request.");
      return;
    }
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: authEmail || profile?.email || "",
      password: deleteForm.currentPassword,
    });
    if (verifyError) {
      setDeleteError("Your current password was incorrect.");
      return;
    }
    setDeletingChurch(true);
    const reviewerIds = deletionReviewerCandidateIds;
    const holdUntil = reviewerIds.length === 0
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : null;
    const payload = {
      deletion_requested_at: new Date().toISOString(),
      deletion_requested_by: profile.id,
      deletion_requested_by_name: profile.full_name || profile.email || "Shepherd Account Manager",
      deletion_reviewer_user_ids: reviewerIds,
      deletion_approvals: [],
      deletion_hold_until: holdUntil,
    };
    const { data, error } = await supabase.from("churches").update(payload).eq("id", church.id).select().single();
    setDeletingChurch(false);
    if (error) {
      setDeleteError(error.message || "We couldn't start that deletion request.");
      return;
    }
    if (data) setChurch?.(data);
    await recordActivity?.({
      action: "requested",
      entityType: "church_account_deletion",
      entityId: church.id,
      entityTitle: church.name,
      summary: `${profile?.full_name || "A Shepherd Account Manager"} requested deletion of ${church.name}.`,
      metadata: { reviewers: reviewerIds },
    });
    await Promise.all(deletionReviewerCandidates.map((user) => createPersistentNotification({
      churchId: church.id,
      actorProfile: profile,
      recipientProfileId: user.auth_user_id,
      type: "church_deletion_review_requested",
      title: "Church Deletion Review Requested",
      detail: `${profile?.full_name || "A Shepherd Account Manager"} requested deletion of ${church.name}. Open Church Account to approve or undo this request.`,
      target: "account",
      sourceKey: `${church.id}:church-deletion-review`,
      data: { churchId: church.id, churchName: church.name },
    })));
    setDeleteForm({ churchName: "", currentPassword: "" });
    setDeleteMessage(reviewerIds.length === 0
      ? "Deletion request started. There are no other Shepherd Account Managers, so the 30-day hold has started and can still be undone before final deletion."
      : "Deletion request started. All other Shepherd Account Managers must approve it before the 30-day hold begins.");
  };

  const approveChurchDeletion = async () => {
    setDeleteError("");
    setDeleteMessage("");
    if (!currentUserCanApproveDeletion) {
      setDeleteError("You are not one of the selected reviewers for this deletion request.");
      return;
    }
    const nextApproval = {
      reviewer_id: profile.id,
      reviewer_name: profile.full_name || profile.email || "Reviewer",
      approved_at: new Date().toISOString(),
    };
    const nextApprovals = [...deletionApprovals, nextApproval];
    const nextApprovalRequirementMet = nextApprovals.length >= deletionRequiredApprovalCount;
    const nextPayload = {
      deletion_approvals: nextApprovals,
      deletion_hold_until: nextApprovalRequirementMet && !church?.deletion_hold_until
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : church?.deletion_hold_until || null,
    };
    const { data, error } = await supabase.from("churches").update(nextPayload).eq("id", church.id).select().single();
    if (error) {
      setDeleteError(error.message || "We couldn't save that deletion approval.");
      return;
    }
    if (data) setChurch?.(data);
    await recordActivity?.({
      action: "approved",
      entityType: "church_account_deletion",
      entityId: church.id,
      entityTitle: church.name,
      summary: `${profile?.full_name || "A reviewer"} approved deletion of ${church.name}.`,
      metadata: { approval_count: nextApprovals.length },
    });
    setDeleteMessage(nextApprovalRequirementMet ? "Approval saved. The 30-day hold has started." : "Approval saved. Waiting on the remaining Shepherd Account Managers.");
  };

  const cancelChurchDeletion = async () => {
    setDeleteError("");
    setDeleteMessage("");
    if (!canDeleteChurchAccount(profile, church)) {
      setDeleteError("Only Shepherd Account Managers can cancel this deletion request.");
      return;
    }
    const payload = {
      deletion_requested_at: null,
      deletion_requested_by: null,
      deletion_requested_by_name: null,
      deletion_reviewer_user_ids: [],
      deletion_approvals: [],
      deletion_hold_until: null,
    };
    const { data, error } = await supabase.from("churches").update(payload).eq("id", church.id).select().single();
    if (error) {
      setDeleteError(error.message || "We couldn't cancel that deletion request.");
      return;
    }
    if (data) setChurch?.(data);
    await recordActivity?.({
      action: "cancelled",
      entityType: "church_account_deletion",
      entityId: church.id,
      entityTitle: church.name,
      summary: `${profile?.full_name || "A Shepherd Account Manager"} cancelled deletion of ${church.name}.`,
    });
    await Promise.all(currentManagerUsers
      .filter((user) => user.auth_user_id && user.auth_user_id !== profile?.id)
      .map((user) => createPersistentNotification({
        churchId: church.id,
        actorProfile: profile,
        recipientProfileId: user.auth_user_id,
        type: "church_deletion_cancelled",
        title: "Church Deletion Request Cancelled",
        detail: `${profile?.full_name || "A Shepherd Account Manager"} undid the deletion request for ${church.name}.`,
        target: "account",
        sourceKey: `${church.id}:church-deletion-cancelled:${Date.now()}`,
        data: { churchId: church.id, churchName: church.name },
      })));
    setDeleteMessage("Deletion request cancelled.");
  };

  const finalizeChurchDeletion = async () => {
    setDeleteError("");
    setDeleteMessage("");
    if (!deletionReadyToFinalize) {
      setDeleteError("This church account is not ready for final deletion yet.");
      return;
    }
    if (!confirmDestructiveAction(`Permanently delete ${church?.name || "this church"} now? This cannot be undone.`)) return;
    setDeletingChurch(true);
    const { error } = await supabase.rpc("delete_church_account", { p_church_id: church.id });
    setDeletingChurch(false);
    if (error) {
      setDeleteError(error.message || "We couldn't permanently delete this church account.");
      return;
    }
    setDeleteMessage("Church account deleted. Signing out...");
    await supabase.auth.signOut();
    if (typeof window !== "undefined") window.location.reload();
  };

  return (
    <div className="fadeIn mobile-pad" style={widePageStyle}>
      <div style={{marginBottom:24,textAlign:"left"}}>
        <h2 style={pageTitleStyle}>Account</h2>
        <p style={{color:C.muted,fontSize:13,marginTop:4}}>
          {activeSettingsBranch === "calendar"
            ? "Manage the shared church calendar connection and imported Google calendars."
            : activeSettingsBranch === "church-account"
              ? "Manage church-level account leadership and protected church controls."
              : "Manage your profile photo, email, password, and account recovery."}
        </p>
      </div>
      <div className="mobile-stack" style={{display:"grid",gridTemplateColumns:"320px 1fr",gap:18,alignItems:"start"}}>
        <div style={{display:"grid",gap:18,alignContent:"start",alignSelf:"start"}}>
          <div className="card" style={{padding:22,textAlign:"left"}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center"}}>
              <div style={{width:112,height:112,borderRadius:"50%",background:`linear-gradient(135deg,${C.goldDim},${C.gold})`,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",fontSize:34,fontWeight:700,color:"#0f1117"}}>
                {profile?.photo_url ? <img src={profile.photo_url} alt={profile.full_name || "User"} style={{width:"100%",height:"100%",objectFit:"cover"}} /> : (profile?.full_name?.[0] || "U")}
              </div>
              <div style={{marginTop:14,fontSize:18,fontWeight:600,color:C.text}}>{profile?.full_name || "User"}</div>
              <div style={{marginTop:4,fontSize:12,color:C.muted}}>{roleLabel(profile)}</div>
              <div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center",marginTop:18}}>
              <label className="btn-outline" style={{cursor:"pointer"}}>
                {photoSaving ? "Saving..." : (profile?.photo_url ? "Upload New Photo" : "Upload Photo")}
                <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{display:"none"}} />
              </label>
              {profile?.photo_url && (
                <button className="btn-outline" onClick={removeProfilePhoto} disabled={photoSaving}>
                  Remove Photo
                </button>
              )}
              </div>
              {photoError && <div style={{marginTop:10,fontSize:12,color:C.danger,textAlign:"center"}}>{photoError}</div>}
              {photoMessage && <div style={{marginTop:10,fontSize:12,color:C.success,textAlign:"center"}}>{photoMessage}</div>}
              <button className="btn-gold-compact" onClick={onStartTutorial} style={{marginTop:16,justifyContent:"center"}}>
                Open Walkthrough
              </button>
            </div>
          </div>
          <div className="card" style={{padding:18,textAlign:"left",display:"grid",gap:10,alignContent:"start"}}>
            <button
              className={activeSettingsBranch === "my-account" ? "btn-gold" : "btn-outline"}
              onClick={() => setSettingsBranch("my-account")}
              style={{justifyContent:"flex-start",textAlign:"left",width:"100%",minHeight:44}}
            >
              My Account
            </button>
            <button
              className={activeSettingsBranch === "church-account" ? "btn-gold" : "btn-outline"}
              onClick={() => canSeeChurchAccount && setSettingsBranch("church-account")}
              style={{justifyContent:"space-between",textAlign:"left",width:"100%",minHeight:44}}
            >
              <span>Church Account</span>
              {!canSeeChurchAccount && <Icons.lock />}
            </button>
            <button
              className={activeSettingsBranch === "calendar" ? "btn-gold" : "btn-outline"}
              onClick={() => canSeeCalendarSettings && setSettingsBranch("calendar")}
              style={{justifyContent:"space-between",textAlign:"left",width:"100%",minHeight:44}}
            >
              <span>Calendar Settings</span>
              {!canSeeCalendarSettings && <Icons.lock />}
            </button>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:18}}>
          {activeSettingsBranch === "calendar" ? (
            <CalendarSettingsPanel
              profile={profile}
              church={church}
              setChurch={setChurch}
              calendarEvents={calendarEvents}
              setCalendarEvents={setCalendarEvents}
              session={session}
            />
          ) : activeSettingsBranch === "church-account" ? (
            <>
              <div className="card" style={{padding:22,textAlign:"left"}}>
                {canManageAccountManagers ? (
                  <div style={{display:"grid",gap:12}}>
                    <div>
                      <h3 style={sectionTitleStyle}>Shepherd Account Managers</h3>
                      <p style={{fontSize:12,color:C.muted,marginTop:6,lineHeight:1.6}}>
                        Manage this like a live list. Add the people who should keep full Shepherd account control, and remove them intentionally instead of replacing the whole list by accident.
                      </p>
                    </div>
                    {currentUserMissingFromSelection && (
                      <div style={{padding:"10px 12px",border:`1px solid ${C.goldDim}`,borderRadius:12,background:C.goldGlow,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                        <div style={{fontSize:12,color:C.text,lineHeight:1.6}}>
                          Your account was not in the current manager draft, so Shepherd added you back into the pending list to protect against accidental lockout.
                        </div>
                        <button className="btn-outline" onClick={() => addAccountManager(profile.id)}>Keep Me Included</button>
                      </div>
                    )}
                    <div style={{display:"grid",gap:12}}>
                      <div style={{padding:"12px 14px",border:`1px solid ${C.border}`,borderRadius:12,background:C.surface,display:"grid",gap:10}}>
                        <div style={{fontSize:12,color:C.muted}}>Current Managers</div>
                        {selectedManagerUsers.length === 0 ? (
                          <div style={{fontSize:12,color:C.muted}}>No managers selected yet.</div>
                        ) : selectedManagerUsers.map((user) => (
                          <div key={`selected-${user.id}`} style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",alignItems:"center",gap:12}}>
                            <div style={{fontSize:13,color:C.text,lineHeight:1.6,minWidth:0}}>
                              {user.full_name}
                              {user.email ? <span style={{color:C.muted}}> • {user.email}</span> : ""}
                              {user.auth_user_id === profile?.id ? <span style={{color:C.gold}}> • You</span> : ""}
                            </div>
                            <button className="btn-outline" onClick={() => removeAccountManager(user.auth_user_id)} disabled={user.auth_user_id === profile?.id} style={{whiteSpace:"nowrap",padding:"8px 12px"}}>
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                      <div style={{padding:"12px 14px",border:`1px solid ${C.border}`,borderRadius:12,background:C.surface,display:"grid",gap:10}}>
                        <div style={{fontSize:12,color:C.muted}}>Add Another Manager</div>
                        {availableManagerCandidates.length === 0 ? (
                          <div style={{fontSize:12,color:C.muted}}>Everyone eligible is already in the manager list.</div>
                        ) : availableManagerCandidates.map((user) => (
                          <div key={`available-${user.id}`} style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",alignItems:"center",gap:12}}>
                            <div style={{fontSize:13,color:C.text,lineHeight:1.6,minWidth:0}}>
                              {user.full_name}
                              {user.email ? <span style={{color:C.muted}}> • {user.email}</span> : ""}
                            </div>
                            <button className="btn-outline" onClick={() => addAccountManager(user.auth_user_id)} style={{whiteSpace:"nowrap",padding:"8px 12px"}}>
                              Add as Manager
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>
                      Saved managers: {currentManagerUsers.length ? currentManagerUsers.map((user) => user.full_name).join(", ") : (currentAccountManagerEmails.length ? currentAccountManagerEmails.join(", ") : "None selected yet")}
                    </div>
                    {accountManagerError && <div style={{fontSize:12,color:C.danger}}>{accountManagerError}</div>}
                    {accountManagerMessage && <div style={{fontSize:12,color:C.success}}>{accountManagerMessage}</div>}
                    <div style={{display:"flex",justifyContent:"flex-end"}}>
                      <button
                        className="btn-gold"
                        onClick={saveAccountManagers}
                        disabled={accountManagerSaving || !selectedAccountManagerIds.length || accountManagerSelectionUnchanged}
                      >
                        {accountManagerSaving ? "Saving..." : "Save Shepherd Account Managers"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{display:"grid",gap:10}}>
                    <h3 style={sectionTitleStyle}>Church Account</h3>
                    <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>
                      This area holds church-level account controls like Shepherd Account Managers. Your current role does not have access to edit these settings.
                    </div>
                  </div>
                )}
              </div>
              {canSeeActivityLog && (
                <div className="card" style={{padding:22,textAlign:"left"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap",marginBottom:activityLogOpen ? 14 : 0}}>
                    <div>
                      <h3 style={sectionTitleStyle}>Activity Log</h3>
                      {activityLogOpen && <p style={{fontSize:12,color:C.muted,marginTop:6,lineHeight:1.6}}>
                        A church-wide record of meaningful changes across Shepherd. This logs important saves, assignments, status moves, approvals, deletions, and account changes.
                      </p>}
                    </div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"flex-end"}}>
                      {activityLogOpen && (
                        <button className="btn-outline" onClick={refreshActivityLogs} style={{whiteSpace:"nowrap"}}>
                          Refresh
                        </button>
                      )}
                      <button className="btn-gold-compact" onClick={() => setActivityLogOpen((current) => !current)} style={{whiteSpace:"nowrap"}}>
                        {activityLogOpen ? "Collapse" : `Expand (${(activityLogs || []).length})`}
                      </button>
                    </div>
                  </div>
                  {activityLogOpen && <div style={{display:"grid",gap:10}}>
                    {(activityLogs || []).length === 0 ? (
                      <div style={{padding:"18px 14px",border:`1px dashed ${C.border}`,borderRadius:12,color:C.muted,fontSize:12,textAlign:"center"}}>
                        No activity has been recorded yet. New meaningful changes will appear here.
                      </div>
                    ) : activityMonthGroups.map((group, groupIndex) => {
                      const monthOpen = isActivityMonthOpen(group.key, groupIndex);
                      return (
                        <div key={group.key} style={{border:`1px solid ${C.border}`,borderRadius:14,background:C.surface,overflow:"hidden"}}>
                          <button
                            type="button"
                            onClick={() => toggleActivityMonth(group.key, groupIndex)}
                            style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,padding:"12px 14px",border:"none",background:monthOpen ? C.card : "transparent",color:C.text,cursor:"pointer",textAlign:"left"}}
                          >
                            <span style={{fontSize:14,fontWeight:600,color:monthOpen ? C.gold : C.text}}>{group.label}</span>
                            <span style={{fontSize:12,color:C.muted,whiteSpace:"nowrap"}}>{group.entries.length} {group.entries.length === 1 ? "item" : "items"} • {monthOpen ? "Collapse" : "Expand"}</span>
                          </button>
                          {monthOpen && (
                            <div style={{display:"grid",gap:8,padding:12,borderTop:`1px solid ${C.border}`}}>
                              {group.entries.slice(0, 60).map((entry) => (
                                <div key={entry.id} style={{padding:"12px 14px",border:`1px solid ${C.border}`,borderRadius:12,background:C.card,display:"grid",gap:5}}>
                                  <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"baseline",flexWrap:"wrap"}}>
                                    <div style={{fontSize:13,color:C.text,fontWeight:600,lineHeight:1.5}}>{entry.summary}</div>
                                    <div style={{fontSize:11,color:C.muted,whiteSpace:"nowrap"}}>{fmtActivityDate(entry.created_at)}</div>
                                  </div>
                                  <div style={{fontSize:11,color:C.muted,lineHeight:1.5}}>
                                    {entry.actor_name || "Shepherd"} • {String(entry.entity_type || "system").replace(/_/g, " ")}
                                    {entry.entity_title ? ` • ${entry.entity_title}` : ""}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>}
                </div>
              )}
	              {(canDeleteChurchAccount(profile, church) || canReviewChurchDeletion) && (
	                <div className="card" style={{padding:22,textAlign:"left",border:`1px solid rgba(224,82,82,.35)`}}>
	                  <h3 style={{...sectionTitleStyle,color:C.danger}}>Church Account Deletion</h3>
	                  <p style={{fontSize:12,color:C.muted,marginTop:6,lineHeight:1.6}}>
	                    Only Shepherd Account Managers can start this process. All other Shepherd Account Managers must approve, then Shepherd holds the account for 30 days before final deletion. Any Shepherd Account Manager can undo the request during that hold.
	                  </p>
                  <div style={{display:"grid",gap:12,marginTop:16}}>
                    {deletionPending ? (
                      <>
                        <div style={{padding:"12px 14px",border:`1px solid ${C.border}`,borderRadius:12,background:C.surface,display:"grid",gap:8}}>
                          <div style={{fontSize:13,color:C.text,fontWeight:700}}>Deletion Request Pending</div>
                          <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>
                            Requested by {church?.deletion_requested_by_name || "a Shepherd Account Manager"} on {fmtActivityDate(church?.deletion_requested_at)}.
	                          </div>
	                          <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>
	                            Reviewer approvals: <span style={{color:C.text}}>{deletionApprovalCount}/{deletionRequiredApprovalCount}</span>
	                            {deletionHoldLabel
	                              ? <span> • 30-day hold ends {deletionHoldLabel}</span>
	                              : deletionRequiredApprovalCount === 0
	                                ? <span> • 30-day hold begins immediately because there are no other managers</span>
	                                : <span> • 30-day hold begins after all other managers approve</span>}
	                          </div>
                          {deletionApprovals.length > 0 && (
                            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                              {deletionApprovals.map((approval) => (
                                <span key={`${approval.reviewer_id}-${approval.approved_at}`} className="badge" style={{background:C.goldGlow,color:C.gold,border:`1px solid ${C.goldDim}`}}>
                                  {approval.reviewer_name || "Reviewer"} approved
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        {currentUserCanApproveDeletion && (
                          <button className="btn-gold" onClick={approveChurchDeletion}>
                            Approve Deletion Request
                          </button>
                        )}
                        {canDeleteChurchAccount(profile, church) && (
                          <div style={{display:"flex",gap:10,justifyContent:"flex-end",flexWrap:"wrap"}}>
	                            <button className="btn-gold" onClick={cancelChurchDeletion}>
	                              Undo Deletion Request
	                            </button>
                            <button className="btn-outline" onClick={finalizeChurchDeletion} disabled={!deletionReadyToFinalize || deletingChurch} style={{borderColor:C.danger,color:C.danger,opacity:deletionReadyToFinalize ? 1 : .55}}>
                              {deletingChurch ? "Deleting..." : "Permanently Delete After Hold"}
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <input
                          className="input-field"
                          value={deleteForm.churchName}
                          onChange={(e)=>setDeleteForm({...deleteForm,churchName:e.target.value})}
                          placeholder={`Type "${church?.name || "church name"}" to confirm`}
                        />
                        <input
                          className="input-field"
                          type="password"
                          value={deleteForm.currentPassword}
                          onChange={(e)=>setDeleteForm({...deleteForm,currentPassword:e.target.value})}
                          placeholder="Current password"
                        />
	                        <div style={{padding:"12px 14px",border:`1px solid ${C.border}`,borderRadius:12,background:C.surface,display:"grid",gap:10}}>
	                          <div style={{fontSize:12,color:C.muted}}>Required Approval</div>
	                          {deletionDraftReviewerCount === 0 ? (
	                            <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>
	                              You are currently the only Shepherd Account Manager. If you request deletion, the 30-day hold starts immediately and can still be undone before final deletion.
	                            </div>
	                          ) : (
	                            <>
	                              <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>
	                                All other Shepherd Account Managers will be notified by email and must approve before the 30-day hold begins.
	                              </div>
	                              {deletionReviewerCandidates.map((user) => (
	                                <div key={`deletion-reviewer-${user.auth_user_id}`} style={{display:"flex",alignItems:"center",gap:10,fontSize:13,color:C.text}}>
	                                  <span style={{width:16,height:16,borderRadius:4,border:`1px solid ${C.goldDim}`,background:C.goldGlow,color:C.gold,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:11}}>✓</span>
	                                  {user.full_name}
	                                  {user.email ? <span style={{color:C.muted}}>• {user.email}</span> : ""}
	                                </div>
	                              ))}
	                            </>
	                          )}
	                        </div>
                        <div style={{display:"flex",justifyContent:"flex-end"}}>
                          <button className="btn-outline" onClick={requestChurchDeletion} disabled={deletingChurch} style={{borderColor:C.danger,color:C.danger}}>
                            {deletingChurch ? "Starting Request..." : "Request Church Account Deletion"}
                          </button>
                        </div>
                      </>
                    )}
                    {deleteError && <div style={{fontSize:12,color:C.danger}}>{deleteError}</div>}
                    {deleteMessage && <div style={{fontSize:12,color:C.success}}>{deleteMessage}</div>}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="card" style={{padding:22,textAlign:"left"}}>
                <h3 style={sectionTitleStyle}>Email</h3>
                <p style={{fontSize:12,color:C.muted,marginTop:6,lineHeight:1.6}}>Change the email attached to your Shepherd account. We verify this with your current password first, and the new inbox should still confirm the change.</p>
                <div style={{display:"flex",flexDirection:"column",gap:12,marginTop:16}}>
                  <input className="input-field" type="email" value={emailForm.nextEmail} onChange={(e)=>setEmailForm({...emailForm,nextEmail:e.target.value})} placeholder="New email address" />
                  <input className="input-field" type="password" value={emailForm.currentPassword} onChange={(e)=>setEmailForm({...emailForm,currentPassword:e.target.value})} placeholder="Current password" />
                  <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>
                    If you do not remember your current password, use the recovery helper below first.
                  </div>
                  {emailError && <div style={{fontSize:12,color:C.danger}}>{emailError}</div>}
                  {emailMessage && <div style={{fontSize:12,color:C.success}}>{emailMessage}</div>}
                  <div style={{display:"flex",justifyContent:"flex-end"}}>
                    <button className="btn-gold" onClick={updateEmail}>Change Email</button>
                  </div>
                </div>
              </div>
              <div className="card" style={{padding:22,textAlign:"left"}}>
                <h3 style={sectionTitleStyle}>Password</h3>
                <p style={{fontSize:12,color:C.muted,marginTop:6,lineHeight:1.6}}>Update your password for future logins. We verify the current password before allowing the new one.</p>
                <div style={{display:"flex",flexDirection:"column",gap:12,marginTop:16}}>
                  <input className="input-field" type="password" value={passwordForm.currentPassword} onChange={(e)=>setPasswordForm({...passwordForm,currentPassword:e.target.value})} placeholder="Current password" />
                  <input className="input-field" type="password" value={passwordForm.password} onChange={(e)=>setPasswordForm({...passwordForm,password:e.target.value})} placeholder="New password" />
                  <input className="input-field" type="password" value={passwordForm.confirmPassword} onChange={(e)=>setPasswordForm({...passwordForm,confirmPassword:e.target.value})} placeholder="Confirm new password" />
                  {passwordError && <div style={{fontSize:12,color:C.danger}}>{passwordError}</div>}
                  {passwordMessage && <div style={{fontSize:12,color:C.success}}>{passwordMessage}</div>}
                  <div style={{display:"flex",justifyContent:"flex-end"}}>
                    <button className="btn-gold" onClick={updatePassword}>Change Password</button>
                  </div>
                </div>
              </div>
              <div className="card" style={{padding:22,textAlign:"left"}}>
                <h3 style={sectionTitleStyle}>Password Recovery</h3>
                <p style={{fontSize:12,color:C.muted,marginTop:6,lineHeight:1.6}}>
                  If you cannot remember your current password, send yourself a reset email. Use the link in that email to create a new password, then come back here for any secure account changes you still need to make.
                </p>
                <div style={{display:"flex",flexDirection:"column",gap:12,marginTop:16}}>
                  <div style={{fontSize:12,color:C.muted}}>
                    Reset email will be sent to <span style={{color:C.text,fontWeight:600}}>{authEmail || profile?.email || "the email on this account"}</span>.
                  </div>
                  <div style={{display:"flex",justifyContent:"flex-end"}}>
                    <button className="btn-outline" onClick={sendPasswordReset}>Send Password Reset Email</button>
                  </div>
                  {resetError && <div style={{fontSize:12,color:C.danger}}>{resetError}</div>}
                  {resetMessage && <div style={{fontSize:12,color:C.success}}>{resetMessage}</div>}
                </div>
              </div>
              <div className="card" style={{padding:22,textAlign:"left"}}>
                <h3 style={sectionTitleStyle}>Notification Email Preview</h3>
                <p style={{fontSize:12,color:C.muted,marginTop:6,lineHeight:1.6}}>
                  Send yourself one sample of each Shepherd notification email so you can judge the inbox layout before the team relies on it.
                </p>
                <div style={{display:"flex",flexDirection:"column",gap:12,marginTop:16}}>
                  <div style={{fontSize:12,color:C.muted}}>
                    Preview emails will be sent to <span style={{color:C.text,fontWeight:600}}>{profile?.email || authEmail || "your Shepherd profile email"}</span>.
                  </div>
                  <div style={{display:"flex",justifyContent:"flex-end"}}>
                    <button className="btn-gold" onClick={sendNotificationPreviewEmails} disabled={emailPreviewSending} style={{opacity:emailPreviewSending ? 0.75 : 1}}>
                      {emailPreviewSending ? "Sending Previews..." : "Send Preview Emails"}
                    </button>
                  </div>
                  {emailPreviewError && <div style={{fontSize:12,color:C.danger}}>{emailPreviewError}</div>}
                  {emailPreviewMessage && <div style={{fontSize:12,color:C.success}}>{emailPreviewMessage}</div>}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function NotificationsPage({ notifications, unreadCount, markAllRead, markRead, setActive, browserPermission, enableBrowserNotifications }) {
  return (
    <div className="fadeIn mobile-pad" style={widePageStyle}>
      <div className="page-header" style={{display:"grid",gridTemplateColumns:"1fr auto",alignItems:"start",gap:16,marginBottom:24}}>
        <div style={{justifySelf:"start",textAlign:"left"}}>
          <h2 style={pageTitleStyle}>Notifications</h2>
          <p style={{color:C.muted,fontSize:13,marginTop:4}}>
            {unreadCount} unread notifications for your account
          </p>
        </div>
        <div className="page-actions" style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"flex-end"}}>
          {browserPermission !== "granted" && (
            <button className="btn-outline" onClick={enableBrowserNotifications}>Enable Browser Alerts</button>
          )}
          <button className="btn-gold" onClick={markAllRead}>Mark All Read</button>
        </div>
      </div>
      <div className="card" style={{padding:22}}>
        {notifications.length === 0 && <p style={{color:C.muted,fontSize:13}}>No notifications right now.</p>}
        {notifications.map((item) => (
          <div key={item.id} style={{display:"grid",gridTemplateColumns:"12px 1fr auto",gap:14,alignItems:"start",padding:"14px 0",borderBottom:`1px solid ${C.border}`}}>
            <div style={{width:10,height:10,borderRadius:"50%",background:item.tone,marginTop:6}} />
            <div style={{textAlign:"left"}}>
              <div style={{fontSize:14,fontWeight:600,color:C.text}}>{item.title}</div>
              <div style={{fontSize:12,color:C.muted,marginTop:4,lineHeight:1.6}}>{item.detail}</div>
            </div>
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              <button className="btn-outline" onClick={()=>{markRead(item.id); setActive(item.target || "tasks");}} style={{padding:"6px 10px",fontSize:12}}>
                Open
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrashPage({ trashItems, clearTrash, restoreTrashItem }) {
  const sortedItems = [...(trashItems || [])].sort((a, b) => new Date(b.deleted_at || 0) - new Date(a.deleted_at || 0));

  return (
    <div className="fadeIn mobile-pad" style={widePageStyle}>
      <div className="page-header" style={{display:"grid",gridTemplateColumns:"1fr auto",alignItems:"start",gap:16,marginBottom:24}}>
        <div style={{justifySelf:"start",textAlign:"left"}}>
          <h2 style={pageTitleStyle}>Trash</h2>
          <p style={{color:C.muted,fontSize:13,marginTop:4}}>
            Deleted items are held here until you are ready to clear them.
          </p>
        </div>
        <div className="page-actions" style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"flex-end"}}>
          <button className="btn-outline" onClick={clearTrash} disabled={sortedItems.length === 0}>
            Clear Trash
          </button>
        </div>
      </div>
      <div className="card" style={{padding:22}}>
        {sortedItems.length === 0 && <p style={{color:C.muted,fontSize:13}}>Trash is empty right now.</p>}
        {sortedItems.map((item) => (
          <div key={item.id} style={{display:"grid",gridTemplateColumns:"1fr auto",gap:16,alignItems:"start",padding:"14px 0",borderBottom:`1px solid ${C.border}`}}>
            <div style={{textAlign:"left"}}>
              <div style={{fontSize:14,fontWeight:600,color:C.text}}>{item.title || "Untitled item"}</div>
              <div style={{fontSize:12,color:C.muted,marginTop:4,lineHeight:1.6}}>
                {item.entity_label} from {item.source_label}
                {item.deleted_by ? ` • deleted by ${item.deleted_by}` : ""}
              </div>
            </div>
            <div style={{display:"grid",justifyItems:"end",gap:10}}>
              <div style={{fontSize:11,color:C.muted,textAlign:"right"}}>
                {item.deleted_at ? new Date(item.deleted_at).toLocaleString("en-US", { month:"short", day:"numeric", hour:"numeric", minute:"2-digit" }) : "—"}
              </div>
              <button className="btn-gold-compact" onClick={() => restoreTrashItem?.(item)}>
                Restore
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const FAQ_CATEGORY_ORDER = ["Dashboard", "Focus Bar", "Tasks", "Frameworks", "Event Planning", "Calendar", "Calendar Settings", "Google Calendar", "Operations", "Access", "Finances", "Trash", "Account"];
const FAQ_ITEMS = [
  { tag: "Dashboard", question: "What should I check first on the Dashboard?", answer: "Start with unread notifications, then check Church Lock Up and your Focus Bar. The Dashboard is meant to show what needs your attention before you jump into a board." },
  { tag: "Dashboard", question: "Why do some dashboard cards collapse?", answer: "Collapsible cards keep the Dashboard from becoming noisy. Open the sections you need that day and collapse the ones that are not immediately relevant." },
  { tag: "Dashboard", question: "What is Team Snapshot for?", answer: "Team Snapshot gives senior leadership a quick view of what staff are actively focused on and what else is on their plate. It is designed for clarity, not surveillance." },
  { tag: "Dashboard", question: "Why do I see Church Lock Up on my Dashboard?", answer: "Everyone benefits from knowing who is assigned to lock up for the current week. The Dashboard card makes that assignment visible without forcing staff into Operations." },
  { tag: "Dashboard", question: "Why does my Dashboard look different from another staff member's?", answer: "Shepherd adjusts dashboard content based on role, assignments, notifications, and permissions. Admins and senior leaders may see leadership tools that other staff do not need." },

  { tag: "Focus Bar", question: "Why does Shepherd ask me to choose a current focus?", answer: "The Focus Bar is a manual signal, not an automatic tracker. Choose the task that has your attention right now so your dashboard and leadership views reflect your current work." },
  { tag: "Focus Bar", question: "Who can see what I select in the Focus Bar?", answer: "You can see it on your Dashboard. Senior Pastor and Admin-style leadership views can see staff focus through Team Snapshot so they understand workload without another check-in." },
  { tag: "Focus Bar", question: "How do I unselect my current focus?", answer: "Click the selected task again or use the unselect option in the Focus Bar. Once unselected, Shepherd should no longer mark that task as what you are working on." },
  { tag: "Focus Bar", question: "Does Shepherd automatically pick my focus?", answer: "No. Shepherd may show tasks that are available to choose, but the actual focus is intentionally manual so it reflects your real attention in the moment." },
  { tag: "Focus Bar", question: "Why does a focus item show an event name?", answer: "If the task comes from event planning, Shepherd shows the event name as context. This keeps the task title readable while still showing what event it belongs to." },

  { tag: "Tasks", question: "What happens when a task becomes overdue?", answer: "A task is considered overdue after its due date has passed. Shepherd notifies the assignee and the Senior Pastor so the right people know the item needs attention." },
  { tag: "Tasks", question: "Where should I change a task's completion status?", answer: "Use the completion status selector on the task card or task detail view. The status should reflect where the task actually is: to do, in progress, in review, or done." },
  { tag: "Tasks", question: "When should I use comments on a task?", answer: "Use comments when a decision, update, question, or approval context should stay attached to the work. That keeps the conversation from getting lost in text messages." },
  { tag: "Tasks", question: "Why are some tasks connected to review?", answer: "Some tasks require approval before they are considered complete. Shepherd keeps the task visible through the review workflow so the assignee and reviewer know what is still pending." },
  { tag: "Tasks", question: "Can I delete a task by accident?", answer: "Delete actions use the trash flow where possible, so deleted items can be restored from Trash. That gives the church a safety net for accidental removals." },

  { tag: "Frameworks", question: "What is Frameworks for?", answer: "Frameworks is the entry point for Shepherd's workflow boards. Use it when you need to decide whether the work belongs in events, operations, content, or another board." },
  { tag: "Frameworks", question: "Is Frameworks the same as Workspaces?", answer: "Yes. The app was renamed from Workspaces to Frameworks so the purpose is clearer for staff." },
  { tag: "Frameworks", question: "Which card should I open for a new event?", answer: "Use Event Requests if the event still needs approval. Use Event Planning when you are building the plan, timeline, checklist, and tasks for an event that needs execution." },
  { tag: "Frameworks", question: "Why are boards separated into cards?", answer: "Cards keep each workflow focused. Staff can enter the exact workflow they need instead of scrolling through unrelated tools." },
  { tag: "Frameworks", question: "Can more cards be added later?", answer: "Yes. Frameworks is built to grow as the church adds workflows like content, facilities, care, or additional operations processes." },

  { tag: "Event Planning", question: "What is the difference between Event Planning and Event Requests?", answer: "Event Requests are for submitting and approving a proposed church event. Event Planning is for building the actual plan: timeline nodes, checklist items, notes, and linked tasks." },
  { tag: "Event Planning", question: "Why did a timeline node create a task?", answer: "Timeline nodes can optionally be added to your Tasks list. If selected, Shepherd creates or updates one linked task for that node instead of creating duplicates." },
  { tag: "Event Planning", question: "What happens if I uncheck 'Also add this step to my Tasks list'?", answer: "Shepherd should remove the linked task from the active task list and avoid creating more copies. The timeline node can still remain in the event plan." },
  { tag: "Event Planning", question: "Why should timeline nodes be connected to tasks?", answer: "Tasks give specific people ownership and due dates. Timeline nodes give the event plan structure. Connecting them lets the plan and task board work together." },
  { tag: "Event Planning", question: "Who can see an event plan?", answer: "Shared event plans are visible to the appropriate church staff so planning does not get trapped with one person. Access still depends on the church's roles and permissions." },

  { tag: "Calendar", question: "Where do calendar items come from?", answer: "The Calendar can show imported Google calendar items, My Tasks, approved event requests, direct church calendar entries, and approved staff availability." },
  { tag: "Calendar", question: "How do I move around the Calendar?", answer: "Use the month and year controls at the top of the Calendar card to jump to the month you want to review. The calendar keeps the shared church view focused on this year and next year." },
  { tag: "Calendar", question: "Can I schedule months ahead?", answer: "Yes. The calendar can be navigated ahead within the allowed year range, and events or tasks with future dates can appear when that week is selected." },
  { tag: "Calendar", question: "Can I look back at past calendar weeks?", answer: "Yes. You can move backward to review past weeks within the allowed calendar range. Older imported data depends on what has been brought into Shepherd." },
  { tag: "Calendar", question: "Why do filters only show Google calendars and My Tasks?", answer: "The filters were simplified so staff can choose between the imported church calendars and their personal task layer without fighting too many overlapping filter buttons." },

  { tag: "Calendar Settings", question: "Who can manage Calendar Settings?", answer: "Calendar Settings are managed by a church admin from Account > Calendar Settings. This keeps the shared church calendar connection controlled and consistent." },
  { tag: "Calendar Settings", question: "Where do I connect Google?", answer: "Go to Account, open Calendar Settings, and use Connect Google. Once connected, the admin can select which calendars Shepherd should import." },
  { tag: "Calendar Settings", question: "Can staff connect their own Google calendars?", answer: "The current design is church-level, not personal. Staff view the shared church calendar feed, while admins manage which Google calendars are imported." },
  { tag: "Calendar Settings", question: "How do I remove an imported calendar?", answer: "Use Calendar Settings to remove the imported calendar. Removing it should also clear that calendar's imported items from the shared Shepherd calendar view." },
  { tag: "Calendar Settings", question: "Why are settings under Account?", answer: "Calendar connection is an account-level church setting, so it lives beside other protected account controls instead of crowding the daily Calendar page." },

  { tag: "Google Calendar", question: "If Google Calendar changes, does Shepherd update automatically?", answer: "Shepherd refreshes imported calendars when an authorized admin refreshes them. This controlled import approach helps avoid accidental edits and duplicate records." },
  { tag: "Google Calendar", question: "Why is Google Calendar not two-way right now?", answer: "One-way import is safer for this stage. It lets Shepherd read the church calendar without risking unexpected changes back into Google." },
  { tag: "Google Calendar", question: "Why did Shepherd ask to reconnect Google?", answer: "Google access uses tokens. If the live token is missing or expired, an admin may need to reconnect so Shepherd can refresh the shared calendar again." },
  { tag: "Google Calendar", question: "Can we import multiple Google calendars?", answer: "Yes. The admin can select multiple official Google calendars so staff can filter and view the calendars the church wants to share." },
  { tag: "Google Calendar", question: "Why did a calendar name look wrong?", answer: "Imported events are tied to Google calendar source IDs. If labels look mismatched, the imported calendar list may need to be refreshed or the old imported records cleared and reimported." },

  { tag: "Operations", question: "Which staff availability items need approval?", answer: "PTO requests go through review. Out Of Office and Sick Day entries are logged directly because they are more immediate status updates." },
  { tag: "Operations", question: "Who approves PTO requests?", answer: "PTO requests are intended to be reviewed by church leadership, including the Senior Pastor and Church Administrator, before they appear as approved time off." },
  { tag: "Operations", question: "What happens after PTO is approved?", answer: "Once approved, Shepherd can place that approved time off onto the shared calendar so the staff can plan around the absence." },
  { tag: "Operations", question: "How does Church Lock Up work?", answer: "Operations includes a weekly lock-up assignment from Monday through Sunday. Authorized users can assign, swap, or edit who is responsible that week." },
  { tag: "Operations", question: "Why is lock-up shown on everyone's Dashboard?", answer: "Lock-up affects the whole team after services, so Shepherd surfaces the current assignment where staff will actually see it." },

  { tag: "Access", question: "Why can I see some pages but not edit everything?", answer: "Shepherd uses role and assignment-based access. Some pages are visible for clarity, while protected actions depend on role, ministry assignment, budget assignment, or account manager access." },
  { tag: "Access", question: "What does the lock icon mean?", answer: "A lock means the area exists, but your current account does not have access to open or manage it. This helps staff know the feature is there without exposing controls." },
  { tag: "Access", question: "Who can manage staff access?", answer: "Church administrators, senior leaders, or Shepherd Account Managers can manage staff access depending on the specific setting." },
  { tag: "Access", question: "Why does local access sometimes look different from live?", answer: "Local and live can differ if code, database rows, or browser sessions are not in the same state. Refreshing, logging out and back in, or checking the linked staff account often resolves confusion." },
  { tag: "Access", question: "Why does a real account matter more than a staff draft?", answer: "Permissions work best when the staff database is linked to the person's actual Shepherd login. Draft staff records can display names but may not carry full account access." },

  { tag: "Finances", question: "Why can some staff see Finances and others cannot?", answer: "Finances are tied to ministry budgets and finance access. Staff should see budget areas assigned to their actual Shepherd account, while broader finance roles can see more." },
  { tag: "Finances", question: "What does Approved Amount For This Year mean?", answer: "It is the amount approved by the board or church leadership for that ministry's yearly budget. Shepherd uses it as the starting reference for budget tracking." },
  { tag: "Finances", question: "What is a purchase order for?", answer: "Purchase orders help staff request and track spending before money is committed. They create a review trail around planned expenses." },
  { tag: "Finances", question: "Why should budgets be assigned to staff?", answer: "Assigning a ministry budget connects the right staff member to the right financial view. That keeps finances useful without making every budget visible to everyone." },
  { tag: "Finances", question: "Why are budget cards simplified?", answer: "The cards focus on the essentials: ministry, approved amount, used amount, and remaining balance. Extra tags were removed to reduce visual noise." },

  { tag: "Trash", question: "What does Trash restore?", answer: "Trash holds supported deleted Shepherd items so accidental deletes are less scary. Items can be restored instead of being gone immediately." },
  { tag: "Trash", question: "Why use a trash icon instead of a big delete button?", answer: "The trash icon keeps destructive actions quieter and more consistent across the app while still making deletion available where appropriate." },
  { tag: "Trash", question: "Can everything be restored from Trash?", answer: "Trash supports the main Shepherd item types that have been wired into the restore flow. Some system records or external Google imports may need a refresh or reimport instead." },
  { tag: "Trash", question: "Who should clear Trash?", answer: "Only someone confident the deleted items are no longer needed should clear Trash. Restoring first is safer when there is any doubt." },
  { tag: "Trash", question: "Will deleting an imported calendar clear its events?", answer: "Removing an imported Google calendar should clear that calendar's imported events from the shared view. That is separate from deleting normal Shepherd tasks or records." },

  { tag: "Account", question: "What is a Shepherd Account Manager?", answer: "A Shepherd Account Manager has church-level account control, including protected church settings. Churches can keep more than one manager to avoid lockout." },
  { tag: "Account", question: "Where do I update my profile photo?", answer: "Go to Account > My Account and use the profile photo controls. Your photo helps staff recognize accounts more easily across the app." },
  { tag: "Account", question: "How do I reset my password?", answer: "Go to Account > My Account and use Password Recovery. Shepherd sends a reset email to the email address on your account." },
  { tag: "Account", question: "Where are church-level settings?", answer: "Church-level settings live under Account in sections like Church Account and Calendar Settings. Locked sections stay visible so staff understand where those controls live." },
  { tag: "Account", question: "Can there be more than one account manager?", answer: "Yes. Shepherd supports multiple account managers so responsibility can be shared and the church is not dependent on one person's login." },
];

function FAQPage({ onStartTutorial }) {
  const groupedFaqItems = FAQ_CATEGORY_ORDER
    .map((category) => ({
      category,
      items: FAQ_ITEMS.filter((item) => item.tag === category),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="fadeIn mobile-pad" style={widePageStyle}>
      <div className="page-header" style={{display:"grid",gridTemplateColumns:"1fr auto",alignItems:"start",gap:16,marginBottom:24}}>
        <div style={{justifySelf:"start",textAlign:"left"}}>
          <h2 style={pageTitleStyle}>FAQ</h2>
          <p style={{color:C.muted,fontSize:13,marginTop:4,lineHeight:1.6,maxWidth:680}}>
            Practical answers for the parts of Shepherd that need a little more detail than the walkthrough.
          </p>
        </div>
        <div className="page-actions" style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"flex-end"}}>
          <button className="btn-gold" onClick={onStartTutorial}>
            Reopen Walkthrough
          </button>
        </div>
      </div>

      <div className="card" style={{padding:22,textAlign:"left",display:"grid",gap:20}}>
        {groupedFaqItems.map((group) => (
          <section key={group.category} style={{display:"grid",gap:10}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{height:1,flex:1,background:C.border}} />
              <div style={{fontSize:11,color:C.gold,fontWeight:800,textTransform:"uppercase",letterSpacing:".12em",whiteSpace:"nowrap"}}>
                {group.category}
              </div>
              <div style={{height:1,flex:1,background:C.border}} />
            </div>
            {group.items.map((item) => (
              <details
                key={item.question}
                style={{border:`1px solid ${C.border}`,borderRadius:14,background:C.surface,overflow:"hidden"}}
              >
                <summary style={{cursor:"pointer",padding:"16px 18px",display:"flex",alignItems:"center",gap:12,listStyle:"none"}}>
                  <span style={{minWidth:10,height:10,borderRadius:"50%",background:C.gold,boxShadow:`0 0 0 4px ${C.goldGlow}`}} />
                  <span style={{flex:1,minWidth:0,fontSize:15,fontWeight:700,color:C.text,lineHeight:1.4}}>{item.question}</span>
                </summary>
                <div style={{padding:"0 18px 18px 40px",fontSize:13,color:C.muted,lineHeight:1.8}}>
                  {item.answer}
                </div>
              </details>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}

function ChurchTeamPage({ church, profile, setProfile, previewUsers, setPreviewUsers }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const blank = { first_name: "", last_name: "", roles: ["youth_pastor"], title: formatRoleTitles(["youth_pastor"]), oversight: "standard" };
  const [form, setForm] = useState(blank);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [showTeamMemberModal, setShowTeamMemberModal] = useState(false);
  const editingMember = (previewUsers || []).find((entry) => entry.id === editingMemberId) || null;
  const editingMemberIsAccountAdmin = isStaffAccountAdmin(editingMember, church);

  const applyOversight = (payload, oversight) => {
    if (oversight === "admin") {
      return {
        ...payload,
        can_see_team_overview: true,
        can_see_admin_overview: true,
        read_only_oversight: false,
      };
    }
    return {
      ...payload,
      can_see_team_overview: true,
      can_see_admin_overview: false,
      read_only_oversight: false,
    };
  };

  const getOversightValue = (user) => {
    if (isStaffAccountAdmin(user, church)) return "admin";
    if (user?.can_see_admin_overview) return "admin";
    return "standard";
  };

  const saveStaffMember = async () => {
    setError("");
    if (!canEditChurchTeam(profile, church)) {
      setError("Only the Church Administrator or Senior Pastor can manage the church team.");
      return;
    }
    if (!church?.id) {
      setError("We couldn't find this church yet.");
      return;
    }
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError("Enter a first and last name.");
      return;
    }
    if (!form.roles?.length) {
      setError("Select at least one role.");
      return;
    }
    const roleBundle = buildRoleBundle(form.roles);
    const fullName = `${form.first_name.trim()} ${form.last_name.trim()}`.trim();
    const payload = {
      church_id: church.id,
      full_name: fullName,
      role: roleBundle.primaryRole,
      title: roleBundle.title,
      staff_roles: roleBundle.selectedRoles,
      ministries: roleBundle.ministries,
      can_see_team_overview: roleBundle.canSeeTeamOverview,
      can_see_admin_overview: roleBundle.canSeeAdminOverview,
      read_only_oversight: false,
    };
    const finalPayload = applyOversight(payload, form.oversight);
    setSaving(true);
    const existingMemberId =
      editingMemberId
      || (previewUsers || []).find((entry) =>
        entry?.church_id === church.id && samePerson(entry.full_name, fullName)
      )?.id
      || null;
    const likelyDuplicate = (previewUsers || []).find((entry) =>
      entry?.church_id === church.id
      && entry.id !== editingMemberId
      && isPotentialDuplicateStaffName(entry.full_name, fullName)
    );
    if (!existingMemberId && likelyDuplicate) {
      setSaving(false);
      setError(`This looks like it may duplicate ${likelyDuplicate.full_name}. Open that team member and edit the existing record instead of creating a second version of the same person.`);
      return;
    }
    const query = existingMemberId
      ? supabase.from("church_staff").update(finalPayload).eq("id", existingMemberId)
      : supabase.from("church_staff").upsert(finalPayload, { onConflict: "church_id,full_name" });
    let { data, error: saveError } = await query.select().single();
    if (saveError && String(saveError.message || "").includes("staff_roles")) {
      const legacyPayload = {
        church_id: finalPayload.church_id,
        full_name: finalPayload.full_name,
        role: finalPayload.role,
        title: finalPayload.title,
        ministries: finalPayload.ministries,
        can_see_team_overview: finalPayload.can_see_team_overview,
        can_see_admin_overview: finalPayload.can_see_admin_overview,
        read_only_oversight: finalPayload.read_only_oversight,
      };
      const legacyQuery = existingMemberId
        ? supabase.from("church_staff").update(legacyPayload).eq("id", existingMemberId)
        : supabase.from("church_staff").upsert(legacyPayload, { onConflict: "church_id,full_name" });
      const legacyResult = await legacyQuery.select().single();
      data = legacyResult.data;
      saveError = legacyResult.error;
    }
    if (saveError && String(saveError.message || "").includes("church_staff_pkey")) {
      const { data: existingRow } = await supabase
        .from("church_staff")
        .select("*")
        .eq("church_id", church.id)
        .eq("full_name", fullName)
        .maybeSingle();
      if (existingRow?.id) {
        const retry = await supabase
          .from("church_staff")
          .update(finalPayload)
          .eq("id", existingRow.id)
          .select()
          .single();
        data = retry.data;
        saveError = retry.error;
      }
    }
    if (saveError) {
      setSaving(false);
      setError(saveError.message || "We couldn't save that team member.");
      return;
    }
    if (data?.auth_user_id) {
      const baseProfilePayload = createProfilePayload(
        data.auth_user_id,
        data.church_id,
        data,
        data.email || ""
      );
      await supabase.from("profiles").upsert({
        ...baseProfilePayload,
        full_name: data.full_name,
        role: data.role,
        title: data.title,
        staff_roles: Array.isArray(data.staff_roles) ? data.staff_roles : (data.role ? [data.role] : []),
        ministries: data.ministries || [],
        can_see_team_overview: data.can_see_team_overview,
        can_see_admin_overview: data.can_see_admin_overview,
        read_only_oversight: data.read_only_oversight,
      });
    }
    const profileSyncPayload = {
      full_name: data.full_name,
      role: data.role,
      title: data.title,
      staff_roles: data.staff_roles,
      ministries: data.ministries,
      can_see_team_overview: data.can_see_team_overview,
      can_see_admin_overview: data.can_see_admin_overview,
      read_only_oversight: data.read_only_oversight,
    };
    const profileSyncResult = await supabase
      .from("profiles")
      .update(profileSyncPayload)
      .eq("staff_id", data.id);
    if (profileSyncResult.error && String(profileSyncResult.error.message || "").includes("staff_roles")) {
      await supabase
        .from("profiles")
        .update({
          full_name: data.full_name,
          role: data.role,
          title: data.title,
          ministries: data.ministries,
          can_see_team_overview: data.can_see_team_overview,
          can_see_admin_overview: data.can_see_admin_overview,
          read_only_oversight: data.read_only_oversight,
        })
        .eq("staff_id", data.id);
    }
    setProfile?.((current) => {
      if (!current || current.staff_id !== data.id) return current;
      return normalizeAccessUser({
        ...current,
        full_name: data.full_name,
        role: data.role,
        title: data.title,
        staff_roles: Array.isArray(data.staff_roles) ? data.staff_roles : (data.role ? [data.role] : []),
        ministries: data.ministries || [],
        can_see_team_overview: data.can_see_team_overview,
        can_see_admin_overview: data.can_see_admin_overview,
        read_only_oversight: data.read_only_oversight,
      });
    });
    setPreviewUsers((current) => {
      const others = (current || []).filter((entry) => entry.id !== data.id);
      return [...others, normalizeAccessUser(data)].sort((a, b) => a.full_name.localeCompare(b.full_name));
    });
    setSaving(false);
    setEditingMemberId(null);
    setForm(blank);
    setShowTeamMemberModal(false);
  };

  const openNewMemberModal = () => {
    setEditingMemberId(null);
    setForm(blank);
    setError("");
    setShowTeamMemberModal(true);
  };

  const startEditingMember = (user) => {
    const [firstName = "", ...rest] = (user.full_name || "").split(" ");
    setEditingMemberId(user.id);
    const roles = normalizeSelectedRoles(
      Array.isArray(user.staff_roles) && user.staff_roles.length > 0
        ? user.staff_roles
        : [user.role || "youth_pastor"]
    );
    setForm({
      first_name: firstName,
      last_name: rest.join(" "),
      roles,
      title: user.title || formatRoleTitles(roles),
      oversight: getOversightValue(user),
    });
    setError("");
    setShowTeamMemberModal(true);
  };

  const toggleRoleSelection = (roleValue) => {
    setForm((current) => {
      const hasRole = current.roles.includes(roleValue);
      const nextRoles = hasRole
        ? current.roles.filter((entry) => entry !== roleValue)
        : [...current.roles, roleValue];
      return {
        ...current,
        roles: nextRoles,
        title: formatRoleTitles(nextRoles),
      };
    });
  };

  const removeStaffMember = async (user) => {
    if (!canEditChurchTeam(profile, church)) {
      setError("Only the Church Administrator or Senior Pastor can remove staff members.");
      return;
    }
    if (!window.confirm(`Remove ${user.full_name} from ${church?.name || "this church"}?`)) return;
    setError("");
    await supabase.from("profiles").delete().eq("staff_id", user.id);
    const { error: deleteError } = await supabase.from("church_staff").delete().eq("id", user.id);
    if (deleteError) {
      setError(deleteError.message || "We couldn't remove that staff member.");
      return;
    }
    setPreviewUsers((current) => (current || []).filter((entry) => entry.id !== user.id));
    if (editingMemberId === user.id) {
      setEditingMemberId(null);
      setForm(blank);
      setShowTeamMemberModal(false);
    }
  };

  return (
    <div className="fadeIn mobile-pad" style={widePageStyle}>
      <div className="page-header" style={{display:"grid",gridTemplateColumns:"1fr",gap:16,marginBottom:24}}>
        <div style={{justifySelf:"start",textAlign:"left"}}>
          <h2 style={pageTitleStyle}>Church Team</h2>
          <p style={{color:C.muted,fontSize:13,marginTop:4,maxWidth:760}}>
            Add and manage the people and roles for {church?.name || "your church"} so that when someone logs in for the first time, they can select their own name from the list.
          </p>
        </div>
      </div>
      {showTeamMemberModal ? (
        <div className="card" style={{padding:22,textAlign:"left",display:"grid",gap:18}}>
          <div>
            <button className="btn-outline" onClick={()=>{setShowTeamMemberModal(false); setEditingMemberId(null); setForm(blank); setError("");}} style={{marginBottom:14}}>
              Back to Church Team
            </button>
            <h3 style={sectionTitleStyle}>{editingMemberId ? "Edit Team Member" : "Create Team Member"}</h3>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div className="mobile-two-stack" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <input className="input-field" placeholder="First name" value={form.first_name} onChange={(e)=>setForm({...form,first_name:e.target.value})}/>
              <input className="input-field" placeholder="Last name" value={form.last_name} onChange={(e)=>setForm({...form,last_name:e.target.value})}/>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8,padding:14,border:`1px solid ${C.border}`,borderRadius:12,background:C.surface}}>
              <div style={{fontSize:12,color:C.muted}}>Roles</div>
              <div className="mobile-two-stack" style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10}}>
                {STAFF_ROLE_OPTIONS.map((option) => (
                  <label key={option.value} style={{display:"flex",alignItems:"flex-start",gap:8,fontSize:13,color:C.text}}>
                    <input
                      type="checkbox"
                      checked={form.roles.includes(option.value)}
                      onChange={() => toggleRoleSelection(option.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <select
              className="input-field"
              value={form.oversight}
              onChange={(e)=>setForm({...form,oversight:e.target.value})}
              style={{background:C.surface}}
            >
              <option value="standard">Standard Access</option>
              <option value="admin">Administrative Oversight</option>
            </select>
            {editingMemberIsAccountAdmin && (
              <div style={{fontSize:12,color:C.muted,textAlign:"left",lineHeight:1.6}}>
                This person is also a Shepherd Account Manager, so they will still retain elevated access until the manager list is changed.
              </div>
            )}
            {error && <div style={{fontSize:12,color:C.danger,textAlign:"left"}}>{error}</div>}
            <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8,flexWrap:"wrap"}}>
              <button className="btn-outline" onClick={()=>{setShowTeamMemberModal(false); setEditingMemberId(null); setForm(blank); setError("");}}>
                Cancel
              </button>
              <button className="btn-gold" onClick={saveStaffMember} disabled={saving || !canEditChurchTeam(profile, church)}>
                {saving ? "Saving..." : editingMemberId ? "Save Changes" : "Create Team Member"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{padding:22,textAlign:"left"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
            <h3 style={sectionTitleStyle}>Current Team</h3>
            {canEditChurchTeam(profile, church) && (
              <button className="btn-gold" onClick={openNewMemberModal}><Icons.plus/>Create Team Member</button>
            )}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:12,marginTop:16}}>
            {(previewUsers || []).length === 0 && <div style={{fontSize:13,color:C.muted}}>No team members have been added yet.</div>}
            {(previewUsers || []).map((user) => (
              <div key={user.id} style={{display:"grid",gridTemplateColumns:"1fr auto",gap:16,alignItems:"start",padding:"14px 0",borderBottom:`1px solid ${C.border}`}}>
                <div>
                  <div style={{fontSize:14,fontWeight:600,color:C.text}}>{user.full_name}</div>
                  <div style={{fontSize:12,color:C.muted,marginTop:4}}>{user.title}</div>
                  <div style={{fontSize:11,color:C.muted,marginTop:4}}>
                    {getChurchTeamAccessLabel(user, church)}
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:8}}>
                  {canEditChurchTeam(profile, church) && (
                    <div style={{display:"flex",gap:8}}>
                      <button className="btn-outline" onClick={()=>startEditingMember(user)} style={{padding:"5px 10px",fontSize:12}}>Edit</button>
                      <button className="btn-outline" onClick={()=>removeStaffMember(user)} style={{padding:"5px 10px",fontSize:12,borderColor:C.danger,color:C.danger}}>Remove</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EventRequestFormFields({ eventForm, setEventForm }) {
  const toggleLocationArea = (area) => {
    setEventForm((current) => ({
      ...current,
      location_areas: current.location_areas.includes(area)
        ? current.location_areas.filter((entry) => entry !== area)
        : [...current.location_areas, area],
    }));
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"flex-start",textAlign:"left"}}>
        <label style={{fontSize:14,fontWeight:600,color:C.text,width:"100%",textAlign:"left"}}>Event Name <span style={{color:C.danger}}>*</span></label>
        <input className="input-field" value={eventForm.event_name} onChange={(e)=>setEventForm({...eventForm,event_name:e.target.value})} />
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"flex-start",textAlign:"left"}}>
        <label style={{fontSize:14,fontWeight:600,color:C.text,width:"100%",textAlign:"left"}}>Event Point of Contact <span style={{color:C.danger}}>*</span></label>
        <input className="input-field" value={eventForm.contact_name} onChange={(e)=>setEventForm({...eventForm,contact_name:e.target.value})} />
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"flex-start",textAlign:"left"}}>
        <label style={{fontSize:14,fontWeight:600,color:C.text,width:"100%",textAlign:"left"}}>Phone <span style={{color:C.danger}}>*</span></label>
        <input className="input-field" value={eventForm.phone} onChange={(e)=>setEventForm({...eventForm,phone:e.target.value})} />
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"flex-start",textAlign:"left"}}>
        <label style={{fontSize:14,fontWeight:600,color:C.text,width:"100%",textAlign:"left"}}>Email <span style={{color:C.danger}}>*</span></label>
        <input className="input-field" type="email" value={eventForm.email} onChange={(e)=>setEventForm({...eventForm,email:e.target.value})} />
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8,alignItems:"flex-start",textAlign:"left"}}>
        <label style={{fontSize:14,fontWeight:600,color:C.text,width:"100%",textAlign:"left"}}>Event Type</label>
        <select className="input-field" value={eventForm.event_format} onChange={(e)=>setEventForm({...eventForm,event_format:e.target.value,event_timing:""})} style={{background:C.surface}}>
          <option value="single">Single</option>
          <option value="multi">Multi-Day</option>
          <option value="recurring">Recurring</option>
        </select>
        <div style={{display:"grid",gap:3,padding:"12px 14px",border:`1px solid ${C.border}`,borderRadius:12,background:C.surface,width:"100%",textAlign:"left",justifyItems:"start"}}>
          <div style={{fontSize:12,color:C.text,lineHeight:1.35,width:"100%"}}><strong>Single:</strong> One event time frame on one day.</div>
          <div style={{fontSize:12,color:C.text,lineHeight:1.35,width:"100%"}}><strong>Multi-Day:</strong> One event that runs across multiple days in a row.</div>
          <div style={{fontSize:12,color:C.text,lineHeight:1.35,width:"100%"}}><strong>Recurring:</strong> One event time frame that repeats on a regular schedule.</div>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"flex-start",textAlign:"left"}}>
        <label style={{fontSize:14,fontWeight:600,color:C.text,width:"100%",textAlign:"left"}}>Event Start/End Time <span style={{color:C.danger}}>*</span></label>
        {eventForm.event_format === "single" && (
          <div className="mobile-stack" style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:12,width:"100%"}}>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <div style={{fontSize:12,color:C.muted}}>Date <span style={{color:C.danger}}>*</span></div>
              <input className="input-field" type="date" value={eventForm.single_date} onChange={(e)=>setEventForm({...eventForm,single_date:e.target.value})} />
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <div style={{fontSize:12,color:C.muted}}>Start Time <span style={{color:C.danger}}>*</span></div>
              <input className="input-field" type="time" value={eventForm.single_start_time} onChange={(e)=>setEventForm({...eventForm,single_start_time:e.target.value})} />
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <div style={{fontSize:12,color:C.muted}}>End Time <span style={{color:C.danger}}>*</span></div>
              <input className="input-field" type="time" value={eventForm.single_end_time} onChange={(e)=>setEventForm({...eventForm,single_end_time:e.target.value})} />
            </div>
          </div>
        )}
        {eventForm.event_format === "multi" && (
          <div className="mobile-stack" style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:12,width:"100%"}}>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <div style={{fontSize:12,color:C.muted}}>Start Date <span style={{color:C.danger}}>*</span></div>
              <input className="input-field" type="date" value={eventForm.multi_start_date} onChange={(e)=>setEventForm({...eventForm,multi_start_date:e.target.value})} />
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <div style={{fontSize:12,color:C.muted}}>End Date <span style={{color:C.danger}}>*</span></div>
              <input className="input-field" type="date" value={eventForm.multi_end_date} onChange={(e)=>setEventForm({...eventForm,multi_end_date:e.target.value})} />
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <div style={{fontSize:12,color:C.muted}}>Start Time <span style={{color:C.danger}}>*</span></div>
              <input className="input-field" type="time" value={eventForm.multi_start_time} onChange={(e)=>setEventForm({...eventForm,multi_start_time:e.target.value})} />
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <div style={{fontSize:12,color:C.muted}}>End Time <span style={{color:C.danger}}>*</span></div>
              <input className="input-field" type="time" value={eventForm.multi_end_time} onChange={(e)=>setEventForm({...eventForm,multi_end_time:e.target.value})} />
            </div>
          </div>
        )}
        {eventForm.event_format === "recurring" && (
          <div className="mobile-stack" style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:12,width:"100%"}}>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <div style={{fontSize:12,color:C.muted}}>Date <span style={{color:C.danger}}>*</span></div>
              <input className="input-field" type="date" value={eventForm.recurring_start_date} onChange={(e)=>setEventForm({...eventForm,recurring_start_date:e.target.value})} />
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <div style={{fontSize:12,color:C.muted}}>How Often Does It Repeat? <span style={{color:C.danger}}>*</span></div>
              <input className="input-field" placeholder="Every week, every month, first Wednesday..." value={eventForm.recurring_frequency} onChange={(e)=>setEventForm({...eventForm,recurring_frequency:e.target.value})} />
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <div style={{fontSize:12,color:C.muted}}>Start Time <span style={{color:C.danger}}>*</span></div>
              <input className="input-field" type="time" value={eventForm.recurring_start_time} onChange={(e)=>setEventForm({...eventForm,recurring_start_time:e.target.value})} />
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <div style={{fontSize:12,color:C.muted}}>End Time <span style={{color:C.danger}}>*</span></div>
              <input className="input-field" type="time" value={eventForm.recurring_end_time} onChange={(e)=>setEventForm({...eventForm,recurring_end_time:e.target.value})} />
            </div>
          </div>
        )}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"flex-start",textAlign:"left"}}>
        <label style={{fontSize:14,fontWeight:600,color:C.text,width:"100%",textAlign:"left"}}>Setup Date <span style={{color:C.danger}}>*</span></label>
        <input className="input-field" type="datetime-local" value={eventForm.setup_datetime} onChange={(e)=>setEventForm({...eventForm,setup_datetime:e.target.value})} />
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"flex-start",textAlign:"left"}}>
        <label style={{fontSize:14,fontWeight:600,color:C.text,width:"100%",textAlign:"left"}}>Event Description & Purpose <span style={{color:C.danger}}>*</span></label>
        <textarea className="input-field" rows={3} value={eventForm.description} onChange={(e)=>setEventForm({...eventForm,description:e.target.value})} style={{resize:"vertical"}} />
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"flex-start",textAlign:"left"}}>
        <label style={{fontSize:14,fontWeight:600,color:C.text,width:"100%",textAlign:"left"}}>Event Location <span style={{color:C.danger}}>*</span></label>
        <div style={{fontSize:12,color:C.text,lineHeight:1.5,width:"100%"}}>
          Is this a request for the building or just an announcement and graphics support?
        </div>
        <select className="input-field" value={eventForm.location_scope} onChange={(e)=>setEventForm({...eventForm,location_scope:e.target.value,location_areas:e.target.value === "building" ? eventForm.location_areas : []})} style={{background:C.surface}}>
          <option value="">Select an option</option>
          <option value="building">I want to use the building for my event</option>
          <option value="off-campus">No, I would just like this to be announced because we are having the event off campus</option>
        </select>
        {eventForm.location_scope === "building" && (
          <div style={{display:"flex",flexDirection:"column",gap:10,padding:14,border:`1px solid ${C.border}`,borderRadius:12,background:C.surface,width:"100%"}}>
            <div style={{fontSize:12,color:C.text,lineHeight:1.5}}>
              Which areas of the church would you like to use?
              <span style={{color:C.danger}}> *</span>
            </div>
            <div style={{fontSize:11,color:C.muted,lineHeight:1.4}}>
              Select all that apply.
            </div>
            <div className="mobile-stack" style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10}}>
              {EVENT_LOCATION_AREA_OPTIONS.map((area) => (
                <label key={area} style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:C.text}}>
                  <input type="checkbox" checked={eventForm.location_areas.includes(area)} onChange={()=>toggleLocationArea(area)} />
                  {area}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"flex-start",textAlign:"left"}}>
        <label style={{fontSize:14,fontWeight:600,color:C.text,width:"100%",textAlign:"left"}}>Reference Photos / Graphics Direction</label>
        <div style={{fontSize:12,color:C.text,lineHeight:1.5,width:"100%"}}>
          In regards to art and graphics for slides and announcements, please send a few examples of artwork or styles you feel would work well with your event’s theme. This helps us align the design with your vision from the beginning. Once your event is approved, our graphic design team will begin creating the artwork. You can expect a first draft within one week. If major changes are needed, we are happy to make those adjustments within two business days. After the final artwork is approved, we will send you the files you need for sharing and posting, and we will take care of anything going on our website and app.
        </div>
        <textarea className="input-field" rows={2} placeholder="Paste links or describe the visual style you want." value={eventForm.graphics_reference} onChange={(e)=>setEventForm({...eventForm,graphics_reference:e.target.value})} style={{resize:"vertical"}} />
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:14,padding:16,border:`1px solid ${C.border}`,borderRadius:12,background:C.surface}}>
        <div style={{fontSize:14,fontWeight:600,color:C.text,width:"100%",textAlign:"left"}}>Additional Resources</div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"flex",flexDirection:"column",gap:10,padding:14,border:`1px solid ${C.border}`,borderRadius:12,background:C.card}}>
            <div style={{fontSize:14,fontWeight:600,color:C.text,width:"100%",textAlign:"left"}}>Audio & Visual</div>
            <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:C.text}}>
              <input type="checkbox" checked={eventForm.av_request} onChange={(e)=>setEventForm({...eventForm,av_request:e.target.checked})} />
              Request A/V support for this event
            </label>
            {eventForm.av_request && (
              <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"flex-start",textAlign:"left"}}>
                <label style={{fontSize:14,fontWeight:600,color:C.text,width:"100%",textAlign:"left"}}>Describe Your A/V Needs</label>
                <textarea className="input-field" rows={3} placeholder="Please describe the sound, slides, microphones, video, livestream, or other A/V support you need." value={eventForm.av_request_details} onChange={(e)=>setEventForm({...eventForm,av_request_details:e.target.value})} style={{resize:"vertical"}} />
              </div>
            )}
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:10,padding:14,border:`1px solid ${C.border}`,borderRadius:12,background:C.card}}>
            <div style={{fontSize:14,fontWeight:600,color:C.text,width:"100%",textAlign:"left"}}>Kitchen</div>
            <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:C.text}}>
              <input type="checkbox" checked={eventForm.kitchen_use} onChange={(e)=>setEventForm({...eventForm,kitchen_use:e.target.checked})} />
              Request kitchen access for this event
            </label>
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:10,padding:14,border:`1px solid ${C.border}`,borderRadius:12,background:C.card}}>
            <div style={{fontSize:14,fontWeight:600,color:C.text,width:"100%",textAlign:"left"}}>Coffee Shop</div>
            <div style={{display:"grid",gap:6,fontSize:12,color:C.text,lineHeight:1.5,width:"100%",textAlign:"left",justifyItems:"start"}}>
              <div style={{width:"100%",textAlign:"left"}}>A supply fee will be added for coffee service requests.</div>
              <div style={{width:"100%",textAlign:"left"}}>Espresso drink service requires a minimum of two baristas, and that staffing is included in the coffee shop fee. Only trained individuals may operate or work inside the coffee shop, and this applies to both espresso service and drip coffee service.</div>
            </div>
            <div style={{display:"grid",gap:10,width:"100%"}}>
              <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:C.text}}>
                <input type="checkbox" checked={eventForm.drip_coffee_only} onChange={(e)=>setEventForm({...eventForm,drip_coffee_only:e.target.checked})} />
                Drip Coffee Only
              </label>
              <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:C.text}}>
                <input type="checkbox" checked={eventForm.espresso_drinks} onChange={(e)=>setEventForm({...eventForm,espresso_drinks:e.target.checked})} />
                Espresso Drinks
              </label>
            </div>
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:10,padding:14,border:`1px solid ${C.border}`,borderRadius:12,background:C.card}}>
            <div style={{fontSize:14,fontWeight:600,color:C.text,width:"100%",textAlign:"left"}}>Tables Needed</div>
            <div style={{fontSize:12,color:C.text,lineHeight:1.5,width:"100%"}}>
              We currently have the following tables available. Select how many of each you would like to request.
            </div>
            <div className="mobile-stack" style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:12,width:"100%"}}>
              {[
                ["tables_6ft_rectangular", "6ft Rectangular", 12],
                ["tables_8ft_rectangular", "8ft Rectangular", 3],
                ["tables_5ft_round", "5ft Round", 9],
              ].map(([key, label, available]) => (
                <div key={key} style={{display:"flex",flexDirection:"column",gap:6}}>
                  <div style={{fontSize:12,color:C.muted}}>{label} ({available} available)</div>
                  <select className="input-field" value={eventForm[key]} onChange={(e)=>setEventForm({...eventForm,[key]:e.target.value})} style={{background:C.surface}}>
                    {Array.from({ length: Number(available) + 1 }, (_, index) => (
                      <option key={index} value={String(index)}>{index}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:10,padding:14,border:`1px solid ${C.border}`,borderRadius:12,background:C.card}}>
            <div style={{fontSize:14,fontWeight:600,color:C.text,width:"100%",textAlign:"left"}}>Tablecloths</div>
            <div style={{display:"grid",gap:10,width:"100%"}}>
              <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:C.text}}>
                <input type="checkbox" checked={!!eventForm.black_vinyl_tablecloths} onChange={(e)=>setEventForm({...eventForm,black_vinyl_tablecloths:e.target.checked ? "requested" : ""})} />
                Black Vinyl Tablecloths
              </label>
              <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:C.text}}>
                <input type="checkbox" checked={!!eventForm.white_linen_tablecloths} onChange={(e)=>setEventForm({...eventForm,white_linen_tablecloths:e.target.checked ? "requested" : "",white_linen_agreement:e.target.checked ? eventForm.white_linen_agreement : false})} />
                White Linen Tablecloths
              </label>
            </div>
            {!!eventForm.white_linen_tablecloths && (
              <label style={{display:"flex",alignItems:"flex-start",gap:8,fontSize:13,color:C.text,marginLeft:28,fontStyle:"italic"}}>
                <input type="checkbox" checked={eventForm.white_linen_agreement} onChange={(e)=>setEventForm({...eventForm,white_linen_agreement:e.target.checked})} style={{marginTop:2}} />
                I agree to launder and press the white linen tablecloths after the event. <span style={{color:C.danger}}>*</span>
              </label>
            )}
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:10,padding:14,border:`1px solid ${C.border}`,borderRadius:12,background:C.card}}>
            <div style={{fontSize:14,fontWeight:600,color:C.text,width:"100%",textAlign:"left"}}>Pipe and Drape</div>
            <input className="input-field" placeholder="Describe any pipe and drape needs for this event." value={eventForm.pipe_and_drape} onChange={(e)=>setEventForm({...eventForm,pipe_and_drape:e.target.value})} />
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:10,padding:14,border:`1px solid ${C.border}`,borderRadius:12,background:C.card}}>
            <div style={{fontSize:14,fontWeight:600,color:C.text,width:"100%",textAlign:"left"}}>Chairs</div>
            <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:C.text}}>
              <input type="checkbox" checked={eventForm.metal_folding_chairs_requested} onChange={(e)=>setEventForm({...eventForm,metal_folding_chairs_requested:e.target.checked,metal_folding_chairs:e.target.checked ? eventForm.metal_folding_chairs : ""})} />
              Request metal folding chairs
            </label>
            {eventForm.metal_folding_chairs_requested && (
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <label style={{fontSize:14,fontWeight:600,color:C.text,width:"100%",textAlign:"left"}}>How many metal fold chairs do you need? <span style={{color:C.danger}}>*</span></label>
                <input className="input-field" type="number" min="0" value={eventForm.metal_folding_chairs} onChange={(e)=>setEventForm({...eventForm,metal_folding_chairs:e.target.value})} />
              </div>
            )}
          </div>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"flex-start",textAlign:"left"}}>
        <label style={{fontSize:14,fontWeight:600,color:C.text,width:"100%",textAlign:"left"}}>Additional Information to be noted</label>
        <textarea className="input-field" rows={4} placeholder="Cleaning, music approvals, childcare, stage rules, fees, open/close building, due dates, decor team..." value={eventForm.additional_information} onChange={(e)=>setEventForm({...eventForm,additional_information:e.target.value})} style={{resize:"vertical"}} />
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10,alignItems:"flex-start",textAlign:"left",padding:"16px 18px",border:`1px solid ${C.border}`,borderRadius:14,background:C.surface}}>
        <label style={{fontSize:14,fontWeight:600,color:C.text,width:"100%",textAlign:"left"}}>Items That May Need Admin Approval or Coordination</label>
        <div style={{fontSize:12,color:C.muted,lineHeight:1.5,width:"100%",textAlign:"left"}}>
          Depending on your event, the Administrator may need to review or coordinate the following details with you:
        </div>
        <ol style={{display:"grid",gap:8,fontSize:12,color:C.text,lineHeight:1.5,paddingLeft:18,margin:0,textAlign:"left",justifyItems:"start",width:"100%"}}>
          <li>Building access, including who will open and close the church.</li>
          <li>A/C scheduling for the spaces being used.</li>
          <li>Food cleanup and how any excess food will be handled afterward.</li>
          <li>Music, videos, or other media being used during the event.</li>
          <li>Any fees, payments, or money being collected or distributed.</li>
          <li>Childcare plans, including age groups, activities, and staffing needs.</li>
          <li>Stage use, room use, or any special setup limitations that need to be addressed.</li>
          <li>Any additional classroom or ministry-space guidelines connected to the event.</li>
          <li>Building care expectations, including the no-glitter rule.</li>
        </ol>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10,alignItems:"flex-start",textAlign:"left",padding:"16px 18px",border:`1px solid ${C.border}`,borderRadius:14,background:C.surface}}>
        <label style={{fontSize:14,fontWeight:600,color:C.text,width:"100%",textAlign:"left"}}>Please Review Before Submitting</label>
        <ol style={{display:"grid",gap:8,fontSize:12,color:C.text,lineHeight:1.5,paddingLeft:18,margin:0,textAlign:"left",justifyItems:"start"}}>
          <li>Submission of this form does not guarantee approval of the event or use of the requested areas of the facility. Administration will follow up with you within one week.</li>
          <li>Any sound or slide requests must be approved through Worship and AV. Our team will review what is possible and follow up with you ahead of time.</li>
          <li>Staff can help support planning and room preparation, but your event team is responsible for setup, decorating, and teardown.</li>
          <li>Your ministry is responsible for providing its own supplies and leaving the space fully cleaned after the event.</li>
          <li>Administration will review any required cleaning procedures and other event logistics with you as needed.</li>
        </ol>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10,alignItems:"flex-start",textAlign:"left",padding:"16px 18px",border:`1px solid ${C.border}`,borderRadius:14,background:C.surface}}>
        <label style={{fontSize:14,fontWeight:600,color:C.text,width:"100%",textAlign:"left"}}>Planning Timeline</label>
        <div style={{fontSize:12,color:C.muted,lineHeight:1.5,width:"100%",textAlign:"left"}}>
          This is a general planning outline and may be adjusted by the Administrator based on your event timeline and needs.
        </div>
        <ol style={{display:"grid",gap:8,fontSize:12,color:C.text,lineHeight:1.5,paddingLeft:18,margin:0,textAlign:"left",justifyItems:"start"}}>
          <li><strong>8 weeks out:</strong> Form is submitted, reviewed in staff meeting, and any servant-volunteer needs begin to be discussed. Ministry leads are contacted if approval is needed for someone to serve in areas like AV, coffee, or kitchen.</li>
          <li><strong>7 weeks out:</strong> Updates are gathered for servant workers and artwork requests begin moving forward.</li>
          <li><strong>6 weeks out:</strong> Meet with the Administrator to finalize setup, decorations, cleanup, building access, and any AV, coffee, speaker, or kitchen needs.</li>
          <li><strong>5 weeks out:</strong> Graphics are approved through staff, team roles are clarified, and the event is created and tracked if needed.</li>
          <li><strong>4 weeks out:</strong> Announcements are prepared and approved, and key people involved in setup, cleanup, decorating, or teaching connect with the Administrator and any other impacted staff or ministries.</li>
          <li><strong>3 weeks out:</strong> Event announcements begin going out to the church.</li>
          <li><strong>2 weeks out:</strong> Final team communication happens for any last-minute additions or changes, and reminders go out to the ministries affected by the event.</li>
          <li><strong>1 week out:</strong> Staff is reminded, responsibilities are reviewed, and final building access details are confirmed.</li>
        </ol>
      </div>
      <div className="mobile-stack" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"flex-start",textAlign:"left"}}>
          <label style={{fontSize:14,fontWeight:600,color:C.text,width:"100%",textAlign:"left"}}>Date Submitted <span style={{color:C.danger}}>*</span></label>
          <input className="input-field" type="date" value={eventForm.submitted_on} onChange={(e)=>setEventForm({...eventForm,submitted_on:e.target.value})} />
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"flex-start",textAlign:"left"}}>
          <label style={{fontSize:14,fontWeight:600,color:C.text,width:"100%",textAlign:"left"}}>Signature <span style={{color:C.danger}}>*</span></label>
          <input className="input-field" value={eventForm.signature} onChange={(e)=>setEventForm({...eventForm,signature:e.target.value})} />
        </div>
      </div>
    </div>
  );
}

function EventsBoard({ profile, church, eventRequests, setEventRequests, tasks, setTasks, moveItemToTrash, previewUsers, recordActivity }) {
  const [eventsSection, setEventsSection] = useState("home");
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState(() => createEventRequestBlank(profile));
  const [formError, setFormError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requestCommentDraft, setRequestCommentDraft] = useState("");
  const [eventWorkflows, setEventWorkflows] = useState([]);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [workflowError, setWorkflowError] = useState("");
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [workflowForm, setWorkflowForm] = useState(() => createEventPlanningBlank(profile));
  const [timelineDraft, setTimelineDraft] = useState({ id: null, title: "", date: "", details: "", includeInTasks: false, reviewRequired: false, reviewers: [] });
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [planningFilter, setPlanningFilter] = useState("mine");
  const [checklistDraft, setChecklistDraft] = useState("");
  const [planningNoteDraft, setPlanningNoteDraft] = useState("");
  const eventRequestDraftKey = getFormDraftStorageKey(profile?.id, "event-request");
  const eventPlanDraftKey = getFormDraftStorageKey(profile?.id, "event-plan");
  const timelineEditorRef = useRef(null);
  const eventColumns = [
    { id: "new", title: "New Event Requests", detail: "Incoming ministry requests waiting for admin review and scheduling.", accent: C.gold, surface: "rgba(201,168,76,0.08)" },
    { id: "approved", title: "Approved Events", detail: "Confirmed events ready to be coordinated, staffed, and communicated.", accent: C.success, surface: "rgba(82,200,122,0.08)" },
    { id: "declined", title: "Declined Events", detail: "Requests that were not approved, with room for notes and follow-up.", accent: C.danger, surface: "rgba(224,82,82,0.08)" },
  ];
  const requests = eventRequests || [];
  const visibleWorkflows = eventWorkflows
    .filter((workflow) => planningFilter === "mine"
      ? samePerson(workflow.owner_name, profile?.full_name)
      : !samePerson(workflow.owner_name, profile?.full_name))
    .sort((left, right) => new Date(getEventWorkflowPrimaryDate(left) || left.created_at || 0) - new Date(getEventWorkflowPrimaryDate(right) || right.created_at || 0));
  const canEditWorkflow = (workflow) => samePerson(workflow?.owner_name, profile?.full_name) || isChurchAdministrator(profile);
  const eventPlanningTeamNames = [...new Set((previewUsers || []).map((user) => user.full_name).filter(Boolean))];

  useEffect(() => {
    let active = true;
    if (!church?.id) return () => {
      active = false;
    };
    Promise.resolve().then(() => {
      if (active) setWorkflowLoading(true);
    });
    supabase
      .from("event_workflows")
      .select("*")
      .eq("church_id", church.id)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setEventWorkflows([]);
          return;
        }
        setEventWorkflows((data || []).map(normalizeEventWorkflow));
      })
      .finally(() => {
        if (!active) return;
        setWorkflowLoading(false);
      });
    return () => {
      active = false;
    };
  }, [church?.id]);

  const saveEventRequest = async () => {
    const eventTiming = buildEventTimingSummary(eventForm);
    if (!eventForm.event_name || !eventTiming || !eventForm.setup_datetime || !eventForm.description || !eventForm.contact_name || !eventForm.phone || !eventForm.email || !eventForm.location_scope || !eventForm.signature) {
      setFormError("Please complete the required fields before submitting this request.");
      return;
    }
    if (eventForm.location_scope === "building" && eventForm.location_areas.length === 0) {
      setFormError("Please select at least one church area for building-use requests.");
      return;
    }
    if (eventForm.white_linen_tablecloths && !eventForm.white_linen_agreement) {
      setFormError("Please agree to launder and press the white linen tablecloths before submitting.");
      return;
    }
    if (eventForm.metal_folding_chairs_requested && !eventForm.metal_folding_chairs) {
      setFormError("Please enter how many metal folding chairs you need.");
      return;
    }
    if (!church?.id) {
      setFormError("We could not find this church for event requests.");
      return;
    }
    const request = {
      ...eventForm,
      church_id: church.id,
      event_timing: eventTiming,
      tables_needed: buildTablesSummary(eventForm),
      status: "new",
      requested_by: profile?.full_name || eventForm.contact_name,
    };
    setFormError("");
    const { data, error } = await supabase.from("event_requests").insert(request).select().single();
    if (error) {
      setFormError(error.message || "We couldn't save that request.");
      return;
    }
    setEventRequests((current) => [data, ...(current || [])]);
    await createNotificationsForNames({
      users: previewUsers,
      names: (previewUsers || [])
        .filter((user) => isChurchAdministrator(user))
        .map((user) => user.full_name),
      churchId: church.id,
      actorProfile: profile,
      type: "event_request_submitted",
      title: "New Event Request Submitted",
      detail: `${data.contact_name || "A requester"} submitted ${data.event_name}.`,
      target: "events-board",
      sourceKey: data.id,
      data: { eventRequestId: data.id, eventName: data.event_name },
    });
    clearStoredFormDraft(eventRequestDraftKey);
    await recordActivity?.({
      action: "created",
      entityType: "event_request",
      entityId: data.id,
      entityTitle: data.event_name,
      summary: `${profile?.full_name || "A staff member"} submitted event request "${data.event_name}".`,
      metadata: { status: data.status, contact_name: data.contact_name },
    });
    setShowEventForm(false);
    setEventForm(createEventRequestBlank(profile));
  };

  const setEventRequestStatus = async (requestId, status) => {
    const existingRequest = requests.find((request) => request.id === requestId);
    const decisionPayload = {
      status,
      decided_at: new Date().toISOString(),
      decided_by: profile?.full_name || null,
    };
    let linkedWorkflow = null;
    if (status === "approved" && existingRequest) {
      const { data: existingWorkflow, error: existingWorkflowError } = await supabase
        .from("event_workflows")
        .select("*")
        .eq("church_id", church?.id)
        .eq("linked_event_request_id", existingRequest.id)
        .maybeSingle();
      if (existingWorkflowError) {
        setFormError(existingWorkflowError.message || "We couldn't check for an existing event plan.");
        return;
      }
      if (existingWorkflow) {
        linkedWorkflow = normalizeEventWorkflow(existingWorkflow);
      } else {
        const requesterStaff = findStaffByEventRequester(previewUsers, existingRequest);
        const workflowOwner = requesterStaff?.full_name || profile?.full_name || existingRequest.contact_name || "Staff Member";
        const workflowPayload = buildEventWorkflowFromRequest(existingRequest, church?.id, workflowOwner);
        const { data: createdWorkflow, error: workflowError } = await supabase
          .from("event_workflows")
          .insert(workflowPayload)
          .select()
          .maybeSingle();
        if (workflowError) {
          setFormError(workflowError.message || "We couldn't create the event planning framework.");
          return;
        }
        if (!createdWorkflow) {
          setFormError("We couldn't create the event planning framework.");
          return;
        }
        linkedWorkflow = normalizeEventWorkflow(createdWorkflow);
        setEventWorkflows((current) => [linkedWorkflow, ...(current || [])]);
      }
    }

    if (status === "approved" && existingRequest && !existingRequest.graphics_task_created) {
      const taskPayloads = buildApprovedEventTaskChain(existingRequest, church?.id, previewUsers);
      if (taskPayloads.length > 0) {
        const { data: createdTasks, error: taskChainError } = await supabase.from("tasks").insert(taskPayloads).select();
        if (taskChainError) {
          setFormError(taskChainError.message || "We couldn't create the event follow-up tasks.");
          return;
        }
        if (createdTasks?.length) {
          const graphicsTask = createdTasks.find((task) => task.ministry === "Content/Art");
          decisionPayload.graphics_task_created = !!graphicsTask;
          decisionPayload.graphics_task_id = graphicsTask?.id || null;
          setTasks((current) => [...createdTasks.map(normalizeTask), ...(current || [])]);
          await Promise.all(createdTasks.map((task) => {
            const recipient = findStaffByName(previewUsers, task.assignee);
            const recipientProfileId = getStaffProfileId(recipient);
            if (!recipientProfileId) return null;
            return createPersistentNotification({
              churchId: church?.id,
              actorProfile: profile,
              recipientProfileId,
              type: "task_assigned",
              title: "New Task Assigned",
              detail: `${task.title} was created from the approved event request ${existingRequest.event_name}.`,
              target: "tasks",
              taskId: task.id,
              sourceKey: task.id,
              data: { taskTitle: task.title, eventRequestId: existingRequest.id, eventName: existingRequest.event_name },
            });
          }));
        }
      }
    }

    const { data, error } = await supabase.from("event_requests").update(decisionPayload).eq("id", requestId).select().single();
    if (error) {
      setFormError(error.message || "We couldn't update that event request.");
      return;
    }
    setFormError("");
    setEventRequests((current) => current.map((request) => request.id === requestId ? data : request));
    setSelectedRequest((current) => current?.id === requestId ? data : current);
    if (linkedWorkflow) {
      setSelectedWorkflow(linkedWorkflow);
      setPlanningFilter(samePerson(linkedWorkflow.owner_name, profile?.full_name) ? "mine" : "others");
      setSelectedRequest(null);
    }
    await recordActivity?.({
      action: status,
      entityType: "event_request",
      entityId: data.id,
      entityTitle: data.event_name,
      summary: `${profile?.full_name || "A staff member"} ${status === "approved" ? "approved" : "declined"} event request "${data.event_name}".`,
      metadata: { status, event_plan_id: linkedWorkflow?.id || null },
    });
    if (linkedWorkflow && status === "approved") {
      await recordActivity?.({
        action: "created",
        entityType: "event_plan",
        entityId: linkedWorkflow.id,
        entityTitle: linkedWorkflow.event_name || linkedWorkflow.title,
        summary: `${profile?.full_name || "A staff member"} created an event planning framework for "${linkedWorkflow.event_name || linkedWorkflow.title}".`,
      });
    }
  };

  const loadingRequests = !!church?.id && eventRequests === null;
  const publicEventRequestLink = (() => {
    const code = church?.code ? encodeURIComponent(church.code) : "";
    const path = code ? `/event-request/new/${code}` : "/event-request";
    return typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
  })();
  const getEventRequestShareLink = (request) => {
    if (!request?.public_access_token) return "";
    return typeof window !== "undefined" ? `${window.location.origin}/event-request/${request.public_access_token}` : `/event-request/${request.public_access_token}`;
  };
  const copyPublicEventRequestLink = async () => {
    try {
      await navigator.clipboard.writeText(publicEventRequestLink);
      setCopyMessage("Public form link copied.");
      window.setTimeout(() => setCopyMessage(""), 2200);
    } catch {
      setCopyMessage("Couldn't copy automatically. Use /event-request.");
      window.setTimeout(() => setCopyMessage(""), 3000);
    }
  };
  const copyRequesterEventRequestLink = async (request) => {
    if (!request?.id) return;
    setFormError("");
    let targetRequest = request;
    if (!targetRequest.public_access_token) {
      const token = createPublicAccessToken();
      const { data, error } = await supabase
        .from("event_requests")
        .update({ public_access_token: token, public_access_enabled: true })
        .eq("id", request.id)
        .select()
        .single();
      if (error) {
        setFormError(error.message || "We couldn't create that requester link.");
        return;
      }
      targetRequest = data;
      setEventRequests((current) => (current || []).map((entry) => entry.id === data.id ? data : entry));
      setSelectedRequest(data);
    }
    const link = getEventRequestShareLink(targetRequest);
    try {
      await navigator.clipboard.writeText(link);
      setCopyMessage("Requester share link copied.");
    } catch {
      setCopyMessage(`Requester link: ${link}`);
    }
  };

  const requestDetails = selectedRequest || null;
  const openRequest = (request) => setSelectedRequest(request);
  const openWorkflowModal = (workflow = null) => {
    setWorkflowError("");
    if (workflow) {
      setWorkflowForm({
        id: workflow.id,
        eventName: workflow.event_name || workflow.title || "",
        startDate: workflow.start_date || workflow.target_date || "",
        endDate: workflow.end_date || workflow.start_date || workflow.target_date || "",
        startTime: workflow.start_time || "",
        endTime: workflow.end_time || "",
        location: workflow.location || "",
        mainContact: workflow.main_contact || "",
        linkedRequestId: workflow.linked_event_request_id || "",
      });
    } else {
      setWorkflowForm(readStoredFormDraft(eventPlanDraftKey, createEventPlanningBlank(profile)));
    }
    setShowWorkflowModal(true);
  };
  const openEventRequestForm = () => {
    setEventForm(readStoredFormDraft(eventRequestDraftKey, createEventRequestBlank(profile)));
    setFormError("");
    setShowEventForm(true);
  };
  const closeEventRequestForm = () => {
    clearStoredFormDraft(eventRequestDraftKey);
    setShowEventForm(false);
    setEventForm(createEventRequestBlank(profile));
  };
  const closeWorkflowForm = () => {
    if (!workflowForm.id) clearStoredFormDraft(eventPlanDraftKey);
    setShowWorkflowModal(false);
  };
  const saveWorkflow = async () => {
    if (!church?.id) {
      setWorkflowError("We couldn't find this church for planning workflows.");
      return;
    }
    if (!workflowForm.eventName.trim() || !workflowForm.startDate || !workflowForm.location.trim() || !workflowForm.mainContact.trim()) {
      setWorkflowError("Please complete the event name, date, location, and main contact before creating this event plan.");
      return;
    }
    const payload = {
      church_id: church.id,
      title: workflowForm.eventName.trim(),
      event_name: workflowForm.eventName.trim(),
      owner_name: profile?.full_name || "Staff Member",
      visibility: "shared",
      summary: "",
      target_date: workflowForm.startDate || null,
      start_date: workflowForm.startDate || null,
      end_date: workflowForm.endDate || workflowForm.startDate || null,
      location: workflowForm.location.trim(),
      main_contact: workflowForm.mainContact.trim(),
      linked_event_request_id: workflowForm.linkedRequestId || null,
      timeline_items: selectedWorkflow?.timeline_items || [],
      checklist_items: selectedWorkflow?.checklist_items || createDefaultEventChecklist(),
      notes_entries: selectedWorkflow?.notes_entries || [],
      steps: [
        ...((selectedWorkflow?.steps || []).filter((entry) => entry?.type !== "event_meta")),
        {
          type: "event_meta",
          start_time: workflowForm.startTime || "",
          end_time: workflowForm.endTime || "",
        },
      ],
    };
    setWorkflowError("");
    if (workflowForm.id) {
      const { data, error } = await supabase.from("event_workflows").update(payload).eq("id", workflowForm.id).select().maybeSingle();
      if (error) {
        setWorkflowError(error.message || "We couldn't save that planning workflow.");
        return;
      }
      if (!data) {
        setWorkflowError("We couldn't save that planning workflow.");
        return;
      }
      const normalized = normalizeEventWorkflow(data);
      setEventWorkflows((current) => (current || []).map((entry) => entry.id === normalized.id ? normalized : entry));
      setSelectedWorkflow(normalized);
      await recordActivity?.({
        action: "updated",
        entityType: "event_plan",
        entityId: normalized.id,
        entityTitle: normalized.event_name || normalized.title,
        summary: `${profile?.full_name || "A staff member"} updated event plan "${normalized.event_name || normalized.title}".`,
      });
    } else {
      const { data, error } = await supabase.from("event_workflows").insert(payload).select().maybeSingle();
      if (error) {
        setWorkflowError(error.message || "We couldn't create that planning workflow.");
        return;
      }
      if (!data) {
        setWorkflowError("We couldn't create that planning workflow.");
        return;
      }
      const normalized = normalizeEventWorkflow(data);
      setEventWorkflows((current) => [normalized, ...(current || [])]);
      setSelectedWorkflow(normalized);
      clearStoredFormDraft(eventPlanDraftKey);
      await recordActivity?.({
        action: "created",
        entityType: "event_plan",
        entityId: normalized.id,
        entityTitle: normalized.event_name || normalized.title,
        summary: `${profile?.full_name || "A staff member"} created event plan "${normalized.event_name || normalized.title}".`,
      });
    }
    setShowWorkflowModal(false);
  };

  useEffect(() => {
    if (showEventForm || showWorkflowModal || selectedWorkflow || selectedRequest) return;
    const restoredEventRequest = readStoredFormDraft(eventRequestDraftKey, null);
    if (restoredEventRequest && hasMeaningfulFormDraft(restoredEventRequest, ["event_format", "location_areas", "av_request", "kitchen_use", "white_linen_agreement", "metal_folding_chairs_requested", "submitted_on"])) {
      const timer = window.setTimeout(() => {
        setEventForm(restoredEventRequest);
        setShowEventForm(true);
      }, 0);
      return () => window.clearTimeout(timer);
    }
    const restoredEventPlan = readStoredFormDraft(eventPlanDraftKey, null);
    if (restoredEventPlan && hasMeaningfulFormDraft(restoredEventPlan, ["linkedRequestId"])) {
      const timer = window.setTimeout(() => {
        setWorkflowForm(restoredEventPlan);
        setShowWorkflowModal(true);
      }, 0);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [eventRequestDraftKey, eventPlanDraftKey, showEventForm, showWorkflowModal, selectedWorkflow, selectedRequest]);

  useEffect(() => {
    if (!showEventForm) return;
    if (!hasMeaningfulFormDraft(eventForm, ["event_format", "location_areas", "av_request", "kitchen_use", "white_linen_agreement", "metal_folding_chairs_requested", "submitted_on"])) return;
    writeStoredFormDraft(eventRequestDraftKey, eventForm);
  }, [showEventForm, eventForm, eventRequestDraftKey]);

  useEffect(() => {
    if (!showWorkflowModal || workflowForm.id) return;
    if (!hasMeaningfulFormDraft(workflowForm, ["linkedRequestId"])) return;
    writeStoredFormDraft(eventPlanDraftKey, workflowForm);
  }, [showWorkflowModal, workflowForm, eventPlanDraftKey]);
  const openWorkflow = (workflow) => {
    setSelectedWorkflow(workflow);
    setTimelineDraft({ id: null, title: "", date: "", details: "", includeInTasks: false, reviewRequired: false, reviewers: [] });
    setShowTimelineModal(false);
    setChecklistDraft("");
    setPlanningNoteDraft("");
  };
  const toggleTimelineReviewer = (name) => {
    setTimelineDraft((current) => {
      const currentReviewers = current.reviewers || [];
      const nextReviewers = listIncludesPerson(currentReviewers, name)
        ? currentReviewers.filter((entry) => !samePerson(entry, name))
        : [...currentReviewers, name];
      return {
        ...current,
        reviewers: nextReviewers,
      };
    });
  };
  const updateWorkflow = async (workflow, changes) => {
    const { data, error } = await supabase.from("event_workflows").update(changes).eq("id", workflow.id).select().maybeSingle();
    if (error || !data) {
      setWorkflowError(error?.message || "We couldn't update that event plan.");
      return null;
    }
    const normalized = normalizeEventWorkflow(data);
    setEventWorkflows((current) => (current || []).map((entry) => entry.id === normalized.id ? normalized : entry));
    setSelectedWorkflow((current) => current?.id === normalized.id ? normalized : current);
    return normalized;
  };
  const updateWorkflowChecklistItem = async (workflow, itemId) => {
    const nextItems = (workflow.checklist_items || []).map((item) => item.id === itemId ? { ...item, done: !item.done } : item);
    await updateWorkflow(workflow, { checklist_items: nextItems });
  };
  const addWorkflowTimelineItem = async (workflow) => {
    if (!timelineDraft.title.trim()) return;
    if (timelineDraft.id) {
      const currentItem = (workflow.timeline_items || []).find((item) => item.id === timelineDraft.id);
      const assigneeName = currentItem?.linked_task_assignee || profile?.full_name || workflow.main_contact || "Staff";
      const existingLinkedTask = currentItem?.linked_task_id
        ? (tasks || []).find((task) => task.id === currentItem.linked_task_id) || findLinkedEventPlanTask(tasks, currentItem?.id)
        : findLinkedEventPlanTask(tasks, currentItem?.id);
      let linkedTaskId = existingLinkedTask?.id || currentItem?.linked_task_id || null;
      const taskReviewers = timelineDraft.reviewRequired
        ? (timelineDraft.reviewers || []).filter((name) => !samePerson(name, assigneeName))
        : [];
      if (!timelineDraft.includeInTasks && linkedTaskId) {
        const linkedTask = (tasks || []).find((task) => task.id === linkedTaskId);
        if (linkedTask) {
          moveItemToTrash?.({
            entity_type: "task",
            entity_label: "Task",
            source: "event-planning",
            source_label: "Event Planning",
            title: linkedTask.title,
            deleted_by: profile?.full_name || "Staff",
            payload: linkedTask,
          });
        }
        const { error: taskError } = await supabase.from("tasks").delete().eq("id", linkedTaskId);
        if (taskError) {
          setWorkflowError(taskError.message || "We couldn't remove the linked task.");
          return;
        }
        setTasks((current) => (current || []).filter((task) => task.id !== linkedTaskId));
        linkedTaskId = null;
      } else if (timelineDraft.includeInTasks && !linkedTaskId) {
        const taskPayload = {
          church_id: church?.id,
          title: timelineDraft.title.trim(),
          ministry: "Events",
          assignee: assigneeName,
          due_date: timelineDraft.date || workflow.start_date || null,
          status: "todo",
          notes: buildEventPlanTaskNotes(workflow, timelineDraft.details, currentItem?.id),
          review_required: timelineDraft.reviewRequired,
          reviewers: taskReviewers,
          review_approvals: [],
          review_history: [],
        };
        const { data: createdTask, error: taskError } = await supabase.from("tasks").insert(taskPayload).select().maybeSingle();
        if (taskError) {
          setWorkflowError(taskError.message || "We couldn't add that timeline step to Tasks.");
          return;
        }
        if (!createdTask) {
          setWorkflowError("We couldn't add that timeline step to Tasks.");
          return;
        }
        linkedTaskId = createdTask?.id || null;
        if (createdTask) {
          const normalizedCreatedTask = normalizeTask(createdTask);
          setTasks((current) => [normalizedCreatedTask, ...(current || [])]);
          const recipient = findStaffByName(previewUsers, normalizedCreatedTask.assignee);
          const recipientProfileId = getStaffProfileId(recipient);
          if (recipientProfileId) {
            await createPersistentNotification({
              churchId: church?.id,
              actorProfile: profile,
              recipientProfileId,
              type: "task_assigned",
              title: "New Event Planning Task",
              detail: `${normalizedCreatedTask.title} was added from ${workflow.event_name || workflow.title}.`,
              target: "tasks",
              taskId: normalizedCreatedTask.id,
              sourceKey: normalizedCreatedTask.id,
              data: { taskTitle: normalizedCreatedTask.title, eventPlanId: workflow.id, eventName: workflow.event_name || workflow.title },
            });
          }
        }
      } else if (linkedTaskId) {
        const taskPayload = {
          title: timelineDraft.title.trim(),
          due_date: timelineDraft.date || workflow.start_date || null,
          notes: buildEventPlanTaskNotes(workflow, timelineDraft.details, currentItem?.id),
          review_required: timelineDraft.includeInTasks ? timelineDraft.reviewRequired : false,
          reviewers: timelineDraft.includeInTasks ? taskReviewers : [],
          review_approvals: [],
          status: timelineDraft.includeInTasks && timelineDraft.reviewRequired && currentItem?.done ? "in-review" : currentItem?.done ? "done" : "todo",
        };
        let { data: updatedTask, error: taskError } = await supabase.from("tasks").update(taskPayload).eq("id", linkedTaskId).select().maybeSingle();
        if (taskError) {
          setWorkflowError(taskError.message || "We couldn't update the linked task.");
          return;
        }
        if (!updatedTask) {
          const recreatedTaskPayload = {
            church_id: church?.id,
            ministry: "Events",
            assignee: assigneeName,
            ...taskPayload,
          };
          const { data: recreatedTask, error: recreateError } = await supabase.from("tasks").insert(recreatedTaskPayload).select().maybeSingle();
          if (recreateError || !recreatedTask) {
            setWorkflowError(recreateError?.message || "We couldn't update the linked task.");
            return;
          }
          linkedTaskId = recreatedTask.id;
          setTasks((current) => [normalizeTask(recreatedTask), ...(current || []).filter((task) => task.id !== linkedTaskId)]);
        } else {
          setTasks((current) => (current || []).map((task) => task.id === updatedTask.id ? normalizeTask(updatedTask) : task));
        }
      }
      const nextItems = (workflow.timeline_items || []).map((item) => item.id === timelineDraft.id ? {
        ...item,
        title: timelineDraft.title.trim(),
        date: timelineDraft.date || null,
        details: timelineDraft.details.trim(),
        linked_task_id: timelineDraft.includeInTasks ? linkedTaskId : null,
        linked_task_assignee: timelineDraft.includeInTasks ? assigneeName : null,
        linked_task_review_required: timelineDraft.includeInTasks ? timelineDraft.reviewRequired : false,
        linked_task_reviewers: timelineDraft.includeInTasks ? taskReviewers : [],
      } : item);
      await updateWorkflow(workflow, { timeline_items: nextItems });
      setWorkflowError("");
      setTimelineDraft({ id: null, title: "", date: "", details: "", includeInTasks: false, reviewRequired: false, reviewers: [] });
      setShowTimelineModal(false);
      return;
    }
    const assigneeName = profile?.full_name || workflow.main_contact || "Staff";
    const taskReviewers = timelineDraft.reviewRequired
      ? (timelineDraft.reviewers || []).filter((name) => !samePerson(name, assigneeName))
      : [];
    const nodeId = crypto.randomUUID();
    let linkedTaskId = null;
    if (timelineDraft.includeInTasks) {
      const taskPayload = {
        church_id: church?.id,
        title: timelineDraft.title.trim(),
        ministry: "Events",
        assignee: assigneeName,
        due_date: timelineDraft.date || workflow.start_date || null,
        status: "todo",
        notes: buildEventPlanTaskNotes(workflow, timelineDraft.details, nodeId),
        review_required: timelineDraft.reviewRequired,
        reviewers: taskReviewers,
        review_approvals: [],
        review_history: [],
      };
      const { data: createdTask, error: taskError } = await supabase.from("tasks").insert(taskPayload).select().maybeSingle();
      if (taskError) {
        setWorkflowError(taskError.message || "We couldn't add that timeline step to Tasks.");
        return;
      }
      if (!createdTask) {
        setWorkflowError("We couldn't add that timeline step to Tasks.");
        return;
      }
      linkedTaskId = createdTask?.id || null;
      if (createdTask) {
        const normalizedCreatedTask = normalizeTask(createdTask);
        setTasks((current) => [normalizedCreatedTask, ...(current || [])]);
        const recipient = findStaffByName(previewUsers, normalizedCreatedTask.assignee);
        const recipientProfileId = getStaffProfileId(recipient);
        if (recipientProfileId) {
          await createPersistentNotification({
            churchId: church?.id,
            actorProfile: profile,
            recipientProfileId,
            type: "task_assigned",
            title: "New Event Planning Task",
            detail: `${normalizedCreatedTask.title} was added from ${workflow.event_name || workflow.title}.`,
            target: "tasks",
            taskId: normalizedCreatedTask.id,
            sourceKey: normalizedCreatedTask.id,
            data: { taskTitle: normalizedCreatedTask.title, eventPlanId: workflow.id, eventName: workflow.event_name || workflow.title },
          });
        }
      }
    }
    const nextItems = [
      ...(workflow.timeline_items || []),
      {
        id: nodeId,
        title: timelineDraft.title.trim(),
        date: timelineDraft.date || null,
        details: timelineDraft.details.trim(),
        done: false,
        created_by: profile?.full_name || "Staff",
        linked_task_id: linkedTaskId,
        linked_task_assignee: timelineDraft.includeInTasks ? assigneeName : null,
        linked_task_review_required: timelineDraft.includeInTasks ? timelineDraft.reviewRequired : false,
        linked_task_reviewers: timelineDraft.includeInTasks ? taskReviewers : [],
      },
    ];
    await updateWorkflow(workflow, { timeline_items: nextItems });
    setWorkflowError("");
    setTimelineDraft({ id: null, title: "", date: "", details: "", includeInTasks: false, reviewRequired: false, reviewers: [] });
    setShowTimelineModal(false);
  };
  const beginEditWorkflowTimelineItem = (item) => {
    const linkedTaskExists = !!item.linked_task_id && (tasks || []).some((task) => task.id === item.linked_task_id);
    setWorkflowError("");
    setTimelineDraft({
      id: item.id,
      title: item.title || "",
      date: item.date || "",
      details: item.details || "",
      includeInTasks: linkedTaskExists,
      reviewRequired: linkedTaskExists ? !!item.linked_task_review_required : false,
      reviewers: linkedTaskExists && item.linked_task_review_required && Array.isArray(item.linked_task_reviewers) ? item.linked_task_reviewers : [],
    });
    setShowTimelineModal(true);
  };
  const openNewTimelineItemModal = () => {
    setWorkflowError("");
    setTimelineDraft({ id: null, title: "", date: "", details: "", includeInTasks: false, reviewRequired: false, reviewers: [] });
    setShowTimelineModal(true);
  };
  const deleteWorkflowTimelineItem = async (workflow, itemId) => {
    if (!confirmDestructiveAction("Delete this timeline node?")) return;
    const nextItems = (workflow.timeline_items || []).filter((item) => item.id !== itemId);
    await updateWorkflow(workflow, { timeline_items: nextItems });
    setTimelineDraft({ id: null, title: "", date: "", details: "", includeInTasks: false, reviewRequired: false, reviewers: [] });
    setShowTimelineModal(false);
    setWorkflowError("");
  };
  const toggleWorkflowTimelineItem = async (workflow, itemId) => {
    const targetItem = (workflow.timeline_items || []).find((item) => item.id === itemId);
    const nextDoneState = !targetItem?.done;
    if (targetItem?.linked_task_id) {
      const nextTaskStatus = nextDoneState
        ? (targetItem.linked_task_review_required ? "in-review" : "done")
        : "todo";
      const { data: updatedTask, error: taskError } = await supabase
        .from("tasks")
        .update({ status: nextTaskStatus })
        .eq("id", targetItem.linked_task_id)
        .select()
        .maybeSingle();
      if (taskError) {
        setWorkflowError(taskError.message || "We couldn't update the linked task.");
        return;
      }
      if (!updatedTask) {
        setWorkflowError("We couldn't update the linked task.");
        return;
      }
      if (updatedTask) {
        setTasks((current) => (current || []).map((task) => task.id === updatedTask.id ? normalizeTask(updatedTask) : task));
      }
    }
    const nextItems = (workflow.timeline_items || []).map((item) => item.id === itemId ? { ...item, done: !item.done } : item);
    await updateWorkflow(workflow, { timeline_items: nextItems });
  };
  const addWorkflowChecklistItem = async (workflow) => {
    if (!checklistDraft.trim()) return;
    const nextItems = [
      ...(workflow.checklist_items || []),
      { id: crypto.randomUUID(), title: checklistDraft.trim(), done: false },
    ];
    await updateWorkflow(workflow, { checklist_items: nextItems });
    setChecklistDraft("");
  };
  const deleteWorkflowChecklistItem = async (workflow, itemId) => {
    if (!confirmDestructiveAction("Delete this checklist item?")) return;
    const nextItems = (workflow.checklist_items || []).filter((item) => item.id !== itemId);
    await updateWorkflow(workflow, { checklist_items: nextItems });
  };
  const addWorkflowNote = async (workflow) => {
    if (!planningNoteDraft.trim()) return;
    const nextNotes = [
      ...(workflow.notes_entries || []),
      {
        id: crypto.randomUUID(),
        author: profile?.full_name || "Staff",
        body: planningNoteDraft.trim(),
        created_at: new Date().toISOString(),
      },
    ];
    await updateWorkflow(workflow, { notes_entries: nextNotes });
    setPlanningNoteDraft("");
  };
  const deleteWorkflow = async (workflow) => {
    if (!workflow?.id) return;
    if (!confirmDestructiveAction(`Delete ${workflow.event_name || workflow.title || "this event plan"}? You can restore supported items from Trash.`)) return;
    moveItemToTrash?.({
      entity_type: "event_plan",
      entity_label: "Event Plan",
      source: "event-planning",
      source_label: "Event Planning",
      title: workflow.event_name || workflow.title,
      deleted_by: profile?.full_name || "Staff",
      payload: workflow,
    });
    const { error } = await supabase.from("event_workflows").delete().eq("id", workflow.id);
    if (error) {
      setWorkflowError(error.message || "We couldn't delete that event plan.");
      return;
    }
    setWorkflowError("");
    setEventWorkflows((current) => (current || []).filter((entry) => entry.id !== workflow.id));
    setSelectedWorkflow((current) => current?.id === workflow.id ? null : current);
    await recordActivity?.({
      action: "deleted",
      entityType: "event_plan",
      entityId: workflow.id,
      entityTitle: workflow.event_name || workflow.title,
      summary: `${profile?.full_name || "A staff member"} deleted event plan "${workflow.event_name || workflow.title}".`,
    });
  };
	  const deleteRequest = async (request) => {
    if (!request?.id) return;
    if (!confirmDestructiveAction(`Delete ${request.event_name || "this event request"}? You can restore supported items from Trash.`)) return;
    moveItemToTrash?.({
      entity_type: "event_request",
      entity_label: "Event Request",
      source: "events-board",
      source_label: "Events Board",
      title: request.event_name,
      deleted_by: profile?.full_name || "Staff",
      payload: request,
    });
    const { error } = await supabase.from("event_requests").delete().eq("id", request.id);
    if (error) {
      setFormError(error.message || "We couldn't delete that event request.");
      return;
    }
    setFormError("");
    setEventRequests((current) => (current || []).filter((entry) => entry.id !== request.id));
    setSelectedRequest(null);
	    await recordActivity?.({
	      action: "deleted",
	      entityType: "event_request",
	      entityId: request.id,
	      entityTitle: request.event_name,
	      summary: `${profile?.full_name || "A staff member"} deleted event request "${request.event_name}".`,
	    });
	  };
  const addEventRequestComment = async (request) => {
    const body = requestCommentDraft.trim();
    if (!body || !request?.id) return;
    setFormError("");
    const nextComment = {
      id: crypto.randomUUID(),
      author: profile?.full_name || "Staff",
      email: profile?.email || "",
      role: "staff",
      body,
      created_at: new Date().toISOString(),
    };
    const nextComments = [...(Array.isArray(request.public_comments) ? request.public_comments : []), nextComment];
    const { data, error } = await supabase
      .from("event_requests")
      .update({ public_comments: nextComments })
      .eq("id", request.id)
      .select()
      .single();
    if (error) {
      setFormError(error.message || "We couldn't add that comment.");
      return;
    }
    setEventRequests((current) => (current || []).map((entry) => entry.id === data.id ? data : entry));
    setSelectedRequest(data);
    setRequestCommentDraft("");
    await recordActivity?.({
      action: "commented",
      entityType: "event_request",
      entityId: request.id,
      entityTitle: request.event_name,
      summary: `${profile?.full_name || "A staff member"} commented on event request "${request.event_name}".`,
    });
  };

  useEffect(() => {
    if (!showTimelineModal || !timelineEditorRef.current) return;
    timelineEditorRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [showTimelineModal]);

  return (
    <div className="fadeIn mobile-pad" style={widePageStyle}>
      <div className="card" style={{padding:22}}>
        <div className="events-board-header" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
          <div style={{textAlign:"left"}}>
            <h3 style={{...pageTitleStyle,textAlign:"left"}}>Events Board</h3>
            <p style={{color:C.muted,fontSize:13,marginTop:8,maxWidth:560,textAlign:"left",lineHeight:1.55}}>
              Manage event requests, approvals, and the follow-through needed to move each event from submission to calendar-ready planning.
            </p>
            {copyMessage && (
              <div style={{fontSize:12,color:C.success,marginTop:8}}>{copyMessage}</div>
            )}
          </div>
          <div className="events-board-actions" style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"}}>
            {eventsSection !== "home" && (
              <button className="btn-outline" onClick={() => setEventsSection("home")}>Back to Events Board</button>
            )}
          </div>
        </div>
        {eventsSection === "home" && (
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:16}}>
            <button
              className="card"
              onClick={() => setEventsSection("planning")}
              style={{padding:22,textAlign:"left",background:C.surface,cursor:"pointer",display:"grid",gap:10,minHeight:180}}
            >
              <div style={{fontSize:18,fontWeight:600,color:C.text}}>Event Planning</div>
              <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>
                Build planning workflows for upcoming events and organize them between your own plans and the rest of the team.
              </div>
              <div style={{marginTop:"auto",justifySelf:"end"}}>
                <span className="btn-gold-compact">Open planning</span>
              </div>
            </button>
            <button
              className="card"
              onClick={() => setEventsSection("requests")}
              style={{padding:22,textAlign:"left",background:C.surface,cursor:"pointer",display:"grid",gap:10,minHeight:180}}
            >
              <div style={{fontSize:18,fontWeight:600,color:C.text}}>Event Requests</div>
              <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>
                Intake, review, approve, and archive incoming event requests for the church.
              </div>
              <div style={{marginTop:"auto",justifySelf:"end"}}>
                <span className="btn-gold-compact">Open requests</span>
              </div>
            </button>
          </div>
        )}
        {eventsSection === "planning" && (
          <div className="card" style={{padding:18,borderTop:`3px solid ${C.blue}`,background:`linear-gradient(180deg, rgba(91,143,232,0.08) 0%, ${C.card} 24%)`}}>
            {showWorkflowModal && (
              <div style={{display:"grid",gap:18}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
                  <div style={{textAlign:"left"}}>
                    <button className="btn-outline" onClick={closeWorkflowForm} style={{marginBottom:14}}>
                      Back to Event Planning
                    </button>
                    <h3 style={{...pageTitleStyle,textAlign:"left"}}>{workflowForm.id ? "Edit Event Plan" : "New Event Plan"}</h3>
                    <div style={{fontSize:12,color:C.muted,marginTop:8,lineHeight:1.6,maxWidth:640}}>
                      Capture the core event details here, then open the plan to build out the timeline, checklist, and notes.
                    </div>
                  </div>
                </div>
                <div className="card" style={{padding:20,textAlign:"left",display:"grid",gap:14}}>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    <label style={{fontSize:12,color:C.muted,textAlign:"left"}}>Name Of The Event</label>
                    <input className="input-field" placeholder="Example: Women's Night" value={workflowForm.eventName} onChange={(e)=>setWorkflowForm((current) => ({ ...current, eventName: e.target.value }))} />
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    <label style={{fontSize:12,color:C.muted,textAlign:"left"}}>Link To Event Request</label>
                    <select className="input-field" value={workflowForm.linkedRequestId} onChange={(e)=>{
                      const linkedRequest = requests.find((request) => request.id === e.target.value);
                      setWorkflowForm((current) => ({
                        ...current,
                        linkedRequestId: e.target.value,
                        eventName: linkedRequest?.event_name || current.eventName,
                        startDate: linkedRequest?.single_date || linkedRequest?.multi_start_date || linkedRequest?.recurring_start_date || current.startDate,
                        endDate: linkedRequest?.multi_end_date || linkedRequest?.single_date || linkedRequest?.recurring_start_date || current.endDate,
                        location: linkedRequest ? getEventLocationSummary(linkedRequest) : current.location,
                        mainContact: linkedRequest?.contact_name || current.mainContact,
                      }));
                    }} style={{background:C.surface}}>
                      <option value="">No linked request</option>
                      {requests.map((request) => (
                        <option key={request.id} value={request.id}>{request.event_name}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{display:"grid",gap:10}}>
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      <label style={{fontSize:12,color:C.muted,textAlign:"left"}}>From Date</label>
                      <input className="input-field" type="date" value={workflowForm.startDate} onChange={(e)=>setWorkflowForm((current) => ({ ...current, startDate: e.target.value }))} />
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      <label style={{fontSize:12,color:C.muted,textAlign:"left"}}>To Date</label>
                      <input className="input-field" type="date" value={workflowForm.endDate} onChange={(e)=>setWorkflowForm((current) => ({ ...current, endDate: e.target.value }))} />
                    </div>
                    <div className="mobile-two-stack" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                      <div style={{display:"flex",flexDirection:"column",gap:6}}>
                        <label style={{fontSize:12,color:C.muted,textAlign:"left"}}>Start Time</label>
                        <input className="input-field" type="time" value={workflowForm.startTime || ""} onChange={(e)=>setWorkflowForm((current) => ({ ...current, startTime: e.target.value }))} />
                      </div>
                      <div style={{display:"flex",flexDirection:"column",gap:6}}>
                        <label style={{fontSize:12,color:C.muted,textAlign:"left"}}>End Time</label>
                        <input className="input-field" type="time" value={workflowForm.endTime || ""} onChange={(e)=>setWorkflowForm((current) => ({ ...current, endTime: e.target.value }))} />
                      </div>
                    </div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    <label style={{fontSize:12,color:C.muted,textAlign:"left"}}>Location</label>
                    <input className="input-field" placeholder="Example: Youth Room" value={workflowForm.location} onChange={(e)=>setWorkflowForm((current) => ({ ...current, location: e.target.value }))} />
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    <label style={{fontSize:12,color:C.muted,textAlign:"left"}}>Main Contact Person</label>
                    <input className="input-field" placeholder="Who is leading this event?" value={workflowForm.mainContact} onChange={(e)=>setWorkflowForm((current) => ({ ...current, mainContact: e.target.value }))} />
                  </div>
                  {workflowError && <div style={{fontSize:12,color:C.danger,textAlign:"left"}}>{workflowError}</div>}
                  <div style={{display:"flex",gap:10,justifyContent:"flex-end",flexWrap:"wrap",paddingTop:8}}>
                    <button className="btn-outline" onClick={closeWorkflowForm}>Cancel</button>
                    <button className="btn-gold" onClick={saveWorkflow}>Save Event Plan</button>
                  </div>
                </div>
              </div>
            )}
            {!showWorkflowModal && !selectedWorkflow && (
              <>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap",marginBottom:14}}>
                  <div style={{textAlign:"left"}}>
                    <div style={{...sectionTitleStyle,textAlign:"left"}}>Event Planning</div>
                    <div style={{fontSize:12,color:C.muted,marginTop:6,lineHeight:1.6,maxWidth:680}}>
                      Start with a short intake, then open the event to build out its planning timeline, checklist, and working notes. Use the filters to switch between your own plans and plans created by others.
                    </div>
                  </div>
                  <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
                    <div className="task-filter-group" style={{display:"flex",background:C.surface,borderRadius:10,padding:3,border:`1px solid ${C.border}`,gap:2}}>
                      {[
                        { id: "mine", label: "My Plans" },
                        { id: "others", label: "Others" },
                      ].map((option) => (
                        <button
                          key={option.id}
                          onClick={() => setPlanningFilter(option.id)}
                          style={{padding:"6px 14px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:500,background:planningFilter===option.id?C.card:"transparent",color:planningFilter===option.id?C.text:C.muted}}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    <button className="btn-outline" onClick={() => openWorkflowModal()}>New Event Plan</button>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:14}}>
                  {workflowLoading && (
                    <div style={{padding:"26px 14px",border:`1px dashed ${C.border}`,borderRadius:12,textAlign:"center",fontSize:12,color:C.muted,gridColumn:"1 / -1"}}>
                      Loading event plans...
                    </div>
                  )}
                  {!workflowLoading && visibleWorkflows.length === 0 && (
                    <div style={{padding:"26px 14px",border:`1px dashed ${C.border}`,borderRadius:12,textAlign:"center",fontSize:12,color:C.muted,gridColumn:"1 / -1"}}>
                      {planningFilter === "mine"
                        ? "You have not created any event plans yet."
                        : "No event plans from other team members yet."}
                    </div>
                  )}
                  {!workflowLoading && visibleWorkflows.map((workflow) => {
                    const checklistDone = (workflow.checklist_items || []).filter((item) => item.done).length;
                    return (
                      <div
                        key={workflow.id}
                        className="card"
                        style={{padding:18,textAlign:"left",background:C.surface,border:`1px solid ${C.border}`,display:"grid",gap:10}}
                      >
                        <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"flex-start"}}>
                          <div style={{fontSize:20,fontWeight:600,color:C.text,lineHeight:1.2}}>{workflow.event_name || workflow.title}</div>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            {canEditWorkflow(workflow) && (
                              <button
                                type="button"
                                onClick={() => deleteWorkflow(workflow)}
                                style={{display:"flex",alignItems:"center",justifyContent:"center",background:"none",border:`1px solid ${C.border}`,borderRadius:10,cursor:"pointer",color:C.muted,padding:8}}
                                aria-label={`Delete ${workflow.event_name || workflow.title}`}
                                title="Delete event plan"
                              >
                                <Icons.trash />
                              </button>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => openWorkflow(workflow)}
                          style={{display:"grid",gap:10,textAlign:"left",background:"none",border:"none",padding:0,cursor:"pointer"}}
                        >
                          <div style={{fontSize:12,color:C.muted}}>Countdown: {getEventCountdownLabel(workflow)}</div>
                          <div style={{fontSize:12,color:C.muted}}>Main contact: {workflow.main_contact || "—"}</div>
                          <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>{getEventTimelineSummary(workflow)}</div>
                          <div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap",fontSize:12,color:C.muted}}>
                            <span>{workflow.start_date ? fmtDate(workflow.start_date) : "Date not set"}</span>
                            <span>{checklistDone}/{(workflow.checklist_items || []).length} checklist items complete</span>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
            {!showWorkflowModal && selectedWorkflow && (
              <div style={{display:"grid",gap:16}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
                  <div style={{textAlign:"left"}}>
                    <button className="btn-outline" onClick={() => setSelectedWorkflow(null)} style={{marginBottom:14}}>Back to Event Planning</button>
                    <h3 style={{...pageTitleStyle,textAlign:"left"}}>{selectedWorkflow.event_name || selectedWorkflow.title}</h3>
                    <div style={{fontSize:14,color:C.gold,fontWeight:600,marginTop:8,textAlign:"left"}}>{getEventCountdownLabel(selectedWorkflow)}</div>
                    <div style={{fontSize:12,color:C.muted,marginTop:10,lineHeight:1.6,textAlign:"left"}}>
                      Use this page as the working hub for the event: organize the timeline, mark off the checklist, and keep live planning notes in one place.
                    </div>
                  </div>
                  <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
                    {canEditWorkflow(selectedWorkflow) && (
                      <button className="btn-outline" onClick={() => openWorkflowModal(selectedWorkflow)}>Edit Event Details</button>
                    )}
                    {canEditWorkflow(selectedWorkflow) && (
                      <button
                        type="button"
                        onClick={() => deleteWorkflow(selectedWorkflow)}
                        style={{display:"flex",alignItems:"center",justifyContent:"center",background:"none",border:`1px solid ${C.border}`,borderRadius:10,cursor:"pointer",color:C.muted,padding:10}}
                        aria-label={`Delete ${selectedWorkflow.event_name || selectedWorkflow.title}`}
                        title="Delete event plan"
                      >
                        <Icons.trash />
                      </button>
                    )}
                  </div>
                </div>
                <div className="card" style={{padding:16,textAlign:"left",display:"grid",gap:12}}>
                  <div className="request-details-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12}}>
                    <div>
                      <div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:0.4}}>Event Date</div>
                      <div style={{fontSize:14,color:C.text,marginTop:4}}>
                        {selectedWorkflow.start_date ? fmtDate(selectedWorkflow.start_date) : "—"}{selectedWorkflow.end_date && selectedWorkflow.end_date !== selectedWorkflow.start_date ? ` - ${fmtDate(selectedWorkflow.end_date)}` : ""}
                      </div>
                      {(selectedWorkflow.start_time || selectedWorkflow.end_time) && (
                        <div style={{fontSize:12,color:C.muted,marginTop:4}}>
                          {selectedWorkflow.start_time || "Start time TBD"}{selectedWorkflow.end_time ? ` - ${selectedWorkflow.end_time}` : ""}
                        </div>
                      )}
                    </div>
                    <div>
                      <div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:0.4}}>Location</div>
                      <div style={{fontSize:14,color:C.text,marginTop:4}}>{selectedWorkflow.location || "—"}</div>
                    </div>
                    <div>
                      <div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:0.4}}>Main Contact</div>
                      <div style={{fontSize:14,color:C.text,marginTop:4}}>{selectedWorkflow.main_contact || "—"}</div>
                    </div>
                    {selectedWorkflow.linked_event_request_id && (
                      <div>
                        <div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:0.4}}>Linked Request</div>
                        <div style={{fontSize:14,color:C.text,marginTop:4}}>
                          {requests.find((request) => request.id === selectedWorkflow.linked_event_request_id)?.event_name || "—"}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {workflowError && (
                  <div style={{fontSize:12,color:C.danger,textAlign:"left"}}>{workflowError}</div>
                )}
                <div className="card" style={{padding:18,textAlign:"left"}}>
                  <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}>
                    <div>
                      <div style={{...sectionTitleStyle,textAlign:"left"}}>Timeline</div>
                      <div style={{fontSize:12,color:C.muted,marginTop:6,lineHeight:1.6}}>Build the event out in chronological order. Open a node when you want to focus on one step without letting the timeline take over the whole page.</div>
                    </div>
                  </div>
                  {canEditWorkflow(selectedWorkflow) && showTimelineModal && (
                    <div ref={timelineEditorRef} className="card" style={{padding:18,textAlign:"left",display:"grid",gap:14,marginTop:16,marginBottom:16,border:`1px solid ${C.goldDim}`,background:C.surface}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                        <h3 style={sectionTitleStyle}>{timelineDraft.id ? "Edit Timeline Node" : "Add Timeline Node"}</h3>
                        <button className="btn-outline" onClick={()=>setShowTimelineModal(false)} style={{padding:"6px 10px",fontSize:12}}>Close Editor</button>
                      </div>
                      <div style={{display:"grid",gap:10}}>
                        <input className="input-field" placeholder="Timeline task title" value={timelineDraft.title} onChange={(e)=>setTimelineDraft((current) => ({ ...current, title: e.target.value }))} />
                        <input className="input-field" type="date" value={timelineDraft.date} onChange={(e)=>setTimelineDraft((current) => ({ ...current, date: e.target.value }))} />
                        <textarea className="input-field" rows={4} placeholder="What needs to happen for this step?" value={timelineDraft.details} onChange={(e)=>setTimelineDraft((current) => ({ ...current, details: e.target.value }))} style={{resize:"vertical"}} />
                        <>
                          <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:C.text,textAlign:"left"}}>
                            <input
                              type="checkbox"
                              checked={!!timelineDraft.includeInTasks}
                              onChange={(e)=>setTimelineDraft((current) => ({
                                ...current,
                                includeInTasks: e.target.checked,
                                reviewRequired: e.target.checked ? current.reviewRequired : false,
                                reviewers: e.target.checked ? current.reviewers : [],
                              }))}
                            />
                            Also add this step to my Tasks list
                          </label>
                          {timelineDraft.includeInTasks && (
                            <div style={{display:"grid",gap:10}}>
                              <div style={{fontSize:11,color:C.muted,textAlign:"left"}}>
                                Shepherd will create or update the linked task assigned to you, and checking it off here will also move that linked task forward.
                              </div>
                              <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:C.text,textAlign:"left"}}>
                                <input
                                  type="checkbox"
                                  checked={!!timelineDraft.reviewRequired}
                                  onChange={(e)=>setTimelineDraft((current) => ({
                                    ...current,
                                    reviewRequired: e.target.checked,
                                    reviewers: e.target.checked ? current.reviewers : [],
                                  }))}
                                />
                                This task needs the review workflow
                              </label>
                              {timelineDraft.reviewRequired && (
                                <>
                                  <div style={{fontSize:11,color:C.muted,textAlign:"left"}}>
                                    Pick the reviewers who need to sign off once this linked task reaches review.
                                  </div>
                                  <div className="mobile-two-stack" style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10,padding:14,border:`1px solid ${C.border}`,borderRadius:12,background:C.surface}}>
                                    {eventPlanningTeamNames.map((name) => {
                                      const isAssignedPerson = samePerson(name, profile?.full_name || selectedWorkflow.main_contact || "Staff");
                                      return (
                                        <label key={name} style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:isAssignedPerson ? C.muted : C.text,opacity:isAssignedPerson ? 0.72 : 1}}>
                                          <input
                                            type="checkbox"
                                            checked={listIncludesPerson(timelineDraft.reviewers || [], name)}
                                            onChange={()=>toggleTimelineReviewer(name)}
                                            disabled={isAssignedPerson}
                                          />
                                          {name}
                                          {isAssignedPerson && <span style={{fontSize:11,color:C.muted}}>(Assigned)</span>}
                                        </label>
                                      );
                                    })}
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap",marginTop:22}}>
                        <div>
                          {timelineDraft.id && (
                            <button
                              className="btn-outline"
                              onClick={() => deleteWorkflowTimelineItem(selectedWorkflow, timelineDraft.id)}
                              style={{display:"flex",alignItems:"center",justifyContent:"center",padding:10,borderColor:"rgba(224,82,82,.35)",color:C.danger}}
                              aria-label="Delete timeline node"
                              title="Delete timeline node"
                            >
                              <Icons.trash />
                            </button>
                          )}
                        </div>
                        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                          <button className="btn-outline" onClick={() => {
                            setShowTimelineModal(false);
                            setTimelineDraft({ id: null, title: "", date: "", details: "", includeInTasks: false, reviewRequired: false, reviewers: [] });
                          }}>
                            Cancel
                          </button>
                          <button className="btn-gold" onClick={() => addWorkflowTimelineItem(selectedWorkflow)}>
                            {timelineDraft.id ? "Save Changes" : "Add Timeline Node"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  <div style={{position:"relative",marginTop:16,padding:"4px 0 6px 0"}}>
                    {(selectedWorkflow.timeline_items || []).length > 0 && (
                      <div style={{position:"absolute",left:10,top:10,bottom:10,width:3,background:"linear-gradient(180deg, rgba(91,143,232,0.45) 0%, rgba(91,143,232,0.9) 100%)",borderRadius:999}} />
                    )}
                    <div style={{display:"flex",flexDirection:"column",gap:16,paddingLeft:0}}>
                    {(selectedWorkflow.timeline_items || [])
                      .slice()
                      .sort((left, right) => new Date(left.date || 0) - new Date(right.date || 0))
                      .map((item) => (
                        <details key={item.id} open={false} style={{position:"relative",paddingLeft:34}}>
                          <summary style={{listStyle:"none",cursor:"pointer",outline:"none"}}>
                            <div style={{position:"absolute",left:0,top:14,width:22,height:22,borderRadius:"50%",border:`4px solid ${item.done ? C.success : C.blue}`,background:C.card,zIndex:1}} />
                            <div style={{padding:"10px 12px 9px",border:`1px solid ${C.border}`,borderRadius:14,background:item.done ? "rgba(82,200,122,0.08)" : C.surface,minHeight:64}}>
                              <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start",flexWrap:"wrap"}}>
                                <div style={{fontSize:14,fontWeight:600,color:item.done ? C.muted : C.text,lineHeight:1.35,textDecoration:item.done ? "line-through" : "none"}}>{item.title}</div>
                                <div style={{fontSize:12,color:C.muted}}>{item.date ? `Due ${fmtDate(item.date)}` : "Due date not set"}</div>
                              </div>
                              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:6}}>
                                {item.linked_task_id && (
                                  <span className="badge" style={{background:C.goldGlow,color:C.gold,border:`1px solid ${C.goldDim}`}}>
                                    In Tasks{item.linked_task_assignee ? ` • ${item.linked_task_assignee}` : ""}
                                  </span>
                                )}
                                {item.linked_task_review_required && (
                                  <span className="badge" style={{background:"rgba(155,114,232,.15)",color:C.purple,border:`1px solid rgba(155,114,232,.3)`}}>
                                    Review Workflow
                                  </span>
                                )}
                                {item.done && <div style={{fontSize:10,color:C.gold,alignSelf:"center"}}>Completed</div>}
                              </div>
                            </div>
                          </summary>
                          <div style={{marginTop:10,padding:"12px 14px",border:`1px solid ${C.border}`,borderRadius:12,background:C.card}}>
                            {item.details ? (
                              <div style={{fontSize:12,color:C.muted,lineHeight:1.6,whiteSpace:"pre-line"}}>{item.details}</div>
                            ) : (
                              <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>No extra details added yet.</div>
                            )}
                            {canEditWorkflow(selectedWorkflow) && (
                              <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",marginTop:12,flexWrap:"wrap"}}>
                                <label style={{display:"flex",alignItems:"center",gap:10,fontSize:12,color:C.text}}>
                                  <input type="checkbox" checked={!!item.done} onChange={() => toggleWorkflowTimelineItem(selectedWorkflow, item.id)} />
                                  Mark this timeline step complete
                                </label>
                                <button
                                  type="button"
                                  className="btn-outline"
                                  onClick={() => beginEditWorkflowTimelineItem(item)}
                                  style={{padding:"6px 10px",fontSize:12}}
                                >
                                  <Icons.pen /> Edit Node
                                </button>
                              </div>
                            )}
                          </div>
                        </details>
                      ))}
                    </div>
                    {(selectedWorkflow.timeline_items || []).length === 0 && (
                      <div style={{padding:"22px 14px",border:`1px dashed ${C.border}`,borderRadius:12,textAlign:"center",fontSize:12,color:C.muted}}>No timeline tasks yet.</div>
                    )}
                  </div>
                  {canEditWorkflow(selectedWorkflow) && (
                    <div style={{display:"grid",gap:14,marginTop:18,paddingTop:18,borderTop:`1px solid ${C.border}`}}>
                      <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}>
                        <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>
                          Add another step when you need to expand the event plan with a new deadline or objective.
                        </div>
                        <button className="btn-outline" onClick={openNewTimelineItemModal}>
                          <Icons.plus /> Add Timeline Node
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="request-details-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                  <div className="card" style={{padding:18,textAlign:"left"}}>
                    <div style={{...sectionTitleStyle,textAlign:"left"}}>Checklist</div>
                    <div style={{fontSize:12,color:C.muted,marginTop:6,lineHeight:1.6}}>Track the major planning wins that need to be closed before the event arrives.</div>
                    <div style={{display:"flex",flexDirection:"column",gap:10,marginTop:14}}>
                      {(selectedWorkflow.checklist_items || []).map((item) => (
                        <div key={item.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",border:`1px solid ${C.border}`,borderRadius:10,background:C.surface}}>
                          <input type="checkbox" checked={!!item.done} disabled={!canEditWorkflow(selectedWorkflow)} onChange={() => updateWorkflowChecklistItem(selectedWorkflow, item.id)} />
                          <span style={{flex:1,fontSize:13,color:item.done ? C.muted : C.text,textDecoration:item.done ? "line-through" : "none"}}>{item.title}</span>
                          {canEditWorkflow(selectedWorkflow) && (
                            <button
                              type="button"
                              onClick={() => deleteWorkflowChecklistItem(selectedWorkflow, item.id)}
                              style={{display:"flex",alignItems:"center",justifyContent:"center",background:"none",border:`1px solid ${C.border}`,borderRadius:8,cursor:"pointer",color:C.muted,padding:6}}
                              aria-label={`Delete ${item.title}`}
                              title="Delete checklist item"
                            >
                              <Icons.trash />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    {canEditWorkflow(selectedWorkflow) && (
                      <div style={{display:"grid",gap:10,marginTop:14}}>
                        <input className="input-field" placeholder="Add another checklist item" value={checklistDraft} onChange={(e)=>setChecklistDraft(e.target.value)} />
                        <div style={{display:"flex",justifyContent:"flex-end"}}>
                          <button className="btn-outline" onClick={() => addWorkflowChecklistItem(selectedWorkflow)}>Add Checklist Item</button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="card" style={{padding:18,textAlign:"left"}}>
                    <div style={{...sectionTitleStyle,textAlign:"left"}}>Planning Notes</div>
                    <div style={{fontSize:12,color:C.muted,marginTop:6,lineHeight:1.6}}>Use this like a shared notepad for ideas, open questions, and planning updates.</div>
                    <div style={{display:"flex",flexDirection:"column",gap:10,marginTop:14}}>
                      {(selectedWorkflow.notes_entries || [])
                        .slice()
                        .sort((left, right) => new Date(left.created_at || 0) - new Date(right.created_at || 0))
                        .map((entry) => (
                          <div key={entry.id} style={{padding:"12px 14px",border:`1px solid ${C.border}`,borderRadius:12,background:C.surface}}>
                            <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start"}}>
                              <div style={{fontSize:13,fontWeight:600,color:C.text}}>{entry.author || "Staff"}</div>
                              <div style={{fontSize:11,color:C.muted}}>{fmtDate(entry.created_at)} {new Date(entry.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</div>
                            </div>
                            <div style={{fontSize:13,color:C.text,marginTop:6,lineHeight:1.6,whiteSpace:"pre-line"}}>{entry.body}</div>
                          </div>
                        ))}
                      {(selectedWorkflow.notes_entries || []).length === 0 && (
                        <div style={{padding:"22px 14px",border:`1px dashed ${C.border}`,borderRadius:12,textAlign:"center",fontSize:12,color:C.muted}}>No notes yet.</div>
                      )}
                    </div>
                    {canEditWorkflow(selectedWorkflow) && (
                      <div style={{display:"grid",gap:10,marginTop:14}}>
                        <textarea className="input-field" rows={4} placeholder="Add a planning note or update" value={planningNoteDraft} onChange={(e)=>setPlanningNoteDraft(e.target.value)} style={{resize:"vertical"}} />
                        <div style={{display:"flex",justifyContent:"flex-end"}}>
                          <button className="btn-outline" onClick={() => addWorkflowNote(selectedWorkflow)}>Add Note</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {eventsSection === "requests" && (
        <div className="card" style={{padding:18,borderTop:`3px solid ${C.gold}`,background:`linear-gradient(180deg, rgba(201,168,76,0.08) 0%, ${C.card} 24%)`}}>
          {showEventForm ? (
            <div style={{display:"grid",gap:18}}>
              <div style={{textAlign:"left"}}>
                <button className="btn-outline" onClick={closeEventRequestForm} style={{marginBottom:14}}>Back to Event Requests</button>
                <h3 style={sectionTitleStyle}>New Event Request</h3>
              </div>
              <div className="card" style={{padding:20,textAlign:"left"}}>
                <EventRequestFormFields eventForm={eventForm} setEventForm={setEventForm} />
                {formError && <div style={{marginTop:14,fontSize:12,color:C.danger,textAlign:"left"}}>{formError}</div>}
                <div style={{display:"flex",gap:10,marginTop:22,justifyContent:"flex-end",flexWrap:"wrap"}}>
                  <button className="btn-outline" onClick={closeEventRequestForm}>Cancel</button>
                  <button className="btn-gold" onClick={saveEventRequest}>Submit Request</button>
                </div>
              </div>
            </div>
	          ) : requestDetails ? (
	            <div style={{display:"grid",gap:18}}>
	              <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start",flexWrap:"wrap"}}>
	                <div style={{textAlign:"left"}}>
	                  <button className="btn-outline" onClick={()=>setSelectedRequest(null)} style={{marginBottom:14}}>Back to Event Requests</button>
	                  <h3 style={{...sectionTitleStyle,textAlign:"left"}}>{requestDetails.event_name}</h3>
	                </div>
	                <button className="btn-outline" onClick={() => copyRequesterEventRequestLink(requestDetails)}>
	                  Copy Requester Share Link
	                </button>
	              </div>
              <div style={{display:"grid",gap:14,textAlign:"left"}}>
                <div className="request-details-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  <div>
                    <div style={{fontSize:12,color:C.muted}}>Submitted by</div>
                    <div style={{fontSize:13,color:C.text,marginTop:4}}>{requestDetails.contact_name}</div>
                  </div>
                  <div>
                    <div style={{fontSize:12,color:C.muted}}>Submitted on</div>
                    <div style={{fontSize:13,color:C.text,marginTop:4}}>{fmtDate(requestDetails.submitted_on || requestDetails.created_at)}</div>
                  </div>
                  <div>
                    <div style={{fontSize:12,color:C.muted}}>Event Type</div>
                    <div style={{fontSize:13,color:C.text,marginTop:4}}>{requestDetails.event_format}</div>
                  </div>
                  <div>
                    <div style={{fontSize:12,color:C.muted}}>Event Date</div>
                    <div style={{fontSize:13,color:C.text,marginTop:4}}>{getEventDateSummary(requestDetails)}</div>
                  </div>
                  <div>
                    <div style={{fontSize:12,color:C.muted}}>Setup Date</div>
                    <div style={{fontSize:13,color:C.text,marginTop:4}}>{requestDetails.setup_datetime ? new Date(requestDetails.setup_datetime).toLocaleString("en-US") : "—"}</div>
                  </div>
                  <div>
                    <div style={{fontSize:12,color:C.muted}}>Location</div>
                    <div style={{fontSize:13,color:C.text,marginTop:4}}>{getEventLocationSummary(requestDetails)}</div>
                  </div>
                </div>
                <div>
                  <div style={{fontSize:12,color:C.muted}}>Contact Details</div>
                  <div style={{fontSize:13,color:C.text,marginTop:4,lineHeight:1.6}}>{requestDetails.phone} • {requestDetails.email}</div>
                </div>
                <div>
                  <div style={{fontSize:12,color:C.muted}}>Event Description & Purpose</div>
                  <div style={{fontSize:13,color:C.text,marginTop:4,lineHeight:1.6}}>{requestDetails.description || "—"}</div>
                </div>
                <div>
                  <div style={{fontSize:12,color:C.muted}}>Graphics Direction</div>
                  <div style={{fontSize:13,color:C.text,marginTop:4,lineHeight:1.6}}>{requestDetails.graphics_reference || "—"}</div>
                </div>
                <div>
                  <div style={{fontSize:12,color:C.muted}}>Additional Resources</div>
                  <div style={{fontSize:13,color:C.text,marginTop:4,lineHeight:1.7,whiteSpace:"pre-line"}}>
                    {[
                      requestDetails.av_request ? `Audio & Visual: ${requestDetails.av_request_details || "Requested"}` : null,
                      requestDetails.kitchen_use ? "Kitchen: Requested" : null,
                      requestDetails.drip_coffee_only ? "Coffee Shop: Drip Coffee Only" : null,
                      requestDetails.espresso_drinks ? "Coffee Shop: Espresso Drinks" : null,
                      requestDetails.tables_needed ? `Tables Needed: ${requestDetails.tables_needed}` : null,
                      requestDetails.black_vinyl_tablecloths ? "Black Vinyl Tablecloths: Requested" : null,
                      requestDetails.white_linen_tablecloths ? "White Linen Tablecloths: Requested" : null,
                      requestDetails.pipe_and_drape ? `Pipe and Drape: ${requestDetails.pipe_and_drape}` : null,
                      requestDetails.metal_folding_chairs_requested ? `Metal Folding Chairs: ${requestDetails.metal_folding_chairs || "Requested"}` : null,
                    ].filter(Boolean).join("\n") || "No additional resources requested."}
                  </div>
                </div>
	                <div>
	                  <div style={{fontSize:12,color:C.muted}}>Additional Information</div>
	                  <div style={{fontSize:13,color:C.text,marginTop:4,lineHeight:1.6}}>{requestDetails.additional_information || "—"}</div>
	                </div>
	                <div className="card" style={{padding:16,textAlign:"left",display:"grid",gap:12,background:C.surface}}>
	                  <div>
	                    <div style={sectionTitleStyle}>Requester Conversation</div>
	                    <div style={{fontSize:12,color:C.muted,marginTop:6,lineHeight:1.6}}>
	                      Comments here are visible to anyone using this requester's share link.
	                    </div>
	                  </div>
	                  <div style={{display:"grid",gap:10}}>
	                    {(requestDetails.public_comments || []).length === 0 ? (
	                      <div style={{padding:"16px 14px",border:`1px dashed ${C.border}`,borderRadius:12,fontSize:12,color:C.muted,textAlign:"center"}}>
	                        No requester comments yet.
	                      </div>
	                    ) : (requestDetails.public_comments || []).map((comment) => (
	                      <div key={comment.id} style={{padding:"12px 14px",border:`1px solid ${C.border}`,borderRadius:12,background:C.card}}>
	                        <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"baseline",flexWrap:"wrap"}}>
	                          <div style={{fontSize:13,color:C.text,fontWeight:700}}>
	                            {comment.author || "Guest"}{comment.role === "staff" ? <span style={{color:C.gold}}> • Staff</span> : ""}
	                          </div>
	                          <div style={{fontSize:11,color:C.muted}}>{fmtActivityDate(comment.created_at)}</div>
	                        </div>
	                        <div style={{fontSize:13,color:C.text,lineHeight:1.6,whiteSpace:"pre-line",marginTop:6}}>{comment.body}</div>
	                      </div>
	                    ))}
	                  </div>
	                  <textarea className="input-field" rows={3} placeholder="Reply or ask a follow-up question" value={requestCommentDraft} onChange={(e)=>setRequestCommentDraft(e.target.value)} style={{resize:"vertical"}} />
	                  <div style={{display:"flex",justifyContent:"flex-end"}}>
	                    <button className="btn-outline" onClick={() => addEventRequestComment(requestDetails)} disabled={!requestCommentDraft.trim()}>
	                      Add Comment
	                    </button>
	                  </div>
	                </div>
	              </div>
              {formError && <div style={{fontSize:12,color:C.danger,textAlign:"left"}}>{formError}</div>}
              <div style={{display:"flex",gap:10,justifyContent:"flex-end",flexWrap:"wrap"}}>
                {canApproveEventRequests(profile, church) && requestDetails.status !== "approved" && (
                  <button className="btn-outline" onClick={() => setEventRequestStatus(requestDetails.id, "approved")}>Approve</button>
                )}
                {canApproveEventRequests(profile, church) && requestDetails.status !== "declined" && (
                  <button className="btn-outline" onClick={() => setEventRequestStatus(requestDetails.id, "declined")}>Decline</button>
                )}
                {canApproveEventRequests(profile, church) && (
                  <button className="btn-outline" onClick={() => deleteRequest(requestDetails)} style={{color:C.danger,borderColor:"rgba(224,82,82,.35)"}}>
                    Delete
                  </button>
                )}
              </div>
            </div>
          ) : (
          <div style={{display:"grid",gap:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap",marginBottom:14}}>
            <div style={{textAlign:"left"}}>
              <div style={{...sectionTitleStyle,textAlign:"left"}}>Event Requests</div>
              <div style={{fontSize:12,color:C.muted,marginTop:6,lineHeight:1.6}}>
                This section holds your event intake, approval flow, and submitted request archive.
              </div>
            </div>
            <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"}}>
              <button className="btn-outline" onClick={copyPublicEventRequestLink}>
                Copy Public Form Link
              </button>
              <button className="btn-gold" onClick={openEventRequestForm}>
                New Event Request
              </button>
            </div>
          </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr",gap:16}}>
              {eventColumns.map((column) => (
                <div
                  key={column.title}
                  className="card"
                  style={{
                    padding:16,
                    minHeight:420,
                    borderTop:`3px solid ${column.accent}`,
                    background:`linear-gradient(180deg, ${column.surface} 0%, ${C.card} 24%)`,
                  }}
                >
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,paddingBottom:12,borderBottom:`1px solid ${C.border}`}}>
                    <div style={{textAlign:"left"}}>
                      <div style={{fontSize:15,fontWeight:600,color:column.accent}}>{column.title}</div>
                      <div style={{fontSize:11,color:C.muted,marginTop:2}}>
                        {requests.filter((request) => request.status === column.id).length} requests
                      </div>
                    </div>
                    <div style={{width:10,height:10,borderRadius:"50%",background:column.accent,flexShrink:0}} />
                  </div>
                  <div style={{fontSize:12,color:C.muted,lineHeight:1.6,marginTop:0,textAlign:"left"}}>{column.detail}</div>
                  <div style={{marginTop:18,display:"flex",flexDirection:"column",gap:12}}>
                    {loadingRequests && (
                      <div style={{padding:"26px 14px",border:`1px dashed ${C.border}`,borderRadius:12,textAlign:"center",fontSize:12,color:C.muted}}>
                        Loading requests...
                      </div>
                    )}
                    {requests.filter((request) => request.status === column.id).map((request) => (
                      <button className="event-request-row" key={request.id} onClick={() => openRequest(request)} style={{padding:16,border:`1px solid ${C.border}`,borderRadius:12,background:C.surface,textAlign:"left",cursor:"pointer",display:"grid",gridTemplateColumns:"1fr auto",gap:16,alignItems:"start"}}>
                        <div style={{fontSize:20,fontWeight:600,color:C.text,lineHeight:1.15}}>{request.event_name}</div>
                        <div className="event-request-meta" style={{display:"flex",flexDirection:"column",alignItems:"flex-end",textAlign:"right",gap:4}}>
                          <div style={{fontSize:11,color:C.muted}}>Submitted by {request.contact_name}</div>
                          <div style={{fontSize:11,color:C.muted}}>Submitted on {fmtDate(request.submitted_on || request.created_at)}</div>
                        </div>
                      </button>
                    ))}
                    {!loadingRequests && requests.filter((request) => request.status === column.id).length === 0 && (
                      <div style={{padding:"26px 14px",border:`1px dashed ${C.border}`,borderRadius:12,textAlign:"center",fontSize:12,color:C.muted}}>
                        No requests in this column yet.
                      </div>
                    )}
                  </div>
                </div>
              ))}
        </div>
        </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}

function Workspaces({ setActive }) {
  const boards = [
    {
      id: "events-board",
      name: "Events",
      summary: "Requests, approvals, and event planning frameworks.",
      systems: ["Event request form", "Approval queue", "Event logistics"],
    },
    {
      id: "content-media-board",
      name: "Content & Media",
      summary: "Creative production, review, and publishing frameworks.",
      systems: ["Content intake", "Review rounds", "Publishing flow"],
    },
    {
      id: "operations-board",
      name: "Operations",
      summary: "Weekly frameworks that keep the church running behind the scenes.",
      systems: ["Service prep", "Facility workflows", "Volunteer coordination"],
    },
  ];

  return (
    <div className="fadeIn mobile-pad" style={widePageStyle}>
      <div style={{marginBottom:28}}>
        <h2 style={pageTitleStyle}>Frameworks</h2>
        <p style={{color:C.muted,fontSize:13,marginTop:4}}>
      Open a board to work inside a dedicated ministry framework.
        </p>
      </div>
      <div className="frameworks-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,280px),1fr))",gap:18}}>
        {boards.map((board) => (
          <button
            key={board.id}
            onClick={() => setActive(board.id)}
            className="card framework-card"
            style={{padding:22,textAlign:"left",cursor:"pointer",background:C.card,border:`1px solid ${C.border}`,display:"flex",flexDirection:"column",minHeight:180,maxWidth:"100%",minWidth:0,overflow:"hidden"}}
          >
            <div className="framework-card-title" style={{...sectionTitleStyle,overflowWrap:"anywhere"}}>{board.name}</div>
            <div style={{fontSize:12,color:C.muted,marginTop:8,lineHeight:1.6,overflowWrap:"break-word"}}>{board.summary}</div>
            <div style={{marginTop:"auto",alignSelf:"flex-end"}}>
              <span className="btn-gold-compact">Open board</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ContentMediaBoard({ tasks, setTasks, setActive, churchId, recordActivity }) {
  const isPreview = churchId === "preview";
  const [draggingTaskId, setDraggingTaskId] = useState(null);
  const [dragOverStatus, setDragOverStatus] = useState("");
  const [contentBoardError, setContentBoardError] = useState("");
  const contentTasks = tasks.filter(isContentTask);
  const columns = [
    { id: "todo", title: "Not Started", detail: "New asks, fresh requests, and creative work that has not started yet." },
    { id: "in-progress", title: "In Progress", detail: "Active design, editing, filming, writing, and production work in motion." },
    { id: "in-review", title: "In Review", detail: "Drafts and deliverables waiting on approvals, edits, or final sign-off." },
    { id: "done", title: "Published / Delivered", detail: "Approved content that has been delivered, posted, or completed." },
  ];

  const updateContentTaskStatus = async (task, nextStatus) => {
    setContentBoardError("");
    if (nextStatus === "done" && task.review_required && task.reviewers.some((name) => !listIncludesPerson(task.review_approvals, name))) {
      setContentBoardError("This item still needs its review approvals before it can be marked done.");
      return;
    }
    const changes = nextStatus === "in-review" && task.status !== "in-review"
      ? { status: nextStatus, review_approvals: [], review_history: [] }
      : { status: nextStatus };
    if (isPreview) {
      const updated = normalizeTask({ ...task, ...changes });
      setTasks((current) => current.map((entry) => entry.id === task.id ? updated : entry));
      return;
    }
    let result = await supabase.from("tasks").update(changes).eq("id", task.id).select().single();
    if (result.error && /review_history/i.test(result.error.message || "")) {
      result = await supabase.from("tasks").update({ status: nextStatus, review_approvals: changes.review_approvals || [] }).eq("id", task.id).select().single();
    }
    if (result.error) {
      setContentBoardError(result.error.message || "We couldn't update that item status.");
      return;
    }
    const updated = normalizeTask(result.data);
    setTasks((current) => current.map((entry) => entry.id === task.id ? updated : entry));
    await recordActivity?.({
      action: "status_changed",
      entityType: "content_item",
      entityId: updated.id,
      entityTitle: updated.title,
      summary: `${updated.title} moved from ${STATUS_STYLES[task.status]?.label || task.status} to ${STATUS_STYLES[nextStatus]?.label || nextStatus}.`,
      metadata: { from_status: task.status, to_status: nextStatus, assignee: updated.assignee },
    });
  };

  const handleContentTaskDrop = async (event, statusKey) => {
    event.preventDefault();
    const taskId = event.dataTransfer.getData("text/plain") || draggingTaskId;
    setDraggingTaskId(null);
    setDragOverStatus("");
    const task = tasks.find((entry) => entry.id === taskId);
    if (!task || task.status === statusKey || !isContentTask(task)) return;
    await updateContentTaskStatus(task, statusKey);
  };

  return (
    <div className="fadeIn mobile-pad" style={{...widePageStyle,overflowX:"hidden"}}>
      <div className="card content-board-shell" style={{padding:22,maxWidth:"100%",overflow:"hidden"}}>
        <div className="events-board-header" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
          <div style={{textAlign:"left"}}>
            <h3 style={{...pageTitleStyle,textAlign:"left",fontSize:"clamp(34px, 7vw, 46px)",lineHeight:1.12,maxWidth:680}}>
              Content &amp; Media Board
            </h3>
            <p style={{color:C.muted,fontSize:13,marginTop:8,maxWidth:620,textAlign:"left",lineHeight:1.55}}>
              This board mirrors every <span style={{color:C.text}}>Content/Art</span> task from the main Tasks page, so creative work stays in sync here automatically as it is assigned, edited, reviewed, and completed.
            </p>
          </div>
          <div className="events-board-actions" style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"}}>
            <button className="btn-outline" onClick={() => setActive("tasks")}>Open Tasks</button>
          </div>
        </div>
        {contentBoardError && (
          <div style={{fontSize:12,color:C.danger,textAlign:"left",marginBottom:14}}>
            {contentBoardError}
          </div>
        )}
        <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr)",gap:16,width:"100%",maxWidth:"100%"}}>
          {columns.map((column) => {
            const columnTasks = contentTasks.filter((task) => task.status === column.id);
            const statusStyle = STATUS_STYLES[column.id] || STATUS_STYLES.todo;
            return (
              <div
                key={column.id}
                className="card content-board-column"
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setDragOverStatus(column.id);
                }}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) setDragOverStatus("");
                }}
                onDrop={(event) => handleContentTaskDrop(event, column.id)}
                style={{
                  padding:16,
                  minHeight:420,
                  width:"100%",
                  maxWidth:"100%",
                  minWidth:0,
                  overflow:"hidden",
                  borderTop:`3px solid ${statusStyle.accent}`,
                  background:dragOverStatus === column.id
                    ? `linear-gradient(180deg, ${statusStyle.surface} 0%, rgba(192,161,72,.14) 100%)`
                    : `linear-gradient(180deg, ${statusStyle.surface} 0%, ${C.card} 24%)`,
                  boxShadow:dragOverStatus === column.id ? `0 0 0 1px ${statusStyle.accent}` : undefined,
                  transition:"background .16s ease, box-shadow .16s ease",
                }}
              >
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,paddingBottom:12,borderBottom:`1px solid ${C.border}`}}>
                  <div style={{textAlign:"left"}}>
                    <div style={{fontSize:15,fontWeight:600,color:statusStyle.accent}}>{column.title}</div>
                    <div style={{fontSize:11,color:C.muted,marginTop:2}}>{columnTasks.length} items</div>
                  </div>
                  <div style={{width:10,height:10,borderRadius:"50%",background:statusStyle.accent,flexShrink:0}} />
                </div>
                <div style={{marginTop:18,display:"flex",flexDirection:"column",gap:12}}>
                  {columnTasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      className="content-task-row"
                      draggable
                      onDragStart={(event) => {
                        setContentBoardError("");
                        setDraggingTaskId(task.id);
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", task.id);
                      }}
                      onDragEnd={() => { setDraggingTaskId(null); setDragOverStatus(""); }}
                      title="Drag this item to another status column."
                      style={{
                        padding:16,
                        border:`1px solid ${draggingTaskId === task.id ? statusStyle.accent : C.border}`,
                        borderRadius:12,
                        background:C.surface,
                        textAlign:"left",
                        cursor:"grab",
                        display:"grid",
                        gridTemplateColumns:"1fr auto",
                        gap:16,
                        alignItems:"start",
                        width:"100%",
                        maxWidth:"100%",
                        minWidth:0,
                        opacity:draggingTaskId === task.id ? 0.68 : 1,
                        transform:draggingTaskId === task.id ? "scale(.99)" : "none",
                        transition:"opacity .16s ease, transform .16s ease, border-color .16s ease",
                      }}
                    >
                      <div style={{display:"flex",flexDirection:"column",gap:6,minWidth:0}}>
                        <div style={{fontSize:20,fontWeight:600,color:task.status==="done"?C.muted:C.text,textDecoration:task.status==="done"?"line-through":"none",overflowWrap:"break-word"}}>
                          {task.title}
                        </div>
                        <div style={{fontSize:11,color:C.muted,overflowWrap:"break-word"}}>Assigned to {task.assignee}</div>
                      </div>
                      <div className="content-task-meta" style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6,textAlign:"right",minWidth:0}}>
                        <div style={{fontSize:11,color:C.muted}}>Due {fmtDate(task.due_date)}</div>
                        <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"flex-end"}}>
                          {task.review_required && (
                            <span className="badge" style={{background:C.goldGlow,color:C.gold,border:`1px solid ${C.goldDim}`}}>
                              Review {task.review_approvals.length}/{task.reviewers.length}
                            </span>
                          )}
                          <span className={`badge ${getTag(task.ministry)}`}>{task.ministry}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                  {columnTasks.length === 0 && (
                    <div style={{padding:"26px 14px",border:`1px dashed ${C.border}`,borderRadius:12,textAlign:"center",fontSize:12,color:C.muted}}>
                      No items in {statusStyle.label.toLowerCase()}.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PlaceholderBoard({ title, summary, systems }) {
  return (
    <div className="fadeIn" style={widePageStyle}>
      <div className="card" style={{padding:24}}>
        <h2 style={pageTitleStyle}>{title}</h2>
        <p style={{color:C.muted,fontSize:13,marginTop:6,maxWidth:620}}>{summary}</p>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:18}}>
          {systems.map((system) => (
            <span key={system} className="badge" style={{background:C.surface,color:C.text,border:`1px solid ${C.border}`}}>
              {system}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function OperationsBoard({ profile, church, previewUsers, staffAvailabilityRequests, setStaffAvailabilityRequests, churchLockupAssignments, setChurchLockupAssignments, setCalendarEvents, recordActivity }) {
  const [operationsSection, setOperationsSection] = useState("home");
  const [timeOffMode, setTimeOffMode] = useState("");
  const [lockupMode, setLockupMode] = useState("home");
  const [operationsMessage, setOperationsMessage] = useState("");
  const [operationsError, setOperationsError] = useState("");
  const [operationsSubmitting, setOperationsSubmitting] = useState(false);
  const [timeOffForm, setTimeOffForm] = useState({
    requestType: "PTO Request",
    fromDate: "",
    toDate: "",
    startTime: "",
    endTime: "",
    reason: "",
    coverage: "",
    details: "",
    returnDate: "",
  });
  const cards = [
    {
      id: "time-off",
      name: "Staff Time Off / Out Of Office / Sick Days",
      summary: "Handle staff PTO requests, out-of-office visibility, and sick-day tracking from one operations workflow.",
      systems: ["PTO requests", "Out-of-office tracking", "Sick day logging"],
    },
    {
      id: "lock-up",
      name: "Church Lock Up",
      summary: "Assign the staff member responsible for locking up after services each week so there is always a clear owner.",
      systems: ["Weekly assignment", "Service coverage", "After-service accountability"],
    },
  ];
  const approverCandidates = [...new Map((previewUsers || [])
    .filter((user) =>
      (Array.isArray(user?.staff_roles) && (
        user.staff_roles.includes("senior_pastor")
        || user.staff_roles.includes("church_administrator")
      ))
      || samePerson(user?.title, "Senior Pastor")
      || samePerson(user?.title, "Church Administrator")
    )
    .map((user) => [normalizeName(user.full_name), user])).values()];
  const ptoApproverNames = approverCandidates.map((user) => user.full_name).filter(Boolean);
  const availabilityRequests = (staffAvailabilityRequests || []).slice().sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  const staffOptions = [...new Map((previewUsers || [])
    .filter((user) => String(user?.full_name || "").trim())
    .map((user) => [normalizeName(user.full_name), user.full_name.trim()])).values()];
  const lockupAssignments = (churchLockupAssignments || [])
    .slice()
    .sort((a, b) => getDateSortValue(a.week_of) - getDateSortValue(b.week_of));
  const currentLockupAssignment = lockupAssignments.find((assignment) => {
    if (!assignment?.week_of) return false;
    const weekStart = parseAppDate(assignment.week_of);
    if (!weekStart) return false;
    const thisWeekStart = startOfWeekMonday(new Date());
    return weekStart.getFullYear() === thisWeekStart.getFullYear()
      && weekStart.getMonth() === thisWeekStart.getMonth()
      && weekStart.getDate() === thisWeekStart.getDate();
  }) || null;
  const [lockupForm, setLockupForm] = useState(() => {
    const baseWeek = startOfWeekMonday(new Date());
    const weekValue = toAppDateValue(baseWeek);
    return {
      weekOf: weekValue,
      assigneeNames: [],
      notes: "",
    };
  });
  const lockupWeekRangeLabel = fmtWeekRange(lockupForm.weekOf);

  const buildAvailabilityEventRows = (request) => {
    const rows = [];
    const start = parseAppDate(request.from_date);
    const end = parseAppDate(request.to_date || request.from_date);
    if (!start || !end) return rows;
    const finalDay = end.getTime() >= start.getTime() ? end : start;
    const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const title = request.request_type === "Out Of Office Notice"
      ? `${request.requested_by} • Out Of Office`
      : request.request_type === "Sick Day Log"
        ? `${request.requested_by} • Sick Day`
        : `${request.requested_by} • PTO`;
    while (cursor.getTime() <= finalDay.getTime()) {
      const eventDate = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
      rows.push({
        church_id: church?.id,
        created_by: profile?.id || null,
        title,
        event_date: eventDate,
        start_time: request.start_time || null,
        end_time: request.end_time || null,
        location: "Staff Availability",
        notes: [
          `staff-availability-request:${request.id}`,
          request.notes || "",
        ].filter(Boolean).join("\n\n"),
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return rows;
  };

  const syncAvailabilityRequestCalendar = async (request) => {
    if (!request?.id || !church?.id) return [];
    const existingIds = Array.isArray(request.calendar_event_ids) ? request.calendar_event_ids.filter(Boolean) : [];
    if (existingIds.length) {
      await supabase.from("calendar_events").delete().in("id", existingIds);
      setCalendarEvents((current) => (current || []).filter((event) => !existingIds.includes(event.id)));
    }
    const rows = buildAvailabilityEventRows(request);
    if (!rows.length) return [];
    const { data, error } = await supabase.from("calendar_events").insert(rows).select();
    if (error) throw error;
    const saved = data || [];
    setCalendarEvents((current) => {
      const others = (current || []).filter((event) => !saved.some((entry) => entry.id === event.id));
      return [...others, ...saved].sort((a, b) => getDateSortValue(a.event_date) - getDateSortValue(b.event_date));
    });
    return saved.map((entry) => entry.id);
  };

  const resetOperationsFlow = () => {
    setTimeOffMode("");
    setLockupMode("home");
    setOperationsMessage("");
    setOperationsError("");
    setOperationsSubmitting(false);
    setTimeOffForm({
      requestType: "PTO Request",
      fromDate: "",
      toDate: "",
      startTime: "",
      endTime: "",
      reason: "",
      coverage: "",
      details: "",
        returnDate: "",
      });
    const baseWeek = startOfWeekMonday(new Date());
    const weekValue = toAppDateValue(baseWeek);
    setLockupForm({
      weekOf: weekValue,
      assigneeNames: [],
      notes: "",
    });
  };

  const openWorkflowCard = (cardId) => {
    if (cardId === "time-off") {
      resetOperationsFlow();
      setOperationsSection("time-off");
      return;
    }
    if (cardId === "lock-up") {
      resetOperationsFlow();
      setOperationsSection("lock-up");
    }
  };

  const chooseTimeOffMode = (mode) => {
    setOperationsMessage("");
    setOperationsError("");
    setTimeOffMode(mode);
    setTimeOffForm((current) => ({
      ...current,
      requestType:
        mode === "pto"
          ? "PTO Request"
          : mode === "ooo"
            ? "Out Of Office Notice"
            : "Sick Day Log",
    }));
  };

  const submitOperationsForm = async () => {
    setOperationsError("");
    setOperationsMessage("");
    if (!timeOffMode) {
      setOperationsError("Choose what you want to do first.");
      return;
    }
    if (!timeOffForm.fromDate) {
      setOperationsError(timeOffMode === "sick" ? "Choose the sick day date." : "Choose a start date.");
      return;
    }
    if ((timeOffMode === "pto" || timeOffMode === "ooo") && !timeOffForm.toDate) {
      setOperationsError("Choose an end date.");
      return;
    }
    if (timeOffMode === "pto" && !timeOffForm.reason.trim()) {
      setOperationsError("Add a short reason for the time-off request.");
      return;
    }
    if (timeOffMode === "ooo" && !timeOffForm.details.trim()) {
      setOperationsError("Add a short note so the team knows why you are out of office.");
      return;
    }
    if (timeOffMode === "sick" && !timeOffForm.details.trim()) {
      setOperationsError("Add a short note for the sick day log.");
      return;
    }
    if (!church?.id || !profile?.id) {
      setOperationsError("We couldn't find your church profile yet.");
      return;
    }
    setOperationsSubmitting(true);
    try {
      const requestType = timeOffMode === "pto"
        ? "PTO Request"
        : timeOffMode === "ooo"
          ? "Out Of Office Notice"
          : "Sick Day Log";
      const payload = {
        church_id: church.id,
        requester_id: profile.id,
        requested_by: profile.full_name || "Staff Member",
        requester_email: profile.email || null,
        request_type: requestType,
        from_date: timeOffForm.fromDate,
        to_date: timeOffMode === "sick" ? (timeOffForm.returnDate || timeOffForm.fromDate) : timeOffForm.toDate,
        start_time: timeOffMode === "sick" ? null : (timeOffForm.startTime || null),
        end_time: timeOffMode === "sick" ? null : (timeOffForm.endTime || null),
        notes: timeOffMode === "pto" ? timeOffForm.coverage.trim() : timeOffForm.details.trim(),
        reason: timeOffMode === "pto" ? timeOffForm.reason.trim() : null,
        status: timeOffMode === "pto" ? "pending_review" : "submitted",
        required_approvers: timeOffMode === "pto" ? ptoApproverNames : [],
        approvals: [],
        approval_history: [],
        calendar_event_ids: [],
      };
      const { data, error } = await supabase.from("staff_availability_requests").insert(payload).select().single();
      if (error) throw error;
      let saved = normalizeStaffAvailabilityRequest(data);
      if (timeOffMode !== "pto") {
        const calendarEventIds = await syncAvailabilityRequestCalendar(saved);
        if (calendarEventIds.length) {
          const updateResult = await supabase
            .from("staff_availability_requests")
            .update({ calendar_event_ids: calendarEventIds })
            .eq("id", saved.id)
            .select()
            .single();
          if (updateResult.error) throw updateResult.error;
          saved = normalizeStaffAvailabilityRequest(updateResult.data);
        }
      }
      setStaffAvailabilityRequests((current) => [saved, ...(current || []).filter((entry) => entry.id !== saved.id)]);
      if (timeOffMode === "pto") {
        await createNotificationsForNames({
          users: previewUsers,
          names: ptoApproverNames.filter((name) => !samePerson(name, profile?.full_name)),
          churchId: church.id,
          actorProfile: profile,
          type: "pto_review_requested",
          title: "PTO Request Needs Review",
          detail: `${profile.full_name || "A staff member"} submitted a PTO request for ${fmtDate(saved.from_date)}-${fmtDate(saved.to_date)}.`,
          target: "operations-board",
          sourceKey: saved.id,
          data: { availabilityRequestId: saved.id, requestedBy: profile.full_name || "", requestType: saved.request_type },
        });
      }
      await recordActivity?.({
        action: "created",
        entityType: "staff_availability",
        entityId: saved.id,
        entityTitle: saved.request_type,
        summary: `${profile?.full_name || "A staff member"} submitted ${saved.request_type} for ${fmtDate(saved.from_date)}-${fmtDate(saved.to_date)}.`,
        metadata: { status: saved.status, request_type: saved.request_type },
      });
      setOperationsMessage(
        timeOffMode === "pto"
          ? "PTO request submitted for review. The Senior Pastor and Church Administrator have both been notified."
          : timeOffMode === "ooo"
            ? "Out-of-office notice submitted and added to the calendar."
            : "Sick day logged and added to the calendar."
      );
      setTimeOffMode("");
      setTimeOffForm({
        requestType: "PTO Request",
        fromDate: "",
        toDate: "",
        startTime: "",
        endTime: "",
        reason: "",
        coverage: "",
        details: "",
        returnDate: "",
      });
    } catch (error) {
      setOperationsError(error?.message || "We couldn't submit that availability request yet.");
    } finally {
      setOperationsSubmitting(false);
    }
  };

  const updateAvailabilityRequestStatus = async (request, status) => {
    if (!request?.id || !canApproveAvailabilityRequest(profile, request)) return;
    const nowIso = new Date().toISOString();
    const nextHistory = [
      ...(request.approval_history || []),
      {
        id: `${request.id}-${status}-${nowIso}`,
        reviewer: profile?.full_name || "Reviewer",
        action: status,
        created_at: nowIso,
      },
    ];
    const nextApprovals = status === "approved"
      ? [...new Set([...(request.approvals || []), profile?.full_name].filter(Boolean))]
      : (request.approvals || []);
    const fullyApproved = status === "approved"
      && (request.required_approvers || []).every((name) => listIncludesPerson(nextApprovals, name));
    let changes = status === "denied"
      ? {
          status: "denied",
          approvals: nextApprovals,
          approval_history: nextHistory,
          decided_at: nowIso,
          decided_by: profile?.full_name || "Reviewer",
        }
      : {
          status: fullyApproved ? "approved" : "pending_review",
          approvals: nextApprovals,
          approval_history: nextHistory,
          decided_at: fullyApproved ? nowIso : null,
          decided_by: fullyApproved ? (profile?.full_name || "Reviewer") : null,
        };
    if (fullyApproved) {
      const calendarEventIds = await syncAvailabilityRequestCalendar({ ...request, ...changes });
      changes = { ...changes, calendar_event_ids: calendarEventIds };
    }
    const { data, error } = await supabase.from("staff_availability_requests").update(changes).eq("id", request.id).select().single();
    if (error) {
      setOperationsError(error.message || "We couldn't update that request.");
      return;
    }
    const saved = normalizeStaffAvailabilityRequest(data);
    setStaffAvailabilityRequests((current) => (current || []).map((entry) => entry.id === saved.id ? saved : entry));
    if (request.requester_id) {
      await createPersistentNotification({
        churchId: church?.id,
        actorProfile: profile,
        recipientProfileId: request.requester_id,
        type: status === "denied" ? "pto_denied" : fullyApproved ? "pto_approved" : "pto_review_progress",
        title: status === "denied" ? "PTO Request Denied" : fullyApproved ? "PTO Request Approved" : "PTO Review Updated",
        detail: status === "denied"
          ? `${request.request_type} was denied${profile?.full_name ? ` by ${profile.full_name}` : ""}.`
          : fullyApproved
            ? `${request.request_type} was fully approved and added to the calendar.`
            : `${profile?.full_name || "A reviewer"} approved your PTO request. One more approval may still be needed.`,
        target: "operations-board",
        sourceKey: `${request.id}:${status}:${profile?.id || "reviewer"}`,
        data: { availabilityRequestId: request.id, requestType: request.request_type },
      });
    }
    await recordActivity?.({
      action: status,
      entityType: "staff_availability",
      entityId: saved.id,
      entityTitle: saved.request_type,
      summary: `${profile?.full_name || "A reviewer"} ${status === "approved" ? "approved" : "denied"} ${saved.request_type} for ${saved.requested_by || "staff"}.`,
      metadata: { status: saved.status, request_type: saved.request_type },
    });
    setOperationsMessage(
      status === "denied"
        ? "PTO request denied."
        : fullyApproved
          ? "PTO request fully approved and added to the calendar."
          : "Approval recorded. Waiting on the remaining reviewer."
    );
  };

  const openLockupAssignment = (assignment = null) => {
    setOperationsMessage("");
    setOperationsError("");
    setLockupMode("form");
    if (assignment) {
      setLockupForm({
        weekOf: toAppDateValue(startOfWeekMonday(assignment.week_of)),
        assigneeNames: Array.isArray(assignment.assignee_names) ? assignment.assignee_names : [],
        notes: assignment.notes || "",
      });
      return;
    }
    const baseWeek = startOfWeekMonday(new Date());
    const weekValue = toAppDateValue(baseWeek);
    setLockupForm({
      weekOf: weekValue,
      assigneeNames: [],
      notes: "",
    });
  };

  const submitLockupAssignment = async () => {
    setOperationsError("");
    setOperationsMessage("");
    if (!church?.id || !profile?.id) {
      setOperationsError("We couldn't find your church profile yet.");
      return;
    }
    if (!lockupForm.weekOf) {
      setOperationsError("Choose the week this lock-up assignment should cover.");
      return;
    }
    if (!lockupForm.assigneeNames.length) {
      setOperationsError("Choose at least one staff member to cover church lock up.");
      return;
    }
    setOperationsSubmitting(true);
    try {
      const normalizedWeekOf = toAppDateValue(startOfWeekMonday(lockupForm.weekOf));
      const payload = {
        church_id: church.id,
        assigned_by: profile.full_name || "Staff Member",
        assigned_by_id: profile.id,
        week_of: normalizedWeekOf,
        service_label: "After Services",
        assignee_names: lockupForm.assigneeNames,
        notes: lockupForm.notes.trim() || null,
      };
      const existing = lockupAssignments.find((assignment) => assignment.week_of === normalizedWeekOf);
      let saved;
      if (existing?.id) {
        const result = await supabase
          .from("church_lockup_assignments")
          .update(payload)
          .eq("id", existing.id)
          .select()
          .single();
        if (result.error) throw result.error;
        saved = normalizeChurchLockupAssignment(result.data);
      } else {
        const result = await supabase
          .from("church_lockup_assignments")
          .insert(payload)
          .select()
          .single();
        if (result.error) throw result.error;
        saved = normalizeChurchLockupAssignment(result.data);
      }
      setChurchLockupAssignments((current) => {
        const next = [...(current || []).filter((assignment) => assignment.id !== saved.id && assignment.week_of !== saved.week_of), saved];
        return next.sort((a, b) => getDateSortValue(a.week_of) - getDateSortValue(b.week_of));
      });
      await createNotificationsForNames({
        users: previewUsers,
        names: saved.assignee_names.filter((name) => !samePerson(name, profile?.full_name)),
        churchId: church.id,
        actorProfile: profile,
        type: "lockup_assigned",
        title: "Church Lock-Up Assigned",
        detail: `You are assigned to lock up for ${fmtWeekRange(saved.week_of)}.`,
        target: "operations-board",
        sourceKey: `${saved.id || saved.week_of}:lockup`,
        data: { lockupAssignmentId: saved.id, weekOf: saved.week_of },
      });
      await recordActivity?.({
        action: existing?.id ? "updated" : "created",
        entityType: "lockup_assignment",
        entityId: saved.id,
        entityTitle: fmtWeekRange(saved.week_of),
        summary: `${profile?.full_name || "A staff member"} assigned church lock-up for ${fmtWeekRange(saved.week_of)} to ${saved.assignee_names.join(", ")}.`,
        metadata: { week_of: saved.week_of, assignees: saved.assignee_names },
      });
      setOperationsMessage("Church lock-up assignment saved.");
      setLockupMode("home");
    } catch (error) {
      setOperationsError(error?.message || "We couldn't save that lock-up assignment yet.");
    } finally {
      setOperationsSubmitting(false);
    }
  };

  const shiftLockupWeek = (direction) => {
    setLockupForm((current) => {
      const base = startOfWeekMonday(current.weekOf);
      base.setDate(base.getDate() + (direction * 7));
      return {
        ...current,
        weekOf: toAppDateValue(base),
      };
    });
  };

  const renderLockupForm = () => (
    <div className="card" style={{padding:22,textAlign:"left",display:"grid",gap:16,background:C.surface}}>
      <div>
        <div style={{fontSize:18,fontWeight:600,color:C.text}}>Church Lock Up</div>
        <div style={{fontSize:12,color:C.muted,marginTop:8,lineHeight:1.6}}>
          Assign who is responsible for locking up after services that week so Operations always has a clear owner.
        </div>
      </div>
      <div style={{display:"grid",gap:6}}>
        <label style={{fontSize:12,color:C.muted}}>Week</label>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"nowrap"}}>
            <button className="btn-outline" onClick={() => shiftLockupWeek(-1)} style={{padding:"8px 12px",minWidth:44}} aria-label="Previous week">
              ←
            </button>
            <div
              style={{
                flex:"1 1 auto",
                minWidth:0,
                minHeight:44,
                border:`1px solid ${C.border}`,
                borderRadius:12,
                background:C.bg,
                display:"flex",
                alignItems:"center",
                justifyContent:"center",
                padding:"0 14px",
                fontSize:13,
                color:C.text,
                textAlign:"center",
              }}
            >
              {lockupWeekRangeLabel}
            </div>
            <button className="btn-outline" onClick={() => shiftLockupWeek(1)} style={{padding:"8px 12px",minWidth:44}} aria-label="Next week">
              →
            </button>
        </div>
      </div>
      <div style={{display:"grid",gap:6}}>
        <label style={{fontSize:12,color:C.muted}}>Assigned Staff</label>
        <div style={{display:"grid",gap:10}}>
          {staffOptions.length === 0 && (
            <div style={{fontSize:12,color:C.muted}}>No staff records are available to assign yet.</div>
          )}
          {staffOptions.map((name) => {
            const selected = lockupForm.assigneeNames.some((entry) => samePerson(entry, name));
            return (
              <label key={name} style={{display:"flex",alignItems:"center",gap:10,fontSize:13,color:C.text}}>
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setLockupForm((current) => ({
                      ...current,
                      assigneeNames: checked
                        ? [...current.assigneeNames, name]
                        : current.assigneeNames.filter((entry) => !samePerson(entry, name)),
                    }));
                  }}
                />
                <span>{name}</span>
              </label>
            );
          })}
        </div>
      </div>
      <div style={{display:"grid",gap:6}}>
        <label style={{fontSize:12,color:C.muted}}>Notes</label>
        <textarea
          className="input-field"
          rows={4}
          value={lockupForm.notes}
          onChange={(e) => setLockupForm((current) => ({ ...current, notes: e.target.value }))}
          placeholder="Example: Include sanctuary, lobby, and youth entrance checks after the last service."
          style={{minHeight:120,resize:"vertical"}}
        />
      </div>
      {operationsError && <div style={{fontSize:12,color:C.danger}}>{operationsError}</div>}
      {operationsMessage && <div style={{fontSize:12,color:C.success}}>{operationsMessage}</div>}
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,flexWrap:"wrap"}}>
        <button className="btn-outline" onClick={() => setLockupMode("home")}>Back</button>
        <button className="btn-gold" onClick={submitLockupAssignment} disabled={operationsSubmitting}>
          {operationsSubmitting ? "Saving..." : "Save Lock Up Assignment"}
        </button>
      </div>
    </div>
  );

  const renderLockupAssignments = () => (
    <div className="card" style={{padding:22,textAlign:"left",display:"grid",gap:16,background:C.surface}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16,flexWrap:"wrap"}}>
        <div>
          <div style={{fontSize:18,fontWeight:600,color:C.text}}>Weekly Lock Up</div>
          <div style={{fontSize:12,color:C.muted,marginTop:8,lineHeight:1.6}}>
            Keep one visible record of who is assigned to close the building after services each week.
          </div>
        </div>
        <button className="btn-gold-compact" onClick={() => openLockupAssignment()}>
          Assign Week
        </button>
      </div>
      {currentLockupAssignment && (
        <div className="card" style={{padding:18,display:"grid",gap:8,background:C.card}}>
          <div style={{fontSize:11,color:C.gold,textTransform:"uppercase",letterSpacing:".12em"}}>This Week</div>
          <div style={{fontSize:16,fontWeight:600,color:C.text}}>
            {currentLockupAssignment.assignee_names.join(", ") || "No one assigned yet"}
          </div>
          <div style={{fontSize:12,color:C.muted}}>
            {fmtWeekRange(currentLockupAssignment.week_of)} • {currentLockupAssignment.service_label || "Sunday Services"}
          </div>
        </div>
      )}
      <div style={{display:"grid",gap:12}}>
        {lockupAssignments.length === 0 && (
          <div style={{padding:"22px 14px",border:`1px dashed ${C.border}`,borderRadius:12,textAlign:"center",fontSize:12,color:C.muted}}>
            No weekly church lock-up assignments have been added yet.
          </div>
        )}
        {lockupAssignments.map((assignment) => (
          <div key={assignment.id} className="card" style={{padding:18,display:"grid",gap:10,background:C.card}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
              <div>
                <div style={{fontSize:16,fontWeight:600,color:C.text}}>
                  {assignment.assignee_names.join(", ") || "No one assigned"}
                </div>
                <div style={{fontSize:12,color:C.muted,marginTop:4}}>
                  {fmtWeekRange(assignment.week_of)} • {assignment.service_label || "Sunday Services"}
                </div>
              </div>
              <button className="btn-outline" onClick={() => openLockupAssignment(assignment)}>Swap / Edit</button>
            </div>
            {assignment.notes && (
              <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>
                {assignment.notes}
              </div>
            )}
          </div>
        ))}
      </div>
      {operationsError && <div style={{fontSize:12,color:C.danger}}>{operationsError}</div>}
      {operationsMessage && <div style={{fontSize:12,color:C.success}}>{operationsMessage}</div>}
    </div>
  );

  const renderTimeOffForm = () => {
    if (!timeOffMode) return null;
    const title = timeOffMode === "pto"
      ? "Request Time Off"
      : timeOffMode === "ooo"
        ? "Indicate Out Of Office"
        : "Log Sick Days";
    const helper = timeOffMode === "pto"
      ? "Submit a planned time-off request with dates, coverage, and the basic context leaders need."
      : timeOffMode === "ooo"
        ? "Let the team know when you will be out and what coverage or communication notes they should have."
        : "Record a sick day quickly so operations and leadership know your availability and return timing.";

    return (
      <div className="card" style={{padding:22,textAlign:"left",display:"grid",gap:16,background:C.surface}}>
        <div>
          <div style={{fontSize:18,fontWeight:600,color:C.text}}>{title}</div>
          <div style={{fontSize:12,color:C.muted,marginTop:8,lineHeight:1.6}}>{helper}</div>
        </div>
        <div className="mobile-two-stack" style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:12}}>
          <div style={{display:"grid",gap:6}}>
            <label style={{fontSize:12,color:C.muted}}>Submitted By</label>
            <input className="input-field" value={profile?.full_name || ""} readOnly />
          </div>
          <div style={{display:"grid",gap:6}}>
            <label style={{fontSize:12,color:C.muted}}>Request Type</label>
            <input className="input-field" value={timeOffForm.requestType} readOnly />
          </div>
        </div>
        <div className="mobile-two-stack" style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:12}}>
          <div style={{display:"grid",gap:6}}>
            <label style={{fontSize:12,color:C.muted}}>{timeOffMode === "sick" ? "Date" : "From Date"}</label>
            <input className="input-field" type="date" value={timeOffForm.fromDate} onChange={(e) => setTimeOffForm((current) => ({ ...current, fromDate: e.target.value }))} />
          </div>
          <div style={{display:"grid",gap:6}}>
            <label style={{fontSize:12,color:C.muted}}>{timeOffMode === "sick" ? "Return Date" : "To Date"}</label>
            <input
              className="input-field"
              type="date"
              value={timeOffMode === "sick" ? timeOffForm.returnDate : timeOffForm.toDate}
              onChange={(e) => setTimeOffForm((current) => ({
                ...current,
                ...(timeOffMode === "sick" ? { returnDate: e.target.value } : { toDate: e.target.value }),
              }))}
            />
          </div>
        </div>
        {timeOffMode !== "sick" && (
          <div className="mobile-two-stack" style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:12}}>
            <div style={{display:"grid",gap:6}}>
              <label style={{fontSize:12,color:C.muted}}>Start Time</label>
              <input className="input-field" type="time" value={timeOffForm.startTime} onChange={(e) => setTimeOffForm((current) => ({ ...current, startTime: e.target.value }))} />
            </div>
            <div style={{display:"grid",gap:6}}>
              <label style={{fontSize:12,color:C.muted}}>End Time</label>
              <input className="input-field" type="time" value={timeOffForm.endTime} onChange={(e) => setTimeOffForm((current) => ({ ...current, endTime: e.target.value }))} />
            </div>
          </div>
        )}
        {timeOffMode === "pto" && (
          <div style={{display:"grid",gap:6}}>
            <label style={{fontSize:12,color:C.muted}}>Reason</label>
            <input className="input-field" value={timeOffForm.reason} onChange={(e) => setTimeOffForm((current) => ({ ...current, reason: e.target.value }))} placeholder="Example: Family trip" />
          </div>
        )}
        <div style={{display:"grid",gap:6}}>
          <label style={{fontSize:12,color:C.muted}}>Notes</label>
          <textarea
            className="input-field"
            rows={4}
            value={timeOffMode === "pto" ? timeOffForm.coverage : timeOffForm.details}
            onChange={(e) => setTimeOffForm((current) => ({
              ...current,
              ...(timeOffMode === "pto" ? { coverage: e.target.value } : { details: e.target.value }),
            }))}
            placeholder={
              timeOffMode === "pto"
                ? "Who is covering and what should leadership know?"
                : timeOffMode === "ooo"
                  ? "Example: At a conference, available only by text for urgent issues."
                  : "Example: Sick today, resting, and will update the team tomorrow morning."
            }
            style={{minHeight:120,resize:"vertical"}}
          />
        </div>
        {operationsError && <div style={{fontSize:12,color:C.danger}}>{operationsError}</div>}
        {operationsMessage && <div style={{fontSize:12,color:C.success}}>{operationsMessage}</div>}
        <div style={{display:"flex",justifyContent:"flex-end",gap:10,flexWrap:"wrap"}}>
          <button className="btn-outline" onClick={() => chooseTimeOffMode("")}>Back</button>
          <button className="btn-gold" onClick={submitOperationsForm} disabled={operationsSubmitting}>
            {operationsSubmitting ? "Saving..." : title}
          </button>
        </div>
      </div>
    );
  };

  const renderAvailabilityRequests = () => (
    <div className="card" style={{padding:22,textAlign:"left",display:"grid",gap:16,background:C.surface}}>
      <div>
        <div style={{fontSize:18,fontWeight:600,color:C.text}}>Availability Requests</div>
        <div style={{fontSize:12,color:C.muted,marginTop:8,lineHeight:1.6}}>
          Review the latest PTO, out-of-office, and sick-day entries submitted through Operations.
        </div>
      </div>
      <div style={{display:"grid",gap:12}}>
        {availabilityRequests.length === 0 && (
          <div style={{padding:"22px 14px",border:`1px dashed ${C.border}`,borderRadius:12,textAlign:"center",fontSize:12,color:C.muted}}>
            No availability requests have been submitted yet.
          </div>
        )}
        {availabilityRequests.map((request) => (
          <div key={request.id} className="card" style={{padding:18,display:"grid",gap:12,background:C.card}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
              <div>
                <div style={{fontSize:16,fontWeight:600,color:C.text}}>{request.request_type}</div>
                <div style={{fontSize:12,color:C.muted,marginTop:4}}>
                  {request.requested_by} • {fmtDate(request.from_date)}{request.to_date && request.to_date !== request.from_date ? ` to ${fmtDate(request.to_date)}` : ""}
                </div>
              </div>
              <div style={{fontSize:12,color:request.status === "approved" ? C.success : request.status === "denied" ? C.danger : C.gold,textTransform:"capitalize"}}>
                {request.status.replace("_", " ")}
              </div>
            </div>
            {request.notes && (
              <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>
                {request.notes}
              </div>
            )}
            {request.request_type === "PTO Request" && (
              <div style={{display:"grid",gap:8}}>
                {(request.required_approvers || []).map((reviewer) => {
                  const decision = getAvailabilityReviewerDecision(request, reviewer);
                  const decisionLabel = decision?.action === "approved"
                    ? "Approved"
                    : decision?.action === "denied"
                      ? "Denied"
                      : "Waiting";
                  const decisionTone = decision?.action === "approved"
                    ? C.success
                    : decision?.action === "denied"
                      ? C.danger
                      : C.muted;
                  return (
                    <div key={`${request.id}-${reviewer}`} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                      <div style={{fontSize:12,color:C.text}}>{reviewer}</div>
                      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                        <div style={{fontSize:11,color:decisionTone}}>{decisionLabel}</div>
                        {samePerson(reviewer, profile?.full_name) && canApproveAvailabilityRequest(profile, request) && (
                          <>
                            <button className="btn-outline" onClick={() => updateAvailabilityRequestStatus(request, "approved")} style={{padding:"7px 10px",color:C.success,borderColor:"rgba(82,200,122,.35)"}}>Approve</button>
                            <button className="btn-outline" onClick={() => updateAvailabilityRequestStatus(request, "denied")} style={{padding:"7px 10px",color:C.danger,borderColor:"rgba(224,82,82,.35)"}}>Deny</button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fadeIn mobile-pad" style={widePageStyle}>
      <div
        className="card"
        style={{
          padding:22,
          textAlign:"left",
          display:"grid",
          gap:18,
          background:`linear-gradient(180deg, rgba(154,163,178,.08) 0%, ${C.card} 20%)`,
          border:`1px solid ${C.border}`,
        }}
      >
        <div style={{display:"grid",gap:6,maxWidth:760}}>
          <h2 style={{...pageTitleStyle,margin:0}}>Operations Board</h2>
          <div style={{fontSize:12,color:C.muted,lineHeight:1.7}}>
            Build the internal systems that help your church run smoothly behind the scenes, starting with staff coverage and time-off workflows.
          </div>
        </div>
        {operationsSection === "home" ? (
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:18}}>
            {cards.map((card) => (
              <button
                key={card.id}
                className="card"
                onClick={() => openWorkflowCard(card.id)}
                style={{
                  padding:22,
                  textAlign:"left",
                  display:"grid",
                  gap:10,
                  minHeight:180,
                  background:C.surface,
                  border:`1px solid ${C.border}`,
                  cursor:"pointer",
                }}
              >
                <div style={{fontSize:18,fontWeight:600,color:C.text,maxWidth:320}}>{card.name}</div>
                <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>
                  {card.summary}
                </div>
                <div style={{marginTop:"auto",justifySelf:"end"}}>
                  <span className="btn-gold-compact">Open workflow</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div style={{display:"grid",gap:18}}>
            <button className="btn-outline" onClick={() => { resetOperationsFlow(); setOperationsSection("home"); }} style={{justifySelf:"start"}}>
              Back to Operations Board
            </button>
            {operationsSection === "time-off" && !timeOffMode ? (
              <div className="card" style={{padding:22,textAlign:"left",display:"grid",gap:16,background:C.surface}}>
                <div>
                  <div style={{fontSize:18,fontWeight:600,color:C.text}}>Staff Availability</div>
                  <div style={{fontSize:12,color:C.muted,marginTop:8,lineHeight:1.6}}>
                    Choose the kind of availability update you need to submit so Shepherd can guide you through the right next step.
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:16}}>
                  {[
                    {
                      id: "pto",
                      title: "Request Time Off",
                      summary: "PTO requests are subject to review and may be approved or declined before they are placed on the shared calendar.",
                    },
                    {
                      id: "ooo",
                      title: "Indicate Out Of Office",
                      summary: "Let the team know when you are away and how reachable you are.",
                    },
                    {
                      id: "sick",
                      title: "Log Sick Days",
                      summary: "Record a sick day quickly so operations and leadership can track availability.",
                    },
                  ].map((option) => (
                    <button
                      key={option.id}
                      className="card"
                      onClick={() => chooseTimeOffMode(option.id)}
                      style={{padding:20,textAlign:"left",background:C.card,display:"grid",gap:10,cursor:"pointer",minHeight:160}}
                    >
                      <div style={{fontSize:18,fontWeight:600,color:C.text}}>{option.title}</div>
                      <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>{option.summary}</div>
                      <div style={{marginTop:"auto",justifySelf:"end"}}>
                        <span className="btn-gold-compact">Open form</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : operationsSection === "time-off" ? renderTimeOffForm() : lockupMode === "form" ? renderLockupForm() : renderLockupAssignments()}
            {operationsSection === "time-off" ? renderAvailabilityRequests() : null}
          </div>
        )}
      </div>
    </div>
  );
}

function PublicEventRequestSharePage({ token }) {
  const [request, setRequest] = useState(null);
  const [eventForm, setEventForm] = useState(() => createEventRequestBlank());
  const [commentDraft, setCommentDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadSharedRequest = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: loadError } = await supabase.functions.invoke("event-request-share", {
      body: { action: "get", token },
    });
    setLoading(false);
    if (loadError) {
      setError(loadError.message || "We couldn't load that event request.");
      return;
    }
    setRequest(data?.request || null);
    setEventForm(eventRequestToForm(data?.request || {}));
  }, [token]);

  useEffect(() => {
    loadSharedRequest();
  }, [loadSharedRequest]);

  const saveSharedRequest = async () => {
    const eventTiming = buildEventTimingSummary(eventForm);
    if (!eventTiming) {
      setError("Complete the event timing before saving updates.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    const { data, error: saveError } = await supabase.functions.invoke("event-request-share", {
      body: {
        action: "update",
        token,
        eventForm: {
          ...eventForm,
          event_timing: eventTiming,
          tables_needed: buildTablesSummary(eventForm),
        },
      },
    });
    setSaving(false);
    if (saveError) {
      setError(saveError.message || "We couldn't save those updates.");
      return;
    }
    setRequest(data?.request || null);
    setEventForm(eventRequestToForm(data?.request || {}));
    setMessage("Request details updated.");
  };

  const addSharedComment = async () => {
    if (!commentDraft.trim()) return;
    setSaving(true);
    setError("");
    setMessage("");
    const { data, error: commentError } = await supabase.functions.invoke("event-request-share", {
      body: {
        action: "comment",
        token,
        authorName: eventForm.contact_name,
        authorEmail: eventForm.email,
        body: commentDraft,
      },
    });
    setSaving(false);
    if (commentError) {
      setError(commentError.message || "We couldn't add that comment.");
      return;
    }
    setRequest(data?.request || null);
    setEventForm(eventRequestToForm(data?.request || {}));
    setCommentDraft("");
    setMessage("Comment added.");
  };

  const canEditDetails = request?.status === "new";

  return (
    <div style={{minHeight:"100vh",background:C.bg,padding:"32px 16px"}}>
      <div className="fadeIn" style={{maxWidth:920,margin:"0 auto"}}>
        <div className="card" style={{padding:28,textAlign:"left",display:"grid",gap:18}}>
          <div>
            <h1 style={pageTitleStyle}>Event Request</h1>
            <p style={{color:C.muted,fontSize:13,marginTop:6,lineHeight:1.6}}>
              Use this secure request link to check status, update event details while the request is still new, and answer follow-up questions from staff.
            </p>
          </div>
          {loading ? (
            <div style={{padding:"24px 14px",border:`1px dashed ${C.border}`,borderRadius:12,color:C.muted,fontSize:12,textAlign:"center"}}>
              Loading request...
            </div>
          ) : error && !request ? (
            <div style={{padding:"16px 14px",border:`1px solid rgba(224,82,82,.35)`,borderRadius:12,color:C.danger,fontSize:13}}>
              {error}
            </div>
          ) : (
            <>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12}}>
                <div style={{padding:"12px 14px",border:`1px solid ${C.border}`,borderRadius:12,background:C.surface}}>
                  <div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:0.4}}>Status</div>
                  <div style={{fontSize:15,color:C.gold,fontWeight:700,marginTop:4,textTransform:"capitalize"}}>{request?.status || "new"}</div>
                </div>
                <div style={{padding:"12px 14px",border:`1px solid ${C.border}`,borderRadius:12,background:C.surface}}>
                  <div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:0.4}}>Submitted By</div>
                  <div style={{fontSize:15,color:C.text,fontWeight:700,marginTop:4}}>{request?.contact_name || "Requester"}</div>
                </div>
                <div style={{padding:"12px 14px",border:`1px solid ${C.border}`,borderRadius:12,background:C.surface}}>
                  <div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:0.4}}>Submitted On</div>
                  <div style={{fontSize:15,color:C.text,fontWeight:700,marginTop:4}}>{fmtDate(request?.submitted_on || request?.created_at)}</div>
                </div>
              </div>

              {!canEditDetails && (
                <div style={{padding:"12px 14px",border:`1px solid ${C.goldDim}`,borderRadius:12,background:C.goldGlow,color:C.text,fontSize:12,lineHeight:1.6}}>
                  This request has already been reviewed, so details are locked. You can still leave comments or answers below.
                </div>
              )}

              {canEditDetails && (
                <div className="card" style={{padding:20,textAlign:"left",display:"grid",gap:14}}>
                  <EventRequestFormFields eventForm={eventForm} setEventForm={setEventForm} />
                  <div style={{display:"flex",justifyContent:"flex-end"}}>
                    <button className="btn-gold" onClick={saveSharedRequest} disabled={saving}>
                      {saving ? "Saving..." : "Save Request Updates"}
                    </button>
                  </div>
                </div>
              )}

              <div className="card" style={{padding:20,textAlign:"left",display:"grid",gap:12}}>
                <div>
                  <h3 style={sectionTitleStyle}>Follow-Up Conversation</h3>
                  <p style={{fontSize:12,color:C.muted,marginTop:6,lineHeight:1.6}}>
                    Use this area to answer staff questions or add important updates.
                  </p>
                </div>
                {(request?.public_comments || []).length === 0 ? (
                  <div style={{padding:"18px 14px",border:`1px dashed ${C.border}`,borderRadius:12,color:C.muted,fontSize:12,textAlign:"center"}}>
                    No comments yet.
                  </div>
                ) : (request?.public_comments || []).map((comment) => (
                  <div key={comment.id} style={{padding:"12px 14px",border:`1px solid ${C.border}`,borderRadius:12,background:C.surface}}>
                    <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"baseline",flexWrap:"wrap"}}>
                      <div style={{fontSize:13,color:C.text,fontWeight:700}}>
                        {comment.author || "Guest"}{comment.role === "staff" ? <span style={{color:C.gold}}> • Staff</span> : ""}
                      </div>
                      <div style={{fontSize:11,color:C.muted}}>{fmtActivityDate(comment.created_at)}</div>
                    </div>
                    <div style={{fontSize:13,color:C.text,lineHeight:1.6,whiteSpace:"pre-line",marginTop:6}}>{comment.body}</div>
                  </div>
                ))}
                <textarea className="input-field" rows={4} placeholder="Add a comment or answer a staff question" value={commentDraft} onChange={(e)=>setCommentDraft(e.target.value)} style={{resize:"vertical"}} />
                <div style={{display:"flex",justifyContent:"flex-end"}}>
                  <button className="btn-outline" onClick={addSharedComment} disabled={saving || !commentDraft.trim()}>
                    Add Comment
                  </button>
                </div>
              </div>
              {error && <div style={{fontSize:12,color:C.danger}}>{error}</div>}
              {message && <div style={{fontSize:12,color:C.success}}>{message}</div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PublicEventRequestPage({ churchCode = "" }) {
  const [eventForm, setEventForm] = useState(() => createEventRequestBlank());
  const [submitError, setSubmitError] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");
  const [submittedShareLink, setSubmittedShareLink] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submitEventRequest = async () => {
    const eventTiming = buildEventTimingSummary(eventForm);
    if (!eventForm.event_name || !eventTiming || !eventForm.setup_datetime || !eventForm.description || !eventForm.contact_name || !eventForm.phone || !eventForm.email || !eventForm.location_scope || !eventForm.signature) {
      setSubmitError("Please complete the required fields before submitting this request.");
      return;
    }
    if (eventForm.location_scope === "building" && eventForm.location_areas.length === 0) {
      setSubmitError("Please select at least one church area for building-use requests.");
      return;
    }
    if (eventForm.white_linen_tablecloths && !eventForm.white_linen_agreement) {
      setSubmitError("Please agree to launder and press the white linen tablecloths before submitting.");
      return;
    }
    if (eventForm.metal_folding_chairs_requested && !eventForm.metal_folding_chairs) {
      setSubmitError("Please enter how many metal folding chairs you need.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    setSubmitMessage("");
    const { data, error } = await supabase.functions.invoke("submit-public-event-request", {
      body: {
        churchCode,
        eventForm,
        eventTiming,
        tablesNeeded: buildTablesSummary(eventForm),
      },
    });
    if (error) {
      setSubmitError(error.message || "We couldn't submit that request.");
      setSubmitting(false);
      return;
    }
    const shareLink = data?.publicAccessToken && typeof window !== "undefined"
      ? `${window.location.origin}/event-request/${data.publicAccessToken}`
      : "";
    setSubmittedShareLink(shareLink);
    setSubmitMessage("Your event request has been submitted. The Administrator will follow up within one week. Save the request link below so you can check status, update details, or answer follow-up questions.");
    setEventForm(createEventRequestBlank());
    setSubmitting(false);
  };

  return (
    <div className="fadeIn mobile-pad" style={{minHeight:"100vh",padding:"48px 20px",background:C.bg}}>
      <div style={{maxWidth:860,margin:"0 auto"}}>
        <div className="card" style={{padding:28}}>
          <div style={{marginBottom:22,textAlign:"left"}}>
            <h1 style={pageTitleStyle}>Event Request Form</h1>
            <p style={{color:C.muted,fontSize:13,marginTop:6}}>
              Submit an event request for review. Once submitted, it will automatically appear in the church's Events board.
            </p>
          </div>

          {!churchCode && (
            <div style={{marginBottom:16,padding:"12px 14px",border:`1px solid ${C.goldDim}`,borderRadius:12,background:C.goldGlow,color:C.text,fontSize:13,lineHeight:1.55,textAlign:"left"}}>
              This form needs to be opened from the church's shared request link so Shepherd knows where to send it.
            </div>
          )}

          <EventRequestFormFields eventForm={eventForm} setEventForm={setEventForm} />
          {submitError && <div style={{marginTop:14,fontSize:12,color:C.danger,textAlign:"left"}}>{submitError}</div>}
          {submitMessage && <div style={{marginTop:14,fontSize:12,color:C.success,textAlign:"left"}}>{submitMessage}</div>}
          {submittedShareLink && (
            <div style={{marginTop:14,padding:"12px 14px",border:`1px solid ${C.goldDim}`,borderRadius:12,background:C.goldGlow,textAlign:"left",display:"grid",gap:8}}>
              <div style={{fontSize:12,color:C.text,fontWeight:700}}>Your request link</div>
              <a href={submittedShareLink} style={{fontSize:12,color:C.gold,wordBreak:"break-all"}}>{submittedShareLink}</a>
              <button className="btn-outline" onClick={() => navigator.clipboard?.writeText(submittedShareLink)} style={{justifySelf:"start",fontSize:12,padding:"7px 10px"}}>
                Copy Link
              </button>
            </div>
          )}
          <div style={{display:"flex",justifyContent:"flex-end",marginTop:22}}>
            <button className="btn-gold" onClick={submitEventRequest} disabled={submitting || !churchCode} style={{opacity:submitting || !churchCode ? 0.8 : 1}}>
              {submitting ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────
function Dashboard({ tasks, setActive, profile, church, previewUsers, setProfile, setPreviewUsers, churchLockupAssignments, notifications, archivedNotifications, unreadCount, readNotificationIds, archiveNotification, restoreNotification, openNotificationTarget }) {
  const hasAdminOversight = hasAdministrativeOversight(profile, church);
  const canSeeTeamSnapshot = !!profile && (
    profile?.role === "senior_pastor"
    || profile?.role === "church_administrator"
    || (profile?.staff_roles || []).includes("senior_pastor")
    || (profile?.staff_roles || []).includes("church_administrator")
    || samePerson(profile?.title, "Senior Pastor")
    || samePerson(profile?.title, "Church Administrator")
  );
  const greeting = getTimeOfDayGreeting();
  const dailyVerse = getDailyVerse();
  const [teamSnapshotOpen, setTeamSnapshotOpen] = useState(() => {
    if (typeof window === "undefined" || !profile?.id) return true;
    try {
      const stored = JSON.parse(window.localStorage.getItem(getDashboardSectionStateStorageKey(profile.id)) || "{}");
      return stored.teamSnapshotOpen ?? true;
    } catch {
      return true;
    }
  });
  const [notificationsOpen, setNotificationsOpen] = useState(() => {
    if (typeof window === "undefined" || !profile?.id) return true;
    try {
      const stored = JSON.parse(window.localStorage.getItem(getDashboardSectionStateStorageKey(profile.id)) || "{}");
      return stored.notificationsOpen ?? true;
    } catch {
      return true;
    }
  });
  const [lockupOpen, setLockupOpen] = useState(() => {
    if (typeof window === "undefined" || !profile?.id) return true;
    try {
      const stored = JSON.parse(window.localStorage.getItem(getDashboardSectionStateStorageKey(profile.id)) || "{}");
      return stored.lockupOpen ?? true;
    } catch {
      return true;
    }
  });
  const [archivedNotificationsOpen, setArchivedNotificationsOpen] = useState(() => {
    if (typeof window === "undefined" || !profile?.id) return false;
    try {
      const stored = JSON.parse(window.localStorage.getItem(getDashboardSectionStateStorageKey(profile.id)) || "{}");
      return stored.archivedNotificationsOpen ?? false;
    } catch {
      return false;
    }
  });
  const [personalNotepadEntries, setPersonalNotepadEntries] = useState(() => {
    if (typeof window === "undefined" || !profile?.id) return [];
    try {
      const raw = window.localStorage.getItem(getStaffNotepadStorageKey(profile.id));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      if (typeof parsed === "string" && parsed.trim()) {
        return [{
          id: crypto.randomUUID(),
          body: parsed.trim(),
          created_at: new Date().toISOString(),
        }];
      }
      return [];
    } catch {
      const legacy = window.localStorage.getItem(getStaffNotepadStorageKey(profile.id));
      return legacy?.trim() ? [{
        id: crypto.randomUUID(),
        body: legacy.trim(),
        created_at: new Date().toISOString(),
      }] : [];
    }
  });
  const [notepadDraft, setNotepadDraft] = useState("");
  const [editingNotepadId, setEditingNotepadId] = useState(null);
  const [editingNotepadDraft, setEditingNotepadDraft] = useState("");
  const [draggedNotepadId, setDraggedNotepadId] = useState(null);
  const [currentWorkTaskId, setCurrentWorkTaskId] = useState(() => {
    if (typeof window === "undefined" || !profile?.id) return "";
    return window.localStorage.getItem(getCurrentWorkFocusStorageKey(profile.id)) || profile?.current_focus_task_id || "";
  });
  const myAssignedTasks = tasks.filter((task) => samePerson(task.assignee, profile?.full_name));
  const myOpenTasks = myAssignedTasks.filter((task) => task.status !== "done");
  const myInReviewTasks = myOpenTasks.filter((task) => task.status === "in-review");
  const myOverdueTasks = myOpenTasks.filter((task) => isAfterDueDate(task.due_date));
  const selectedCurrentTask = myOpenTasks.find((task) => task.id === currentWorkTaskId) || null;
  const sortedLockupAssignments = (churchLockupAssignments || [])
    .slice()
    .sort((a, b) => getDateSortValue(a.week_of) - getDateSortValue(b.week_of));
  const thisWeekStart = startOfWeekMonday(new Date());
  const currentLockupAssignment = sortedLockupAssignments.find((assignment) => {
    const weekStart = parseAppDate(assignment?.week_of);
    return weekStart
      && weekStart.getFullYear() === thisWeekStart.getFullYear()
      && weekStart.getMonth() === thisWeekStart.getMonth()
      && weekStart.getDate() === thisWeekStart.getDate();
  }) || null;
  const nextLockupAssignment = currentLockupAssignment || sortedLockupAssignments.find((assignment) => {
    const weekStart = parseAppDate(assignment?.week_of);
    return weekStart && weekStart.getTime() > thisWeekStart.getTime();
  }) || null;
  const myTaskPreview = myOpenTasks
    .slice()
    .sort((a, b) => getDateSortValue(a.due_date) - getDateSortValue(b.due_date))
    .slice(0, 16);
  const teamSummary = previewUsers
    .filter((user) => !samePerson(user.full_name, profile?.full_name))
    .map((user) => {
    const assigned = tasks.filter((task) => samePerson(task.assignee, user.full_name));
    const openAssigned = assigned.filter((task) => task.status !== "done");
    const inReviewTasks = openAssigned.filter((task) => task.status === "in-review");
    const overdueTasks = openAssigned.filter((task) => isAfterDueDate(task.due_date));
    const focusedTask = openAssigned.find((task) => task.id === user.current_focus_task_id) || null;
    const currentTask =
      focusedTask
      || assigned.find((task) => task.status === "in-progress")
      || assigned
        .filter((task) => task.status !== "done")
        .sort((a, b) => getDateSortValue(a.due_date) - getDateSortValue(b.due_date))[0]
      || null;
    const additionalTasks = openAssigned
      .filter((task) => task.id !== currentTask?.id)
      .sort((a, b) => getDateSortValue(a.due_date) - getDateSortValue(b.due_date));
    const workloadSummary = focusedTask
      ? "Current focus"
      : currentTask
      ? currentTask.status === "in-progress"
        ? "Currently in progress"
        : currentTask.status === "in-review"
          ? "Waiting on review"
          : "Next priority"
      : openAssigned.length > 0
        ? "Upcoming work"
        : "Clear right now";
    const workloadDetail = overdueTasks.length > 0
      ? `${overdueTasks.length} overdue ${overdueTasks.length === 1 ? "task" : "tasks"}`
      : inReviewTasks.length > 0
        ? `${inReviewTasks.length} item${inReviewTasks.length === 1 ? "" : "s"} in review`
        : additionalTasks[0]?.due_date
          ? `Next due ${fmtDate(additionalTasks[0].due_date)}`
          : openAssigned.length > 0
            ? `${openAssigned.length} active task${openAssigned.length === 1 ? "" : "s"}`
            : "No open tasks";
    return {
      ...user,
      openTasks: openAssigned.length,
      inProgressTasks: assigned.filter((task) => task.status === "in-progress").length,
      inReviewTasks: inReviewTasks.length,
      overdueTasks: overdueTasks.length,
      focusedTask,
      currentTask,
      currentTaskContextLabel: currentTask?.ministry === "Events" ? getLinkedEventPlanName(currentTask) || currentTask.ministry : currentTask?.ministry || "",
      additionalTasks,
      workloadSummary,
      workloadDetail,
    };
  });
  useEffect(() => {
    if (typeof window === "undefined" || !profile?.id) return;
    window.localStorage.setItem(getStaffNotepadStorageKey(profile.id), JSON.stringify(personalNotepadEntries));
  }, [profile?.id, personalNotepadEntries]);

  useEffect(() => {
    if (typeof window === "undefined" || !profile?.id) return;
    if (!currentWorkTaskId) {
      window.localStorage.removeItem(getCurrentWorkFocusStorageKey(profile.id));
      return;
    }
    window.localStorage.setItem(getCurrentWorkFocusStorageKey(profile.id), currentWorkTaskId);
  }, [profile?.id, currentWorkTaskId]);

  useEffect(() => {
    if (!profile?.id) return;
    if ((profile.current_focus_task_id || "") === currentWorkTaskId) return;
    let cancelled = false;
    const nextFocusId = currentWorkTaskId || null;
    const saveFocus = async () => {
      const { error } = await supabase
        .from("profiles")
        .update({
          current_focus_task_id: nextFocusId,
          current_focus_updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);
      if (error || cancelled) return;
      setProfile((current) => current ? normalizeAccessUser({
        ...current,
        current_focus_task_id: nextFocusId,
        current_focus_updated_at: new Date().toISOString(),
      }) : current);
      setPreviewUsers((current) => (current || []).map((user) => {
        if (user.id === profile.id || user.staff_id === profile.staff_id || samePerson(user.full_name, profile.full_name)) {
          return normalizeAccessUser({
            ...user,
            current_focus_task_id: nextFocusId,
            current_focus_updated_at: new Date().toISOString(),
          });
        }
        return user;
      }));
    };
    saveFocus();
    return () => {
      cancelled = true;
    };
  }, [profile?.id, profile?.staff_id, profile?.full_name, profile?.current_focus_task_id, currentWorkTaskId, setProfile, setPreviewUsers]);

  useEffect(() => {
    if (typeof window === "undefined" || !profile?.id) return;
    window.localStorage.setItem(getDashboardSectionStateStorageKey(profile.id), JSON.stringify({
      lockupOpen,
      teamSnapshotOpen,
      notificationsOpen,
      archivedNotificationsOpen,
    }));
  }, [profile?.id, lockupOpen, teamSnapshotOpen, notificationsOpen, archivedNotificationsOpen]);

  const postPersonalNote = () => {
    if (!notepadDraft.trim()) return;
    setPersonalNotepadEntries((current) => [
      {
        id: crypto.randomUUID(),
        body: notepadDraft.trim(),
        created_at: new Date().toISOString(),
      },
      ...(current || []),
    ]);
    setNotepadDraft("");
  };
  const startEditingPersonalNote = (entry) => {
    setEditingNotepadId(entry.id);
    setEditingNotepadDraft(entry.body);
  };
  const saveEditedPersonalNote = () => {
    if (!editingNotepadId || !editingNotepadDraft.trim()) return;
    setPersonalNotepadEntries((current) => (current || []).map((entry) => entry.id === editingNotepadId ? {
      ...entry,
      body: editingNotepadDraft.trim(),
      updated_at: new Date().toISOString(),
    } : entry));
    setEditingNotepadId(null);
    setEditingNotepadDraft("");
  };
  const deletePersonalNote = (entryId) => {
    if (!confirmDestructiveAction("Delete this personal note?")) return;
    setPersonalNotepadEntries((current) => (current || []).filter((entry) => entry.id !== entryId));
    if (editingNotepadId === entryId) {
      setEditingNotepadId(null);
      setEditingNotepadDraft("");
    }
  };
  const movePersonalNote = (draggedId, targetId) => {
    if (!draggedId || !targetId || draggedId === targetId) return;
    setPersonalNotepadEntries((current) => {
      const items = [...(current || [])];
      const draggedIndex = items.findIndex((entry) => entry.id === draggedId);
      const targetIndex = items.findIndex((entry) => entry.id === targetId);
      if (draggedIndex === -1 || targetIndex === -1) return current;
      const [draggedItem] = items.splice(draggedIndex, 1);
      items.splice(targetIndex, 0, draggedItem);
      return items;
    });
  };

  return (
    <div className="fadeIn mobile-pad" style={widePageStyle}>
      <div style={{marginBottom:28}}>
        <h2 style={{fontFamily:"'Young Serif Medium', Georgia, serif",fontSize:42,fontWeight:500,color:C.text,letterSpacing:"0.01em",lineHeight:1.12}}>{greeting}, {profile?.full_name?.split(" ")[0] || "team"}.</h2>
        <p style={{color:C.muted,marginTop:4,fontStyle:profile?.canSeeTeamOverview && !profile?.readOnlyOversight?"italic":"normal"}}>
          {profile?.canSeeTeamOverview
            ? profile?.readOnlyOversight
              ? "You can see the whole church team's workload this week in read-only mode."
              : `${dailyVerse.text} ${dailyVerse.reference}`
            : hasAdminOversight
              ? "You can see the full church workload with an administrative operations lens."
              : `Here is your ministry workload and the shared church picture for ${roleLabel(profile)}.`}
        </p>
      </div>
      <div className="card" style={{padding:22,marginBottom:20,display:"grid",alignContent:"start"}}>
        <div className="section-header" style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{textAlign:"left"}}>
            <h3 style={sectionTitleStyle}>Focus Bar</h3>
            <div style={{fontSize:12,color:C.muted,marginTop:6,lineHeight:1.5}}>
              {myOpenTasks.length} open task{myOpenTasks.length === 1 ? "" : "s"} assigned to you
            </div>
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end",marginLeft:"auto"}}>
            <button
              type="button"
              className="btn-gold-compact"
              onClick={() => {
                setActive("tasks");
                if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              Open task board
            </button>
          </div>
        </div>
        <div style={{display:"grid",gap:14}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3, minmax(0,1fr))",gap:10}}>
            {[
              { label: "Open", value: String(myOpenTasks.length), tone: C.text },
              { label: "In Review", value: String(myInReviewTasks.length), tone: myInReviewTasks.length > 0 ? C.blue : C.muted },
              { label: "Overdue", value: String(myOverdueTasks.length), tone: myOverdueTasks.length > 0 ? C.danger : C.muted },
            ].map((metric) => (
              <div key={metric.label} className="card" style={{padding:"12px 12px",display:"grid",gap:4,textAlign:"left",background:"rgba(255,255,255,.03)"}}>
                <div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:".08em"}}>{metric.label}</div>
                <div style={{fontSize:22,fontWeight:700,color:metric.tone,lineHeight:1}}>{metric.value}</div>
              </div>
            ))}
          </div>
          {myTaskPreview.length > 0 ? (
            <div style={{display:"grid",gap:10}}>
              <div style={{fontSize:12,color:C.muted,lineHeight:1.6,textAlign:"left"}}>
                <span style={{color:!currentWorkTaskId ? C.gold : C.muted}}>
                  {!currentWorkTaskId
                    ? "What task are you currently working on? Your selected task will stay marked here until you change it and helps your Senior Pastor see what has your attention."
                    : "Your selected task will stay marked here until you change it and helps your Senior Pastor see what has your attention."}
                </span>
              </div>
              <div className="mobile-two-stack" style={{display:"grid",gridTemplateColumns:"repeat(4, minmax(0,1fr))",gap:10}}>
                {myTaskPreview.map((task) => {
                  const isSelected = selectedCurrentTask?.id === task.id;
                  const linkedEventPlanName = task.ministry === "Events" ? getLinkedEventPlanName(task) : "";
                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => setCurrentWorkTaskId(isSelected ? "" : task.id)}
                      className="card"
                      style={{
                        padding:"14px 16px",
                        display:"grid",
                        gap:6,
                        alignContent:"start",
                        minHeight:128,
                        textAlign:"left",
                        border:`1px solid ${isSelected ? C.goldDim : C.border}`,
                        background:isSelected ? C.goldGlow : C.surface,
                        cursor:"pointer",
                      }}
                    >
                      <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start",flexWrap:"wrap"}}>
                        <div style={{minWidth:0}}>
                          <div style={{fontSize:14,fontWeight:600,color:C.text,lineHeight:1.45}}>{task.title}</div>
                          <div style={{fontSize:12,color:C.muted,lineHeight:1.6,marginTop:2}}>
                            {task.due_date ? `Due ${fmtDate(task.due_date)}` : "No due date"}{linkedEventPlanName ? ` • ${linkedEventPlanName}` : task.ministry ? ` • ${task.ministry}` : ""}
                          </div>
                        </div>
                        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"}}>
                          {task.status !== "todo" && (
                            <span style={{fontSize:12,color:task.status === "in-progress" ? C.blue : C.gold,lineHeight:1.6}}>
                              {task.status === "in-progress" ? "In Progress" : "In Review"}
                            </span>
                          )}
                          {isSelected && (
                            <span className="badge" style={{background:`${C.gold}22`,color:C.gold,border:`1px solid ${C.goldDim}`}}>
                              Working on this now
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="card" style={{padding:"16px 18px",display:"grid",gap:6,textAlign:"left",background:"rgba(255,255,255,.02)"}}>
              <div style={{fontSize:16,fontWeight:600,color:C.text}}>You’re clear right now</div>
              <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>
                No open tasks are assigned to you at the moment.
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="card" style={{padding:22,marginBottom:20,display:"grid",alignContent:"start"}}>
        <div className="section-header" style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{textAlign:"left"}}>
            <h3 style={sectionTitleStyle}>Church Lock Up</h3>
            <div style={{fontSize:12,color:C.muted,marginTop:6,lineHeight:1.5}}>
              {nextLockupAssignment ? `Current week: ${fmtWeekRange(nextLockupAssignment.week_of)}` : "No weekly lock-up assignment is set yet"}
            </div>
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end",marginLeft:"auto"}}>
            <button type="button" className="btn-gold-compact" onClick={() => setLockupOpen((current) => !current)}>
              {lockupOpen ? "Collapse" : "Expand"}
            </button>
          </div>
        </div>
        {lockupOpen ? (
          nextLockupAssignment ? (
            <div className="card" style={{padding:"18px 18px",display:"grid",gap:8,textAlign:"left",background:"rgba(255,255,255,.03)"}}>
              <div style={{fontSize:11,color:C.gold,textTransform:"uppercase",letterSpacing:".08em"}}>
                {currentLockupAssignment ? "This Week" : "Next Up"}
              </div>
              <div style={{fontSize:18,fontWeight:600,color:C.text,lineHeight:1.35}}>
                {(nextLockupAssignment.assignee_names || []).join(", ") || "No one assigned"}
              </div>
              <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>
                {fmtWeekRange(nextLockupAssignment.week_of)}
              </div>
              {nextLockupAssignment.notes && (
                <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>
                  {nextLockupAssignment.notes}
                </div>
              )}
            </div>
          ) : (
            <div style={{fontSize:13,color:C.muted,textAlign:"left",marginTop:4}}>
              No one is assigned to lock up this week yet.
            </div>
          )
        ) : (
          <div style={{fontSize:13,color:C.muted,textAlign:"left",marginTop:4}}>
            Lock-up assignment collapsed. Expand it when you want to check this week’s coverage.
          </div>
        )}
      </div>
      {canSeeTeamSnapshot && previewUsers.length > 0 && (
        <div className="card" style={{padding:22,marginBottom:20,display:"grid",alignContent:"start"}}>
          <div className="section-header" style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div style={{textAlign:"left"}}>
              <h3 style={sectionTitleStyle}>Team Snapshot</h3>
              <div style={{fontSize:12,color:C.muted,marginTop:6,lineHeight:1.5}}>
                {teamSummary.length} team members in view
              </div>
            </div>
            <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end",marginLeft:"auto"}}>
              <button type="button" className="btn-gold-compact" onClick={() => setTeamSnapshotOpen((current) => !current)}>
                {teamSnapshotOpen ? "Collapse" : "Expand"}
              </button>
            </div>
          </div>
          {teamSnapshotOpen ? (
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {teamSummary.map((member) => (
              <div
                className="dashboard-team-row"
                key={member.id}
                style={{
                  padding:18,
                  border:`1px solid ${member.currentTask?.status === "in-progress" ? C.goldDim : C.border}`,
                  borderRadius:14,
                  background:member.currentTask?.status === "in-progress" ? C.goldGlow : C.surface,
                  display:"grid",
                  gridTemplateColumns:"minmax(0,1fr) minmax(220px, 260px)",
                  gap:18,
                  alignItems:"start",
                  textAlign:"left"
                }}
              >
                <div style={{display:"grid",gap:14,justifyItems:"start",textAlign:"left"}}>
                  <div style={{display:"grid",gap:4,justifyItems:"start",textAlign:"left"}}>
                    <div style={{fontSize:18,fontWeight:600,color:C.text,lineHeight:1.25}}>{member.full_name}</div>
                    <div style={{fontSize:12,color:C.muted}}>{member.title}</div>
                  </div>
                  <div style={{display:"grid",gap:6,justifyItems:"start",textAlign:"left"}}>
                    <div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:".08em"}}>
                      Current focus
                    </div>
                    {member.currentTask ? (
                      <>
                        <div style={{fontSize:15,color:C.text,fontWeight:500,lineHeight:1.45}}>{member.currentTask.title}</div>
                        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                          {member.currentTaskContextLabel && (
                            <span style={{fontSize:12,color:C.muted,lineHeight:1.6}}>
                              {member.currentTask?.ministry === "Events" ? `From ${member.currentTaskContextLabel}` : member.currentTaskContextLabel}
                            </span>
                          )}
                          {member.currentTask.status !== "todo" && (
                            <span style={{fontSize:12,color:member.currentTask.status === "in-progress" ? C.blue : C.gold,lineHeight:1.6}}>
                              {member.currentTask.status === "in-progress" ? "In Progress" : "In Review"}
                            </span>
                          )}
                          {member.currentTask.due_date && <span style={{fontSize:11,color:C.muted}}>Due {fmtDate(member.currentTask.due_date)}</span>}
                        </div>
                      </>
                    ) : (
                      <div style={{fontSize:13,color:C.muted}}>No active task right now.</div>
                    )}
                  </div>
                </div>
                <div className="dashboard-team-row-right" style={{textAlign:"left",display:"grid",gap:10,alignSelf:"stretch",padding:"12px 14px",border:`1px solid ${C.border}`,borderRadius:12,background:"rgba(255,255,255,.02)"}}>
                  <div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:".08em"}}>
                    Other open tasks
                  </div>
                  {member.additionalTasks?.length ? (
                    <div style={{display:"grid",gridTemplateColumns:"repeat(2, minmax(0,1fr))",gap:8}}>
                      {member.additionalTasks.map((task) => (
                        <div key={task.id} className="card" style={{padding:"10px 12px",display:"grid",gap:4,textAlign:"left",background:"rgba(255,255,255,.03)"}}>
                          <div style={{fontSize:12,fontWeight:600,color:C.text,lineHeight:1.45}}>{task.title}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>
                      Nothing else on their plate right now.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          ) : (
            <div style={{fontSize:13,color:C.muted,textAlign:"left",marginTop:4}}>Team snapshot collapsed. Expand it when you want to review everyone else’s workload.</div>
          )}
        </div>
      )}
      <div className="card" style={{padding:22,marginBottom:20,display:"grid",alignContent:"start"}}>
        <div className="section-header" style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{textAlign:"left"}}>
            <h3 style={sectionTitleStyle}>Notifications</h3>
            <div style={{fontSize:12,color:C.muted,marginTop:6,lineHeight:1.5}}>
              {unreadCount} unread notification{unreadCount === 1 ? "" : "s"}
            </div>
          </div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"flex-end",marginLeft:"auto"}}>
            <button type="button" className="btn-gold-compact" onClick={() => setNotificationsOpen((current) => !current)}>
              {notificationsOpen ? "Collapse" : "Expand"}
            </button>
          </div>
        </div>
        {notificationsOpen ? (
          <>
            {notifications.length === 0 && <p style={{color:C.muted,fontSize:13,marginTop:4,textAlign:"left"}}>No notifications right now.</p>}
            {notifications.map((item) => (
              <div
                className="dashboard-note-row"
                key={item.id}
                style={{
                  display:"flex",
                  gap:12,
                  marginBottom:14,
                  padding:"12px 12px 14px",
                  borderBottom:`1px solid ${C.border}`,
                  border:`1px solid ${!readNotificationIds.includes(item.id) ? C.goldDim : C.border}`,
                  borderRadius:12,
                  alignItems:"flex-start",
                  background:!readNotificationIds.includes(item.id) ? C.goldGlow : "rgba(255,255,255,.02)",
                  opacity:!readNotificationIds.includes(item.id) ? 1 : 0.68,
                }}
              >
                <div style={{width:10,height:10,borderRadius:"50%",background:!readNotificationIds.includes(item.id) ? item.tone : C.muted,marginTop:5,flexShrink:0}} />
                <div style={{textAlign:"left"}}>
                  <div style={{fontSize:13,fontWeight:500,color:C.text,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                    <span>{item.title}</span>
                    {!readNotificationIds.includes(item.id) && (
                      <span className="badge" style={{fontSize:9,background:`${C.gold}22`,color:C.gold,border:`1px solid ${C.goldDim}`}}>
                        New
                      </span>
                    )}
                  </div>
                  <div style={{fontSize:12,color:C.muted,marginTop:3,lineHeight:1.5}}>{item.detail}</div>
                </div>
                <button type="button" className="btn-gold-compact" onClick={()=>openNotificationTarget?.(item)} style={{marginLeft:"auto"}}>
                  Open
                </button>
                <button type="button" className="btn-outline" onClick={() => archiveNotification?.(item.id)} style={{padding:"6px 10px",marginLeft:8}}>
                  Archive
                </button>
              </div>
            ))}
            {archivedNotifications.length > 0 && (
              <div style={{display:"grid",gap:10,marginTop:10}}>
                <div className="section-header" style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
                  <div style={{textAlign:"left"}}>
                    <div style={{fontSize:12,color:C.muted}}>Archived</div>
                    <div style={{fontSize:12,color:C.muted,marginTop:4,lineHeight:1.6}}>
                      {archivedNotifications.length} archived notification{archivedNotifications.length === 1 ? "" : "s"}
                    </div>
                  </div>
                  <button type="button" className="btn-gold-compact" onClick={() => setArchivedNotificationsOpen((current) => !current)}>
                    {archivedNotificationsOpen ? "Collapse" : "Expand"}
                  </button>
                </div>
                {archivedNotificationsOpen && archivedNotifications.map((item) => (
                  <div
                    className="dashboard-note-row"
                    key={`archived-${item.id}`}
                    style={{
                      display:"flex",
                      gap:12,
                      padding:"12px 12px 14px",
                      border:`1px solid ${C.border}`,
                      borderRadius:12,
                      alignItems:"flex-start",
                      background:"rgba(255,255,255,.02)",
                      opacity:0.6,
                    }}
                  >
                    <div style={{width:10,height:10,borderRadius:"50%",background:C.muted,marginTop:5,flexShrink:0}} />
                    <div style={{textAlign:"left"}}>
                      <div style={{fontSize:13,fontWeight:500,color:C.text}}>{item.title}</div>
                      <div style={{fontSize:12,color:C.muted,marginTop:3,lineHeight:1.5}}>{item.detail}</div>
                    </div>
                    <button type="button" className="btn-gold-compact" onClick={() => restoreNotification?.(item.id)} style={{marginLeft:"auto"}}>
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{fontSize:13,color:C.muted,textAlign:"left",marginTop:4}}>Notifications collapsed. Expand this section to review and open them.</div>
        )}
      </div>
      <div>
        <div className="card" style={{padding:22}}>
          <div className="section-header" style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div style={{textAlign:"left",flex:1}}>
              <h3 style={{...sectionTitleStyle,textAlign:"left"}}>Personal Notepad</h3>
            </div>
          </div>
          <p style={{fontSize:12,color:C.muted,lineHeight:1.6,textAlign:"left",marginBottom:12}}>
            Keep quick reminders for yourself here. This notepad is private to your account, and your notes can be dragged and dropped into the order you want.
          </p>
          <div style={{display:"grid",gap:12}}>
            <textarea
              className="input-field"
              rows={4}
              placeholder="Write down a quick reminder, thought, or next step for yourself..."
              value={notepadDraft}
              onChange={(e)=>setNotepadDraft(e.target.value)}
              style={{resize:"vertical"}}
            />
            <div style={{display:"flex",justifyContent:"flex-end"}}>
              <button className="btn-gold" onClick={postPersonalNote}>Post</button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {personalNotepadEntries.length === 0 && (
                <div style={{padding:"18px 14px",border:`1px dashed ${C.border}`,borderRadius:12,fontSize:13,color:C.muted,textAlign:"left"}}>
                  No notes yet.
                </div>
              )}
              {personalNotepadEntries.map((entry) => (
                <div
                  key={entry.id}
                  draggable={editingNotepadId !== entry.id}
                  onDragStart={() => setDraggedNotepadId(entry.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    movePersonalNote(draggedNotepadId, entry.id);
                    setDraggedNotepadId(null);
                  }}
                  onDragEnd={() => setDraggedNotepadId(null)}
                  style={{
                    padding:"16px 16px 14px",
                    border:`1px solid ${C.goldDim}`,
                    borderRadius:14,
                    background:`linear-gradient(180deg, ${C.goldGlow} 0%, rgba(201,168,76,0.08) 18%, ${C.card} 100%)`,
                    boxShadow:"0 12px 28px rgba(0,0,0,.2)",
                    position:"relative",
                    overflow:"hidden",
                    cursor: editingNotepadId === entry.id ? "default" : "grab",
                    opacity: draggedNotepadId === entry.id ? 0.72 : 1,
                    textAlign:"left",
                  }}
                >
                  <div style={{position:"absolute",left:0,right:0,top:0,height:3,background:`linear-gradient(90deg, ${C.goldDim} 0%, ${C.gold} 55%, ${C.goldDim} 100%)`}} />
                  <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start",position:"relative"}}>
                    <div style={{fontSize:11,color:C.muted}}>
                      {entry.updated_at ? "Edited note" : "Posted note"}
                    </div>
                    <div style={{fontSize:11,color:C.muted,textAlign:"right"}}>
                      {new Date(entry.updated_at || entry.created_at).toLocaleString("en-US", { month:"short", day:"numeric", year:"numeric", hour:"numeric", minute:"2-digit" })}
                    </div>
                  </div>
                  {editingNotepadId === entry.id ? (
                    <div style={{display:"grid",gap:10,marginTop:10,position:"relative"}}>
                      <textarea
                        className="input-field"
                        rows={4}
                        value={editingNotepadDraft}
                        onChange={(e)=>setEditingNotepadDraft(e.target.value)}
                        style={{resize:"vertical"}}
                      />
                      <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
                        <button className="btn-outline" onClick={() => { setEditingNotepadId(null); setEditingNotepadDraft(""); }} style={{padding:"6px 10px",fontSize:12}}>Cancel</button>
                        <button className="btn-gold" onClick={saveEditedPersonalNote} style={{padding:"6px 12px",fontSize:12}}>Save</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{fontSize:13,color:C.text,marginTop:8,lineHeight:1.7,whiteSpace:"pre-line",position:"relative"}}>{entry.body}</div>
                  )}
                  <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:12,position:"relative"}}>
                    {editingNotepadId !== entry.id && (
                      <button className="btn-outline" onClick={() => startEditingPersonalNote(entry)} style={{padding:"6px 10px",fontSize:12}}>
                        Edit
                      </button>
                    )}
                    <button className="btn-outline" onClick={() => deletePersonalNote(entry.id)} style={{padding:"6px 10px",fontSize:12,borderColor:"rgba(224,82,82,.35)",color:C.danger}}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tasks ──────────────────────────────────────────────────────────────────
function Tasks({ tasks, setTasks, churchId, church, profile, previewUsers, moveItemToTrash, taskOpenRequest, clearTaskOpenRequest, recordActivity }) {
  const isPreview = churchId === "preview";
  const canCreateTasks = true;
  const canAssignToAnyone = hasAdministrativeOversight(profile, church);
  const [mFilter, setMFilter] = useState("All");
  const [aFilter, setAFilter] = useState("mine");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskFormError, setTaskFormError] = useState("");
  const [commentDraft, setCommentDraft] = useState("");
  const [commentCursor, setCommentCursor] = useState(0);
  const [taskCommentError, setTaskCommentError] = useState("");
  const [taskCommentsOpen, setTaskCommentsOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      const stored = JSON.parse(window.localStorage.getItem(getTaskDiscussionStateStorageKey(profile?.id)) || "{}");
      return stored.taskCommentsOpen ?? true;
    } catch {
      return true;
    }
  });
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentDraft, setEditingCommentDraft] = useState("");
  const [highlightedTaskCommentId, setHighlightedTaskCommentId] = useState(null);
  const commentInputRef = useRef(null);
  const taskCommentRefs = useRef({});
  const blank = {title:"",ministry:"Admin",assignee:profile?.full_name || "",due_date:"",status:"todo",notes:"",share_link:"",review_required:false,reviewers:[],review_approvals:[],comments:[]};
  const [form, setForm] = useState(blank);
  const taskDraftKey = getFormDraftStorageKey(profile?.id, "new-task");
  const [orderedCategories, setOrderedCategories] = useState(() => getStoredCategoryOrder());
  const [collapsedColumns, setCollapsedColumns] = useState(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(window.localStorage.getItem(getTaskColumnStateStorageKey(profile?.id)) || "{}");
    } catch {
      return {};
    }
  });
  const [draggingTaskId, setDraggingTaskId] = useState(null);
  const [dragOverStatus, setDragOverStatus] = useState("");
  const teamNames = previewUsers?.map((user) => user.full_name) || [];
  const allowedAssignees = canAssignToAnyone ? teamNames : [profile?.full_name].filter(Boolean);
  const boardTasks = tasks;
  const mentionableNames = [...new Set(teamNames.filter(Boolean))];
  const mentionableStaff = mentionableNames.map((name) => ({ fullName: name, token: getStaffMentionToken(name) })).filter((entry) => entry.token);
  const eventPlanLinkMatch = selectedTask?.notes?.match(/^Linked from event plan:\s*(.+?)(?:\n|$)/);
  const eventPlanName = eventPlanLinkMatch?.[1]?.trim() || "";
  const taskNotesBody = eventPlanLinkMatch
    ? (selectedTask?.notes || "").replace(/^Linked from event plan:\s*.+?(?:\n\n?|\n|$)/, "").trim()
    : (selectedTask?.notes || "").trim();

  const mentionContext = getMentionContext(commentDraft, commentCursor);
  const mentionSuggestions = mentionContext
    ? mentionableStaff.filter((entry) => entry.token.toLowerCase().includes(mentionContext.query.trim().toLowerCase()) && !samePerson(entry.fullName, profile?.full_name)).slice(0, 5)
    : [];

  const filtered = boardTasks.filter((t) => {
    const ministryMatch = mFilter === "All" || t.ministry === mFilter;
    const isMine = isTaskForUser(t, profile?.full_name);
    const assigneeMatch =
      aFilter === "all" ||
      (aFilter === "mine" && isMine);
    return ministryMatch && assigneeMatch;
  });

  const openNew = () => {
    setEditing(null);
    setTaskFormError("");
    const fallback = { ...blank, ministry: orderedCategories[0] || "Admin", assignee: profile?.full_name || blank.assignee };
    setForm(readStoredFormDraft(taskDraftKey, fallback));
    setShowModal(true);
  };
  const openEdit = (t) => { setEditing(t); setTaskFormError(""); setForm(normalizeTask(t)); setShowModal(true); setSelectedTask(null); };
  const closeTaskForm = () => {
    if (!editing) clearStoredFormDraft(taskDraftKey);
    setShowModal(false);
  };
  const openTask = (task) => {
    setSelectedTask(normalizeTask(task));
    setCommentDraft("");
    setTaskCommentError("");
    setEditingCommentId(null);
    setEditingCommentDraft("");
    setHighlightedTaskCommentId(null);
  };

  const notifyTaskAssignment = async (task, previousAssignee = "") => {
    if (!task?.id || !task?.assignee || !churchId || isPreview) return;
    if (previousAssignee && samePerson(previousAssignee, task.assignee)) return;
    if (samePerson(task.assignee, profile?.full_name)) return;
    const recipient = (previewUsers || []).find((user) => samePerson(user.full_name, task.assignee));
    const recipientProfileId = recipient?.auth_user_id;
    if (!recipientProfileId) return;

    await createPersistentNotification({
      churchId,
      actorProfile: profile,
      recipientProfileId,
      type: "task_assigned",
      title: "New Task Assigned",
      detail: `${task.title} was assigned to you${profile?.full_name ? ` by ${profile.full_name}` : ""}.`,
      target: "tasks",
      taskId: task.id,
      sourceKey: task.id,
      data: {
        taskTitle: task.title,
        ministry: task.ministry,
        assignedBy: profile?.full_name || "",
      },
    });
  };

  const notifyTaskReviewRequested = async (task) => {
    if (!task?.id || isPreview) return;
    await createNotificationsForNames({
      users: previewUsers,
      names: (task.reviewers || []).filter((name) => !samePerson(name, profile?.full_name)),
      churchId,
      actorProfile: profile,
      type: "task_review_requested",
      title: "Review Requested",
      detail: `${task.title} is ready for your review.`,
      target: "tasks",
      taskId: task.id,
      sourceKey: `${task.id}:review-request:${task.review_history?.length || 0}`,
      data: { taskTitle: task.title, requestedBy: profile?.full_name || "" },
    });
  };

  const notifyTaskReviewDecision = async (task, status, decisionKey) => {
    if (!task?.id || isPreview) return;
    const recipient = findStaffByName(previewUsers, task.assignee);
    const recipientProfileId = getStaffProfileId(recipient);
    if (!recipientProfileId) return;
    await createPersistentNotification({
      churchId,
      actorProfile: profile,
      recipientProfileId,
      type: status === "approved" ? "task_review_approved" : "task_review_denied",
      title: status === "approved" ? "Task Review Approved" : "Task Review Needs Changes",
      detail: `${profile?.full_name || "A reviewer"} ${status === "approved" ? "approved" : "sent back"} ${task.title}.`,
      target: "tasks",
      taskId: task.id,
      sourceKey: `${task.id}:review:${status}:${decisionKey || "latest"}`,
      data: { taskTitle: task.title, reviewedBy: profile?.full_name || "" },
    });
  };

  const notifyTaskComment = async (task, comment) => {
    if (!task?.id || !comment?.id || isPreview) return;
    const mentionedNames = getMentionedStaffNames(comment.body, previewUsers);
    const generalNames = [
      task.assignee,
      ...(task.reviewers || []),
    ].filter(Boolean);
    await createNotificationsForNames({
      users: previewUsers,
      names: generalNames.filter((name) => !samePerson(name, profile?.full_name)),
      churchId,
      actorProfile: profile,
      type: "task_comment",
      title: "New Comment On A Task",
      detail: `${comment.author || profile?.full_name || "A staff member"} commented on ${task.title}.`,
      target: "tasks",
      taskId: task.id,
      sourceKey: `${task.id}:comment:${comment.id}`,
      data: { taskTitle: task.title, commentId: comment.id },
    });
    await createNotificationsForNames({
      users: previewUsers,
      names: mentionedNames.filter((name) => !samePerson(name, profile?.full_name)),
      churchId,
      actorProfile: profile,
      type: "task_comment_mention",
      title: "You Were Mentioned In A Task",
      detail: `${comment.author || profile?.full_name || "A staff member"} mentioned you in ${task.title}.`,
      target: "tasks",
      taskId: task.id,
      sourceKey: `${task.id}:mention:${comment.id}`,
      data: { taskTitle: task.title, commentId: comment.id },
    });
  };

  const syncTaskInView = (updatedTask) => {
    setSelectedTask((current) => current?.id === updatedTask.id ? normalizeTask(updatedTask) : current);
  };

  const save = async () => {
    setTaskFormError("");
    if (!form.title) {
      setTaskFormError("Please enter a task title.");
      return;
    }
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
      if (!editing) clearStoredFormDraft(taskDraftKey);
      setShowModal(false);
      return;
    }
    const dbPayload = {
      title: safeForm.title,
      ministry: safeForm.ministry,
      assignee: safeForm.assignee,
      due_date: safeForm.due_date,
      status: safeForm.status,
      notes: safeForm.notes,
      review_required: safeForm.review_required,
      reviewers: safeForm.reviewers,
      review_approvals: safeForm.review_approvals,
      review_history: safeForm.review_history || [],
      church_id: churchId,
    };
    if (editing) {
      let result = await supabase.from("tasks").update(dbPayload).eq("id",editing.id).select().single();
      if (result.error && /review_required|reviewers|review_approvals|review_history|share_link/i.test(result.error.message || "")) {
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
      if (result.error) {
        setTaskFormError(result.error.message || "We couldn't save that task.");
        return;
      }
      if (result.data) {
        const normalized = normalizeTask(result.data);
        setTasks(tasks.map(t=>t.id===editing.id?normalized:t));
        await notifyTaskAssignment(normalized, editing.assignee);
        await recordActivity?.({
          action: "updated",
          entityType: "task",
          entityId: normalized.id,
          entityTitle: normalized.title,
          summary: `${profile?.full_name || "A staff member"} updated task "${normalized.title}".`,
          metadata: { assignee: normalized.assignee, status: normalized.status },
        });
      }
    } else {
      let result = await supabase.from("tasks").insert(dbPayload).select().single();
      if (result.error && /review_required|reviewers|review_approvals|review_history|share_link/i.test(result.error.message || "")) {
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
      if (result.error) {
        setTaskFormError(result.error.message || "We couldn't save that task.");
        return;
      }
      if (result.data) {
        const normalized = normalizeTask(result.data);
        setTasks([...tasks, normalized]);
        await notifyTaskAssignment(normalized);
        await recordActivity?.({
          action: "created",
          entityType: "task",
          entityId: normalized.id,
          entityTitle: normalized.title,
          summary: `${profile?.full_name || "A staff member"} created task "${normalized.title}" for ${normalized.assignee || "staff"}.`,
          metadata: { assignee: normalized.assignee, status: normalized.status },
        });
      }
    }
    if (!editing) clearStoredFormDraft(taskDraftKey);
    setShowModal(false);
  };

  useEffect(() => {
    if (showModal || editing || selectedTask) return;
    const restoredTask = readStoredFormDraft(taskDraftKey, null);
    if (!restoredTask || !hasMeaningfulFormDraft(restoredTask, ["assignee", "ministry", "status", "review_required", "reviewers", "review_approvals", "comments"])) return;
    const timer = window.setTimeout(() => {
      setForm(restoredTask);
      setShowModal(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [taskDraftKey, showModal, editing, selectedTask]);

  useEffect(() => {
    if (!showModal || editing) return;
    if (!hasMeaningfulFormDraft(form, ["assignee", "ministry", "status", "review_required", "reviewers", "review_approvals", "comments"])) return;
    writeStoredFormDraft(taskDraftKey, form);
  }, [showModal, editing, form, taskDraftKey]);

  const setTaskStatus = async (task, nextStatus) => {
    setTaskFormError("");
    if (nextStatus === "done" && task.review_required && task.reviewers.some((name) => !listIncludesPerson(task.review_approvals, name))) {
      setTaskFormError("This task still needs its review approvals before it can be marked done.");
      return;
    }
    const changes = nextStatus === "in-review" && task.status !== "in-review"
      ? { status: nextStatus, review_approvals: [], review_history: [] }
      : { status: nextStatus };
    if (isPreview) {
      const updated = normalizeTask({ ...task, ...changes });
      setTasks(tasks.map((t) => t.id === task.id ? updated : t));
      syncTaskInView(updated);
      return;
    }
    let result = await supabase.from("tasks").update(changes).eq("id",task.id).select().single();
    if (result.error && /review_history/i.test(result.error.message || "")) {
      result = await supabase.from("tasks").update({ status: nextStatus, review_approvals: changes.review_approvals || [] }).eq("id", task.id).select().single();
    }
    if (result.error) {
      setTaskFormError(result.error.message || "We couldn't update that task status.");
      return;
    }
    const { data } = result;
    const updated = normalizeTask(data);
    setTasks(tasks.map(t=>t.id===task.id?updated:t));
    syncTaskInView(updated);
    if (nextStatus === "in-review" && task.status !== "in-review") await notifyTaskReviewRequested(updated);
    await recordActivity?.({
      action: "status_changed",
      entityType: "task",
      entityId: updated.id,
      entityTitle: updated.title,
      summary: `${profile?.full_name || "A staff member"} moved "${updated.title}" from ${STATUS_STYLES[task.status]?.label || task.status} to ${STATUS_STYLES[nextStatus]?.label || nextStatus}.`,
      metadata: { from_status: task.status, to_status: nextStatus, assignee: updated.assignee },
    });
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

  const updateTaskReviewStatus = async (task, status) => {
    if (!task?.id || !canApproveTaskReview(profile, task)) return;
    const nowIso = new Date().toISOString();
    const nextHistory = [
      ...(task.review_history || []),
      {
        id: `${task.id}-${status}-${nowIso}`,
        reviewer: profile?.full_name || "Reviewer",
        action: status,
        created_at: nowIso,
      },
    ];
    const approvals = status === "approved"
      ? [...new Set([...(task.review_approvals || []), profile?.full_name].filter(Boolean))]
      : [];
    const allApproved = status === "approved" && task.reviewers.length > 0 && task.reviewers.every((name) => listIncludesPerson(approvals, name));
    const changes = status === "approved"
      ? {
          review_approvals: approvals,
          review_history: nextHistory,
          status: allApproved ? "done" : "in-review",
        }
      : {
          review_approvals: [],
          review_history: nextHistory,
          status: "in-progress",
        };
    if (isPreview) {
      const updated = normalizeTask({ ...task, ...changes });
      setTasks(tasks.map((entry) => entry.id === task.id ? updated : entry));
      syncTaskInView(updated);
      return;
    }
    let result = await supabase.from("tasks").update(changes).eq("id", task.id).select().single();
    if (result.error && /review_history/i.test(result.error.message || "")) {
      result = await supabase.from("tasks").update({ review_approvals: changes.review_approvals, status: changes.status }).eq("id", task.id).select().single();
    }
    const { data } = result;
    const updated = normalizeTask(data);
    setTasks(tasks.map((entry) => entry.id === task.id ? updated : entry));
    syncTaskInView(updated);
    await notifyTaskReviewDecision(updated, status, nowIso);
    await recordActivity?.({
      action: "reviewed",
      entityType: "task",
      entityId: updated.id,
      entityTitle: updated.title,
      summary: `${profile?.full_name || "A reviewer"} ${status === "approved" ? "approved" : "sent back"} "${updated.title}".`,
      metadata: { review_status: status },
    });
  };

  const addComment = async () => {
    if (!selectedTask || !commentDraft.trim()) return;
    setTaskCommentError("");
    if (isPreview) {
      const nextComment = {
        id: crypto.randomUUID(),
        author: profile?.full_name || "Staff",
        body: commentDraft.trim(),
        created_at: new Date().toISOString(),
      };
      const nextComments = [...(selectedTask.comments || []), nextComment];
      const saved = await saveTaskComments(selectedTask.id, nextComments);
      if (!saved) return;
      setCommentDraft("");
      setCommentCursor(0);
      return;
    }
    const commentId = crypto.randomUUID();
    const { data, error } = await supabase.rpc("add_task_comment", {
      p_task_id: selectedTask.id,
      p_comment_id: commentId,
      p_body: commentDraft.trim(),
    });
    if (error) {
      setTaskCommentError(error.message || "We couldn't save that comment.");
      return;
    }
    const nextComments = Array.isArray(data) ? data : [];
    setTaskCommentError("");
    setTasks((current) => current.map((task) => task.id === selectedTask.id ? normalizeTask({ ...task, comments: nextComments }) : task));
    setSelectedTask((current) => current?.id === selectedTask.id ? normalizeTask({ ...current, comments: nextComments }) : current);
    const savedComment = nextComments.find((comment) => comment.id === commentId);
    if (savedComment) await notifyTaskComment(selectedTask, savedComment);
    await recordActivity?.({
      action: "commented",
      entityType: "task",
      entityId: selectedTask.id,
      entityTitle: selectedTask.title,
      summary: `${profile?.full_name || "A staff member"} commented on task "${selectedTask.title}".`,
      metadata: { comment_id: commentId },
    });
    setCommentDraft("");
    setCommentCursor(0);
  };

  const saveTaskComments = async (taskId, nextComments) => {
    if (!taskId) return false;
    if (isPreview) {
      setTaskCommentError("");
      setTasks((current) => current.map((task) => task.id === taskId ? normalizeTask({ ...task, comments: nextComments }) : task));
      setSelectedTask((current) => current?.id === taskId ? normalizeTask({ ...current, comments: nextComments }) : current);
      return true;
    }
    const { error } = await supabase.from("tasks").update({ comments: nextComments }).eq("id", taskId);
    if (error) {
      setTaskCommentError(error.message || "We couldn't save that comment.");
      return false;
    }
    setTaskCommentError("");
    setTasks((current) => current.map((task) => task.id === taskId ? normalizeTask({ ...task, comments: nextComments }) : task));
    setSelectedTask((current) => current?.id === taskId ? normalizeTask({ ...current, comments: nextComments }) : current);
    return true;
  };

  const beginEditComment = (comment) => {
    setEditingCommentId(comment.id);
    setEditingCommentDraft(comment.body || "");
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentDraft("");
  };

  const saveEditedComment = async (comment) => {
    if (!selectedTask?.id || !canManageComment(comment, profile) || !editingCommentDraft.trim()) return;
    setTaskCommentError("");
    if (!isPreview) {
      const { data, error } = await supabase.rpc("update_task_comment", {
        p_task_id: selectedTask.id,
        p_comment_id: comment.id,
        p_body: editingCommentDraft.trim(),
      });
      if (error) {
        setTaskCommentError(error.message || "We couldn't save that comment.");
        return;
      }
      const nextComments = Array.isArray(data) ? data : [];
      setTasks((current) => current.map((task) => task.id === selectedTask.id ? normalizeTask({ ...task, comments: nextComments }) : task));
      setSelectedTask((current) => current?.id === selectedTask.id ? normalizeTask({ ...current, comments: nextComments }) : current);
      cancelEditComment();
      return;
    }
    const nextComments = (selectedTask.comments || []).map((entry) => entry.id === comment.id ? {
      ...entry,
      body: editingCommentDraft.trim(),
      updated_at: new Date().toISOString(),
    } : entry);
    const saved = await saveTaskComments(selectedTask.id, nextComments);
    if (!saved) return;
    cancelEditComment();
  };

  const deleteTaskComment = async (comment) => {
    if (!selectedTask?.id || !canManageComment(comment, profile)) return;
    if (!confirmDestructiveAction("Delete this task comment?")) return;
    setTaskCommentError("");
    if (!isPreview) {
      const { data, error } = await supabase.rpc("delete_task_comment", {
        p_task_id: selectedTask.id,
        p_comment_id: comment.id,
      });
      if (error) {
        setTaskCommentError(error.message || "We couldn't delete that comment.");
        return;
      }
      const nextComments = Array.isArray(data) ? data : [];
      setTasks((current) => current.map((task) => task.id === selectedTask.id ? normalizeTask({ ...task, comments: nextComments }) : task));
      setSelectedTask((current) => current?.id === selectedTask.id ? normalizeTask({ ...current, comments: nextComments }) : current);
      if (editingCommentId === comment.id) cancelEditComment();
      return;
    }
    const nextComments = (selectedTask.comments || []).filter((entry) => entry.id !== comment.id);
    const saved = await saveTaskComments(selectedTask.id, nextComments);
    if (!saved) return;
    if (editingCommentId === comment.id) cancelEditComment();
  };

  const insertMention = (name) => {
    const context = getMentionContext(commentDraft, commentCursor);
    if (!context) return;
    const mentionToken = getStaffMentionToken(name);
    const nextValue = `${commentDraft.slice(0, context.start)}@${mentionToken} ${commentDraft.slice(context.end)}`;
    setCommentDraft(nextValue);
    setCommentCursor(context.start + mentionToken.length + 2);
    window.requestAnimationFrame(() => {
      const textarea = commentInputRef.current;
      if (!textarea) return;
      const nextCursor = context.start + mentionToken.length + 2;
      textarea.focus();
      textarea.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const del = async (id) => {
    setTaskFormError("");
    const taskToDelete = tasks.find((task) => task.id === id);
    if (!confirmDestructiveAction(`Delete ${taskToDelete?.title || "this task"}? You can restore supported items from Trash.`)) return;
    if (taskToDelete) {
      moveItemToTrash?.({
        entity_type: "task",
        entity_label: "Task",
        source: isContentTask(taskToDelete) ? "content-media-board" : "tasks",
        source_label: isContentTask(taskToDelete) ? "Content & Media Board" : "Tasks",
        title: taskToDelete.title,
        deleted_by: profile?.full_name || "Staff",
        payload: taskToDelete,
      });
    }
    if (isPreview) {
      setTasks(tasks.filter((t) => t.id !== id));
      return;
    }
    const { error } = await supabase.from("tasks").delete().eq("id",id);
    if (error) {
      setTaskFormError(error.message || "We couldn't delete that task.");
      return;
    }
    setTasks(tasks.filter(t=>t.id!==id));
    await recordActivity?.({
      action: "deleted",
      entityType: "task",
      entityId: id,
      entityTitle: taskToDelete?.title || "Task",
      summary: `${profile?.full_name || "A staff member"} deleted task "${taskToDelete?.title || "Task"}".`,
      metadata: { source: isContentTask(taskToDelete) ? "content-media-board" : "tasks" },
    });
  };

  const groupedTasks = {
    todo: filtered.filter((task) => task.status === "todo"),
    "in-progress": filtered.filter((task) => task.status === "in-progress"),
    "in-review": filtered.filter((task) => task.status === "in-review"),
    done: filtered.filter((task) => task.status === "done"),
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(getTaskColumnStateStorageKey(profile?.id), JSON.stringify(collapsedColumns));
  }, [profile?.id, collapsedColumns]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(getTaskDiscussionStateStorageKey(profile?.id), JSON.stringify({
      taskCommentsOpen,
    }));
  }, [profile?.id, taskCommentsOpen]);

  useEffect(() => {
    if (!taskOpenRequest?.taskId) return;
    const task = tasks.find((entry) => entry.id === taskOpenRequest.taskId);
    if (task) {
      const frame = window.requestAnimationFrame(() => {
        openTask(task);
        setTaskCommentsOpen(true);
        setHighlightedTaskCommentId(taskOpenRequest.commentId || null);
      });
      clearTaskOpenRequest?.();
      return () => window.cancelAnimationFrame(frame);
    }
    clearTaskOpenRequest?.();
  }, [taskOpenRequest, tasks, clearTaskOpenRequest]);

  useEffect(() => {
    if (!selectedTask?.id || !highlightedTaskCommentId || !taskCommentsOpen) return;
    const target = taskCommentRefs.current[highlightedTaskCommentId];
    if (target) {
      window.requestAnimationFrame(() => {
        target.scrollIntoView({ block: "center", behavior: "smooth" });
      });
    }
  }, [selectedTask?.id, highlightedTaskCommentId, taskCommentsOpen]);

  const toggleColumn = (statusKey) => {
    setCollapsedColumns((current) => ({
      ...current,
      [statusKey]: !current?.[statusKey],
    }));
  };

  const handleTaskDragStart = (event, task) => {
    setTaskFormError("");
    setDraggingTaskId(task.id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", task.id);
  };

  const handleTaskDrop = async (event, statusKey) => {
    event.preventDefault();
    const taskId = event.dataTransfer.getData("text/plain") || draggingTaskId;
    setDraggingTaskId(null);
    setDragOverStatus("");
    const task = tasks.find((entry) => entry.id === taskId);
    if (!task || task.status === statusKey) return;
    await setTaskStatus(task, statusKey);
  };

  return (
    <div className="fadeIn mobile-pad" style={widePageStyle}>
      <div className="page-header" style={{display:"grid",gridTemplateColumns:"1fr auto",alignItems:"start",gap:16,marginBottom:24}}>
        <div style={{justifySelf:"start",textAlign:"left"}}>
          <h2 style={{...pageTitleStyle,fontSize:52}}>Tasks</h2>
          <p style={{color:C.muted,fontSize:13,marginTop:4}}>
            {boardTasks.filter(t=>t.status!=="done").length} open tasks across the church team
          </p>
          <p style={{color:C.gold,fontSize:12,marginTop:6}}>
            {boardTasks.filter((task) => task.status !== "done" && isTaskForUser(task, profile?.full_name)).length} open items involve you
          </p>
        </div>
        {canCreateTasks && <button className="btn-gold page-actions" onClick={openNew}><Icons.plus/>New Task</button>}
      </div>
      <div className="task-toolbar" style={{display:"flex",gap:10,marginBottom:22,flexWrap:"wrap"}}>
        <div className="task-filter-group" style={{display:"flex",background:C.surface,borderRadius:10,padding:3,border:`1px solid ${C.border}`,gap:2}}>
          {[
            { id: "mine", label: "My Tasks" },
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
        <div className="task-filter-group" style={{display:"flex",flexWrap:"wrap",background:C.surface,borderRadius:10,padding:3,border:`1px solid ${C.border}`,gap:2,maxWidth:"100%"}}>
          {["All", ...SORTED_TASK_CATEGORIES].map(m=>(
            <button key={m} onClick={()=>setMFilter(m)} style={{padding:"6px 10px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:500,background:mFilter===m?C.card:"transparent",color:mFilter===m?C.text:C.muted}}>{m}</button>
          ))}
        </div>
      </div>
      {taskFormError && !showModal && !selectedTask && (
        <div style={{fontSize:12,color:C.danger,textAlign:"left",marginBottom:14}}>
          {taskFormError}
        </div>
      )}
      {showModal && (
        <div className="card" style={{padding:22,textAlign:"left",display:"grid",gap:18,marginBottom:18}}>
          <div>
            <button className="btn-outline" onClick={closeTaskForm} style={{marginBottom:14}}>Back to Tasks</button>
            <h3 style={sectionTitleStyle}>{editing?"Edit Task":"New Task"}</h3>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <label style={{fontSize:12,color:C.muted,textAlign:"left"}}>Task Title</label>
              <input className="input-field" placeholder="Task title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/>
            </div>
            <div className="task-form-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
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
                <>
                  <div className="mobile-two-stack" style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10,padding:14,border:`1px solid ${C.border}`,borderRadius:12,background:C.surface}}>
                    {teamNames.map((name) => {
                      const assignedName = canAssignToAnyone ? form.assignee : profile?.full_name;
                      const isAssignedPerson = samePerson(name, assignedName);
                      return (
                    <label key={name} style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:isAssignedPerson ? C.muted : C.text,opacity:isAssignedPerson ? 0.72 : 1}}>
                      <input type="checkbox" checked={listIncludesPerson(form.reviewers || [], name)} onChange={()=>toggleReviewer(name)} disabled={isAssignedPerson} />
                      {name}
                      {isAssignedPerson && <span style={{fontSize:11,color:C.muted}}>(Assigned)</span>}
                    </label>
                      );
                    })}
                  </div>
                  <div style={{fontSize:11,color:C.muted,textAlign:"left"}}>
                    The assigned person cannot review their own task, but every staff member is shown here for visibility.
                  </div>
                </>
              )}
            </div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <label style={{fontSize:12,color:C.muted,textAlign:"left"}}>Notes</label>
              <textarea className="input-field" placeholder="Notes (optional)" rows={3} value={form.notes||""} onChange={e=>setForm({...form,notes:e.target.value})} style={{resize:"vertical"}}/>
            </div>
          </div>
          {taskFormError && <div style={{fontSize:12,color:C.danger,textAlign:"left"}}>{taskFormError}</div>}
          <div style={{display:"flex",gap:10,justifyContent:"flex-end",flexWrap:"wrap"}}>
            <button className="btn-outline" onClick={closeTaskForm}>Cancel</button>
            <button className="btn-gold" onClick={save}>Save Task</button>
          </div>
        </div>
      )}
      {selectedTask && !showModal && (
        <div className="card" style={{padding:22,textAlign:"left",display:"grid",gap:16,marginBottom:18}}>
          <div style={{display:"grid",gap:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"nowrap"}}>
              <button className="btn-outline" onClick={()=>setSelectedTask(null)}>Back to Tasks</button>
              <div style={{display:"flex",gap:10,justifyContent:"flex-end",flexShrink:0}}>
                {canEditTask(profile, church, selectedTask) ? (
                  <select className="input-field" value={selectedTask.status} onChange={(e)=>setTaskStatus(selectedTask, e.target.value)} style={{width:150,maxWidth:"100%",background:C.card,padding:"8px 10px",fontSize:12}}>
                    <option value="todo">Not Started</option>
                    <option value="in-progress">In Progress</option>
                    <option value="in-review">In Review</option>
                    <option value="done" disabled={selectedTask.review_required && selectedTask.reviewers.some((name) => !listIncludesPerson(selectedTask.review_approvals, name))}>Done</option>
                  </select>
                ) : null}
              </div>
            </div>
            <div style={{minWidth:0}}>
              <h3 style={{...sectionTitleStyle,textAlign:"left"}}>{selectedTask.title}</h3>
            </div>
          </div>
          <div style={{display:"grid",gap:16,textAlign:"left"}}>
            <div className="request-details-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div>
                <div style={{fontSize:12,color:C.muted}}>Assigned To</div>
                <div style={{fontSize:13,color:C.text,marginTop:4}}>{selectedTask.assignee}</div>
              </div>
              <div>
                <div style={{fontSize:12,color:C.muted}}>Status</div>
                <div style={{fontSize:13,color:C.text,marginTop:4}}>{STATUS_STYLES[selectedTask.status]?.label || "Not Started"}</div>
              </div>
              <div>
                <div style={{fontSize:12,color:C.muted}}>Ministry</div>
                <div style={{fontSize:13,color:C.text,marginTop:4}}>{selectedTask.ministry}</div>
              </div>
              <div>
                <div style={{fontSize:12,color:C.muted}}>Due Date</div>
                <div style={{fontSize:13,color:C.text,marginTop:4}}>{fmtDate(selectedTask.due_date)}</div>
              </div>
            </div>
            <div>
              <div style={{fontSize:12,color:C.muted}}>Task Details</div>
              <div style={{fontSize:13,color:C.text,marginTop:4,lineHeight:1.6}}>
                {eventPlanName ? (
                  <div>
                    Linked from event plan: <strong>{eventPlanName}</strong>
                  </div>
                ) : (
                  taskNotesBody || "No additional notes yet."
                )}
              </div>
            </div>
            <div>
              <div style={{fontSize:12,color:C.muted}}>Review Workflow</div>
              {selectedTask.review_required ? (
                <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:8}}>
                  {selectedTask.reviewers.map((reviewer) => {
                    const decision = getTaskReviewerDecision(selectedTask, reviewer);
                    const isCurrentReviewer = samePerson(reviewer, profile?.full_name);
                    const reviewerCanRespond = isCurrentReviewer && canApproveTaskReview(profile, selectedTask);
                    const decisionLabel = decision?.action === "approved"
                      ? "Approved"
                      : decision?.action === "denied"
                        ? "Denied"
                        : "Pending";
                    const decisionTone = decision?.action === "approved"
                      ? C.success
                      : decision?.action === "denied"
                        ? C.danger
                        : C.muted;
                    return (
                      <div key={reviewer} style={{display:"flex",flexDirection:"column",gap:8,padding:"10px 12px",border:`1px solid ${C.border}`,borderRadius:10,background:C.surface}}>
                        <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start"}}>
                          <div>
                            <div style={{fontSize:13,color:C.text}}>{reviewer}</div>
                            {decision?.created_at && (
                              <div style={{fontSize:11,color:C.muted,marginTop:3}}>
                                {new Date(decision.created_at).toLocaleString("en-US", { month:"short", day:"numeric", hour:"numeric", minute:"2-digit" })}
                              </div>
                            )}
                            {isCurrentReviewer && !decision && (
                              <div style={{fontSize:11,color:C.gold,marginTop:3}}>Awaiting your review</div>
                            )}
                          </div>
                          <div style={{fontSize:12,color:decisionTone,fontWeight:600}}>{decisionLabel}</div>
                        </div>
                        {reviewerCanRespond && (
                          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                            <button className="btn-outline" onClick={()=>updateTaskReviewStatus(selectedTask, "approved")} style={{padding:"7px 10px",color:C.success,borderColor:"rgba(82,200,122,.35)"}}>
                              Approve
                            </button>
                            <button className="btn-outline" onClick={()=>updateTaskReviewStatus(selectedTask, "denied")} style={{padding:"7px 10px",color:C.danger,borderColor:"rgba(224,82,82,.35)"}}>
                              Deny
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{fontSize:13,color:C.muted,marginTop:6}}>This task does not require review.</div>
              )}
            </div>
            <div style={{display:"grid",gap:10,paddingTop:16,borderTop:`1px solid ${C.border}`}}>
              <div className="section-header" style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
                <div style={{textAlign:"left"}}>
                  <div style={{fontSize:18,fontWeight:600,color:C.text,lineHeight:1.3}}>Team Discussion</div>
                  <div style={{fontSize:12,color:C.muted,marginTop:4,lineHeight:1.6}}>Everyone who can view this task can read and join the conversation here.</div>
                </div>
                <button className="btn-outline" onClick={() => setTaskCommentsOpen((current) => !current)} style={{padding:"5px 10px",fontSize:12}}>
                  {taskCommentsOpen ? "Collapse" : "Expand"}
                </button>
              </div>
              {taskCommentsOpen ? (
              <div style={{display:"flex",flexDirection:"column",gap:10,marginTop:2}}>
                {(selectedTask.comments || []).slice().sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)).length > 0 ? (selectedTask.comments || []).slice().sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)).map((comment) => (
                  <div
                    key={comment.id}
                    ref={(node) => {
                      if (node) taskCommentRefs.current[comment.id] = node;
                      else delete taskCommentRefs.current[comment.id];
                    }}
                    style={{
                      padding:"10px 12px",
                      border:`1px solid ${highlightedTaskCommentId === comment.id ? C.goldDim : C.border}`,
                      borderRadius:10,
                      background:highlightedTaskCommentId === comment.id ? C.goldGlow : C.surface,
                      boxShadow: highlightedTaskCommentId === comment.id ? "0 0 0 1px rgba(201,168,76,.25)" : "none",
                    }}
                  >
                    <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start"}}>
                      <div style={{fontSize:12,color:C.text,fontWeight:600}}>{comment.author}</div>
                      <div style={{fontSize:11,color:C.muted,textAlign:"right"}}>
                        {new Date(comment.updated_at || comment.created_at).toLocaleString("en-US", { month:"short", day:"numeric", hour:"numeric", minute:"2-digit" })}
                        {comment.updated_at && <div>Edited</div>}
                      </div>
                    </div>
                    {editingCommentId === comment.id ? (
                      <div style={{display:"grid",gap:10,marginTop:8}}>
                        <textarea
                          className="input-field"
                          rows={3}
                          value={editingCommentDraft}
                          onChange={(e)=>setEditingCommentDraft(e.target.value)}
                          style={{resize:"vertical"}}
                        />
                        <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
                          <button className="btn-outline" onClick={cancelEditComment} style={{padding:"6px 10px",fontSize:12}}>Cancel</button>
                          <button className="btn-gold" onClick={() => saveEditedComment(comment)} style={{padding:"6px 12px",fontSize:12}}>Save</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{fontSize:13,color:C.text,marginTop:6,lineHeight:1.8}}>{renderCommentBody(comment.body, teamNames)}</div>
                    )}
                    {canManageComment(comment, profile) && editingCommentId !== comment.id && (
                      <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:10}}>
                        <button className="btn-outline" onClick={() => beginEditComment(comment)} style={{padding:"6px 10px",fontSize:12}}>Edit</button>
                        <button
                          className="btn-outline"
                          onClick={() => deleteTaskComment(comment)}
                          style={{display:"flex",alignItems:"center",justifyContent:"center",padding:8,fontSize:12,borderColor:"rgba(224,82,82,.35)",color:C.danger}}
                          aria-label="Delete comment"
                          title="Delete comment"
                        >
                          <Icons.trash />
                        </button>
                      </div>
                    )}
                  </div>
                )) : (
                  <div style={{fontSize:13,color:C.muted}}>No comments yet.</div>
                )}
                <div style={{position:"relative"}}>
                  <textarea
                    ref={commentInputRef}
                    className="input-field"
                    rows={3}
                    placeholder="Leave a comment or revision note..."
                    value={commentDraft}
                    onChange={(e)=>{setCommentDraft(e.target.value); setCommentCursor(e.target.selectionStart);}}
                    onKeyUp={(e)=>setCommentCursor(e.currentTarget.selectionStart)}
                    onClick={(e)=>setCommentCursor(e.currentTarget.selectionStart)}
                    style={{resize:"vertical"}}
                  />
                  {mentionSuggestions.length > 0 && (
                    <div style={{position:"absolute",left:0,right:0,top:"calc(100% + 6px)",border:`1px solid ${C.border}`,borderRadius:12,background:C.card,boxShadow:"0 12px 28px rgba(0,0,0,.28)",zIndex:20,overflow:"hidden"}}>
                      {mentionSuggestions.map((entry) => (
                        <button
                          key={entry.fullName}
                          type="button"
                          onClick={() => insertMention(entry.fullName)}
                          style={{display:"block",width:"100%",padding:"10px 12px",textAlign:"left",background:"transparent",border:"none",borderBottom:`1px solid ${C.border}`,cursor:"pointer",color:C.text,fontSize:13}}
                        >
                          @{entry.token}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{fontSize:11,color:C.muted,textAlign:"left"}}>Use `@FirstLast` to notify someone in this task.</div>
                {taskCommentError && <div style={{fontSize:12,color:C.danger,textAlign:"left"}}>{taskCommentError}</div>}
                <button className="btn-gold" onClick={addComment} style={{alignSelf:"flex-end"}}>Add Comment</button>
              </div>
              ) : (
                <div style={{fontSize:13,color:C.muted,textAlign:"left"}}>Discussion collapsed. Expand it when you want to catch up or reply.</div>
              )}
            </div>
          </div>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end",flexWrap:"wrap"}}>
            {canEditTask(profile, church, selectedTask) && (
              <button className="btn-outline" onClick={()=>openEdit(selectedTask)}>Edit Task</button>
            )}
            {canEditTask(profile, church, selectedTask) && (
              <button
                className="btn-outline"
                onClick={()=>{del(selectedTask.id); setSelectedTask(null);}}
                style={{display:"flex",alignItems:"center",justifyContent:"center",padding:10,color:C.danger,borderColor:"rgba(224,82,82,.35)"}}
                aria-label="Delete task"
                title="Delete task"
              >
                <Icons.trash />
              </button>
            )}
          </div>
        </div>
      )}
      {!showModal && !selectedTask && (
      <div style={{display:"grid",gridTemplateColumns:"1fr",gap:16,alignItems:"start"}}>
        {["todo","in-progress","in-review","done"].map((statusKey) => (
          <div
            key={statusKey}
            className="card"
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              setDragOverStatus(statusKey);
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setDragOverStatus("");
            }}
            onDrop={(event) => handleTaskDrop(event, statusKey)}
            style={{
              padding:16,
              minHeight:collapsedColumns?.[statusKey] ? "auto" : 420,
              borderTop:`3px solid ${STATUS_STYLES[statusKey].accent}`,
              background:dragOverStatus === statusKey
                ? `linear-gradient(180deg, ${STATUS_STYLES[statusKey].surface} 0%, rgba(192,161,72,.14) 100%)`
                : `linear-gradient(180deg, ${STATUS_STYLES[statusKey].surface} 0%, ${C.card} 24%)`,
              boxShadow:dragOverStatus === statusKey ? `0 0 0 1px ${STATUS_STYLES[statusKey].accent}` : undefined,
              transition:"background .16s ease, box-shadow .16s ease",
            }}
          >
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:collapsedColumns?.[statusKey] ? 0 : 14,paddingBottom:12,borderBottom:`1px solid ${C.border}`}}>
              <div>
                <div style={{fontSize:15,fontWeight:600,color:STATUS_STYLES[statusKey].accent}}>{STATUS_STYLES[statusKey].label}</div>
                <div style={{fontSize:11,color:C.muted,marginTop:2}}>{groupedTasks[statusKey].length} tasks</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:10,height:10,borderRadius:"50%",background:STATUS_STYLES[statusKey].accent,flexShrink:0}} />
                <button className="btn-outline" onClick={() => toggleColumn(statusKey)} style={{padding:"5px 10px",fontSize:12}}>
                  {collapsedColumns?.[statusKey] ? "Expand" : "Collapse"}
                </button>
              </div>
            </div>
            {!collapsedColumns?.[statusKey] && (
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {groupedTasks[statusKey].map((task) => (
                <button
                  key={task.id}
                  draggable
                  onDragStart={(event) => handleTaskDragStart(event, task)}
                  onDragEnd={() => { setDraggingTaskId(null); setDragOverStatus(""); }}
                  onClick={() => openTask(task)}
                  title="Drag this task to another status column, or open it to use the status dropdown."
                  style={{
                    padding:16,
                    border:`1px solid ${draggingTaskId === task.id ? STATUS_STYLES[statusKey].accent : C.border}`,
                    borderRadius:12,
                    background:C.surface,
                    textAlign:"left",
                    cursor:"grab",
                    display:"grid",
                    gridTemplateColumns:"1fr auto",
                    gap:16,
                    alignItems:"start",
                    opacity:draggingTaskId === task.id ? 0.68 : 1,
                    transform:draggingTaskId === task.id ? "scale(.99)" : "none",
                    transition:"opacity .16s ease, transform .16s ease, border-color .16s ease",
                  }}
                >
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    <div style={{fontSize:20,fontWeight:600,color:task.status==="done"?C.muted:C.text,textDecoration:task.status==="done"?"line-through":"none"}}>{task.title}</div>
                    <div style={{fontSize:11,color:C.muted}}>Assigned to {task.assignee}</div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6,textAlign:"right"}}>
                    <div style={{fontSize:11,color:C.muted}}>Due {fmtDate(task.due_date)}</div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"flex-end"}}>
                      {task.review_required && (
                        <span className="badge" style={{background:C.goldGlow,color:C.gold,border:`1px solid ${C.goldDim}`}}>
                          Review {task.review_approvals.length}/{task.reviewers.length}
                        </span>
                      )}
                      <span className={`badge ${getTag(task.ministry)}`}>{task.ministry}</span>
                    </div>
                  </div>
                </button>
              ))}
              {groupedTasks[statusKey].length===0 && <div style={{padding:"28px 12px",textAlign:"center",color:C.muted,fontSize:13,border:`1px dashed ${C.border}`,borderRadius:12}}>No tasks in {STATUS_STYLES[statusKey].label.toLowerCase()}.</div>}
            </div>
            )}
          </div>
        ))}
      </div>
      )}
    </div>
  );
}

// ── Budget ─────────────────────────────────────────────────────────────────
function Budget({ transactions, setTransactions, purchaseOrders, setPurchaseOrders, churchId, profile, setProfile, ministries, setMinistries, previewUsers, setPreviewUsers, recordActivity }) {
  const isPreview = churchId === "preview";
  const financeView = isFinanceUser(profile);
  const visibleMinistries = getBudgetScopeMinistries(profile);
  const canEditBudget = canViewBudget(profile);
  const defaultMinistry = visibleMinistries[0] || "Admin";
  const [showModal, setShowModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showPurchaseOrderModal, setShowPurchaseOrderModal] = useState(false);
  const [budgetError, setBudgetError] = useState("");
  const [budgetSubmitting, setBudgetSubmitting] = useState(false);
  const [transactionError, setTransactionError] = useState("");
  const [transactionSubmitting, setTransactionSubmitting] = useState(false);
  const [purchaseOrderError, setPurchaseOrderError] = useState("");
  const [purchaseOrderSubmitting, setPurchaseOrderSubmitting] = useState(false);
  const [purchaseOrderCommentDrafts, setPurchaseOrderCommentDrafts] = useState({});
  const [purchaseOrderCommentCursor, setPurchaseOrderCommentCursor] = useState({});
  const [editingPurchaseOrderComments, setEditingPurchaseOrderComments] = useState({});
  const purchaseOrderCommentInputRef = useRef(null);
  const [purchaseOrderDiscussionOpen, setPurchaseOrderDiscussionOpen] = useState(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(window.localStorage.getItem(getPurchaseOrderDiscussionStateStorageKey(profile?.id)) || "{}");
    } catch {
      return {};
    }
  });
  const [selectedLedgerMinistry, setSelectedLedgerMinistry] = useState(defaultMinistry);
  const [form, setForm] = useState({description:"",amount:"",ministry:defaultMinistry,category:"",date:new Date().toISOString().split("T")[0],type:"expense"});
  const [budgetForm, setBudgetForm] = useState({ id: null, ministry: defaultMinistry, budget: "", assignedStaffId: "", items: [{ label: "", amount: "" }] });
  const [purchaseOrderForm, setPurchaseOrderForm] = useState({
    title: "",
    amount: "",
    ministry: defaultMinistry,
    budgetLineItem: "",
    neededBy: "",
    purchaseLink: "",
    includedInBudget: "yes",
    notes: "",
  });
  const budgetDraftKey = getFormDraftStorageKey(profile?.id, "new-budget");
  const purchaseOrderDraftKey = getFormDraftStorageKey(profile?.id, "new-purchase-order");
  const ledgerMinistryNames = [...new Set([
    ...((ministries || []).map((entry) => entry.name).filter(Boolean)),
    ...(financeView ? [] : visibleMinistries),
  ])].sort((left, right) => left.localeCompare(right));
  const activeLedgerMinistry = selectedLedgerMinistry || defaultMinistry;
  const selectedMinistryRecord = (ministries || []).find((entry) => entry.name === activeLedgerMinistry);
  const selectedMinistryBudgetItems = normalizeBudgetItems(selectedMinistryRecord?.budget_items);
  const purchaseOrderMinistryOptions = [...new Set([
    ...(financeView ? ledgerMinistryNames : visibleMinistries),
    purchaseOrderForm.ministry,
  ].filter(Boolean))].sort((left, right) => left.localeCompare(right));
  const selectedPurchaseOrderMinistryRecord = (ministries || []).find((entry) => entry.name === purchaseOrderForm.ministry);
  const selectedPurchaseOrderBudgetItems = normalizeBudgetItems(selectedPurchaseOrderMinistryRecord?.budget_items);
  const mentionableNames = [...new Set((previewUsers || []).map((user) => user.full_name).filter(Boolean))];
  const mentionableStaff = mentionableNames.map((name) => ({ fullName: name, token: getStaffMentionToken(name) })).filter((entry) => entry.token);
  const activePurchaseOrderCommentId = Object.keys(purchaseOrderCommentCursor).find((id) => typeof purchaseOrderCommentCursor[id] === "number") || "";
  const activePurchaseOrderCommentDraft = activePurchaseOrderCommentId ? (purchaseOrderCommentDrafts[activePurchaseOrderCommentId] || "") : "";
  const activePurchaseOrderCommentSelection = activePurchaseOrderCommentId ? (purchaseOrderCommentCursor[activePurchaseOrderCommentId] || 0) : 0;
  const purchaseOrderMentionContext = getMentionContext(activePurchaseOrderCommentDraft, activePurchaseOrderCommentSelection);
  const purchaseOrderMentionSuggestions = purchaseOrderMentionContext
    ? mentionableStaff.filter((entry) => entry.token.toLowerCase().includes(purchaseOrderMentionContext.query.trim().toLowerCase()) && !samePerson(entry.fullName, profile?.full_name)).slice(0, 5)
    : [];

  const canManageBudgetLinesForMinistry = (ministry) => financeView || visibleMinistries.includes(ministry);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(getPurchaseOrderDiscussionStateStorageKey(profile?.id), JSON.stringify(purchaseOrderDiscussionOpen));
  }, [profile?.id, purchaseOrderDiscussionOpen]);

  const resetTransactionForm = (ministry = defaultMinistry, type = "expense") => ({
    description: "",
    amount: "",
    ministry,
    category: "",
    date: new Date().toISOString().split("T")[0],
    type,
  });
  const openTransactionModal = (ministry = defaultMinistry, type = "expense") => {
    setSelectedLedgerMinistry(ministry);
    setTransactionError("");
    setTransactionSubmitting(false);
    setForm(resetTransactionForm(ministry, type));
    setShowModal(true);
  };
  const openBudgetModal = (ministry = "") => {
    setBudgetError("");
    const existingMinistry = (ministries || []).find((entry) => entry.name === ministry) || null;
    const assignedUser = (previewUsers || []).find((user) => (user.ministries || []).includes(ministry));
    const normalizedItems = normalizeBudgetItems(existingMinistry?.budget_items);
    const nextBudgetForm = {
      id: existingMinistry?.id || null,
      ministry: ministry || "",
      budget: existingMinistry?.budget !== undefined && existingMinistry?.budget !== null ? String(existingMinistry.budget) : "",
      assignedStaffId: assignedUser?.id || "",
      items: normalizedItems.length > 0 ? normalizedItems.map((item) => ({ label: item.label, amount: String(item.amount) })) : [{ label: "", amount: "" }],
    };
    setBudgetForm(existingMinistry ? nextBudgetForm : readStoredFormDraft(budgetDraftKey, nextBudgetForm));
    setShowBudgetModal(true);
  };
  const openPurchaseOrderModal = (ministry = defaultMinistry) => {
    setSelectedLedgerMinistry(ministry);
    setPurchaseOrderError("");
    const nextPurchaseOrderForm = {
      title: "",
      amount: "",
      ministry,
      budgetLineItem: "",
      neededBy: "",
      purchaseLink: "",
      includedInBudget: "yes",
      notes: "",
    };
    setPurchaseOrderForm(readStoredFormDraft(purchaseOrderDraftKey, nextPurchaseOrderForm));
    setShowPurchaseOrderModal(true);
  };
  const closeBudgetModal = () => {
    if (!budgetForm.id) clearStoredFormDraft(budgetDraftKey);
    setBudgetError("");
    setBudgetSubmitting(false);
    setShowBudgetModal(false);
  };
  const closePurchaseOrderModal = () => {
    clearStoredFormDraft(purchaseOrderDraftKey);
    setShowPurchaseOrderModal(false);
  };

  useEffect(() => {
    if (showBudgetModal || showPurchaseOrderModal || showModal) return undefined;
    const restoredBudget = readStoredFormDraft(budgetDraftKey, null);
    if (restoredBudget && hasMeaningfulFormDraft(restoredBudget, ["id", "ministry", "items"])) {
      const timer = window.setTimeout(() => {
        setBudgetForm(restoredBudget);
        setShowBudgetModal(true);
      }, 0);
      return () => window.clearTimeout(timer);
    }
    const restoredPurchaseOrder = readStoredFormDraft(purchaseOrderDraftKey, null);
    if (restoredPurchaseOrder && hasMeaningfulFormDraft(restoredPurchaseOrder, ["ministry", "includedInBudget"])) {
      const timer = window.setTimeout(() => {
        setPurchaseOrderForm(restoredPurchaseOrder);
        setSelectedLedgerMinistry(restoredPurchaseOrder.ministry || defaultMinistry);
        setShowPurchaseOrderModal(true);
      }, 0);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [budgetDraftKey, purchaseOrderDraftKey, showBudgetModal, showPurchaseOrderModal, showModal, defaultMinistry]);

  useEffect(() => {
    if (!showBudgetModal || budgetForm.id) return;
    if (!hasMeaningfulFormDraft(budgetForm, ["id", "ministry", "items"])) return;
    writeStoredFormDraft(budgetDraftKey, budgetForm);
  }, [showBudgetModal, budgetForm, budgetDraftKey]);

  useEffect(() => {
    if (!showPurchaseOrderModal) return;
    if (!hasMeaningfulFormDraft(purchaseOrderForm, ["ministry", "includedInBudget"])) return;
    writeStoredFormDraft(purchaseOrderDraftKey, purchaseOrderForm);
  }, [showPurchaseOrderModal, purchaseOrderForm, purchaseOrderDraftKey]);

  if (!canViewBudget(profile)) {
    return (
      <div className="fadeIn mobile-pad" style={widePageStyle}>
        <div style={{marginBottom:24}}>
          <h2 style={{...pageTitleStyle,textAlign:"left"}}>Finances</h2>
          <p style={{color:C.muted,fontSize:13,marginTop:4}}>Budget visibility is limited to Finance and ministry leaders.</p>
        </div>
        <div className="card" style={{padding:24}}>
          <p style={{color:C.muted,fontSize:14,lineHeight:1.6}}>
            Your account does not currently have a ministry ledger assigned. Once a ministry is attached to your profile, Shepherd will show you that ministry's budget and transactions here.
          </p>
        </div>
      </div>
    );
  }

  const budgetScopedTransactions = financeView
    ? transactions.filter((transaction) => ledgerMinistryNames.includes(transaction.ministry))
    : transactions.filter((transaction) => visibleMinistries.includes(transaction.ministry));
  const visiblePurchaseOrders = financeView
    ? (purchaseOrders || [])
    : (purchaseOrders || []).filter((order) => order.requester_id === profile?.id || samePerson(order.requested_by, profile?.full_name));
  const visiblePurchaseOrdersByMinistry = visiblePurchaseOrders.reduce((accumulator, order) => {
    const ministryKey = order.ministry || "Admin";
    accumulator[ministryKey] = [...(accumulator[ministryKey] || []), order];
    return accumulator;
  }, {});

  const ministrySummaries = (financeView ? ledgerMinistryNames : visibleMinistries)
    .map((ministry) => {
      const budgetRow = (ministries || []).find((entry) => entry.name === ministry);
      const ministryTransactions = budgetScopedTransactions.filter((transaction) => transaction.ministry === ministry);
      const spent = ministryTransactions
        .filter((transaction) => transaction.amount < 0)
        .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
      const income = ministryTransactions
        .filter((transaction) => transaction.amount > 0)
        .reduce((sum, transaction) => sum + transaction.amount, 0);
      const budgetAmount = Number(budgetRow?.budget || 0);
      return {
        ministry,
        budget: budgetAmount,
        spent,
        income,
        remaining: budgetAmount - spent,
        transactions: ministryTransactions.length,
        purchaseOrders: (visiblePurchaseOrdersByMinistry[ministry] || []).length,
      };
    })
    .filter((summary) => financeView || summary.transactions > 0 || summary.budget > 0);

  const categorySuggestions = [...new Set(
    budgetScopedTransactions
      .filter((transaction) => transaction.ministry === activeLedgerMinistry)
      .map((transaction) => transaction.category)
      .filter(Boolean)
  )];
  const ministryLineItemSuggestions = selectedMinistryBudgetItems.map((item) => item.label);
  const purchaseOrderLineItemSuggestions = selectedPurchaseOrderBudgetItems.map((item) => item.label);

  const save = async () => {
    if (!form.description||!form.amount||!form.category||!form.ministry) {
      setTransactionError("Please complete the transaction description, amount, ministry, and line item.");
      return;
    }
    const parsedAmount = Number.parseFloat(form.amount || "0");
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setTransactionError("Enter a valid transaction amount.");
      return;
    }
    const amt = parsedAmount * (form.type==="expense"?-1:1);
    setTransactionError("");
    setTransactionSubmitting(true);
    if (isPreview) {
      setTransactions([{ ...form, id: `txn-${Date.now()}`, amount: amt, church_id: churchId }, ...transactions]);
      setTransactionSubmitting(false);
      setShowModal(false);
      setForm(resetTransactionForm(defaultMinistry));
      return;
    }
    const { data, error } = await supabase.from("transactions").insert({description:form.description,amount:amt,ministry:form.ministry,category:form.category,date:form.date,church_id:churchId}).select().single();
    setTransactionSubmitting(false);
    if (error) {
      setTransactionError(error.message || "This transaction could not be saved yet.");
      return;
    }
    setTransactions([data,...transactions]);
    await recordActivity?.({
      action: "created",
      entityType: "transaction",
      entityId: data.id,
      entityTitle: data.description,
      summary: `${profile?.full_name || "A staff member"} logged ${form.type === "expense" ? "an expense" : "income"} for ${form.ministry}: ${data.description}.`,
      metadata: { ministry: data.ministry, amount: data.amount },
    });
    setShowModal(false);
    setForm(resetTransactionForm(defaultMinistry));
  };

  const saveBudget = async () => {
    const trimmedMinistry = budgetForm.ministry.trim();
    if (!financeView) {
      setBudgetError("Only the Finance Director can create or rename ministry budgets.");
      return;
    }
    if (!trimmedMinistry) {
      setBudgetError("Enter a ministry name before saving this budget.");
      return;
    }
    const normalizedItems = normalizeBudgetItems((budgetForm.items || []).map((item) => ({
      label: item.label,
      amount: item.amount,
    })));
    const nextBudget = normalizedItems.length > 0
      ? normalizedItems.reduce((sum, item) => sum + item.amount, 0)
      : (Number.parseFloat(budgetForm.budget || "0") || 0);
    if (Number.isNaN(nextBudget)) {
      setBudgetError("Enter a valid budget amount before saving.");
      return;
    }
    setBudgetError("");
    setBudgetSubmitting(true);
    const previousName = (ministries || []).find((entry) => entry.id === budgetForm.id)?.name || trimmedMinistry;
    const payload = {
      church_id: churchId,
      name: trimmedMinistry,
      color: CATEGORY_STYLES[trimmedMinistry]?.color || C.gold,
      budget: nextBudget,
      spent: 0,
      budget_categories: [...new Set(normalizedItems.map((item) => item.label))],
      budget_items: normalizedItems,
    };
    if (isPreview) {
      setMinistries?.((current) => {
        const others = (current || []).filter((entry) => entry.id !== budgetForm.id && entry.name !== previousName);
        return [...others, { ...payload, id: budgetForm.id || `ministry-${trimmedMinistry}` }].sort((left, right) => left.name.localeCompare(right.name));
      });
      if (!budgetForm.id) clearStoredFormDraft(budgetDraftKey);
      setBudgetSubmitting(false);
      setShowBudgetModal(false);
      return;
    }
    try {
      const ministryQuery = budgetForm.id
        ? supabase.from("ministries").update(payload).eq("id", budgetForm.id)
        : supabase.from("ministries").upsert(payload, { onConflict: "church_id,name" });
      const { data, error } = await ministryQuery.select().single();
      if (error) throw error;
      if (previousName !== trimmedMinistry) {
        const matchingTransactions = transactions.filter((transaction) => transaction.ministry === previousName);
        if (matchingTransactions.length > 0) {
          const { error: transactionError } = await supabase.from("transactions").update({ ministry: trimmedMinistry }).eq("church_id", churchId).eq("ministry", previousName);
          if (transactionError) throw transactionError;
          setTransactions((current) => current.map((transaction) => transaction.ministry === previousName ? { ...transaction, ministry: trimmedMinistry } : transaction));
        }
      }
      const updatedStaff = await Promise.all((previewUsers || []).map(async (user) => {
        const existingMinistries = Array.isArray(user.ministries) ? user.ministries : [];
        const strippedMinistries = existingMinistries.filter((ministry) => ministry !== previousName && ministry !== trimmedMinistry);
        const nextMinistries = user.id === budgetForm.assignedStaffId ? [...strippedMinistries, trimmedMinistry] : strippedMinistries;
        if (JSON.stringify(existingMinistries) === JSON.stringify(nextMinistries)) return user;
        if (!isPreview) {
          const { error: staffError } = await supabase.from("church_staff").update({ ministries: nextMinistries }).eq("id", user.id);
          if (staffError) throw staffError;
          const { error: profileError } = await supabase.from("profiles").update({ ministries: nextMinistries }).eq("staff_id", user.id);
          if (profileError) throw profileError;
          if (user.auth_user_id) {
            const { error: upsertProfileError } = await supabase.from("profiles").upsert({
              id: user.auth_user_id,
              church_id: churchId,
              staff_id: user.id,
              full_name: user.full_name,
              role: user.role,
              title: user.title,
              email: user.email || null,
              photo_url: user.photo_url || null,
              staff_roles: Array.isArray(user.staff_roles) ? user.staff_roles : (user.role ? [user.role] : []),
              ministries: nextMinistries,
              can_see_team_overview: user.can_see_team_overview ?? user.canSeeTeamOverview ?? false,
              can_see_admin_overview: user.can_see_admin_overview ?? user.canSeeAdminOverview ?? false,
              read_only_oversight: user.read_only_oversight ?? user.readOnlyOversight ?? false,
            });
            if (upsertProfileError) throw upsertProfileError;
          }
        }
        return normalizeAccessUser({ ...user, ministries: nextMinistries });
      }));
      setPreviewUsers?.(updatedStaff.sort((left, right) => left.full_name.localeCompare(right.full_name)));
      if (profile?.staff_id) {
        const refreshedProfile = updatedStaff.find((user) => user.id === profile.staff_id);
        if (refreshedProfile) {
          setProfile?.((current) => current ? { ...current, ministries: refreshedProfile.ministries } : current);
        }
      }
      setMinistries?.((current) => {
        const others = (current || []).filter((entry) => entry.id !== data.id && entry.name !== data.name);
        return [...others, data].sort((left, right) => left.name.localeCompare(right.name));
      });
      await recordActivity?.({
        action: budgetForm.id ? "updated" : "created",
        entityType: "budget",
        entityId: data.id,
        entityTitle: data.name,
        summary: `${profile?.full_name || "A staff member"} ${budgetForm.id ? "updated" : "created"} the ${data.name} budget.`,
        metadata: { ministry: data.name, budget: data.budget },
      });
      if (!budgetForm.id) clearStoredFormDraft(budgetDraftKey);
      setShowBudgetModal(false);
    } catch (error) {
      setBudgetError(error?.message || "This budget could not be saved yet.");
    } finally {
      setBudgetSubmitting(false);
    }
  };
  const savePurchaseOrder = async () => {
    if (!purchaseOrderForm.title || !purchaseOrderForm.amount || !purchaseOrderForm.ministry) {
      setPurchaseOrderError("Please complete the required purchase order fields.");
      return;
    }
    if (purchaseOrderForm.includedInBudget === "yes" && !purchaseOrderForm.budgetLineItem) {
      setPurchaseOrderError("Choose a budget line item when this request was included in the yearly budget proposal.");
      return;
    }
    const parsedAmount = Number.parseFloat(purchaseOrderForm.amount || "0");
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setPurchaseOrderError("Enter a valid dollar amount for this purchase order.");
      return;
    }
    const normalizedPurchaseLink = normalizeExternalUrl(purchaseOrderForm.purchaseLink);
    setPurchaseOrderError("");
    setPurchaseOrderSubmitting(true);
    const requiredApprovers = [...new Set(
      (previewUsers || [])
        .filter((user) => isFinanceDirector(user) || isSeniorPastor(user))
        .map((user) => user.full_name)
        .filter(Boolean)
    )];
    const payload = {
      church_id: churchId,
      ministry: purchaseOrderForm.ministry,
      budget_line_item: purchaseOrderForm.includedInBudget === "yes" ? purchaseOrderForm.budgetLineItem : "",
      title: purchaseOrderForm.title,
      amount: parsedAmount,
      needed_by: purchaseOrderForm.neededBy || null,
      purchase_link: normalizedPurchaseLink || null,
      included_in_budget: purchaseOrderForm.includedInBudget === "yes",
      notes: purchaseOrderForm.notes || null,
      status: requiredApprovers.length > 0 ? "in-review" : "pending",
      required_approvers: requiredApprovers,
      approvals: [],
      comments: [],
      approval_history: [],
      requester_id: profile?.id || null,
      requested_by: profile?.full_name || "Staff Member",
      requester_email: profile?.email || null,
    };
    if (isPreview) {
      setPurchaseOrders((current) => [normalizePurchaseOrder({ ...payload, id: `po-${Date.now()}`, created_at: new Date().toISOString() }), ...(current || [])]);
      setPurchaseOrderSubmitting(false);
      clearStoredFormDraft(purchaseOrderDraftKey);
      setShowPurchaseOrderModal(false);
      return;
    }
    const { data, error } = await supabase.from("purchase_orders").insert(payload).select().single();
    if (error) {
      setPurchaseOrderSubmitting(false);
      setPurchaseOrderError(error.message || "This purchase order could not be submitted yet.");
      return;
    }
    const savedOrder = normalizePurchaseOrder(data);
    setPurchaseOrders((current) => [savedOrder, ...(current || [])]);
    await createNotificationsForNames({
      users: previewUsers,
      names: requiredApprovers.filter((name) => !samePerson(name, profile?.full_name)),
      churchId,
      actorProfile: profile,
      type: "purchase_order_review_requested",
      title: "Purchase Order Needs Review",
      detail: `${profile?.full_name || "A staff member"} submitted ${savedOrder.title} for ${fmt(savedOrder.amount)}.`,
      target: "budget",
      sourceKey: savedOrder.id,
      data: { purchaseOrderId: savedOrder.id, purchaseOrderTitle: savedOrder.title },
    });
    await recordActivity?.({
      action: "created",
      entityType: "purchase_order",
      entityId: savedOrder.id,
      entityTitle: savedOrder.title,
      summary: `${profile?.full_name || "A staff member"} submitted purchase order "${savedOrder.title}" for ${fmt(savedOrder.amount)}.`,
      metadata: { ministry: savedOrder.ministry, amount: savedOrder.amount, status: savedOrder.status },
    });
    setPurchaseOrderSubmitting(false);
    clearStoredFormDraft(purchaseOrderDraftKey);
    setShowPurchaseOrderModal(false);
  };

  const updatePurchaseOrderStatus = async (order, status) => {
    setPurchaseOrderError("");
    if (!order?.id) {
      setPurchaseOrderError("We couldn't find that purchase order.");
      return;
    }
    const nowIso = new Date().toISOString();
    if (status === "approved" && !canApprovePurchaseOrder(profile, order)) {
      setPurchaseOrderError("You do not have permission to approve this purchase order.");
      return;
    }
    if (status === "denied" && !canApprovePurchaseOrder(profile, order)) {
      setPurchaseOrderError("You do not have permission to deny this purchase order.");
      return;
    }
    const nextApprovals = status === "approved"
      ? [...new Set([...(order.approvals || []), profile?.full_name].filter(Boolean))]
      : (order.approvals || []);
    const fullyApproved = status === "approved" && nextApprovals.length >= Math.max((order.required_approvers || []).length, 1);
    const nextApprovalHistory = [
      ...(order.approval_history || []),
      {
        id: `${order.id}-${status}-${nowIso}`,
        reviewer: profile?.full_name || "Reviewer",
        action: status,
        note: "",
        created_at: nowIso,
      },
    ];
    const changes = status === "approved"
      ? {
          approvals: nextApprovals,
          approval_history: nextApprovalHistory,
          status: fullyApproved ? "approved" : "in-review",
          decided_at: fullyApproved ? nowIso : null,
          decided_by: fullyApproved ? (profile?.full_name || "Finance") : null,
        }
      : {
          approvals: nextApprovals,
          approval_history: nextApprovalHistory,
          status: "denied",
          decided_at: nowIso,
          decided_by: profile?.full_name || "Finance",
        };
    if (isPreview) {
      setPurchaseOrders((current) => (current || []).map((entry) => entry.id === order.id ? normalizePurchaseOrder({ ...entry, ...changes }) : entry));
      return;
    }
    const { error } = await supabase.from("purchase_orders").update(changes).eq("id", order.id);
    if (error) {
      setPurchaseOrderError(error.message || "We couldn't update that purchase order.");
      return;
    }
    setPurchaseOrders((current) => (current || []).map((entry) => entry.id === order.id ? normalizePurchaseOrder({ ...entry, ...changes }) : entry));
    const requesterProfileId = order.requester_id || getStaffProfileId(findStaffByName(previewUsers, order.requested_by));
    if (requesterProfileId) {
      await createPersistentNotification({
        churchId,
        actorProfile: profile,
        recipientProfileId: requesterProfileId,
        type: status === "denied" ? "purchase_order_denied" : fullyApproved ? "purchase_order_approved" : "purchase_order_review_progress",
        title: status === "denied" ? "Purchase Order Denied" : fullyApproved ? "Purchase Order Approved" : "Purchase Order Review Updated",
        detail: status === "denied"
          ? `${order.title} was denied${profile?.full_name ? ` by ${profile.full_name}` : ""}.`
          : fullyApproved
            ? `${order.title} was fully approved.`
            : `${profile?.full_name || "A reviewer"} approved ${order.title}. Another approval may still be needed.`,
        target: "budget",
        sourceKey: `${order.id}:${status}:${profile?.id || "reviewer"}`,
        data: { purchaseOrderId: order.id, purchaseOrderTitle: order.title },
      });
    }
    await recordActivity?.({
      action: status,
      entityType: "purchase_order",
      entityId: order.id,
      entityTitle: order.title,
      summary: `${profile?.full_name || "A reviewer"} ${status === "approved" ? "approved" : "denied"} purchase order "${order.title}".`,
      metadata: { status: changes.status, amount: order.amount },
    });
  };
  const deletePurchaseOrder = async (order) => {
    setPurchaseOrderError("");
    if (!canDeletePurchaseOrder(profile, order) || !order?.id) {
      setPurchaseOrderError("You do not have permission to delete this purchase order.");
      return;
    }
    if (!confirmDestructiveAction(`Delete purchase order "${order.title || order.item || "this request"}"?`)) return;
    if (isPreview) {
      setPurchaseOrders((current) => (current || []).filter((entry) => entry.id !== order.id));
      return;
    }
    const { error } = await supabase.from("purchase_orders").delete().eq("id", order.id);
    if (error) {
      setPurchaseOrderError(error.message || "We couldn't delete that purchase order.");
      return;
    }
    setPurchaseOrders((current) => (current || []).filter((entry) => entry.id !== order.id));
    await recordActivity?.({
      action: "deleted",
      entityType: "purchase_order",
      entityId: order.id,
      entityTitle: order.title,
      summary: `${profile?.full_name || "A staff member"} deleted purchase order "${order.title}".`,
    });
  };
  const addPurchaseOrderComment = async (order) => {
    setPurchaseOrderError("");
    if (!order?.id) {
      setPurchaseOrderError("We couldn't find that purchase order.");
      return;
    }
    const draft = (purchaseOrderCommentDrafts[order.id] || "").trim();
    if (!draft) {
      setPurchaseOrderError("Write a comment before posting.");
      return;
    }
    const commentEntry = {
      id: `${order.id}-comment-${(order.comments || []).length + 1}`,
      author: profile?.full_name || "Staff Member",
      body: draft,
      created_at: new Date().toISOString(),
    };
    const nextComments = [
      ...(order.comments || []),
      commentEntry,
    ];
    const changes = { comments: nextComments };
    if (isPreview) {
      setPurchaseOrders((current) => (current || []).map((entry) => entry.id === order.id ? normalizePurchaseOrder({ ...entry, ...changes }) : entry));
      setPurchaseOrderCommentDrafts((current) => ({ ...current, [order.id]: "" }));
      setPurchaseOrderCommentCursor((current) => ({ ...current, [order.id]: 0 }));
      return;
    }
    const { error } = await supabase.from("purchase_orders").update(changes).eq("id", order.id);
    if (error) {
      setPurchaseOrderError(error.message || "We couldn't post that purchase order comment.");
      return;
    }
    setPurchaseOrders((current) => (current || []).map((entry) => entry.id === order.id ? normalizePurchaseOrder({ ...entry, ...changes }) : entry));
    const mentionedNames = getMentionedStaffNames(commentEntry.body, previewUsers);
    const discussionNames = [
      order.requested_by,
      ...(order.required_approvers || []),
      ...mentionedNames,
    ].filter((name) => !samePerson(name, profile?.full_name));
    await createNotificationsForNames({
      users: previewUsers,
      names: discussionNames,
      churchId,
      actorProfile: profile,
      type: "purchase_order_comment",
      title: "New Purchase Order Comment",
      detail: `${commentEntry.author} commented on ${order.title}.`,
      target: "budget",
      sourceKey: `${order.id}:comment:${commentEntry.id}`,
      data: { purchaseOrderId: order.id, purchaseOrderTitle: order.title, commentId: commentEntry.id },
    });
    await recordActivity?.({
      action: "commented",
      entityType: "purchase_order",
      entityId: order.id,
      entityTitle: order.title,
      summary: `${profile?.full_name || "A staff member"} commented on purchase order "${order.title}".`,
      metadata: { comment_id: commentEntry.id },
    });
    setPurchaseOrderCommentDrafts((current) => ({ ...current, [order.id]: "" }));
    setPurchaseOrderCommentCursor((current) => ({ ...current, [order.id]: 0 }));
  };
  const beginEditPurchaseOrderComment = (orderId, comment) => {
    setEditingPurchaseOrderComments((current) => ({
      ...current,
      [orderId]: { id: comment.id, body: comment.body || "" },
    }));
  };
  const cancelEditPurchaseOrderComment = (orderId) => {
    setEditingPurchaseOrderComments((current) => {
      const next = { ...current };
      delete next[orderId];
      return next;
    });
  };
  const savePurchaseOrderComments = async (orderId, nextComments) => {
    setPurchaseOrderError("");
    if (!orderId) {
      setPurchaseOrderError("We couldn't find that purchase order.");
      return false;
    }
    const changes = { comments: nextComments };
    if (isPreview) {
      setPurchaseOrders((current) => (current || []).map((entry) => entry.id === orderId ? normalizePurchaseOrder({ ...entry, ...changes }) : entry));
      return true;
    }
    const { error } = await supabase.from("purchase_orders").update(changes).eq("id", orderId);
    if (error) {
      setPurchaseOrderError(error.message || "We couldn't update those purchase order comments.");
      return false;
    }
    setPurchaseOrders((current) => (current || []).map((entry) => entry.id === orderId ? normalizePurchaseOrder({ ...entry, ...changes }) : entry));
    return true;
  };
  const saveEditedPurchaseOrderComment = async (order, comment) => {
    const editingState = editingPurchaseOrderComments[order.id];
    if (!order?.id || !comment?.id || !editingState?.body?.trim() || !canManageComment(comment, profile)) return;
    const nextComments = (order.comments || []).map((entry) => entry.id === comment.id ? {
      ...entry,
      body: editingState.body.trim(),
      updated_at: new Date().toISOString(),
    } : entry);
    const saved = await savePurchaseOrderComments(order.id, nextComments);
    if (!saved) return;
    cancelEditPurchaseOrderComment(order.id);
  };
  const deletePurchaseOrderComment = async (order, comment) => {
    if (!order?.id || !comment?.id || !canManageComment(comment, profile)) return;
    if (!confirmDestructiveAction("Delete this purchase order comment?")) return;
    const nextComments = (order.comments || []).filter((entry) => entry.id !== comment.id);
    const saved = await savePurchaseOrderComments(order.id, nextComments);
    if (!saved) return;
    if (editingPurchaseOrderComments[order.id]?.id === comment.id) cancelEditPurchaseOrderComment(order.id);
  };
  const insertPurchaseOrderMention = (orderId, name) => {
    if (!orderId || !purchaseOrderMentionContext) return;
    const draft = purchaseOrderCommentDrafts[orderId] || "";
    const mentionToken = getStaffMentionToken(name);
    const nextValue = `${draft.slice(0, purchaseOrderMentionContext.start)}@${mentionToken} ${draft.slice(purchaseOrderMentionContext.end)}`;
    const nextCursor = purchaseOrderMentionContext.start + mentionToken.length + 2;
    setPurchaseOrderCommentDrafts((current) => ({ ...current, [orderId]: nextValue }));
    setPurchaseOrderCommentCursor((current) => ({ ...current, [orderId]: nextCursor }));
    window.requestAnimationFrame(() => {
      const textarea = purchaseOrderCommentInputRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const updateBudgetItem = (index, field, value) => {
    setBudgetForm((current) => ({
      ...current,
      items: (current.items || []).map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
    }));
  };

  const addBudgetItemRow = () => {
    setBudgetForm((current) => ({
      ...current,
      items: [...(current.items || []), { label: "", amount: "" }],
    }));
  };

  const removeBudgetItemRow = (index) => {
    if (!confirmDestructiveAction("Remove this budget line item?")) return;
    setBudgetForm((current) => {
      const nextItems = (current.items || []).filter((_, itemIndex) => itemIndex !== index);
      return {
        ...current,
        items: nextItems.length > 0 ? nextItems : [{ label: "", amount: "" }],
      };
    });
  };

  const removeBudgetMinistry = async () => {
    if (!financeView || !budgetForm.id) return;
    const ministryName = budgetForm.ministry;
    if (!confirmDestructiveAction(`Remove the ${ministryName || "selected"} ministry budget? This also removes that ministry from assigned staff profiles.`)) return;
    if (isPreview) {
      setMinistries?.((current) => (current || []).filter((entry) => entry.id !== budgetForm.id));
      setPreviewUsers?.((current) => (current || []).map((user) => normalizeAccessUser({
        ...user,
        ministries: (user.ministries || []).filter((ministry) => ministry !== ministryName),
      })));
      setShowBudgetModal(false);
      return;
    }
    await supabase.from("ministries").delete().eq("id", budgetForm.id);
    const updatedStaff = await Promise.all((previewUsers || []).map(async (user) => {
      const nextMinistries = (user.ministries || []).filter((ministry) => ministry !== ministryName);
      if (JSON.stringify(user.ministries || []) === JSON.stringify(nextMinistries)) return user;
      await supabase.from("church_staff").update({ ministries: nextMinistries }).eq("id", user.id);
      await supabase.from("profiles").update({ ministries: nextMinistries }).eq("staff_id", user.id);
      return normalizeAccessUser({ ...user, ministries: nextMinistries });
    }));
    setPreviewUsers?.(updatedStaff.sort((left, right) => left.full_name.localeCompare(right.full_name)));
    if (profile?.staff_id) {
      const refreshedProfile = updatedStaff.find((user) => user.id === profile.staff_id);
      if (refreshedProfile) {
        setProfile?.((current) => current ? { ...current, ministries: refreshedProfile.ministries } : current);
      }
    }
    setMinistries?.((current) => (current || []).filter((entry) => entry.id !== budgetForm.id));
    await recordActivity?.({
      action: "deleted",
      entityType: "budget",
      entityId: budgetForm.id,
      entityTitle: ministryName,
      summary: `${profile?.full_name || "A staff member"} removed the ${ministryName} budget.`,
    });
    setShowBudgetModal(false);
  };

  return (
    <div className="fadeIn mobile-pad" style={{...widePageStyle,textAlign:"left"}}>
      <div className="page-header" style={{display:"grid",gridTemplateColumns:"1fr auto",alignItems:"flex-start",gap:16,marginBottom:24,textAlign:"left"}}>
        <div style={{textAlign:"left",justifySelf:"start"}}>
          <h2 style={{...pageTitleStyle,textAlign:"left"}}>{financeView ? "Budget Overview" : "Your Budgets"}</h2>
          <p style={{color:C.muted,fontSize:13,marginTop:4,textAlign:"left"}}>
            {financeView
              ? "See every ministry's budget standing and manage the church's ministry budgets; other staff only see ministries assigned to their profile."
              : "You will only see budgets and purchase order ministries assigned to your profile; if something is missing, ask the Finance Director to update your ministry assignment."}
          </p>
        </div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"flex-end"}}>
          {financeView && <button className="btn-outline" onClick={() => openBudgetModal()}><Icons.plus/>Create New Budget</button>}
          <button className="btn-outline" onClick={() => openPurchaseOrderModal(defaultMinistry)}><Icons.plus/>New Purchase Order</button>
        </div>
      </div>
      {showModal && canEditBudget && (
        <div className="card" style={{padding:20,textAlign:"left",display:"grid",gap:16,marginBottom:22}}>
          <div>
            <button className="btn-outline" onClick={()=>setShowModal(false)} style={{marginBottom:14}}>Back to Finances</button>
            <h3 style={sectionTitleStyle}>Add Transaction</h3>
          </div>
          <div style={{display:"flex",background:C.surface,borderRadius:10,padding:3,border:`1px solid ${C.border}`}}>
            {["expense","income"].map(type=>(
              <button key={type} onClick={()=>setForm({...form,type})} style={{flex:1,padding:"8px 0",borderRadius:8,border:"none",cursor:"pointer",fontSize:13,fontWeight:500,background:form.type===type?C.card:"transparent",color:form.type===type?(type==="income"?C.success:C.danger):C.muted}}>
                {type==="expense"?"↓ Expense":"↑ Income"}
              </button>
            ))}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <label style={{fontSize:12,color:C.muted,textAlign:"left"}}>Description</label>
              <input className="input-field" placeholder="Description" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <label style={{fontSize:12,color:C.muted,textAlign:"left"}}>Amount</label>
              <input className="input-field" placeholder="$0.00" type="number" inputMode="decimal" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <label style={{fontSize:12,color:C.muted,textAlign:"left"}}>Date</label>
              <input className="input-field" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <label style={{fontSize:12,color:C.muted,textAlign:"left"}}>Ministry</label>
              <input className="input-field" value={form.ministry} readOnly />
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <label style={{fontSize:12,color:C.muted,textAlign:"left"}}>Budget Line Item</label>
              <input className="input-field" list="budget-category-options" placeholder={selectedMinistryBudgetItems.length > 0 ? "Choose a line item" : "Finance needs to create line items first"} value={form.category} onChange={e=>setForm({...form,category:e.target.value})}/>
              <datalist id="budget-category-options">
                {[...ministryLineItemSuggestions, ...categorySuggestions].filter((value, index, values) => value && values.indexOf(value) === index).map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </div>
            {selectedMinistryBudgetItems.length > 0 && (
              <div style={{fontSize:11,color:C.muted,textAlign:"left"}}>
                Available line items: {selectedMinistryBudgetItems.map((item) => item.label).join(", ")}
              </div>
            )}
            {selectedMinistryBudgetItems.length === 0 && (
              <div style={{fontSize:11,color:C.muted,textAlign:"left"}}>
                No line items have been created for this ministry yet. Finance can add them in the ministry budget editor.
              </div>
            )}
          </div>
          {transactionError && (
            <div style={{fontSize:12,color:C.danger,textAlign:"left"}}>
              {transactionError}
            </div>
          )}
          <div style={{display:"flex",gap:10,justifyContent:"flex-end",flexWrap:"wrap"}}>
            <button className="btn-outline" onClick={()=>setShowModal(false)}>Cancel</button>
            <button className="btn-gold" onClick={save} disabled={transactionSubmitting} style={{opacity:transactionSubmitting ? 0.8 : 1}}>
              {transactionSubmitting ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}
      {showPurchaseOrderModal && (
        <div className="card" style={{padding:20,textAlign:"left",display:"grid",gap:16,marginBottom:22}}>
          <div>
            <button className="btn-outline" onClick={closePurchaseOrderModal} style={{marginBottom:14}}>Back to Finances</button>
            <h3 style={sectionTitleStyle}>New Purchase Order</h3>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <label style={{fontSize:12,color:C.muted,textAlign:"left"}}>Name</label>
              <input className="input-field" value={profile?.full_name || ""} readOnly />
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <label style={{fontSize:12,color:C.muted,textAlign:"left"}}>Email</label>
              <input className="input-field" value={profile?.email || ""} readOnly />
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <label style={{fontSize:12,color:C.muted,textAlign:"left"}}>Ministry</label>
              <select
                className="input-field"
                value={purchaseOrderForm.ministry}
                onChange={(e) => {
                  setSelectedLedgerMinistry(e.target.value);
                  setPurchaseOrderForm({ ...purchaseOrderForm, ministry: e.target.value, budgetLineItem: "" });
                }}
                style={{background:C.surface}}
              >
                {purchaseOrderMinistryOptions.map((ministry) => (
                  <option key={ministry} value={ministry}>{ministry}</option>
                ))}
              </select>
              <div style={{fontSize:11,color:C.muted,lineHeight:1.5,textAlign:"left"}}>
                {financeView
                  ? "Finance Director access includes all ministry budgets."
                  : "Only ministries assigned to your profile appear here."}
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <label style={{fontSize:12,color:C.muted,textAlign:"left"}}>What Is This For?</label>
              <input className="input-field" placeholder="Example: Student camp t-shirts" value={purchaseOrderForm.title} onChange={(e)=>setPurchaseOrderForm({...purchaseOrderForm,title:e.target.value})}/>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <label style={{fontSize:12,color:C.muted,textAlign:"left"}}>Was This Included In Your Yearly Budget Proposal?</label>
              <div style={{display:"flex",background:C.surface,borderRadius:10,padding:3,border:`1px solid ${C.border}`}}>
                {[{ value: "yes", label: "Yes" },{ value: "no", label: "No" }].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPurchaseOrderForm({ ...purchaseOrderForm, includedInBudget: option.value })}
                    style={{flex:1,padding:"8px 0",borderRadius:8,border:"none",cursor:"pointer",fontSize:13,fontWeight:500,background: purchaseOrderForm.includedInBudget === option.value ? C.card : "transparent",color: purchaseOrderForm.includedInBudget === option.value ? C.text : C.muted}}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <label style={{fontSize:12,color:C.muted,textAlign:"left"}}>Price</label>
              <input className="input-field" type="number" inputMode="decimal" placeholder="$0.00" value={purchaseOrderForm.amount} onChange={(e)=>setPurchaseOrderForm({...purchaseOrderForm,amount:e.target.value})}/>
            </div>
            {purchaseOrderForm.includedInBudget === "yes" && (
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <label style={{fontSize:12,color:C.muted,textAlign:"left"}}>Budget Line Item</label>
                <input className="input-field" list="purchase-order-line-items" placeholder={selectedPurchaseOrderBudgetItems.length > 0 ? "Choose a line item" : "Add line items to this budget first"} value={purchaseOrderForm.budgetLineItem} onChange={(e)=>setPurchaseOrderForm({...purchaseOrderForm,budgetLineItem:e.target.value})}/>
                <datalist id="purchase-order-line-items">
                  {purchaseOrderLineItemSuggestions.map((item) => <option key={item} value={item} />)}
                </datalist>
              </div>
            )}
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <label style={{fontSize:12,color:C.muted,textAlign:"left"}}>Date Needed By</label>
              <input className="input-field" type="date" value={purchaseOrderForm.neededBy} onChange={(e)=>setPurchaseOrderForm({...purchaseOrderForm,neededBy:e.target.value})}/>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <label style={{fontSize:12,color:C.muted,textAlign:"left"}}>Purchase Link</label>
              <input className="input-field" placeholder="Paste the product or cart link" value={purchaseOrderForm.purchaseLink} onChange={(e)=>setPurchaseOrderForm({...purchaseOrderForm,purchaseLink:e.target.value})}/>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <label style={{fontSize:12,color:C.muted,textAlign:"left"}}>Notes</label>
              <textarea className="input-field" rows={3} placeholder="Any additional info" value={purchaseOrderForm.notes} onChange={(e)=>setPurchaseOrderForm({...purchaseOrderForm,notes:e.target.value})} style={{resize:"vertical"}}/>
            </div>
          </div>
          <div style={{fontSize:12,color:C.muted,lineHeight:1.6,textAlign:"left"}}>
            Purchase orders help your team request spending against a real ministry budget before the transaction happens.
          </div>
          {purchaseOrderError && (
            <div style={{fontSize:12,color:C.danger,textAlign:"left"}}>
              {purchaseOrderError}
            </div>
          )}
          <div style={{display:"flex",gap:10,justifyContent:"flex-end",flexWrap:"wrap"}}>
            <button className="btn-outline" onClick={closePurchaseOrderModal}>Cancel</button>
            <button className="btn-gold" onClick={savePurchaseOrder} disabled={purchaseOrderSubmitting} style={{opacity:purchaseOrderSubmitting ? 0.8 : 1}}>
              {purchaseOrderSubmitting ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </div>
      )}
      {showBudgetModal && canManageBudgetLinesForMinistry(budgetForm.ministry || defaultMinistry) && (
        <div className="card" style={{padding:20,textAlign:"left",display:"grid",gap:16,marginBottom:22}}>
          <div>
            <button className="btn-outline" onClick={closeBudgetModal} style={{marginBottom:14}}>Back to Finances</button>
            <h3 style={sectionTitleStyle}>{financeView ? "Set Ministry Budget" : "Edit Budget Line Items"}</h3>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <label style={{fontSize:12,color:C.muted,textAlign:"left"}}>Ministry</label>
              <input className="input-field" value={budgetForm.ministry} onChange={(e)=>setBudgetForm({...budgetForm,ministry:e.target.value})} placeholder="Ministry name" readOnly={!financeView} />
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <label style={{fontSize:12,color:C.muted,textAlign:"left"}}>Approved Amount For This Year</label>
              <input className="input-field" type="number" inputMode="decimal" placeholder="$0.00" value={budgetForm.budget} onChange={(e)=>setBudgetForm({...budgetForm,budget:e.target.value})} readOnly={!financeView}/>
            </div>
            {financeView && (
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <label style={{fontSize:12,color:C.muted,textAlign:"left"}}>Attach Ministry Lead</label>
              <select className="input-field" value={budgetForm.assignedStaffId} onChange={(e)=>setBudgetForm({...budgetForm,assignedStaffId:e.target.value})} style={{background:C.surface}}>
                <option value="">No one attached</option>
                {(previewUsers || []).map((user) => <option key={user.id} value={user.id}>{user.full_name}</option>)}
              </select>
            </div>
            )}
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <label style={{fontSize:12,color:C.muted,textAlign:"left"}}>Budget Line Items</label>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {(budgetForm.items || []).map((item, index) => (
                  <div key={`budget-item-${index}`} className="mobile-two-stack" style={{display:"grid",gridTemplateColumns:"1fr 140px auto",gap:10,alignItems:"end"}}>
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      <label style={{fontSize:11,color:C.muted,textAlign:"left"}}>Label</label>
                      <input className="input-field" placeholder="Example: Student Retreat" value={item.label} onChange={(e)=>updateBudgetItem(index, "label", e.target.value)} />
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      <label style={{fontSize:11,color:C.muted,textAlign:"left"}}>Amount</label>
                      <input className="input-field" type="number" inputMode="decimal" placeholder="$0.00" value={item.amount} onChange={(e)=>updateBudgetItem(index, "amount", e.target.value)} />
                    </div>
                    <button className="btn-outline" type="button" onClick={() => removeBudgetItemRow(index)} style={{padding:"10px 12px",justifyContent:"center"}}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button className="btn-outline" type="button" onClick={addBudgetItemRow} style={{justifyContent:"center"}}>
                <Icons.plus/>Add Line Item
              </button>
              <div style={{fontSize:12,color:C.muted,textAlign:"left"}}>
                These line items become budget buckets you can attach transactions to later.
              </div>
            </div>
          </div>
          <div style={{fontSize:12,color:C.muted,lineHeight:1.6,textAlign:"left"}}>
            {financeView
              ? "This sets the ministry’s working budget inside Shepherd. If you add line items, the total budget is calculated from them automatically."
              : "You can add and adjust line items for this ministry budget here. Finance still controls the main ministry budget and staff assignment."}
          </div>
          {budgetError && (
            <div style={{fontSize:12,color:C.danger,textAlign:"left"}}>
              {budgetError}
            </div>
          )}
          <div style={{display:"flex",gap:10,justifyContent:"space-between",flexWrap:"wrap"}}>
            {financeView && budgetForm.id ? (
              <button
                className="btn-outline"
                onClick={removeBudgetMinistry}
                style={{display:"flex",alignItems:"center",justifyContent:"center",padding:10,color:C.danger,borderColor:"rgba(224,82,82,.35)"}}
                aria-label="Remove ministry"
                title="Remove ministry"
              >
                <Icons.trash />
              </button>
            ) : <div />}
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            <button className="btn-outline" onClick={closeBudgetModal}>Cancel</button>
            <button className="btn-gold" onClick={saveBudget} disabled={budgetSubmitting} style={{opacity:budgetSubmitting ? 0.8 : 1}}>
              {budgetSubmitting ? "Saving..." : "Save Budget"}
            </button>
            </div>
          </div>
        </div>
      )}
      {!showModal && !showPurchaseOrderModal && !showBudgetModal && (
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:16,marginBottom:28}}>
        {ministrySummaries.length === 0 && (
          <div className="card" style={{padding:24,textAlign:"left",gridColumn:"1 / -1"}}>
            <div style={{...sectionTitleStyle,fontSize:24,marginBottom:8}}>No budgets yet</div>
            <div style={{fontSize:13,color:C.muted,lineHeight:1.6}}>
              {financeView
                ? "Create each ministry budget intentionally from scratch. Once budgets are added, they will appear here with their own transaction controls."
                : "No budgets have been attached to you yet. If something should be here, ask the Finance Director to create the budget and attach it to your ministry profile."}
            </div>
          </div>
        )}
        {ministrySummaries.map((summary) => (
          <div key={summary.ministry} className="stat-card" style={{borderTop:`3px solid ${CATEGORY_STYLES[summary.ministry]?.color || C.gold}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
              <div style={{textAlign:"left"}}>
                <div style={{...sectionTitleStyle,fontSize:24}}>{summary.ministry}</div>
                <div style={{fontSize:12,color:C.muted,marginTop:4}}>{summary.transactions} transactions</div>
                <div style={{fontSize:12,color:C.muted,marginTop:2}}>{summary.purchaseOrders} purchase orders</div>
              </div>
              {financeView && (
                <button
                  className="btn-outline"
                  onClick={() => openBudgetModal(summary.ministry)}
                  style={{padding:"7px 9px",minWidth:0}}
                  aria-label={`Edit ${summary.ministry} budget`}
                  title={`Edit ${summary.ministry} budget`}
                >
                  <Icons.pen/>
                </button>
              )}
            </div>
            <div style={{display:"grid",gap:8,marginTop:18}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.muted}}>
                <span>Budget</span>
                <span style={{color:C.text}}>{fmt(summary.budget)}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.muted}}>
                <span>Spent</span>
                <span style={{color:C.danger}}>{fmt(summary.spent)}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.muted}}>
                <span>Remaining</span>
                <span style={{color:summary.remaining >= 0 ? C.success : C.danger}}>{fmt(summary.remaining)}</span>
              </div>
            </div>
            <div style={{display:"flex",gap:10,marginTop:16,flexWrap:"wrap"}}>
              <button className="btn-gold" onClick={() => openTransactionModal(summary.ministry)} style={{justifyContent:"center",flex:1}}>
                <Icons.plus/>Add Transaction
              </button>
              <button className="btn-outline" onClick={() => openPurchaseOrderModal(summary.ministry)} style={{justifyContent:"center",flex:1}}>
                <Icons.plus/>Purchase Order
              </button>
              {canManageBudgetLinesForMinistry(summary.ministry) && (
                <button className="btn-outline" onClick={() => openBudgetModal(summary.ministry)} style={{justifyContent:"center",flex:1}}>
                  <Icons.pen/>{financeView ? "Edit Budget" : "Edit Line Items"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      )}
      <div className="card" style={{overflow:"hidden"}}>
        <div style={{padding:"16px 18px",borderBottom:`1px solid ${C.border}`,background:C.surface}}>
          <h3 style={{...sectionTitleStyle,textAlign:"left"}}>{financeView ? "Purchase Orders" : "Your Purchase Orders"}</h3>
          <div style={{fontSize:12,color:C.muted,marginTop:4,textAlign:"left"}}>
            {financeView
              ? "Review and respond to ministry purchase requests from one place."
              : "Submit purchase requests tied to your ministry budgets so Finance can review them."}
          </div>
          <div style={{fontSize:11,color:C.muted,marginTop:6,lineHeight:1.5,textAlign:"left"}}>
            {financeView
              ? "Finance Director access includes all ministry budgets and purchase requests."
              : "Ministry options are based on the budgets assigned to your profile."}
          </div>
          {purchaseOrderError && !showPurchaseOrderModal && (
            <div style={{fontSize:12,color:C.danger,marginTop:8,textAlign:"left"}}>
              {purchaseOrderError}
            </div>
          )}
        </div>
        {visiblePurchaseOrders.length===0&&<div style={{padding:"40px",textAlign:"center",color:C.muted}}>No purchase orders yet.</div>}
        {visiblePurchaseOrders.map((order)=>(
          <div key={order.id} style={{padding:"18px",borderTop:`1px solid ${C.border}`,display:"grid",gap:16}}>
            <div style={{display:"grid",gridTemplateColumns:"minmax(0,1.15fr) minmax(280px,.9fr)",gap:18,alignItems:"start"}}>
              <div style={{display:"flex",flexDirection:"column",gap:12,textAlign:"left"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
                  <div style={{display:"flex",flexDirection:"column",gap:6,textAlign:"left"}}>
                    <div style={{fontSize:18,color:C.text,fontWeight:600,lineHeight:1.35}}>{order.title}</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:8,alignItems:"center"}}>
                      <span className={`badge ${getTag(order.ministry)}`}>{order.ministry}</span>
                      <span style={{fontSize:12,color:C.text}}>{fmt(order.amount)}</span>
                      <span style={{fontSize:12,color:C.muted}}>{order.needed_by ? `Needed by ${fmtDate(order.needed_by)}` : "No date needed yet"}</span>
                    </div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",justifyContent:"flex-end"}}>
                    <span style={{fontSize:11,color:order.status === "approved" ? C.success : order.status === "denied" ? C.danger : C.gold,textTransform:"capitalize"}}>{order.status}</span>
                    {canDeletePurchaseOrder(profile, order) && (
                      <button
                        className="btn-outline"
                        onClick={() => deletePurchaseOrder(order)}
                        style={{display:"flex",alignItems:"center",justifyContent:"center",padding:8,color:C.muted,borderColor:C.border}}
                        aria-label="Delete purchase order"
                        title="Delete purchase order"
                      >
                        <Icons.trash />
                      </button>
                    )}
                  </div>
                </div>
                <div style={{display:"grid",gap:6,textAlign:"left"}}>
                  <div style={{fontSize:12,color:C.muted}}><span style={{color:C.text,fontWeight:600}}>Requested by:</span> {order.requested_by}{order.requester_email ? ` • ${order.requester_email}` : ""}</div>
                  {order.budget_line_item && (
                    <div style={{fontSize:12,color:C.muted}}><span style={{color:C.text,fontWeight:600}}>Budget line item:</span> {order.budget_line_item}</div>
                  )}
                  {order.notes && (
                    <div style={{fontSize:12,color:C.muted,lineHeight:1.7}}><span style={{color:C.text,fontWeight:600}}>Notes:</span> {order.notes}</div>
                  )}
                  {order.purchase_link && (
                    <div style={{fontSize:12,color:C.muted}}>
                      <span style={{color:C.text,fontWeight:600}}>Purchase link:</span>{" "}
                      <a href={normalizeExternalUrl(order.purchase_link)} target="_blank" rel="noreferrer" style={{color:C.gold}}>
                        Open purchase link
                      </a>
                    </div>
                  )}
                </div>
              </div>
              <div className="card" style={{padding:"14px",background:C.surface,textAlign:"left"}}>
                <div style={{fontSize:12,color:C.muted,marginBottom:10}}>Approvals</div>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {(order.required_approvers || []).map((reviewer) => {
                    const decision = getPurchaseOrderReviewerDecision(order, reviewer);
                    const isCurrentReviewer = samePerson(reviewer, profile?.full_name);
                    const reviewerCanRespond = isCurrentReviewer && !decision && ["pending", "in-review"].includes(order.status || "pending");
                    const decisionLabel = decision?.action === "approved"
                      ? "Approved"
                      : decision?.action === "denied"
                        ? "Denied"
                        : "Pending";
                    const decisionTone = decision?.action === "approved"
                      ? C.success
                      : decision?.action === "denied"
                        ? C.danger
                        : C.muted;
                    return (
                      <div key={`${order.id}-${reviewer}`} style={{border:`1px solid ${C.border}`,borderRadius:12,padding:"10px 12px",background:C.card,display:"flex",flexDirection:"column",gap:8}}>
                        <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start"}}>
                          <div style={{display:"grid",gap:3}}>
                            <div style={{fontSize:13,color:C.text,fontWeight:600}}>{reviewer}</div>
                            {decision?.created_at && (
                              <div style={{fontSize:11,color:C.muted}}>
                                {new Date(decision.created_at).toLocaleString("en-US", { month:"short", day:"numeric", hour:"numeric", minute:"2-digit" })}
                              </div>
                            )}
                          </div>
                          <div style={{fontSize:12,color:decisionTone,fontWeight:600}}>{decisionLabel}</div>
                        </div>
                        {reviewerCanRespond && (
                          <div style={{display:"grid",gap:8}}>
                            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                              <button className="btn-outline" onClick={() => updatePurchaseOrderStatus(order, "approved")} style={{padding:"7px 10px",color:C.success,borderColor:"rgba(82,200,122,.35)"}}>Approve</button>
                              <button className="btn-outline" onClick={() => updatePurchaseOrderStatus(order, "denied")} style={{padding:"7px 10px",color:C.danger,borderColor:"rgba(224,82,82,.35)"}}>Deny</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div style={{display:"grid",gap:10,textAlign:"left"}}>
              <div className="section-header" style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
                <div style={{textAlign:"left"}}>
                  <div style={{fontSize:12,color:C.muted}}>Comments</div>
                  <div style={{fontSize:12,color:C.muted,marginTop:4,lineHeight:1.6}}>Everyone who can view this purchase order can read and join the conversation here.</div>
                </div>
                <button
                  className="btn-outline"
                  onClick={() => setPurchaseOrderDiscussionOpen((current) => ({ ...current, [order.id]: !(current?.[order.id] ?? true) }))}
                  style={{padding:"5px 10px",fontSize:12}}
                >
                  {(purchaseOrderDiscussionOpen?.[order.id] ?? true) ? "Collapse" : "Expand"}
                </button>
              </div>
              {(purchaseOrderDiscussionOpen?.[order.id] ?? true) ? (
                <div style={{display:"grid",gap:10}}>
                  {(order.comments || []).slice().sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)).length > 0 ? (
                    (order.comments || []).slice().sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)).map((comment) => (
                      <div key={comment.id} style={{padding:"10px 12px",border:`1px solid ${C.border}`,borderRadius:10,background:C.surface}}>
                        <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start"}}>
                          <div style={{fontSize:12,color:C.text,fontWeight:600}}>{comment.author}</div>
                          <div style={{fontSize:11,color:C.muted,textAlign:"right"}}>
                            {new Date(comment.updated_at || comment.created_at).toLocaleString("en-US", { month:"short", day:"numeric", hour:"numeric", minute:"2-digit" })}
                            {comment.updated_at && <div>Edited</div>}
                          </div>
                        </div>
                        {editingPurchaseOrderComments[order.id]?.id === comment.id ? (
                          <div style={{display:"grid",gap:10,marginTop:8}}>
                            <textarea
                              className="input-field"
                              rows={3}
                              value={editingPurchaseOrderComments[order.id]?.body || ""}
                              onChange={(e)=>setEditingPurchaseOrderComments((current) => ({
                                ...current,
                                [order.id]: { id: comment.id, body: e.target.value },
                              }))}
                              style={{resize:"vertical"}}
                            />
                            <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
                              <button className="btn-outline" onClick={() => cancelEditPurchaseOrderComment(order.id)} style={{padding:"6px 10px",fontSize:12}}>Cancel</button>
                              <button className="btn-gold" onClick={() => saveEditedPurchaseOrderComment(order, comment)} style={{padding:"6px 12px",fontSize:12}}>Save</button>
                            </div>
                          </div>
                        ) : (
                          <div style={{fontSize:13,color:C.text,marginTop:6,lineHeight:1.8}}>{renderCommentBody(comment.body, mentionableNames)}</div>
                        )}
                        {canManageComment(comment, profile) && editingPurchaseOrderComments[order.id]?.id !== comment.id && (
                          <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:10}}>
                            <button className="btn-outline" onClick={() => beginEditPurchaseOrderComment(order.id, comment)} style={{padding:"6px 10px",fontSize:12}}>Edit</button>
                            <button
                              className="btn-outline"
                              onClick={() => deletePurchaseOrderComment(order, comment)}
                              style={{display:"flex",alignItems:"center",justifyContent:"center",padding:8,fontSize:12,borderColor:"rgba(224,82,82,.35)",color:C.danger}}
                              aria-label="Delete purchase order comment"
                              title="Delete purchase order comment"
                            >
                              <Icons.trash />
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div style={{fontSize:13,color:C.muted,textAlign:"left"}}>No comments yet.</div>
                  )}
                  <div style={{position:"relative"}}>
                    <textarea
                      ref={activePurchaseOrderCommentId === order.id ? purchaseOrderCommentInputRef : null}
                      className="input-field"
                      rows={2}
                      placeholder="Add a question or comment"
                      value={purchaseOrderCommentDrafts[order.id] || ""}
                      onChange={(e) => {
                        setPurchaseOrderCommentDrafts((current) => ({ ...current, [order.id]: e.target.value }));
                        setPurchaseOrderCommentCursor({ [order.id]: e.target.selectionStart });
                      }}
                      onKeyUp={(e) => setPurchaseOrderCommentCursor({ [order.id]: e.currentTarget.selectionStart })}
                      onClick={(e) => setPurchaseOrderCommentCursor({ [order.id]: e.currentTarget.selectionStart })}
                      style={{resize:"vertical"}}
                    />
                    {activePurchaseOrderCommentId === order.id && purchaseOrderMentionSuggestions.length > 0 && (
                      <div style={{position:"absolute",left:0,right:0,top:"calc(100% + 6px)",border:`1px solid ${C.border}`,borderRadius:12,background:C.card,boxShadow:"0 12px 28px rgba(0,0,0,.28)",zIndex:20,overflow:"hidden"}}>
                        {purchaseOrderMentionSuggestions.map((entry) => (
                          <button
                            key={`${order.id}-${entry.fullName}`}
                            type="button"
                            onClick={() => insertPurchaseOrderMention(order.id, entry.fullName)}
                            style={{display:"block",width:"100%",padding:"10px 12px",textAlign:"left",background:"transparent",border:"none",borderBottom:`1px solid ${C.border}`,cursor:"pointer",color:C.text,fontSize:13}}
                          >
                            @{entry.token}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{fontSize:11,color:C.muted,textAlign:"left"}}>Use `@FirstLast` to notify someone in this purchase order.</div>
                  <div style={{display:"flex",justifyContent:"flex-end"}}>
                    <button className="btn-outline" onClick={() => addPurchaseOrderComment(order)} style={{padding:"7px 10px"}}>Add Comment</button>
                  </div>
                </div>
              ) : (
                <div style={{fontSize:13,color:C.muted,textAlign:"left"}}>Discussion collapsed. Expand it when you want to catch up or reply.</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Ministries ─────────────────────────────────────────────────────────────
function Ministries({ ministries }) {
  return (
    <div className="fadeIn mobile-pad" style={widePageStyle}>
      <div style={{marginBottom:24}}>
        <h2 style={pageTitleStyle}>Ministries</h2>
        <p style={{color:C.muted,fontSize:13,marginTop:4}}>Overview of all ministry departments</p>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:18}}>
        {ministries.map(m=>(
          <div key={m.id} className="card" style={{padding:24,borderTop:`3px solid ${CATEGORY_STYLES[m.name]?.color||C.gold}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
              <h3 style={sectionTitleStyle}>{m.name}</h3>
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
function CalendarView({ tasks, setTasks, calendarEvents, setCalendarEvents, profile, church, churchId, setActive, recordActivity }) {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const today = new Date();
  const calendarYears = [today.getFullYear(), today.getFullYear() + 1];
  const clampCalendarCursor = (value) => {
    const parsed = parseAppDate(value) || today;
    const min = new Date(calendarYears[0], 0, 1);
    const max = new Date(calendarYears[1], 11, 31);
    if (parsed < min) return min;
    if (parsed > max) return max;
    return parsed;
  };
  const [calendarCursor, setCalendarCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  const [calendarFilters, setCalendarFilters] = useState({
    myTasks: true,
  });
  const [googleCalendarFilters, setGoogleCalendarFilters] = useState({});
  const [showCalendarItemForm, setShowCalendarItemForm] = useState(false);
  const [editingCalendarEventId, setEditingCalendarEventId] = useState(null);
  const [selectedCalendarItem, setSelectedCalendarItem] = useState(null);
  const [calendarItemError, setCalendarItemError] = useState("");
  const [calendarItemForm, setCalendarItemForm] = useState({
    calendar_type: "churchEvents",
    title: "",
    event_date: "",
    start_time: "",
    end_time: "",
    location: "",
    notes: "",
  });
  const officialGoogleCalendarIds = Array.isArray(church?.google_calendar_ids) && church.google_calendar_ids.length
    ? church.google_calendar_ids
    : (church?.google_calendar_id ? [church.google_calendar_id] : []);
  const officialGoogleCalendarTitles = Array.isArray(church?.google_calendar_titles) && church.google_calendar_titles.length
    ? church.google_calendar_titles
    : (church?.google_calendar_title ? [church.google_calendar_title] : []);
  const officialGoogleCalendarTitleMap = Object.fromEntries(
    officialGoogleCalendarIds.map((id, index) => [id, officialGoogleCalendarTitles[index] || "Imported Calendar"])
  );
  const getGoogleCalendarIdFromNotes = (notes) => {
    const text = String(notes || "");
    const safeMatch = text.match(/google-calendar-id:([^\n]+)/);
    if (safeMatch?.[1]) {
      try {
        return decodeURIComponent(safeMatch[1].trim());
      } catch {
        return safeMatch[1].trim();
      }
    }
    const legacyMatch = text.match(/google-calendar:(.+):([^\n]+)/);
    return legacyMatch?.[1]?.trim() || "";
  };
  const getGoogleCalendarTitleFromNotes = (notes) => {
    const match = String(notes || "").match(/google-calendar-title:([^\n]+)/);
    return match?.[1]?.trim() || "";
  };
  const resolvedGoogleCalendarFilters = (() => {
    const ids = Array.isArray(church?.google_calendar_ids) && church.google_calendar_ids.length
      ? church.google_calendar_ids
      : (church?.google_calendar_id ? [church.google_calendar_id] : []);
    const next = {};
    ids.forEach((id) => {
      next[id] = Object.prototype.hasOwnProperty.call(googleCalendarFilters, id) ? googleCalendarFilters[id] : true;
    });
    return next;
  })();
  const approvedEvents = [];
  const directChurchEvents = (calendarEvents || [])
    .map((event) => {
      const googleCalendarId = event.google_calendar_source_id || getGoogleCalendarIdFromNotes(event.notes);
      const noteCalendarTitle = event.google_calendar_source_title || getGoogleCalendarTitleFromNotes(event.notes);
      const savedCalendarTitle = googleCalendarId ? (officialGoogleCalendarTitleMap[googleCalendarId] || "") : "";
      const googleCalendarTitle = noteCalendarTitle || savedCalendarTitle;
      return {
        id: `calendar-event-${event.id}`,
        sourceId: event.id,
        type: "churchEvents",
        date: event.event_date,
        title: event.title || "Church event",
        detail: [
          event.start_time && event.end_time ? `${event.start_time} - ${event.end_time}` : event.start_time || "",
          event.location || "",
          googleCalendarTitle || "",
        ].filter(Boolean).join(" • ") || "Added directly to the church calendar",
        tone: C.gold,
        tag: googleCalendarTitle || "Church Event",
        editable: true,
        source: event,
        googleCalendarId,
      };
    })
    .filter((entry) => entry.date);
  const visibleDirectChurchEvents = directChurchEvents.filter((event) => {
    if (!event.googleCalendarId) return true;
    return resolvedGoogleCalendarFilters[event.googleCalendarId] !== false;
  });
  const myTasks = (tasks || [])
    .filter((task) => task.status !== "done" && samePerson(task.assignee, profile?.full_name) && task.due_date)
    .map((task) => ({
      id: `task-${task.id}`,
      type: "myTasks",
      sourceId: task.id,
      date: task.due_date,
      title: task.title,
      detail: `${task.ministry} • ${task.status === "in-progress" ? "In Progress" : task.status === "in-review" ? "In Review" : "Not Started"}`,
      tone: CATEGORY_STYLES[task.ministry]?.color || C.blue,
      tag: "My Task",
      source: task,
    }));
  const calendarItems = [
    ...approvedEvents.filter((event) => {
      if (!event.googleCalendarId) return false;
      return resolvedGoogleCalendarFilters[event.googleCalendarId] !== false;
    }),
    ...visibleDirectChurchEvents,
    ...(calendarFilters.myTasks ? myTasks : []),
  ]
    .filter((item) => item.date)
    .sort((a, b) => getDateSortValue(a.date) - getDateSortValue(b.date));
  const weekdayLabels = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  const toDateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const monthStart = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth(), 1);
  const monthEnd = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 0);
  const monthGridStart = new Date(monthStart.getFullYear(), monthStart.getMonth(), monthStart.getDate() - ((monthStart.getDay() + 6) % 7));
  const monthGridDays = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(monthGridStart.getFullYear(), monthGridStart.getMonth(), monthGridStart.getDate() + index);
    const key = toDateKey(date);
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return {
      key,
      date,
      items: calendarItems.filter((item) => item.date === key),
      isToday: key === toDateKey(today),
      isPast: date < todayStart,
      isCurrentMonth: date.getMonth() === calendarCursor.getMonth(),
    };
  });
  const visibleMonthItems = calendarItems.filter((item) => {
    const parsed = parseAppDate(item.date);
    if (!parsed) return false;
    return parsed >= monthStart && parsed <= monthEnd;
  });
  const filterOptions = [
    { key: "myTasks", label: "My Tasks" },
  ];
  const activeCalendarFilterStyle = {
    background:`linear-gradient(135deg, ${C.gold}, #d8bc63)`,
    border:`1px solid ${C.gold}`,
    color:"#121622",
    boxShadow:`0 0 0 1px ${C.goldDim}, 0 12px 26px rgba(201,168,76,.26)`,
    display:"inline-flex",
    alignItems:"center",
    gap:8,
    fontWeight:800,
  };
  const inactiveCalendarFilterStyle = {
    padding:"6px 12px",
    fontSize:12,
    opacity:.76,
  };
  const activeCalendarCheckStyle = {
    display:"inline-flex",
    alignItems:"center",
    justifyContent:"center",
    width:17,
    height:17,
    borderRadius:5,
    background:"#111622",
    border:"1px solid rgba(255,255,255,.28)",
    fontSize:12,
    lineHeight:1,
    color:C.gold,
  };
  const saveCalendarItem = async () => {
    if (!churchId || !profile?.id || !calendarItemForm.title.trim() || !calendarItemForm.event_date) {
      setCalendarItemError("Add at least a title and date before saving.");
      return;
    }
    if (calendarItemForm.calendar_type === "myTasks") {
      const payload = {
        church_id: churchId,
        title: calendarItemForm.title.trim(),
        ministry: profile?.ministries?.[0] || "Admin",
        assignee: profile?.full_name || "Staff Member",
        due_date: calendarItemForm.event_date,
        status: "todo",
        notes: calendarItemForm.notes.trim() || null,
        review_required: false,
        reviewers: [],
        review_approvals: [],
        comments: [],
      };
      const { data, error } = await supabase.from("tasks").insert(payload).select().single();
      if (error) {
        setCalendarItemError(error.message || "That task could not be added yet.");
        return;
      }
      const savedTask = normalizeTask(data);
      setTasks((current) => [savedTask, ...(current || [])]);
      await recordActivity?.({
        action: "created",
        entityType: "task",
        entityId: savedTask.id,
        entityTitle: savedTask.title,
        summary: `${profile?.full_name || "A staff member"} added task "${savedTask.title}" from the calendar.`,
        metadata: { due_date: savedTask.due_date },
      });
    } else {
      const payload = {
        church_id: churchId,
        created_by: profile.id,
        title: calendarItemForm.title.trim(),
        event_date: calendarItemForm.event_date,
        start_time: calendarItemForm.start_time || null,
        end_time: calendarItemForm.end_time || null,
        location: calendarItemForm.location.trim() || null,
        notes: calendarItemForm.notes.trim() || null,
      };
      const result = editingCalendarEventId
        ? await supabase.from("calendar_events").update(payload).eq("id", editingCalendarEventId).select().maybeSingle()
        : await supabase.from("calendar_events").insert(payload).select().maybeSingle();
      const { data, error } = result;
      if (error) {
        setCalendarItemError(error.message || "That church event could not be saved yet.");
        return;
      }
      if (!data) {
        setCalendarItemError("That church event could not be saved yet.");
        return;
      }
      setCalendarEvents((current) => {
        const others = (current || []).filter((entry) => entry.id !== data.id);
        return [data, ...others];
      });
      await recordActivity?.({
        action: editingCalendarEventId ? "updated" : "created",
        entityType: "calendar_event",
        entityId: data.id,
        entityTitle: data.title,
        summary: `${profile?.full_name || "A staff member"} ${editingCalendarEventId ? "updated" : "added"} calendar event "${data.title}".`,
        metadata: { event_date: data.event_date },
      });
    }
    setCalendarItemError("");
    setEditingCalendarEventId(null);
    setCalendarItemForm({ calendar_type: "churchEvents", title: "", event_date: "", start_time: "", end_time: "", location: "", notes: "" });
    setShowCalendarItemForm(false);
  };

  const openCalendarEventEditor = (item) => {
    if (!item?.editable || !item?.source) return;
    setEditingCalendarEventId(item.source.id);
    setCalendarItemError("");
    setCalendarItemForm({
      calendar_type: "churchEvents",
      title: item.source.title || "",
      event_date: item.source.event_date || "",
      start_time: item.source.start_time || "",
      end_time: item.source.end_time || "",
      location: item.source.location || "",
      notes: stripGoogleCalendarMetadata(item.source.notes),
    });
    setShowCalendarItemForm(true);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const closeCalendarItemForm = () => {
    setShowCalendarItemForm(false);
    setEditingCalendarEventId(null);
    setCalendarItemError("");
    setCalendarItemForm({ calendar_type: "churchEvents", title: "", event_date: "", start_time: "", end_time: "", location: "", notes: "" });
  };

  const openCalendarItem = (item) => {
    if (!item) return;
    setSelectedCalendarItem(item);
  };

  const openSelectedCalendarItemTarget = () => {
    if (!selectedCalendarItem) return;
    if (selectedCalendarItem.editable) {
      openCalendarEventEditor(selectedCalendarItem);
      return;
    }
    if (selectedCalendarItem.type === "myTasks") {
      setActive?.("tasks");
      return;
    }
    if (selectedCalendarItem.type === "churchEvents" && String(selectedCalendarItem.id || "").startsWith("event-")) {
      setActive?.("events-board");
    }
  };

  return (
    <div className="fadeIn mobile-pad" style={{...widePageStyle,textAlign:"left"}}>
      <div className="page-header calendar-page-header" style={{display:"grid",gridTemplateColumns:"1fr auto",gap:16,alignItems:"center",marginBottom:24,textAlign:"left"}}>
        <div style={{textAlign:"left"}}>
          <h2 style={pageTitleStyle}>Calendar</h2>
        </div>
        <div className="page-actions" style={{display:"flex",justifyContent:"flex-end"}}>
          <button className="btn-gold calendar-add-button" onClick={() => showCalendarItemForm ? closeCalendarItemForm() : setShowCalendarItemForm(true)}>
            <Icons.plus /> {showCalendarItemForm ? "Close Form" : "Add To Calendar"}
          </button>
        </div>
      </div>
      {showCalendarItemForm && (
        <div className="card" style={{padding:20,display:"grid",gap:12,marginBottom:18,textAlign:"left"}}>
          <div style={{display:"grid",gap:6}}>
            <label style={{fontSize:12,color:C.muted}}>Calendar</label>
            <select className="input-field" value={calendarItemForm.calendar_type} onChange={(e)=>setCalendarItemForm((current) => ({ ...current, calendar_type: e.target.value }))} style={{background:C.surface}} disabled={!!editingCalendarEventId}>
              <option value="churchEvents">Church Events</option>
              <option value="myTasks">My Tasks</option>
            </select>
          </div>
          <div style={{display:"grid",gap:6}}>
            <label style={{fontSize:12,color:C.muted}}>{calendarItemForm.calendar_type === "myTasks" ? "Task Name" : "Event Name"}</label>
            <input className="input-field" value={calendarItemForm.title} onChange={(e)=>setCalendarItemForm((current) => ({ ...current, title: e.target.value }))} placeholder={calendarItemForm.calendar_type === "myTasks" ? "Example: Finish camp follow-up email" : "Example: Leadership Prayer Night"} />
          </div>
          <div className="mobile-two-stack" style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:12}}>
            <div style={{display:"grid",gap:6}}>
              <label style={{fontSize:12,color:C.muted}}>Date</label>
              <input className="input-field" type="date" value={calendarItemForm.event_date} onChange={(e)=>setCalendarItemForm((current) => ({ ...current, event_date: e.target.value }))} />
            </div>
            {calendarItemForm.calendar_type === "churchEvents" && (
              <div style={{display:"grid",gap:6}}>
                <label style={{fontSize:12,color:C.muted}}>Location</label>
                <input className="input-field" value={calendarItemForm.location} onChange={(e)=>setCalendarItemForm((current) => ({ ...current, location: e.target.value }))} placeholder="Example: Main Lobby" />
              </div>
            )}
          </div>
          {calendarItemForm.calendar_type === "churchEvents" && (
            <div className="mobile-two-stack" style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:12}}>
              <div style={{display:"grid",gap:6}}>
                <label style={{fontSize:12,color:C.muted}}>Start Time</label>
                <input className="input-field" type="time" value={calendarItemForm.start_time} onChange={(e)=>setCalendarItemForm((current) => ({ ...current, start_time: e.target.value }))} />
              </div>
              <div style={{display:"grid",gap:6}}>
                <label style={{fontSize:12,color:C.muted}}>End Time</label>
                <input className="input-field" type="time" value={calendarItemForm.end_time} onChange={(e)=>setCalendarItemForm((current) => ({ ...current, end_time: e.target.value }))} />
              </div>
            </div>
          )}
          <div style={{display:"grid",gap:6}}>
            <label style={{fontSize:12,color:C.muted}}>Notes</label>
            <textarea className="input-field" rows={3} value={calendarItemForm.notes} onChange={(e)=>setCalendarItemForm((current) => ({ ...current, notes: e.target.value }))} placeholder={calendarItemForm.calendar_type === "myTasks" ? "Add a quick note for this task" : "Anything your team should know"} style={{resize:"vertical"}} />
          </div>
          {calendarItemError && <div style={{fontSize:12,color:C.danger}}>{calendarItemError}</div>}
          <div style={{display:"flex",justifyContent:"flex-end",gap:10,flexWrap:"wrap"}}>
            <button className="btn-outline" onClick={closeCalendarItemForm}>Cancel</button>
            <button className="btn-gold" onClick={saveCalendarItem}>{editingCalendarEventId ? "Save Changes" : "Save"}</button>
          </div>
        </div>
      )}
      <div className="card" style={{padding:20,textAlign:"left"}}>
        <div style={{display:"grid",gap:12,marginBottom:18,textAlign:"left"}}>
          <div className="calendar-card-heading" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
            <h3 style={{...sectionTitleStyle,margin:0}}>
              {calendarCursor.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </h3>
            <div className="calendar-jump-controls" style={{display:"flex",gap:8,alignItems:"center",justifyContent:"flex-end",flexWrap:"wrap"}}>
              <span className="calendar-jump-label" style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:".08em"}}>Jump To</span>
              <div className="calendar-jump-selects" style={{display:"grid",gridTemplateColumns:"minmax(92px,1fr) 78px",gap:6,width:180}}>
                <select
                  className="input-field"
                  value={calendarCursor.getMonth()}
                  onChange={(e) => setCalendarCursor((current) => clampCalendarCursor(new Date(current.getFullYear(), Number(e.target.value), 1)))}
                  style={{background:C.surface,padding:"7px 9px",fontSize:12,borderRadius:10,fontWeight:700,color:C.text}}
                >
                  {months.map((month, index) => (
                    <option key={month} value={index}>{month}</option>
                  ))}
                </select>
                <select
                  className="input-field"
                  value={calendarCursor.getFullYear()}
                  onChange={(e) => setCalendarCursor((current) => clampCalendarCursor(new Date(Number(e.target.value), current.getMonth(), 1)))}
                  style={{background:C.surface,padding:"7px 9px",fontSize:12,borderRadius:10,fontWeight:700,color:C.text}}
                >
                  {calendarYears.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <p style={{color:C.muted,fontSize:13,lineHeight:1.6,margin:0}}>See the full month across the calendars you have turned on.</p>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            {officialGoogleCalendarIds.map((id, index) => {
              const active = resolvedGoogleCalendarFilters[id] !== false;
              const label = officialGoogleCalendarTitleMap[id] || `Calendar ${index + 1}`;
              return (
                <button
                  key={id}
                  type="button"
                  className={active ? "btn-gold-compact" : "btn-outline"}
                  onClick={() => setGoogleCalendarFilters((current) => ({ ...current, [id]: !active }))}
                  style={active ? activeCalendarFilterStyle : inactiveCalendarFilterStyle}
                >
                  {active ? (
                    <>
                      <span style={activeCalendarCheckStyle}>✓</span>
                      <span>{label}</span>
                    </>
                  ) : label}
                </button>
              );
            })}
            {filterOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                className={calendarFilters[option.key] ? "btn-gold-compact" : "btn-outline"}
                onClick={() => setCalendarFilters((current) => ({ ...current, [option.key]: !current[option.key] }))}
                style={calendarFilters[option.key] ? activeCalendarFilterStyle : inactiveCalendarFilterStyle}
              >
                {calendarFilters[option.key] ? (
                  <>
                    <span style={activeCalendarCheckStyle}>✓</span>
                    <span>{option.label}</span>
                  </>
                ) : option.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{display:"grid",gap:12,marginBottom:18,paddingBottom:18,borderBottom:`1px solid ${C.border}`}} />
        {selectedCalendarItem && (
          <div className="card" style={{padding:16,display:"grid",gap:10,marginBottom:18,textAlign:"left",background:"rgba(255,255,255,.03)"}}>
            <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start",flexWrap:"wrap"}}>
              <div style={{minWidth:0}}>
                <div style={{fontSize:16,fontWeight:600,color:C.text,lineHeight:1.35}}>{selectedCalendarItem.title}</div>
                <div style={{fontSize:12,color:C.muted,lineHeight:1.6,marginTop:4}}>
                  {fmtDate(selectedCalendarItem.date)}{selectedCalendarItem.detail ? ` • ${selectedCalendarItem.detail}` : ""}
                </div>
              </div>
              <div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"flex-end"}}>
                {(selectedCalendarItem.editable || selectedCalendarItem.type === "myTasks" || (selectedCalendarItem.type === "churchEvents" && String(selectedCalendarItem.id || "").startsWith("event-"))) && (
                  <button className="btn-gold-compact" onClick={openSelectedCalendarItemTarget}>
                    {selectedCalendarItem.editable ? "Edit" : selectedCalendarItem.type === "myTasks" ? "Open Task" : "Open Event"}
                  </button>
                )}
                <button className="btn-outline" onClick={() => setSelectedCalendarItem(null)} style={{padding:"6px 12px",fontSize:12}}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
        {!visibleMonthItems.length && (
          <p style={{color:C.muted,fontSize:13,marginBottom:16}}>Nothing is showing for the calendars you have selected this month.</p>
        )}
            <div style={{overflowX:"auto",paddingBottom:4}}>
              <div style={{minWidth:760}}>
                <div style={{display:"grid",gridTemplateColumns:"repeat(7,minmax(0,1fr))",gap:6,marginBottom:8}}>
                  {weekdayLabels.map((label) => (
                    <div key={label} style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:".08em",textAlign:"center"}}>
                      {label.slice(0, 3)}
                    </div>
                  ))}
                </div>
                <div className="calendar-month-grid" style={{display:"grid",gridTemplateColumns:"repeat(7,minmax(0,1fr))",gap:6}}>
                  {monthGridDays.map((day) => {
                    const visibleItems = day.items.slice(0, 3);
                    const hiddenCount = Math.max(0, day.items.length - visibleItems.length);
                    return (
                      <div
                        key={day.key}
                        style={{
                          minHeight:112,
                          padding:8,
                          borderRadius:12,
                          border:day.isToday ? `1px solid ${C.goldDim}` : `1px solid ${C.border}`,
                          background:day.isPast
                            ? "linear-gradient(135deg, rgba(255,255,255,.025), rgba(255,255,255,.01))"
                            : day.isCurrentMonth ? C.card : "rgba(255,255,255,.025)",
                          opacity:day.isCurrentMonth ? (day.isPast ? .62 : 1) : .45,
                          display:"grid",
                          alignContent:"start",
                          gap:6,
                          minWidth:0,
                        }}
                      >
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:6}}>
                          <span style={{fontSize:12,fontWeight:700,color:day.isToday ? C.gold : day.isPast ? C.muted : C.text}}>
                            {day.date.getDate()}
                          </span>
                          {day.isToday && <span style={{fontSize:8,color:C.gold,textTransform:"uppercase",letterSpacing:".08em"}}>Today</span>}
                          {!day.isToday && day.isPast && day.isCurrentMonth && <span style={{fontSize:8,color:C.muted,textTransform:"uppercase",letterSpacing:".08em"}}>Past</span>}
                        </div>
                        <div style={{display:"grid",gap:4,minWidth:0}}>
                          {visibleItems.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => openCalendarItem(item)}
                              title={item.title}
                              style={{
                                border:`1px solid ${item.tone}33`,
                                borderRadius:8,
                                background:day.isPast ? "rgba(255,255,255,.035)" : `${item.tone}12`,
                                color:day.isPast ? C.muted : C.text,
                                cursor:"pointer",
                                fontSize:10,
                                lineHeight:1.25,
                                padding:"5px 6px",
                                textAlign:"left",
                                whiteSpace:"nowrap",
                                overflow:"hidden",
                                textOverflow:"ellipsis",
                                minWidth:0,
                              }}
                            >
                              {item.title}
                            </button>
                          ))}
                          {hiddenCount > 0 && (
                            <button
                              type="button"
                              onClick={() => setSelectedCalendarItem(day.items[3])}
                              style={{border:"none",background:"transparent",color:C.gold,fontSize:10,textAlign:"left",padding:0,cursor:"pointer"}}
                            >
                              +{hiddenCount} more
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const currentPath = typeof window !== "undefined" ? window.location.pathname.replace(/\/+$/, "") : "";
  const pathSegments = currentPath.split("/").filter(Boolean);
  const isNewPublicEventRequestRoute = pathSegments[0] === "event-request" && pathSegments[1] === "new";
  const publicEventRequestChurchCode = isNewPublicEventRequestRoute ? pathSegments[2] || "" : "";
  const publicEventRequestToken = pathSegments[0] === "event-request" && !isNewPublicEventRequestRoute ? pathSegments[1] || "" : "";
  const isPublicEventRequestRoute = currentPath === "/event-request" || isNewPublicEventRequestRoute || !!publicEventRequestToken;
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [church, setChurch] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [staffAvailabilityRequests, setStaffAvailabilityRequests] = useState([]);
  const [churchLockupAssignments, setChurchLockupAssignments] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [ministries, setMinistries] = useState([]);
  const [eventRequests, setEventRequests] = useState(null);
  const [trashItems, setTrashItems] = useState([]);
  const [previewUsers, setPreviewUsers] = useState([]);
  const [active, setActive] = useState(getStoredActivePage);
  const [taskOpenRequest, setTaskOpenRequest] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [readNotificationIds, setReadNotificationIds] = useState([]);
  const [archivedNotificationIds, setArchivedNotificationIds] = useState([]);
  const [persistentNotifications, setPersistentNotifications] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [showTutorial, setShowTutorial] = useState(false);
  const browserPermission = typeof Notification === "undefined" ? "unsupported" : Notification.permission;
  const shownNotificationIdsRef = useRef(new Set());
  const deadlineNotificationKeysRef = useRef(new Set());
  const loadedUserIdRef = useRef(null);
  const tutorialAutoPromptedUserRef = useRef(null);
  const loggedLoginActivityRef = useRef(new Set());

  const allowedPages = new Set([
    "dashboard",
    "account",
    "workspaces",
    "events-board",
    "content-media-board",
    "operations-board",
    "tasks",
    "trash",
    "faq",
    "budget",
    "calendar",
    ...(shouldShowChurchTeam(profile, church) ? ["church-team"] : []),
  ]);
  const safeActive = allowedPages.has(active) ? active : "dashboard";

  const refreshActivityLogs = useCallback(async (churchIdOverride = church?.id) => {
    if (!churchIdOverride || churchIdOverride === "preview" || !canViewActivityLog(profile)) {
      setActivityLogs([]);
      return;
    }
    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .eq("church_id", churchIdOverride)
      .order("created_at", { ascending: false })
      .limit(120);
    if (error) {
      setActivityLogs([]);
      return;
    }
    setActivityLogs((data || []).map(normalizeActivityLog));
  }, [church?.id, profile]);

  const recordActivity = useCallback(async (activity) => {
    const saved = await createActivityLog({
      churchId: church?.id,
      actorProfile: profile,
      ...activity,
    });
    if (saved) {
      if (canViewActivityLog(profile)) {
        setActivityLogs((current) => [saved, ...(current || []).filter((entry) => entry.id !== saved.id)].slice(0, 120));
      }
    }
    return saved;
  }, [church?.id, profile]);

  const notifications = useMemo(
    () => dedupeNotifications([
      ...persistentNotifications.map(normalizePersistentNotification),
      ...buildNotifications(tasks, eventRequests, purchaseOrders, staffAvailabilityRequests, profile),
    ]),
    [persistentNotifications, tasks, eventRequests, purchaseOrders, staffAvailabilityRequests, profile]
  );
  const validNotificationIds = useMemo(
    () => new Set(notifications.map((item) => item.id)),
    [notifications]
  );
  const cleanedReadNotificationIds = useMemo(
    () => [...new Set([
      ...readNotificationIds,
      ...notifications.filter((item) => item.readAt).map((item) => item.id),
    ])].filter((id) => validNotificationIds.has(id)),
    [readNotificationIds, notifications, validNotificationIds]
  );
  const cleanedArchivedNotificationIds = useMemo(
    () => [...new Set([
      ...archivedNotificationIds,
      ...notifications.filter((item) => item.archivedAt).map((item) => item.id),
    ])].filter((id) => validNotificationIds.has(id)),
    [archivedNotificationIds, notifications, validNotificationIds]
  );
  const unreadNotifications = useMemo(
    () => notifications.filter((item) => !cleanedReadNotificationIds.includes(item.id)),
    [notifications, cleanedReadNotificationIds]
  );
  const activeNotifications = useMemo(
    () => notifications.filter((item) => !cleanedArchivedNotificationIds.includes(item.id)),
    [notifications, cleanedArchivedNotificationIds]
  );
  const archivedNotifications = useMemo(
    () => notifications.filter((item) => cleanedArchivedNotificationIds.includes(item.id)),
    [notifications, cleanedArchivedNotificationIds]
  );

  const markNotificationRead = (id) => {
    if (!id) return;
    setReadNotificationIds((current) => current.includes(id) ? current : [...current, id]);
    const persistent = notifications.find((item) => item.id === id && item.rowId);
    if (persistent?.rowId && !persistent.readAt) {
      const readAt = new Date().toISOString();
      setPersistentNotifications((current) => (current || []).map((item) => item.id === persistent.rowId ? { ...item, read_at: readAt } : item));
      supabase.from("notifications").update({ read_at: readAt }).eq("id", persistent.rowId).then(() => {});
    }
  };
  const archiveNotification = (id) => {
    if (!id) return;
    setArchivedNotificationIds((current) => current.includes(id) ? current : [...current, id]);
    const persistent = notifications.find((item) => item.id === id && item.rowId);
    if (persistent?.rowId && !persistent.archivedAt) {
      const archivedAt = new Date().toISOString();
      const readAt = persistent.readAt || archivedAt;
      setPersistentNotifications((current) => (current || []).map((item) => item.id === persistent.rowId ? { ...item, archived_at: archivedAt, read_at: item.read_at || readAt } : item));
      supabase.from("notifications").update({ archived_at: archivedAt, read_at: readAt }).eq("id", persistent.rowId).then(() => {});
    }
  };
  const restoreNotification = (id) => {
    if (!id) return;
    setArchivedNotificationIds((current) => current.filter((entry) => entry !== id));
    const persistent = notifications.find((item) => item.id === id && item.rowId);
    if (persistent?.rowId) {
      setPersistentNotifications((current) => (current || []).map((item) => item.id === persistent.rowId ? { ...item, archived_at: null } : item));
      supabase.from("notifications").update({ archived_at: null }).eq("id", persistent.rowId).then(() => {});
    }
  };

  const openNotificationTarget = (item) => {
    if (!item) return;
    markNotificationRead(item.id);
    if (item.target === "tasks") {
      if (item.taskId) {
        setTaskOpenRequest({
          taskId: item.taskId,
          commentId: item.commentId || null,
          requestId: crypto.randomUUID(),
        });
      }
      setActive("tasks");
      return;
    }
    setActive(item.target || "dashboard");
  };

  const clearTaskOpenRequest = useCallback(() => {
    setTaskOpenRequest(null);
  }, []);

  const startTutorial = useCallback(() => {
    setShowTutorial(true);
  }, []);

  const completeTutorial = useCallback(() => {
    if (!profile?.id) return;
    const completedAt = new Date().toISOString();
    setProfile((current) => current?.id === profile.id ? { ...current, walkthrough_completed_at: completedAt } : current);
    supabase
      .from("profiles")
      .update({ walkthrough_completed_at: completedAt })
      .eq("id", profile.id)
      .then(() => {});
  }, [profile?.id]);

  const moveItemToTrash = (item) => {
    if (!item) return;
    const record = {
      id: `${item.entity_type || "item"}-${item.payload?.id || Date.now()}-${Date.now()}`,
      deleted_at: new Date().toISOString(),
      ...item,
    };
    setTrashItems((current) => [record, ...(current || [])]);
  };

  const clearTrash = () => {
    if (!confirmDestructiveAction("Permanently clear every item in Trash? This cannot be undone.")) return;
    setTrashItems([]);
  };
  const restoreTrashItem = async (item) => {
    if (!item?.entity_type || !item?.payload) return;

    if (item.entity_type === "task") {
      const { data, error } = await supabase.from("tasks").upsert(item.payload).select().single();
      if (error) return;
      if (data) {
        const normalized = normalizeTask(data);
        setTasks((current) => {
          const others = (current || []).filter((entry) => entry.id !== normalized.id);
          return [normalized, ...others];
        });
      }
    } else if (item.entity_type === "event_request") {
      const { data, error } = await supabase.from("event_requests").upsert(item.payload).select().single();
      if (error) return;
      if (data) {
        setEventRequests((current) => {
          const existing = current || [];
          const others = existing.filter((entry) => entry.id !== data.id);
          return [data, ...others];
        });
      }
    } else if (item.entity_type === "event_plan") {
      const payload = {
        id: item.payload.id,
        church_id: item.payload.church_id,
        linked_event_request_id: item.payload.linked_event_request_id || null,
        title: item.payload.title,
        event_name: item.payload.event_name || item.payload.title || "",
        owner_name: item.payload.owner_name,
        visibility: item.payload.visibility || "shared",
        start_date: item.payload.start_date || null,
        end_date: item.payload.end_date || null,
        start_time: item.payload.start_time || null,
        end_time: item.payload.end_time || null,
        location: item.payload.location || "",
        main_contact: item.payload.main_contact || "",
        timeline_items: Array.isArray(item.payload.timeline_items) ? item.payload.timeline_items : [],
        checklist_items: Array.isArray(item.payload.checklist_items) ? item.payload.checklist_items : [],
        notes_entries: Array.isArray(item.payload.notes_entries) ? item.payload.notes_entries : [],
        summary: item.payload.summary || null,
        target_date: item.payload.target_date || null,
        steps: Array.isArray(item.payload.steps) ? item.payload.steps : [],
        created_at: item.payload.created_at || new Date().toISOString(),
      };
      const { error } = await supabase.from("event_workflows").upsert(payload);
      if (error) return;
    } else {
      return;
    }

    setTrashItems((current) => (current || []).filter((entry) => entry.id !== item.id));
  };

  const loadData = async (uid) => {
    loadedUserIdRef.current = uid || null;
    setLoading(true);
    const { data: authState } = await supabase.auth.getUser();
    const authUser = authState?.user || null;
    const authEmail = authUser?.email || "";
    let { data: profileRow } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
    let prof = profileRow;

    if (!prof) {
      const staffId = authUser?.user_metadata?.staff_id;
      const churchId = authUser?.user_metadata?.church_id;

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
        prof = createProfilePayload(uid, staffRow.church_id, staffRow, authEmail || staffRow.email || "");
        await supabase.from("profiles").upsert(prof);
      }
    }

    if (prof && authEmail && prof.email !== authEmail) {
      prof = { ...prof, email: authEmail };
      await supabase.from("profiles").update({ email: authEmail }).eq("id", uid);
      if (prof.staff_id) {
        await supabase.from("church_staff").update({ email: authEmail }).eq("id", prof.staff_id);
      }
    }

    let normalizedProfile = prof ? normalizeAccessUser(prof) : null;
    if (typeof window !== "undefined" && normalizedProfile?.id) {
      const storedPhoto = window.localStorage.getItem(`shepherd-profile-photo:${normalizedProfile.id}`);
      if (storedPhoto) normalizedProfile = { ...normalizedProfile, photo_url: storedPhoto };
    }
    if (typeof window !== "undefined") {
      const rawTrash = window.localStorage.getItem(getTrashStorageKey(prof?.church_id));
      setTrashItems(rawTrash ? JSON.parse(rawTrash) : []);
    }
    if (prof?.id && typeof window !== "undefined") {
      const raw = window.localStorage.getItem(getNotificationStorageKey(prof.id));
      setReadNotificationIds(raw ? JSON.parse(raw) : []);
      const archivedRaw = window.localStorage.getItem(getArchivedNotificationStorageKey(prof.id));
      setArchivedNotificationIds(archivedRaw ? JSON.parse(archivedRaw) : []);
    } else {
      setReadNotificationIds([]);
      setArchivedNotificationIds([]);
      setPersistentNotifications([]);
      setTrashItems([]);
    }
    if (prof?.church_id) {
      const [ch, t, cla, staff, profileRows, notificationRows] = await Promise.all([
        supabase.from("churches").select("*").eq("id", prof.church_id).single(),
        supabase.from("tasks").select("*").eq("church_id", prof.church_id).order("created_at", { ascending: false }),
        supabase.from("church_lockup_assignments").select("*").eq("church_id", prof.church_id).order("week_of", { ascending: true }),
        supabase.from("church_staff").select("*").eq("church_id", prof.church_id).order("full_name"),
        supabase.from("profiles").select("id,staff_id,full_name,current_focus_task_id,current_focus_updated_at").eq("church_id", prof.church_id),
        supabase.from("notifications").select("*").eq("recipient_profile_id", prof.id).order("created_at", { ascending: false }).limit(100),
      ]);
      const enhancedProfile = normalizedProfile
        ? {
            ...normalizedProfile,
            is_account_admin: isChurchAccountAdmin(normalizedProfile, ch.data),
          }
        : normalizedProfile;
      setProfile(enhancedProfile);
      setChurch(ch.data);
      setTasks((t.data || []).map(normalizeTask));
      setChurchLockupAssignments((cla.data || []).map(normalizeChurchLockupAssignment));
      setPersistentNotifications(notificationRows.data || []);
      if (canViewActivityLog(enhancedProfile)) {
        supabase
          .from("activity_logs")
          .select("*")
          .eq("church_id", prof.church_id)
          .order("created_at", { ascending: false })
          .limit(120)
          .then(({ data, error }) => {
            setActivityLogs(error ? [] : (data || []).map(normalizeActivityLog));
          });
      } else {
        setActivityLogs([]);
      }
      const profileFocusMap = new Map((profileRows.data || []).map((entry) => [entry.staff_id || entry.id || entry.full_name, entry]));
      setPreviewUsers((staff.data || []).map((entry) => {
        const match = profileFocusMap.get(entry.id)
          || (profileRows.data || []).find((row) => row.staff_id === entry.id || samePerson(row.full_name, entry.full_name));
        return normalizeAccessUser({
          ...entry,
          current_focus_task_id: match?.current_focus_task_id || null,
          current_focus_updated_at: match?.current_focus_updated_at || null,
        });
      }));
      const loginActivityKey = `${prof.church_id}:${uid}`;
      if (!loggedLoginActivityRef.current.has(loginActivityKey) && enhancedProfile?.id) {
        loggedLoginActivityRef.current.add(loginActivityKey);
        createActivityLog({
          churchId: prof.church_id,
          actorProfile: enhancedProfile,
          action: "logged_in",
          entityType: "login",
          entityId: enhancedProfile.id,
          entityTitle: enhancedProfile.full_name || enhancedProfile.email || "User",
          summary: `${enhancedProfile.full_name || enhancedProfile.email || "A user"} logged in.`,
        }).then((saved) => {
          if (saved && canViewActivityLog(enhancedProfile)) setActivityLogs((current) => [saved, ...(current || []).filter((entry) => entry.id !== saved.id)].slice(0, 120));
        });
      }
      setLoading(false);

      Promise.all([
        supabase.from("event_requests").select("*").eq("church_id", prof.church_id).order("created_at", { ascending: false }),
        supabase.from("transactions").select("*").eq("church_id", prof.church_id).order("date", { ascending: false }),
        supabase.from("purchase_orders").select("*").eq("church_id", prof.church_id).order("created_at", { ascending: false }),
        supabase.from("staff_availability_requests").select("*").eq("church_id", prof.church_id).order("created_at", { ascending: false }),
        supabase.from("calendar_events").select("*").eq("church_id", prof.church_id).order("event_date", { ascending: true }),
        supabase.from("ministries").select("*").eq("church_id", prof.church_id),
      ]).then(([er, tr, po, sar, ce, m]) => {
        setEventRequests(er.data || []);
        setTransactions(tr.data || []);
        setPurchaseOrders((po.data || []).map(normalizePurchaseOrder));
        setStaffAvailabilityRequests((sar.data || []).map(normalizeStaffAvailabilityRequest));
        setCalendarEvents(ce.data || []);
        setMinistries(m.data || []);
      }).catch(() => {});
      return;
    } else {
      setProfile(normalizedProfile);
      setChurch(null);
      setTasks([]);
      setEventRequests(null);
      setTransactions([]);
      setPurchaseOrders([]);
      setStaffAvailabilityRequests([]);
      setChurchLockupAssignments([]);
      setCalendarEvents([]);
      setMinistries([]);
      setPreviewUsers([]);
      setPersistentNotifications([]);
      setActivityLogs([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!profile?.id) return;
    window.localStorage.setItem(getNotificationStorageKey(profile.id), JSON.stringify(cleanedReadNotificationIds));
  }, [profile?.id, cleanedReadNotificationIds]);

  useEffect(() => {
    if (!profile?.id) return;
    window.localStorage.setItem(getArchivedNotificationStorageKey(profile.id), JSON.stringify(cleanedArchivedNotificationIds));
  }, [profile?.id, cleanedArchivedNotificationIds]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isPublicEventRequestRoute) return;
    window.localStorage.setItem(ACTIVE_PAGE_STORAGE_KEY, safeActive);
    const nextPath = PAGE_PATHS[safeActive] || "/dashboard";
    if (window.location.pathname !== nextPath) {
      window.history.pushState({ shepherdPage: safeActive }, "", nextPath);
    }
  }, [safeActive, isPublicEventRequestRoute]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handlePopState = () => {
      const pageFromPath = getPageFromPath();
      if (pageFromPath) setActive(pageFromPath);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !church?.id) return;
    window.localStorage.setItem(getTrashStorageKey(church.id), JSON.stringify(trashItems));
  }, [church?.id, trashItems]);

  useEffect(() => {
    if (!profile?.id) return undefined;
    const channel = supabase
      .channel(`notifications-${profile.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `recipient_profile_id=eq.${profile.id}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setPersistentNotifications((current) => (current || []).filter((item) => item.id !== payload.old?.id));
            return;
          }
          if (payload.new?.id) {
            setPersistentNotifications((current) => {
              const others = (current || []).filter((item) => item.id !== payload.new.id);
              return [payload.new, ...others].sort((left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0));
            });
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id || !church?.id || !tasks.length) return;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfTomorrow = new Date(today);
    endOfTomorrow.setDate(endOfTomorrow.getDate() + 2);
    const isSeniorPastorViewer = isSeniorPastor(profile) || samePerson(profile?.title, "Senior Pastor");

    tasks.forEach((task) => {
      if (!task?.id || task.status === "done" || !task.due_date) return;
      const dueDate = parseAppDate(task.due_date);
      if (!dueDate) return;
      const dueDay = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
      const assignedToMe = samePerson(task.assignee, profile.full_name);
      const taskIsOverdue = isAfterDueDate(task.due_date, now);
      const taskDueSoon = dueDay.getTime() >= today.getTime() && dueDay.getTime() < endOfTomorrow.getTime();

      if (assignedToMe && (taskIsOverdue || taskDueSoon)) {
        const type = taskIsOverdue ? "task_overdue" : "task_due_soon";
        const sourceKey = `${task.id}:${type}:${task.due_date}`;
        if (!deadlineNotificationKeysRef.current.has(sourceKey)) {
          deadlineNotificationKeysRef.current.add(sourceKey);
          createPersistentNotification({
            churchId: church.id,
            actorProfile: profile,
            recipientProfileId: profile.id,
            type,
            title: taskIsOverdue ? "Task Overdue" : getRelativeDueLabel(task.due_date),
            detail: taskIsOverdue ? `${task.title} is overdue.` : `${task.title} needs attention soon.`,
            target: "tasks",
            taskId: task.id,
            sourceKey,
            data: { taskTitle: task.title, dueDate: task.due_date },
          });
        }
      }

      if (isSeniorPastorViewer && !assignedToMe && (taskIsOverdue || taskDueSoon)) {
        const type = taskIsOverdue ? "team_task_overdue" : "team_task_due_soon";
        const sourceKey = `${task.id}:${type}:${task.due_date}`;
        if (!deadlineNotificationKeysRef.current.has(sourceKey)) {
          deadlineNotificationKeysRef.current.add(sourceKey);
          createPersistentNotification({
            churchId: church.id,
            actorProfile: profile,
            recipientProfileId: profile.id,
            type,
            title: taskIsOverdue ? "Team Task Needs Attention" : "Team Task Due Soon",
            detail: `${task.title} assigned to ${task.assignee || "a team member"} is ${taskIsOverdue ? "overdue" : getRelativeDueLabel(task.due_date).toLowerCase()}.`,
            target: "tasks",
            taskId: task.id,
            sourceKey,
            data: { taskTitle: task.title, assignee: task.assignee || "", dueDate: task.due_date },
          });
        }
      }
    });
  }, [tasks, profile, church]);

  useEffect(() => {
    if (typeof window === "undefined" || loading || !session || !profile?.id || isPublicEventRequestRoute) return;
    const storageKey = getTutorialCompletedStorageKey(profile.id);
    if (profile.walkthrough_completed_at) return;
    if (window.localStorage.getItem(storageKey) === "true") {
      const completedAt = new Date().toISOString();
      setProfile((current) => current?.id === profile.id ? { ...current, walkthrough_completed_at: completedAt } : current);
      supabase
        .from("profiles")
        .update({ walkthrough_completed_at: completedAt })
        .eq("id", profile.id)
        .then(() => {});
      return;
    }
    if (tutorialAutoPromptedUserRef.current === profile.id) return;
    const serverPromptCount = Number.parseInt(profile.walkthrough_prompt_count || 0, 10) || 0;
    const promptCountKey = getTutorialPromptCountStorageKey(profile.id);
    const localPromptCount = Number.parseInt(window.localStorage.getItem(promptCountKey) || "0", 10) || 0;
    const promptCount = Math.max(serverPromptCount, localPromptCount);
    if (promptCount >= TUTORIAL_AUTO_PROMPT_LIMIT) return;
    const nextPromptCount = promptCount + 1;
    tutorialAutoPromptedUserRef.current = profile.id;
    window.localStorage.setItem(promptCountKey, String(nextPromptCount));
    setProfile((current) => current?.id === profile.id ? { ...current, walkthrough_prompt_count: nextPromptCount } : current);
    supabase
      .from("profiles")
      .update({ walkthrough_prompt_count: nextPromptCount })
      .eq("id", profile.id)
      .then(() => {});
    const timer = window.setTimeout(() => setShowTutorial(true), 0);
    return () => window.clearTimeout(timer);
  }, [loading, session, profile?.id, profile?.walkthrough_completed_at, profile?.walkthrough_prompt_count, isPublicEventRequestRoute, setProfile]);

  useEffect(() => {
    if (typeof Notification === "undefined" || browserPermission !== "granted") return;
    const unseen = unreadNotifications
      .slice(0, 3)
      .filter((item) => !shownNotificationIdsRef.current.has(item.id));

    if (unseen.length === 0) return;

    unseen.forEach((item) => {
      new Notification(item.title, { body: item.detail });
      shownNotificationIdsRef.current.add(item.id);
    });
  }, [browserPermission, unreadNotifications]);

  useEffect(() => {
    const initializeSession = async () => {
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const isGoogleCalendarOauth = url.searchParams.get("google_calendar_oauth") === "1"
          || hasStoredGoogleCalendarOAuthState(state);
        if (code && !isGoogleCalendarOauth) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error) {
            url.searchParams.delete("code");
            url.searchParams.delete("state");
            window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
          }
        }
      }
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session) loadData(session.user.id);
      else setLoading(false);
    };
    initializeSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      const nextUserId = session?.user?.id || null;
      if (event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
        return;
      }
      if (event === "SIGNED_IN" && nextUserId && loadedUserIdRef.current === nextUserId) {
        return;
      }
      if (session) loadData(session.user.id);
      else {
        loadedUserIdRef.current = null;
        setProfile(null);
        setChurch(null);
        setTasks([]);
        setTransactions([]);
        setPurchaseOrders([]);
        setMinistries([]);
        setPreviewUsers([]);
        setPersistentNotifications([]);
        setActivityLogs([]);
        loggedLoginActivityRef.current.clear();
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
          <div style={{marginBottom:16,display:"flex",justifyContent:"center"}}>
            <BrandMark size={48} color={C.gold}/>
          </div>
          <div style={{width:32,height:32,border:`2px solid ${C.border}`,borderTopColor:C.gold,borderRadius:"50%",animation:"spin .8s linear infinite",margin:"0 auto"}}/>
        </div>
      </div>
    </>
  );

  if (isPublicEventRequestRoute) {
    return (
      <>
        <GS/>
        {publicEventRequestToken ? (
          <PublicEventRequestSharePage token={publicEventRequestToken} />
        ) : (
          <PublicEventRequestPage churchCode={publicEventRequestChurchCode} />
        )}
      </>
    );
  }

  if (!session) {
    return (
      <>
        <GS/>
        <AuthScreen/>
      </>
    );
  }

  const pages = {
    dashboard:  <Dashboard key={`dashboard-${profile?.id || "anon"}`} tasks={tasks} setActive={setActive} profile={profile} church={church} previewUsers={previewUsers} setProfile={setProfile} setPreviewUsers={setPreviewUsers} churchLockupAssignments={churchLockupAssignments} notifications={activeNotifications.slice(0, 8)} archivedNotifications={archivedNotifications.slice(0, 12)} unreadCount={unreadNotifications.length} readNotificationIds={cleanedReadNotificationIds} archiveNotification={archiveNotification} restoreNotification={restoreNotification} openNotificationTarget={openNotificationTarget}/>,
    account: <AccountPage profile={profile} setProfile={setProfile} church={church} setChurch={setChurch} previewUsers={previewUsers} calendarEvents={calendarEvents} setCalendarEvents={setCalendarEvents} session={session} onStartTutorial={startTutorial} activityLogs={activityLogs} refreshActivityLogs={() => refreshActivityLogs(church?.id)} recordActivity={recordActivity} />,
    "church-team": shouldShowChurchTeam(profile, church) ? <ChurchTeamPage church={church} profile={profile} setProfile={setProfile} previewUsers={previewUsers} setPreviewUsers={setPreviewUsers} /> : <Dashboard key={`dashboard-${profile?.id || "anon"}`} tasks={tasks} setActive={setActive} profile={profile} church={church} previewUsers={previewUsers} setProfile={setProfile} setPreviewUsers={setPreviewUsers} churchLockupAssignments={churchLockupAssignments} notifications={activeNotifications.slice(0, 8)} archivedNotifications={archivedNotifications.slice(0, 12)} unreadCount={unreadNotifications.length} readNotificationIds={cleanedReadNotificationIds} archiveNotification={archiveNotification} restoreNotification={restoreNotification} openNotificationTarget={openNotificationTarget}/>,
    workspaces: <Workspaces setActive={setActive}/>,
    "events-board": <EventsBoard profile={profile} church={church} eventRequests={eventRequests} setEventRequests={setEventRequests} tasks={tasks} setTasks={setTasks} moveItemToTrash={moveItemToTrash} previewUsers={previewUsers} recordActivity={recordActivity}/>,
    "content-media-board": <ContentMediaBoard tasks={tasks} setTasks={setTasks} setActive={setActive} churchId={church?.id} recordActivity={recordActivity} />,
    "operations-board": <OperationsBoard profile={profile} church={church} previewUsers={previewUsers} staffAvailabilityRequests={staffAvailabilityRequests} setStaffAvailabilityRequests={setStaffAvailabilityRequests} churchLockupAssignments={churchLockupAssignments} setChurchLockupAssignments={setChurchLockupAssignments} setCalendarEvents={setCalendarEvents} recordActivity={recordActivity} />,
    tasks:      <Tasks tasks={tasks} setTasks={setTasks} churchId={church?.id} church={church} profile={profile} previewUsers={previewUsers} moveItemToTrash={moveItemToTrash} taskOpenRequest={taskOpenRequest} clearTaskOpenRequest={clearTaskOpenRequest} recordActivity={recordActivity}/>,
    faq: <FAQPage onStartTutorial={startTutorial} />,
    trash: <TrashPage trashItems={trashItems} clearTrash={clearTrash} restoreTrashItem={restoreTrashItem} />,
    budget:     <Budget transactions={transactions} setTransactions={setTransactions} purchaseOrders={purchaseOrders} setPurchaseOrders={setPurchaseOrders} churchId={church?.id} profile={profile} setProfile={setProfile} ministries={ministries} setMinistries={setMinistries} previewUsers={previewUsers} setPreviewUsers={setPreviewUsers} recordActivity={recordActivity}/>,
    ministries: <Ministries ministries={ministries}/>,
    calendar:   <CalendarView tasks={tasks} setTasks={setTasks} eventRequests={eventRequests || []} calendarEvents={calendarEvents} setCalendarEvents={setCalendarEvents} previewUsers={previewUsers} profile={profile} church={church} churchId={church?.id} setActive={setActive} recordActivity={recordActivity} />,
  };

  return (
    <>
      <GS/>
      <div className="app-shell" style={{display:"flex",minHeight:"100vh"}}>
        <Sidebar active={safeActive} setActive={setActive} profile={profile} church={church} onLogout={logout} collapsed={collapsed} setCollapsed={setCollapsed} unreadCount={unreadNotifications.length} onStartTutorial={startTutorial}/>
        <main style={{flex:1,minWidth:0,overflowY:"auto",background:C.bg}}>{pages[safeActive] || pages.dashboard}</main>
      </div>
      {showTutorial && (
        <ShepherdTutorial
          profile={profile}
          church={church}
          onComplete={completeTutorial}
          onClose={() => setShowTutorial(false)}
        />
      )}
    </>
  );
}
