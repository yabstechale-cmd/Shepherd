import { useState, useEffect, useMemo, useRef } from "react";
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
const fmt = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Math.abs(n || 0));
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—";
const fmtShortDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" }) : "—";
const CATEGORY_STORAGE_KEY = "shepherd-recent-task-categories";
const AUTH_CODE_LENGTH = 4;
const NOTIFICATION_STORAGE_PREFIX = "shepherd-notifications";
const TRASH_STORAGE_PREFIX = "shepherd-trash";
const ACTIVE_PAGE_STORAGE_KEY = "shepherd-active-page";
const EVENT_LOCATION_AREA_OPTIONS = ["Youth Room", "Kids Rooms", "Sanctuary", "Kitchen / Dining Area"];

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
    .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);backdrop-filter:blur(4px);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px}
    .modal{background:${C.card};border:1px solid ${C.border};border-radius:18px;width:100%;max-width:520px;padding:28px;max-height:90vh;overflow-y:auto}
    @media (max-width: 760px){
      .app-shell{flex-direction:column}
      .app-sidebar{width:100% !important;min-height:auto !important;border-right:none !important;border-bottom:1px solid ${C.border}}
      .app-sidebar-nav{display:flex;gap:8px;overflow-x:auto;padding:10px 12px !important}
      .app-sidebar-nav .nav-item{margin-bottom:0;flex-shrink:0}
      .app-sidebar-footer{padding:10px 12px !important}
      .section-header{flex-direction:column;align-items:flex-start !important;gap:12px}
      .section-header .btn-outline,.section-header .btn-gold{width:100%;justify-content:center}
      .dashboard-note-row{flex-direction:column}
      .dashboard-note-row .btn-outline{margin-left:0 !important;width:100%;justify-content:center}
      .dashboard-followup-row{flex-wrap:wrap}
      .page-header{grid-template-columns:1fr !important}
      .page-actions{justify-content:flex-start !important}
      .mobile-stack{grid-template-columns:1fr !important}
      .mobile-three-stack{grid-template-columns:1fr !important}
      .mobile-two-stack{grid-template-columns:1fr !important}
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
      .modal{padding:22px}
    }
  `}</style>
);

const normalizeAccessUser = (record) => ({
  ...record,
  ministries: Array.isArray(record?.ministries) ? record.ministries : [],
  staff_roles: Array.isArray(record?.staff_roles) ? record.staff_roles : (record?.role ? [record.role] : []),
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
const normalizeEventWorkflow = (workflow) => ({
  ...workflow,
  event_name: workflow?.event_name || workflow?.title || "",
  visibility: workflow?.visibility === "shared" ? "shared" : "private",
  location: workflow?.location || "",
  main_contact: workflow?.main_contact || "",
  timeline_items: Array.isArray(workflow?.timeline_items) ? workflow.timeline_items : [],
  checklist_items: Array.isArray(workflow?.checklist_items) ? workflow.checklist_items : [],
  notes_entries: Array.isArray(workflow?.notes_entries) ? workflow.notes_entries : [],
  steps: Array.isArray(workflow?.steps) ? workflow.steps : [],
});
const normalizeAutomation = (automation) => ({
  ...automation,
  status: ["draft", "active", "paused", "archived"].includes(automation?.status) ? automation.status : "draft",
  trigger_config: automation?.trigger_config && typeof automation.trigger_config === "object" ? automation.trigger_config : {},
  action_config: automation?.action_config && typeof automation.action_config === "object" ? automation.action_config : {},
  approval_required: automation?.approval_required ?? true,
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
    church?.account_admin_user_id === profile.id
    || (church?.account_admin_email && samePerson(church.account_admin_email, profile.email))
    || profile?.is_account_admin
  );
const isStaffAccountAdmin = (staffUser, church) =>
  !!staffUser && (
    !!staffUser?.is_account_admin
    || (church?.account_admin_user_id && church.account_admin_user_id === staffUser.auth_user_id)
    || (church?.account_admin_email && samePerson(church.account_admin_email, staffUser.email))
  );
const hasChurchAdminRole = (profile) =>
  ["church_administrator", "admin", "senior_pastor"].includes(profile?.role)
  || samePerson(profile?.title, "Church Administrator")
  || samePerson(profile?.title, "Senior Pastor");
const hasAdministrativeOversight = (profile, church) =>
  !!profile && (
    profile?.canSeeAdminOverview
    || profile?.can_see_admin_overview
    || hasChurchAdminRole(profile)
    || isChurchAccountAdmin(profile, church)
  );
const shouldShowChurchTeam = (profile, church) =>
  canManageChurchTeam(profile, church)
  || canEditChurchTeam(profile, church)
  || (!church?.account_admin_user_id && !church?.account_admin_email);
const canManageChurchTeam = (profile, church) =>
  isChurchAccountAdmin(profile, church);
const canEditChurchTeam = (profile, church) => hasAdministrativeOversight(profile, church);
const canDeleteChurchAccount = (profile, church) => hasAdministrativeOversight(profile, church);
const canManageAllTasks = (profile, church) => hasAdministrativeOversight(profile, church);
const canEditTask = (profile, church, task) => canManageAllTasks(profile, church) || samePerson(task?.assignee, profile?.full_name);
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
  && !getTaskReviewerDecision(task, profile?.full_name)
  && ["in-review"].includes(task?.status || "todo");
const canManagePeople = (profile, church) => hasAdministrativeOversight(profile, church);
const isFinanceUser = (profile) => profileHasMinistry(profile, "Finances") || (profile?.staff_roles || []).includes("finance_director") || profile?.role === "finance_director";
const isFinanceDirector = (profile) => (profile?.staff_roles || []).includes("finance_director") || profile?.role === "finance_director";
const isSeniorPastor = (profile) => (profile?.staff_roles || []).includes("senior_pastor") || profile?.role === "senior_pastor";
const isMinistryLedgerLead = (profile) => (profile?.staff_roles || [profile?.role]).some((roleValue) => MINISTRY_LEDGER_ROLE_VALUES.has(roleValue));
const getBudgetScopeMinistries = (profile) => {
  if (!profile) return [];
  if (isFinanceUser(profile)) return TASK_CATEGORIES;
  if (!isMinistryLedgerLead(profile)) return [];
  return Array.isArray(profile?.ministries) ? [...new Set(profile.ministries.filter(Boolean))] : [];
};
const canViewBudget = (profile) => isFinanceUser(profile) || getBudgetScopeMinistries(profile).length > 0;
const canApproveEventRequests = (profile, church) => hasAdministrativeOversight(profile, church);
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
const fetchChurchList = async () => {
  const { data, error } = await supabase.from("churches").select("*").order("name");
  if (error) throw error;
  return data || [];
};
const fetchChurchAccessById = async (churchId) => {
  if (!churchId) return { church: null, users: [] };
  const { data: church, error: churchError } = await supabase.from("churches").select("*").eq("id", churchId).maybeSingle();
  if (churchError) throw churchError;
  if (!church) throw new Error("That church could not be found.");
  const { data: users, error: usersError } = await supabase.from("church_staff").select("*").eq("church_id", church.id).order("full_name");
  if (usersError) throw usersError;
  return { church, users: (users || []).map(normalizeAccessUser) };
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
const STATUS_STYLES = {
  todo: { label: "Not Started", accent: C.gold, surface: "rgba(201,168,76,0.08)" },
  "in-progress": { label: "In Progress", accent: C.blue, surface: "rgba(91,143,232,0.08)" },
  "in-review": { label: "In Review", accent: C.purple, surface: "rgba(155,114,232,0.08)" },
  done: { label: "Done", accent: C.success, surface: "rgba(82,200,122,0.08)" },
};
const getNotificationStorageKey = (profileId) => `${NOTIFICATION_STORAGE_PREFIX}:${profileId}`;
const getTrashStorageKey = (churchId) => `${TRASH_STORAGE_PREFIX}:${churchId || "global"}`;
const getStoredActivePage = () => {
  if (typeof window === "undefined") return "dashboard";
  return window.localStorage.getItem(ACTIVE_PAGE_STORAGE_KEY) || "dashboard";
};
const formatAutomationTrigger = (automation) => {
  if (!automation) return "Trigger not configured";
  if (automation.trigger_type === "schedule") {
    const frequency = automation.trigger_config?.frequency;
    const day = automation.trigger_config?.day;
    const time = automation.trigger_config?.time;
    if (frequency === "weekly" && day && time) return `Every ${String(day).replace(/^./, (char) => char.toUpperCase())} at ${time}`;
    if (frequency === "daily" && time) return `Every day at ${time}`;
    if (frequency === "hourly") return "Runs hourly";
    return "Scheduled automation";
  }
  if (automation.trigger_type === "event") {
    const event = automation.trigger_config?.event;
    const status = automation.trigger_config?.status;
    if (event === "event_request_status_changed" && status) return `When an event request changes to ${status}`;
    if (event === "task_status_changed" && status) return `When a task changes to ${status}`;
    if (event === "task_created") return "When a new task is created";
    return "Event-based automation";
  }
  return "Trigger not configured";
};
const formatAutomationAction = (automation) => {
  const actionType = automation?.action_config?.type;
  if (actionType === "send_notification") {
    return automation?.action_config?.message || "Send a notification";
  }
  if (actionType === "create_task") {
    return automation?.action_config?.title
      ? `Create task: ${automation.action_config.title}`
      : "Create a new task";
  }
  if (actionType === "assign_task") {
    return automation?.action_config?.assignee_role
      ? `Assign a task to ${automation.action_config.assignee_role}`
      : "Assign a task";
  }
  if (actionType === "change_task_status") {
    return automation?.action_config?.status
      ? `Change task status to ${automation.action_config.status}`
      : "Change a task status";
  }
  if (actionType === "update_event_request_status") {
    return automation?.action_config?.status
      ? `Update event request to ${automation.action_config.status}`
      : "Update an event request";
  }
  return "Action not configured";
};
const formatAutomationRunTime = (timestamp) => {
  if (!timestamp) return "—";
  return new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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
const createDefaultEventChecklist = () => ([]);
const createEventPlanningBlank = (profile, request = null) => ({
  id: null,
  eventName: request?.event_name || "",
  startDate: request?.single_date || request?.multi_start_date || request?.recurring_start_date || "",
  endDate: request?.multi_end_date || request?.single_date || request?.recurring_start_date || "",
  location: request ? getEventLocationSummary(request) : "",
  mainContact: request?.contact_name || profile?.full_name || "",
  linkedRequestId: request?.id || "",
  visibility: "private",
});
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
  const due = new Date(date);
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diff = Math.round((dueDay - base) / 86400000);
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  if (diff < 0) return `Overdue since ${fmtDate(date)}`;
  return `Due ${fmtDate(date)}`;
};
const commentMentionsProfile = (comment, profile) => {
  if (!comment?.body || !profile?.full_name) return false;
  const body = comment.body.toLowerCase();
  const fullName = profile.full_name.trim().toLowerCase();
  const firstName = (profile.full_name.split(" ")[0] || "").trim().toLowerCase();
  return body.includes(`@${fullName}`) || (firstName && body.includes(`@${firstName}`));
};
const getMentionContext = (value, cursor) => {
  const beforeCursor = value.slice(0, cursor);
  const match = beforeCursor.match(/(?:^|\s)@([a-zA-Z][a-zA-Z\s]*)$/);
  if (!match) return null;
  const query = match[1];
  const tokenStart = cursor - query.length - 1;
  return {
    query,
    start: tokenStart,
    end: cursor,
  };
};
const renderCommentBody = (body) => {
  const parts = String(body || "").split(/(@[a-zA-Z]+(?:\s[a-zA-Z]+)?)/g);
  return parts.map((part, index) => {
    if (/^@[a-zA-Z]+(?:\s[a-zA-Z]+)?$/.test(part)) {
      return (
        <span
          key={`${part}-${index}`}
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
          {part.trim()}
        </span>
      );
    }
    return <span key={`${part}-${index}`}>{part}</span>;
  });
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
const canDeletePurchaseOrder = (profile, order) =>
  !!order && (
    (order.requester_id === profile?.id && ["pending", "in-review"].includes(order.status || "pending"))
    || canReviewPurchaseOrders(profile)
  );
const buildNotifications = (tasks, eventRequests, purchaseOrders, profile) => {
  if (!profile?.full_name) return [];
  const fullName = profile.full_name;
  const isAdminViewer = hasAdministrativeOversight(profile, null);
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
    const dueDate = task.due_date ? new Date(task.due_date) : null;
    const dueDay = dueDate ? new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()) : null;

    if (assignedToMe && task.status !== "done" && createdAt && now.getTime() - createdAt.getTime() < 3 * 86400000) {
      items.push({
        id: `assigned-${task.id}`,
        tone: C.blue,
        title: "New task assigned",
        detail: `${task.title} was assigned to you.`,
        target: "tasks",
        createdAt: createdAt.getTime(),
      });
    }

    if (assignedToMe && task.status !== "done" && dueDay && dueDay.getTime() < startOfToday.getTime()) {
      items.push({
        id: `overdue-${task.id}`,
        tone: C.danger,
        title: "Task overdue",
        detail: `${task.title} is overdue.`,
        target: "tasks",
        createdAt: dueDay.getTime(),
      });
    } else if (assignedToMe && task.status !== "done" && dueDay && dueDay.getTime() >= startOfToday.getTime() && dueDay.getTime() < endOfTomorrow.getTime()) {
      items.push({
        id: `due-${task.id}`,
        tone: C.gold,
        title: getRelativeDueLabel(task.due_date),
        detail: `${task.title} needs attention soon.`,
        target: "tasks",
        createdAt: dueDay.getTime(),
      });
    }

    if (isAdminViewer && task.status !== "done" && dueDay && dueDay.getTime() < startOfToday.getTime() && !assignedToMe) {
      items.push({
        id: `admin-overdue-${task.id}`,
        tone: C.danger,
        title: "Team task overdue",
        detail: `${task.title} assigned to ${task.assignee || "a team member"} is overdue.`,
        target: "tasks",
        createdAt: dueDay.getTime(),
      });
    } else if (isAdminViewer && task.status !== "done" && dueDay && dueDay.getTime() >= startOfToday.getTime() && dueDay.getTime() < endOfTomorrow.getTime() && !assignedToMe) {
      items.push({
        id: `admin-due-${task.id}`,
        tone: C.gold,
        title: "Team task due soon",
        detail: `${task.title} assigned to ${task.assignee || "a team member"} is ${getRelativeDueLabel(task.due_date).toLowerCase()}.`,
        target: "tasks",
        createdAt: dueDay.getTime(),
      });
    }

    if (reviewerForMe && task.status === "in-review") {
      items.push({
        id: `review-${task.id}-${normalizeName(fullName)}`,
        tone: C.purple,
        title: "Review requested",
        detail: `${task.title} is waiting on your review.`,
        target: "tasks",
        createdAt: dueDay?.getTime() || createdAt?.getTime() || now.getTime(),
      });
    }

    (task.comments || []).forEach((comment) => {
      if (!commentMentionsProfile(comment, profile)) return;
      if (samePerson(comment.author, fullName)) return;
      const commentDate = comment.created_at ? new Date(comment.created_at) : null;
      if (!commentDate) return;
      if (now.getTime() - commentDate.getTime() > 14 * 86400000) return;
      items.push({
        id: `comment-mention-${task.id}-${comment.id}-${normalizeName(fullName)}`,
        tone: C.blue,
        title: "You were mentioned in a task",
        detail: `${comment.author} mentioned you in ${task.title}.`,
        target: "tasks",
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

  return items.sort((a, b) => b.createdAt - a.createdAt);
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

// ── Sidebar ────────────────────────────────────────────────────────────────
function Sidebar({ active, setActive, profile, church, onLogout, collapsed, setCollapsed, unreadCount }) {
  const nav = [
    {id:"dashboard",label:"Dashboard",I:Icons.home},
    {id:"tasks",label:"Tasks",I:Icons.tasks},
    {id:"workspaces",label:"Workspaces",I:Icons.workspace},
    ...(canViewBudget(profile) ? [{id:"budget",label:"Finances",I:Icons.budget}] : []),
    {id:"calendar",label:"Calendar",I:Icons.calendar},
    ...(shouldShowChurchTeam(profile, church) ? [{id:"church-team",label:"Church Team",I:Icons.people}] : []),
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

function AccountPage({ profile, setProfile, church }) {
  const [photoMessage, setPhotoMessage] = useState("");
  const [emailForm, setEmailForm] = useState({ nextEmail: profile?.email || "", currentPassword: "" });
  const [emailMessage, setEmailMessage] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", password: "", confirmPassword: "" });
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [resetError, setResetError] = useState("");
  const [authEmail, setAuthEmail] = useState(profile?.email || "");
  const [deleteForm, setDeleteForm] = useState({ churchName: "", currentPassword: "" });
  const [deleteMessage, setDeleteMessage] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deletingChurch, setDeletingChurch] = useState(false);

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

  const handlePhotoUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const photoUrl = String(reader.result || "");
      if (typeof window !== "undefined" && profile?.id) {
        window.localStorage.setItem(`shepherd-profile-photo:${profile.id}`, photoUrl);
      }
      setProfile((current) => current ? { ...current, photo_url: photoUrl } : current);
      setPhotoMessage("Profile photo updated locally.");
    };
    reader.readAsDataURL(file);
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

  const deleteChurchAccount = async () => {
    setDeleteError("");
    setDeleteMessage("");
    if (!canDeleteChurchAccount(profile, church)) {
      setDeleteError("Only the Church Administrator or Senior Pastor can delete this church account.");
      return;
    }
    if (!church?.id) {
      setDeleteError("We couldn't find this church account.");
      return;
    }
    if (!deleteForm.churchName.trim() || deleteForm.churchName.trim() !== (church?.name || "")) {
      setDeleteError("Type the church name exactly to confirm deletion.");
      return;
    }
    if (!deleteForm.currentPassword) {
      setDeleteError("Enter your current password to confirm this deletion.");
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
    const { error } = await supabase.rpc("delete_church_account", { p_church_id: church.id });
    setDeletingChurch(false);
    if (error) {
      setDeleteError(error.message || "We couldn't delete this church account.");
      return;
    }
    setDeleteMessage("Church account deleted. Signing out...");
    await supabase.auth.signOut();
    if (typeof window !== "undefined") window.location.reload();
  };

  return (
    <div className="fadeIn mobile-pad" style={{padding:"32px 36px",maxWidth:980}}>
      <div style={{marginBottom:24,textAlign:"left"}}>
        <h2 style={pageTitleStyle}>Account</h2>
        <p style={{color:C.muted,fontSize:13,marginTop:4}}>Manage your profile photo, email, password, and account recovery.</p>
      </div>
      <div className="mobile-stack" style={{display:"grid",gridTemplateColumns:"320px 1fr",gap:18}}>
        <div className="card" style={{padding:22,textAlign:"left"}}>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center"}}>
            <div style={{width:112,height:112,borderRadius:"50%",background:`linear-gradient(135deg,${C.goldDim},${C.gold})`,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",fontSize:34,fontWeight:700,color:"#0f1117"}}>
              {profile?.photo_url ? <img src={profile.photo_url} alt={profile.full_name || "User"} style={{width:"100%",height:"100%",objectFit:"cover"}} /> : (profile?.full_name?.[0] || "U")}
            </div>
            <div style={{marginTop:14,fontSize:18,fontWeight:600,color:C.text}}>{profile?.full_name || "User"}</div>
            <div style={{marginTop:4,fontSize:12,color:C.muted}}>{roleLabel(profile)}</div>
            <label className="btn-outline" style={{marginTop:18,cursor:"pointer"}}>
              Add Profile Picture
              <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{display:"none"}} />
            </label>
            {photoMessage && <div style={{marginTop:10,fontSize:12,color:C.success}}>{photoMessage}</div>}
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:18}}>
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
          {canDeleteChurchAccount(profile, church) && (
            <div className="card" style={{padding:22,textAlign:"left",border:`1px solid rgba(224,82,82,.35)`}}>
              <h3 style={{...sectionTitleStyle,color:C.danger}}>Delete Church Account</h3>
              <p style={{fontSize:12,color:C.muted,marginTop:6,lineHeight:1.6}}>
                This permanently removes <span style={{color:C.text,fontWeight:600}}>{church?.name || "this church"}</span> from Shepherd, including staff access, tasks, boards, and stored church data. If you do not remember your password, use Password Recovery above first.
              </p>
              <div style={{display:"flex",flexDirection:"column",gap:12,marginTop:16}}>
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
                {deleteError && <div style={{fontSize:12,color:C.danger}}>{deleteError}</div>}
                {deleteMessage && <div style={{fontSize:12,color:C.success}}>{deleteMessage}</div>}
                <div style={{display:"flex",justifyContent:"flex-end"}}>
                  <button className="btn-outline" onClick={deleteChurchAccount} disabled={deletingChurch} style={{borderColor:C.danger,color:C.danger}}>
                    {deletingChurch ? "Deleting..." : "Delete Church Account"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NotificationsPage({ notifications, unreadCount, markAllRead, markRead, setActive, browserPermission, enableBrowserNotifications }) {
  return (
    <div className="fadeIn mobile-pad" style={{padding:"32px 36px",maxWidth:1100}}>
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

function TrashPage({ trashItems, clearTrash }) {
  const sortedItems = [...(trashItems || [])].sort((a, b) => new Date(b.deleted_at || 0) - new Date(a.deleted_at || 0));

  return (
    <div className="fadeIn mobile-pad" style={{padding:"32px 36px",maxWidth:1100}}>
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
            <div style={{fontSize:11,color:C.muted,textAlign:"right"}}>
              {item.deleted_at ? new Date(item.deleted_at).toLocaleString("en-US", { month:"short", day:"numeric", hour:"numeric", minute:"2-digit" }) : "—"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChurchTeamPage({ church, profile, previewUsers, setPreviewUsers }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const blank = { first_name: "", last_name: "", roles: ["youth_pastor"], title: formatRoleTitles(["youth_pastor"]), oversight: "standard" };
  const [form, setForm] = useState(blank);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [showTeamMemberModal, setShowTeamMemberModal] = useState(false);

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
    setSaving(false);
    if (saveError) {
      setError(saveError.message || "We couldn't save that team member.");
      return;
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
    setPreviewUsers((current) => {
      const others = (current || []).filter((entry) => entry.id !== data.id);
      return [...others, normalizeAccessUser(data)].sort((a, b) => a.full_name.localeCompare(b.full_name));
    });
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
    <div className="fadeIn mobile-pad" style={{padding:"32px 36px",maxWidth:1100}}>
      <div className="page-header" style={{display:"grid",gridTemplateColumns:"1fr",gap:16,marginBottom:24}}>
        <div style={{justifySelf:"start",textAlign:"left"}}>
          <h2 style={pageTitleStyle}>Church Team</h2>
          <p style={{color:C.muted,fontSize:13,marginTop:4,maxWidth:760}}>
            Add and manage the people and roles for {church?.name || "your church"} so that when someone logs in for the first time, they can select their own name from the list.
          </p>
        </div>
      </div>
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
                  {isStaffAccountAdmin(user, church) || user.can_see_admin_overview ? "Administrative Oversight" : "Standard Access"}
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
      {showTeamMemberModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowTeamMemberModal(false)} style={{alignItems:"flex-start",paddingTop:72,paddingBottom:24}}>
          <div className="modal fadeIn">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
              <h3 style={sectionTitleStyle}>{editingMemberId ? "Edit Team Member" : "Create Team Member"}</h3>
              <button onClick={()=>{setShowTeamMemberModal(false); setEditingMemberId(null); setForm(blank); setError("");}} style={{background:"none",border:"none",cursor:"pointer",color:C.muted}}><Icons.x/></button>
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
              {error && <div style={{fontSize:12,color:C.danger,textAlign:"left"}}>{error}</div>}
              <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}>
                <button className="btn-outline" onClick={()=>{setShowTeamMemberModal(false); setEditingMemberId(null); setForm(blank); setError("");}}>
                  Cancel
                </button>
                <button className="btn-gold" onClick={saveStaffMember} disabled={saving || !canEditChurchTeam(profile, church)}>
                  {saving ? "Saving..." : editingMemberId ? "Save Changes" : "Create Team Member"}
                </button>
              </div>
            </div>
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

function EventsBoard({ profile, church, eventRequests, setEventRequests, setTasks, moveItemToTrash, previewUsers }) {
  const [eventsSection, setEventsSection] = useState("home");
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState(() => createEventRequestBlank(profile));
  const [formError, setFormError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [eventWorkflows, setEventWorkflows] = useState([]);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [workflowError, setWorkflowError] = useState("");
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [workflowForm, setWorkflowForm] = useState(() => createEventPlanningBlank(profile));
  const [timelineDraft, setTimelineDraft] = useState({ title: "", date: "", details: "" });
  const [checklistDraft, setChecklistDraft] = useState("");
  const [planningNoteDraft, setPlanningNoteDraft] = useState("");
  const eventColumns = [
    { id: "new", title: "New Event Requests", detail: "Incoming ministry requests waiting for admin review and scheduling.", accent: C.gold, surface: "rgba(201,168,76,0.08)" },
    { id: "approved", title: "Approved Events", detail: "Confirmed events ready to be coordinated, staffed, and communicated.", accent: C.success, surface: "rgba(82,200,122,0.08)" },
    { id: "declined", title: "Declined Events", detail: "Requests that were not approved, with room for notes and follow-up.", accent: C.danger, surface: "rgba(224,82,82,0.08)" },
  ];
  const requests = eventRequests || [];
  const visibleWorkflows = eventWorkflows
    .filter((workflow) => workflow.visibility === "shared" || samePerson(workflow.owner_name, profile?.full_name))
    .sort((left, right) => new Date(getEventWorkflowPrimaryDate(left) || left.created_at || 0) - new Date(getEventWorkflowPrimaryDate(right) || right.created_at || 0));
  const canEditWorkflow = (workflow) => samePerson(workflow?.owner_name, profile?.full_name);

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
    if (status === "approved" && existingRequest && !existingRequest.graphics_task_created) {
      const taskPayloads = buildApprovedEventTaskChain(existingRequest, church?.id, previewUsers);
      if (taskPayloads.length > 0) {
        const { data: createdTasks } = await supabase.from("tasks").insert(taskPayloads).select();
        if (createdTasks?.length) {
          decisionPayload.graphics_task_created = true;
          decisionPayload.graphics_task_id = createdTasks[0]?.id || null;
          setTasks((current) => [...createdTasks.map(normalizeTask), ...(current || [])]);
        }
      }
    }

    const { data, error } = await supabase.from("event_requests").update(decisionPayload).eq("id", requestId).select().single();
    if (error) return;
    setEventRequests((current) => current.map((request) => request.id === requestId ? data : request));
    setSelectedRequest((current) => current?.id === requestId ? data : current);
  };

  const loadingRequests = !!church?.id && eventRequests === null;
  const publicEventRequestLink = typeof window !== "undefined" ? `${window.location.origin}/event-request` : "/event-request";
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
        location: workflow.location || "",
        mainContact: workflow.main_contact || "",
        linkedRequestId: workflow.linked_event_request_id || "",
        visibility: workflow.visibility || "private",
      });
    } else {
      setWorkflowForm(createEventPlanningBlank(profile));
    }
    setShowWorkflowModal(true);
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
      visibility: workflowForm.visibility,
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
      steps: selectedWorkflow?.steps || [],
    };
    setWorkflowError("");
    if (workflowForm.id) {
      const { data, error } = await supabase.from("event_workflows").update(payload).eq("id", workflowForm.id).select().single();
      if (error) {
        setWorkflowError(error.message || "We couldn't save that planning workflow.");
        return;
      }
      const normalized = normalizeEventWorkflow(data);
      setEventWorkflows((current) => (current || []).map((entry) => entry.id === normalized.id ? normalized : entry));
      setSelectedWorkflow(normalized);
    } else {
      const { data, error } = await supabase.from("event_workflows").insert(payload).select().single();
      if (error) {
        setWorkflowError(error.message || "We couldn't create that planning workflow.");
        return;
      }
      const normalized = normalizeEventWorkflow(data);
      setEventWorkflows((current) => [normalized, ...(current || [])]);
      setSelectedWorkflow(normalized);
    }
    setShowWorkflowModal(false);
  };
  const openWorkflow = (workflow) => {
    setSelectedWorkflow(workflow);
    setTimelineDraft({ title: "", date: "", details: "" });
    setChecklistDraft("");
    setPlanningNoteDraft("");
  };
  const updateWorkflow = async (workflow, changes) => {
    const { data, error } = await supabase.from("event_workflows").update(changes).eq("id", workflow.id).select().single();
    if (error) return;
    const normalized = normalizeEventWorkflow(data);
    setEventWorkflows((current) => (current || []).map((entry) => entry.id === normalized.id ? normalized : entry));
    setSelectedWorkflow((current) => current?.id === normalized.id ? normalized : current);
  };
  const updateWorkflowChecklistItem = async (workflow, itemId) => {
    const nextItems = (workflow.checklist_items || []).map((item) => item.id === itemId ? { ...item, done: !item.done } : item);
    await updateWorkflow(workflow, { checklist_items: nextItems });
  };
  const addWorkflowTimelineItem = async (workflow) => {
    if (!timelineDraft.title.trim()) return;
    const nextItems = [
      ...(workflow.timeline_items || []),
      {
        id: crypto.randomUUID(),
        title: timelineDraft.title.trim(),
        date: timelineDraft.date || null,
        details: timelineDraft.details.trim(),
        done: false,
        created_by: profile?.full_name || "Staff",
      },
    ];
    await updateWorkflow(workflow, { timeline_items: nextItems });
    setTimelineDraft({ title: "", date: "", details: "" });
  };
  const toggleWorkflowTimelineItem = async (workflow, itemId) => {
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
  const toggleWorkflowVisibility = async (workflow) => {
    await updateWorkflow(workflow, { visibility: workflow.visibility === "shared" ? "private" : "shared" });
  };
  const deleteWorkflow = async (workflow) => {
    if (!workflow?.id) return;
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
    if (error) return;
    setEventWorkflows((current) => (current || []).filter((entry) => entry.id !== workflow.id));
    setSelectedWorkflow((current) => current?.id === workflow.id ? null : current);
  };
  const deleteRequest = async (request) => {
    if (!request?.id) return;
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
      return;
    }
    setEventRequests((current) => (current || []).filter((entry) => entry.id !== request.id));
    setSelectedRequest(null);
  };

  return (
    <div className="fadeIn mobile-pad" style={{padding:"32px 36px",maxWidth:1200}}>
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
              onClick={() => setEventsSection("requests")}
              style={{padding:22,textAlign:"left",background:C.surface,cursor:"pointer",display:"grid",gap:10,minHeight:180}}
            >
              <div style={{fontSize:18,fontWeight:600,color:C.text}}>Event Requests</div>
              <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>
                Intake, review, approve, and archive incoming event requests for the church.
              </div>
              <div style={{fontSize:12,color:C.gold,marginTop:"auto",justifySelf:"end"}}>Open requests</div>
            </button>
            <button
              className="card"
              onClick={() => setEventsSection("planning")}
              style={{padding:22,textAlign:"left",background:C.surface,cursor:"pointer",display:"grid",gap:10,minHeight:180}}
            >
              <div style={{fontSize:18,fontWeight:600,color:C.text}}>Event Planning</div>
              <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>
                Build planning workflows for upcoming events and choose whether each one stays private or is shared with others.
              </div>
              <div style={{fontSize:12,color:C.gold,marginTop:"auto",justifySelf:"end"}}>Open planning</div>
            </button>
          </div>
        )}
        {eventsSection === "planning" && (
          <div className="card" style={{padding:18,borderTop:`3px solid ${C.blue}`,background:`linear-gradient(180deg, rgba(91,143,232,0.08) 0%, ${C.card} 24%)`}}>
            {!selectedWorkflow && (
              <>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap",marginBottom:14}}>
                  <div style={{textAlign:"left"}}>
                    <div style={{...sectionTitleStyle,textAlign:"left"}}>Event Planning</div>
                    <div style={{fontSize:12,color:C.muted,marginTop:6,lineHeight:1.6,maxWidth:680}}>
                      Start with a short intake, then open the event to build out its planning timeline, checklist, and working notes. Keep it private to yourself or make it visible to the team.
                    </div>
                  </div>
                  <button className="btn-outline" onClick={() => openWorkflowModal()}>New Event Plan</button>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:14}}>
                  {workflowLoading && (
                    <div style={{padding:"26px 14px",border:`1px dashed ${C.border}`,borderRadius:12,textAlign:"center",fontSize:12,color:C.muted,gridColumn:"1 / -1"}}>
                      Loading event plans...
                    </div>
                  )}
                  {!workflowLoading && visibleWorkflows.length === 0 && (
                    <div style={{padding:"26px 14px",border:`1px dashed ${C.border}`,borderRadius:12,textAlign:"center",fontSize:12,color:C.muted,gridColumn:"1 / -1"}}>
                      No event plans yet.
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
            {selectedWorkflow && (
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
                      <button
                        className="btn-outline"
                        onClick={() => toggleWorkflowVisibility(selectedWorkflow)}
                        title={selectedWorkflow.visibility === "shared" ? "Visible to others" : "Private to you"}
                        style={{display:"flex",alignItems:"center",justifyContent:"center",padding:10,minWidth:0}}
                      >
                        {selectedWorkflow.visibility === "shared" ? <Icons.eye /> : <Icons.eyeOff />}
                      </button>
                    )}
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
                <div className="card" style={{padding:18,textAlign:"left"}}>
                  <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}>
                    <div>
                      <div style={{...sectionTitleStyle,textAlign:"left"}}>Timeline</div>
                      <div style={{fontSize:12,color:C.muted,marginTop:6,lineHeight:1.6}}>Build the event out in chronological order. Open a node when you want to focus on one step without letting the timeline take over the whole page.</div>
                    </div>
                  </div>
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
                              {item.done && <div style={{fontSize:10,color:C.gold,marginTop:6}}>Completed</div>}
                            </div>
                          </summary>
                          <div style={{marginTop:10,padding:"12px 14px",border:`1px solid ${C.border}`,borderRadius:12,background:C.card}}>
                            {item.details ? (
                              <div style={{fontSize:12,color:C.muted,lineHeight:1.6,whiteSpace:"pre-line"}}>{item.details}</div>
                            ) : (
                              <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>No extra details added yet.</div>
                            )}
                            {canEditWorkflow(selectedWorkflow) && (
                              <label style={{display:"flex",alignItems:"center",gap:10,marginTop:12,fontSize:12,color:C.text}}>
                                <input type="checkbox" checked={!!item.done} onChange={() => toggleWorkflowTimelineItem(selectedWorkflow, item.id)} />
                                Mark this timeline step complete
                              </label>
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
                    <div style={{display:"grid",gap:10,marginTop:14}}>
                      <input className="input-field" placeholder="Timeline task title" value={timelineDraft.title} onChange={(e)=>setTimelineDraft((current) => ({ ...current, title: e.target.value }))} />
                      <input className="input-field" type="date" value={timelineDraft.date} onChange={(e)=>setTimelineDraft((current) => ({ ...current, date: e.target.value }))} />
                      <textarea className="input-field" rows={3} placeholder="What needs to happen for this step?" value={timelineDraft.details} onChange={(e)=>setTimelineDraft((current) => ({ ...current, details: e.target.value }))} style={{resize:"vertical"}} />
                      <div style={{display:"flex",justifyContent:"flex-end"}}>
                        <button className="btn-outline" onClick={() => addWorkflowTimelineItem(selectedWorkflow)}>Add To Timeline</button>
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
              <button className="btn-gold" onClick={() => {
                setEventForm(createEventRequestBlank(profile));
                setFormError("");
                setShowEventForm(true);
              }}>
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
      {showEventForm && (
        <div className="modal-overlay" onClick={(e)=>e.target===e.currentTarget&&setShowEventForm(false)}>
          <div className="modal fadeIn" style={{maxWidth:760}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
              <h3 style={sectionTitleStyle}>New Event Request</h3>
              <button onClick={()=>setShowEventForm(false)} style={{background:"none",border:"none",cursor:"pointer",color:C.muted}}><Icons.x/></button>
            </div>
            <EventRequestFormFields eventForm={eventForm} setEventForm={setEventForm} />
            {formError && <div style={{marginTop:14,fontSize:12,color:C.danger,textAlign:"left"}}>{formError}</div>}
            <div style={{display:"flex",gap:10,marginTop:22,justifyContent:"flex-end"}}>
              <button className="btn-outline" onClick={()=>setShowEventForm(false)}>Cancel</button>
              <button className="btn-gold" onClick={saveEventRequest}>Submit Request</button>
            </div>
          </div>
        </div>
      )}
      {requestDetails && (
        <div className="modal-overlay" onClick={(e)=>e.target===e.currentTarget&&setSelectedRequest(null)}>
          <div className="modal fadeIn" style={{maxWidth:760}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
              <h3 style={{...sectionTitleStyle,textAlign:"left"}}>{requestDetails.event_name}</h3>
              <button onClick={()=>setSelectedRequest(null)} style={{background:"none",border:"none",cursor:"pointer",color:C.muted}}><Icons.x/></button>
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
            </div>
            <div style={{display:"flex",gap:10,marginTop:22,justifyContent:"flex-end"}}>
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
        </div>
      )}
      {showWorkflowModal && (
        <div className="modal-overlay" onClick={(e)=>e.target===e.currentTarget&&setShowWorkflowModal(false)} style={{alignItems:"flex-start",paddingTop:24,paddingBottom:24}}>
          <div className="modal fadeIn" style={{maxWidth:700}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
              <h3 style={sectionTitleStyle}>{workflowForm.id ? "Edit Event Plan" : "New Event Plan"}</h3>
              <button onClick={()=>setShowWorkflowModal(false)} style={{background:"none",border:"none",cursor:"pointer",color:C.muted}}><Icons.x/></button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
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
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <label style={{fontSize:12,color:C.muted,textAlign:"left"}}>Date Or Dates</label>
                <input className="input-field" type="date" value={workflowForm.startDate} onChange={(e)=>setWorkflowForm((current) => ({ ...current, startDate: e.target.value }))} />
                <input className="input-field" type="date" value={workflowForm.endDate} onChange={(e)=>setWorkflowForm((current) => ({ ...current, endDate: e.target.value }))} />
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <label style={{fontSize:12,color:C.muted,textAlign:"left"}}>Location</label>
                <input className="input-field" placeholder="Example: Youth Room" value={workflowForm.location} onChange={(e)=>setWorkflowForm((current) => ({ ...current, location: e.target.value }))} />
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <label style={{fontSize:12,color:C.muted,textAlign:"left"}}>Main Contact Person</label>
                <input className="input-field" placeholder="Who is leading this event?" value={workflowForm.mainContact} onChange={(e)=>setWorkflowForm((current) => ({ ...current, mainContact: e.target.value }))} />
              </div>
            </div>
            {workflowError && <div style={{marginTop:14,fontSize:12,color:C.danger,textAlign:"left"}}>{workflowError}</div>}
            <div style={{display:"flex",gap:10,marginTop:22,justifyContent:"flex-end"}}>
              <button className="btn-outline" onClick={()=>setShowWorkflowModal(false)}>Cancel</button>
              <button className="btn-gold" onClick={saveWorkflow}>Save Event Plan</button>
            </div>
          </div>
        </div>
      )}
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
    <div className="fadeIn mobile-pad" style={{padding:"32px 36px",maxWidth:1100}}>
      <div style={{marginBottom:28}}>
        <h2 style={pageTitleStyle}>Workspaces</h2>
        <p style={{color:C.muted,fontSize:13,marginTop:4}}>
      Open a board to work inside a dedicated ministry framework.
        </p>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:18}}>
        {boards.map((board) => (
          <button
            key={board.id}
            onClick={() => setActive(board.id)}
            className="card"
            style={{padding:22,textAlign:"left",cursor:"pointer",background:C.card,border:`1px solid ${C.border}`,display:"flex",flexDirection:"column",minHeight:180}}
          >
            <div style={sectionTitleStyle}>{board.name}</div>
            <div style={{fontSize:12,color:C.muted,marginTop:8,lineHeight:1.6}}>{board.summary}</div>
            <div style={{fontSize:12,color:C.gold,marginTop:"auto",alignSelf:"flex-end",textAlign:"right"}}>Open board</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function AutomationsPage({ churchId, profile, automations, setAutomations, automationRuns, refreshAutomations }) {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const draftAutomations = (automations || []).filter((automation) => automation.status === "draft");
  const activeAutomations = (automations || []).filter((automation) => automation.status === "active");
  const canApprove = hasAdministrativeOversight(profile);

  const createDraft = async () => {
    const requestText = prompt.trim();
    if (!requestText || !churchId || !profile?.id) return;
    setError("");
    setMessage("");
    setIsGenerating(true);
    try {
      const { data, error: functionError } = await supabase.functions.invoke("generate-automation-draft", {
        body: { request: requestText },
      });
      if (functionError) throw functionError;
      if (!data?.draft) throw new Error("The automation assistant did not return a draft.");

      const payload = {
        church_id: churchId,
        created_by: profile.id,
        name: data.draft.name,
        description: data.draft.description,
        status: "draft",
        trigger_type: data.draft.trigger_type,
        trigger_config: data.draft.trigger_config,
        action_config: data.draft.action_config,
        approval_required: data.draft.approval_required,
      };
      const { data: savedDraft, error: saveError } = await supabase.from("automations").insert(payload).select().single();
      if (saveError) throw saveError;
      const normalizedDraft = normalizeAutomation(savedDraft);
      setAutomations((current) => [normalizedDraft, ...(current || [])]);
      setPrompt("");
      setMessage(`Draft created: ${normalizedDraft.name}`);
      refreshAutomations?.();
    } catch (draftError) {
      setError(draftError instanceof Error ? draftError.message : "We could not create that automation draft.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fadeIn mobile-pad" style={{padding:"32px 36px",maxWidth:1200}}>
      <div style={{marginBottom:24,textAlign:"left"}}>
        <h2 style={pageTitleStyle}>Automations</h2>
        <p style={{color:C.muted,fontSize:13,marginTop:4,maxWidth:760}}>
          Build church automations from plain-English requests. Shepherd’s AI assistant can turn a simple request into a draft workflow your team can review before it goes live.
        </p>
      </div>

      <div className="card" style={{padding:22,marginBottom:20,textAlign:"left"}}>
        <div className="section-header" style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <h3 style={sectionTitleStyle}>Create With AI</h3>
          <button className="btn-gold" onClick={createDraft} disabled={isGenerating || !prompt.trim() || !churchId || !profile?.id}>
            {isGenerating ? "Generating..." : "Generate Draft"}
          </button>
        </div>
        <p style={{fontSize:12,color:C.muted,lineHeight:1.6,marginBottom:14}}>
          Describe what you want in normal language. Shepherd will turn it into a safe automation draft with a trigger, audience, and actions.
        </p>
        <textarea
          className="input-field"
          rows={4}
          value={prompt}
          onChange={(e)=>setPrompt(e.target.value)}
          placeholder="Example: Every Monday at 9:00 AM remind ministry directors about tasks due this week."
          style={{resize:"vertical"}}
        />
        {error && <div style={{fontSize:12,color:C.danger,marginTop:10}}>{error}</div>}
        {message && <div style={{fontSize:12,color:C.success,marginTop:10}}>{message}</div>}
        <div style={{fontSize:12,color:C.muted,marginTop:10}}>
          First version plan: AI creates a draft only. {canApprove ? "You can review drafts before they go live." : "Someone with administrative oversight reviews drafts before they go live."}
        </div>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:18,marginBottom:20}}>
        <div className="card" style={{padding:22,textAlign:"left"}}>
          <h3 style={sectionTitleStyle}>Drafts</h3>
          <div style={{display:"flex",flexDirection:"column",gap:14,marginTop:16}}>
            {draftAutomations.length === 0 && (
              <div style={{padding:16,border:`1px solid ${C.border}`,borderRadius:12,background:C.surface,fontSize:13,color:C.muted}}>
                No drafts yet. Use Create With AI to turn a plain-English request into a reviewable workflow.
              </div>
            )}
            {draftAutomations.map((automation) => (
              <div key={automation.name} style={{padding:16,border:`1px solid ${C.border}`,borderRadius:12,background:C.surface}}>
                <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"start"}}>
                  <div style={{fontSize:16,fontWeight:600,color:C.text}}>{automation.name}</div>
                  <span className="badge" style={{background:C.goldGlow,color:C.gold,border:`1px solid ${C.goldDim}`}}>{automation.status.replace(/^./, (char) => char.toUpperCase())}</span>
                </div>
                <div style={{fontSize:12,color:C.muted,marginTop:8,lineHeight:1.55}}>Trigger: {formatAutomationTrigger(automation)}</div>
                <div style={{fontSize:12,color:C.muted,marginTop:4,lineHeight:1.55}}>Action: {formatAutomationAction(automation)}</div>
                <div style={{fontSize:12,color:C.muted,marginTop:10}}>
                  Approval: Church account admin, Church Administrator, or Senior Pastor
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card" style={{padding:22,textAlign:"left"}}>
          <h3 style={sectionTitleStyle}>Active</h3>
          <div style={{display:"flex",flexDirection:"column",gap:14,marginTop:16}}>
            {activeAutomations.length === 0 && (
              <div style={{padding:16,border:`1px solid ${C.border}`,borderRadius:12,background:C.surface,fontSize:13,color:C.muted}}>
                No active automations yet. Once a draft is approved, it will appear here.
              </div>
            )}
            {activeAutomations.map((automation) => (
              <div key={automation.name} style={{padding:16,border:`1px solid ${C.border}`,borderRadius:12,background:C.surface}}>
                <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"start"}}>
                  <div style={{fontSize:16,fontWeight:600,color:C.text}}>{automation.name}</div>
                  <span className="badge" style={{background:"rgba(82,200,122,.15)",color:C.success,border:`1px solid rgba(82,200,122,.3)`}}>{automation.status.replace(/^./, (char) => char.toUpperCase())}</span>
                </div>
                <div style={{fontSize:12,color:C.muted,marginTop:8,lineHeight:1.55}}>Trigger: {formatAutomationTrigger(automation)}</div>
                <div style={{fontSize:12,color:C.muted,marginTop:4,lineHeight:1.55}}>Action: {formatAutomationAction(automation)}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card" style={{padding:22,textAlign:"left"}}>
          <h3 style={sectionTitleStyle}>Run History</h3>
          <div style={{display:"flex",flexDirection:"column",gap:14,marginTop:16}}>
            {automationRuns.length === 0 && (
              <div style={{padding:16,border:`1px solid ${C.border}`,borderRadius:12,background:C.surface,fontSize:13,color:C.muted}}>
                No automation runs logged yet. When automations run, success and failure details will appear here.
              </div>
            )}
            {automationRuns.map((run) => (
              <div key={run.id} style={{padding:16,border:`1px solid ${C.border}`,borderRadius:12,background:C.surface}}>
                <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"start"}}>
                  <div style={{fontSize:16,fontWeight:600,color:C.text}}>{run.automation_name || "Automation run"}</div>
                  <span className="badge" style={{background:run.status === "succeeded" ? "rgba(82,200,122,.15)" : run.status === "running" ? "rgba(91,143,232,.15)" : "rgba(224,82,82,.15)",color:run.status === "succeeded" ? C.success : run.status === "running" ? C.blue : C.danger,border:`1px solid ${run.status === "succeeded" ? "rgba(82,200,122,.3)" : run.status === "running" ? "rgba(91,143,232,.3)" : "rgba(224,82,82,.3)"}`}}>{run.status.replace(/^./, (char) => char.toUpperCase())}</span>
                </div>
                <div style={{fontSize:12,color:C.muted,marginTop:8,lineHeight:1.55}}>{run.run_summary || "Run completed."}</div>
                <div style={{fontSize:12,color:C.muted,marginTop:6}}>{formatAutomationRunTime(run.started_at || run.created_at)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ContentMediaBoard({ tasks, setActive }) {
  const contentTasks = tasks.filter(isContentTask);
  const columns = [
    { id: "todo", title: "Not Started", detail: "New asks, fresh requests, and creative work that has not started yet." },
    { id: "in-progress", title: "In Progress", detail: "Active design, editing, filming, writing, and production work in motion." },
    { id: "in-review", title: "In Review", detail: "Drafts and deliverables waiting on approvals, edits, or final sign-off." },
    { id: "done", title: "Published / Delivered", detail: "Approved content that has been delivered, posted, or completed." },
  ];

  return (
    <div className="fadeIn mobile-pad" style={{padding:"32px 36px",maxWidth:1200}}>
      <div className="card" style={{padding:22}}>
        <div className="events-board-header" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
          <div style={{textAlign:"left"}}>
            <h3 style={{...pageTitleStyle,textAlign:"left",fontSize:"clamp(34px, 7vw, 46px)",lineHeight:1.06,maxWidth:680}}>
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
        <div style={{display:"grid",gridTemplateColumns:"1fr",gap:16}}>
          {columns.map((column) => {
            const columnTasks = contentTasks.filter((task) => task.status === column.id);
            const statusStyle = STATUS_STYLES[column.id] || STATUS_STYLES.todo;
            return (
              <div
                key={column.id}
                className="card"
                style={{
                  padding:16,
                  minHeight:420,
                  borderTop:`3px solid ${statusStyle.accent}`,
                  background:`linear-gradient(180deg, ${statusStyle.surface} 0%, ${C.card} 24%)`,
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
                      style={{
                        padding:16,
                        border:`1px solid ${C.border}`,
                        borderRadius:12,
                        background:C.surface,
                        textAlign:"left",
                        cursor:"pointer",
                        display:"grid",
                        gridTemplateColumns:"1fr auto",
                        gap:16,
                        alignItems:"start",
                      }}
                    >
                      <div style={{display:"flex",flexDirection:"column",gap:6}}>
                        <div style={{fontSize:20,fontWeight:600,color:task.status==="done"?C.muted:C.text,textDecoration:task.status==="done"?"line-through":"none"}}>
                          {task.title}
                        </div>
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
    <div className="fadeIn" style={{padding:"32px 36px",maxWidth:1100}}>
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

function PublicEventRequestPage() {
  const [churchCode, setChurchCode] = useState("");
  const [churchRecord, setChurchRecord] = useState(null);
  const [lookupError, setLookupError] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [eventForm, setEventForm] = useState(() => createEventRequestBlank());
  const [submitError, setSubmitError] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    const code = churchCode.trim();

    if (code.length < AUTH_CODE_LENGTH) {
      return () => {
        active = false;
      };
    }

    fetchChurchAccess(code)
      .then(({ church }) => {
        if (!active) return;
        setChurchRecord(church);
      })
      .catch((err) => {
        if (!active) return;
        setChurchRecord(null);
        setLookupError(err.message || "We couldn't find that church code.");
      })
      .finally(() => {
        if (!active) return;
        setLookupLoading(false);
      });

    return () => {
      active = false;
    };
  }, [churchCode]);

  const submitEventRequest = async () => {
    const eventTiming = buildEventTimingSummary(eventForm);
    if (!churchRecord?.id) {
      setSubmitError("Enter a valid church code before submitting the form.");
      return;
    }
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
    const payload = {
      ...eventForm,
      church_id: churchRecord.id,
      event_timing: eventTiming,
      tables_needed: buildTablesSummary(eventForm),
      status: "new",
      requested_by: eventForm.contact_name,
    };
    const { error } = await supabase.from("event_requests").insert(payload);
    if (error) {
      setSubmitError(error.message || "We couldn't submit that request.");
      setSubmitting(false);
      return;
    }
    setSubmitMessage("Your event request has been submitted. The Administrator will follow up within one week.");
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
              Enter your church code to submit an event request. Once submitted, it will automatically appear in the church's Events board for review.
            </p>
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:22,textAlign:"left"}}>
            <label style={{fontSize:14,fontWeight:600,color:C.text}}>Church Code <span style={{color:C.danger}}>*</span></label>
            <input className="input-field" value={churchCode} onChange={(e)=>{
              const next = e.target.value;
              setChurchCode(next);
              if (next.trim().length < AUTH_CODE_LENGTH) {
                setChurchRecord(null);
                setLookupError("");
                setLookupLoading(false);
                setSubmitError("");
                setSubmitMessage("");
              } else {
                setLookupLoading(true);
                setLookupError("");
              }
            }} maxLength={AUTH_CODE_LENGTH} placeholder="Enter your church code" />
            {lookupLoading && <div style={{fontSize:12,color:C.muted}}>Looking up church...</div>}
            {churchRecord && <div style={{fontSize:12,color:C.success}}>Submitting for {churchRecord.name}</div>}
            {lookupError && <div style={{fontSize:12,color:C.danger}}>{lookupError}</div>}
          </div>

          {churchRecord && (
            <>
              <EventRequestFormFields eventForm={eventForm} setEventForm={setEventForm} />
              {submitError && <div style={{marginTop:14,fontSize:12,color:C.danger,textAlign:"left"}}>{submitError}</div>}
              {submitMessage && <div style={{marginTop:14,fontSize:12,color:C.success,textAlign:"left"}}>{submitMessage}</div>}
              <div style={{display:"flex",justifyContent:"flex-end",marginTop:22}}>
                <button className="btn-gold" onClick={submitEventRequest} disabled={submitting} style={{opacity:submitting ? 0.8 : 1}}>
                  {submitting ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────
function Dashboard({ tasks, people, setActive, profile, church, previewUsers, notifications, markNotificationRead, unreadCount, markAllNotificationsRead, browserPermission, enableBrowserNotifications }) {
  const hasAdminOversight = hasAdministrativeOversight(profile, church);
  const greeting = getTimeOfDayGreeting();
  const dailyVerse = getDailyVerse();
  const [teamSnapshotOpen, setTeamSnapshotOpen] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(true);
  const teamSummary = previewUsers
    .filter((user) => !samePerson(user.full_name, profile?.full_name))
    .map((user) => {
    const assigned = tasks.filter((task) => samePerson(task.assignee, user.full_name));
    const openAssigned = assigned.filter((task) => task.status !== "done");
    const inReviewTasks = openAssigned.filter((task) => task.status === "in-review");
    const overdueTasks = openAssigned.filter((task) => {
      if (!task.due_date) return false;
      const dueDate = new Date(task.due_date);
      const today = new Date();
      const dueDay = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
      const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      return dueDay.getTime() < todayDay.getTime();
    });
    const currentTask =
      assigned.find((task) => task.status === "in-progress")
      || assigned
        .filter((task) => task.status !== "done")
        .sort((a, b) => new Date(a.due_date || 0) - new Date(b.due_date || 0))[0]
      || null;
    const upcomingTask = openAssigned
      .filter((task) => task.id !== currentTask?.id)
      .sort((a, b) => new Date(a.due_date || 0) - new Date(b.due_date || 0))[0]
      || null;
    const workloadSummary = currentTask
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
        : upcomingTask?.due_date
          ? `Next due ${fmtDate(upcomingTask.due_date)}`
          : openAssigned.length > 0
            ? `${openAssigned.length} active task${openAssigned.length === 1 ? "" : "s"}`
            : "No open tasks";
    return {
      ...user,
      openTasks: openAssigned.length,
      inProgressTasks: assigned.filter((task) => task.status === "in-progress").length,
      inReviewTasks: inReviewTasks.length,
      overdueTasks: overdueTasks.length,
      currentTask,
      nextTask: upcomingTask,
      workloadSummary,
      workloadDetail,
    };
  });
  const recentAdminWork = tasks
    .filter((task) => ["Admin", "Operations", "Finances"].includes(task.ministry))
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 4);
  return (
    <div className="fadeIn mobile-pad" style={{padding:"32px 36px",maxWidth:1200}}>
      <div style={{marginBottom:28}}>
        <h2 style={{fontFamily:"'Young Serif Medium', Georgia, serif",fontSize:42,fontWeight:500,color:C.text,letterSpacing:"0.01em"}}>{greeting}, {profile?.full_name?.split(" ")[0] || "team"}.</h2>
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
      {previewUsers.length > 0 && (
        <div className="card" style={{padding:22,marginBottom:20}}>
          <div className="section-header" style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <h3 style={sectionTitleStyle}>
              {hasAdminOversight ? "Administrative Team Snapshot" : "Leadership Team Snapshot"}
            </h3>
            <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
              <button className="btn-outline" onClick={() => setTeamSnapshotOpen((current) => !current)} style={{padding:"5px 12px",fontSize:12}}>
                {teamSnapshotOpen ? "Collapse" : "Expand"}
              </button>
              <button className="btn-outline" onClick={()=>setActive("tasks")} style={{padding:"5px 12px",fontSize:12}}>Open task board</button>
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
                          <span className={`badge ${getTag(member.currentTask.ministry)}`}>{member.currentTask.ministry}</span>
                          <span className="badge" style={{background:"rgba(255,255,255,.04)",color:member.currentTask.status === "in-progress" ? C.blue : C.muted,border:`1px solid ${C.border}`}}>
                            {member.currentTask.status === "in-progress" ? "In Progress" : member.currentTask.status === "in-review" ? "In Review" : "To Do"}
                          </span>
                          {member.currentTask.due_date && <span style={{fontSize:11,color:C.muted}}>Due {fmtDate(member.currentTask.due_date)}</span>}
                        </div>
                      </>
                    ) : (
                      <div style={{fontSize:13,color:C.muted}}>No active task right now.</div>
                    )}
                  </div>
                </div>
                <div className="dashboard-team-row-right" style={{textAlign:"left",display:"grid",gap:8,alignSelf:"stretch",padding:"12px 14px",border:`1px solid ${C.border}`,borderRadius:12,background:"rgba(255,255,255,.02)"}}>
                  <div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:".08em"}}>
                    Workload snapshot
                  </div>
                  <div style={{fontSize:16,fontWeight:600,color:member.overdueTasks > 0 ? C.danger : member.inReviewTasks > 0 ? C.blue : C.gold,lineHeight:1.35}}>
                    {member.workloadSummary}
                  </div>
                  <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>
                    {member.workloadDetail}
                  </div>
                  {member.nextTask && (
                    <div style={{fontSize:12,color:C.text,lineHeight:1.6}}>
                      <span style={{color:C.muted}}>Then:</span> {member.nextTask.title}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          ) : (
            <div style={{fontSize:13,color:C.muted,textAlign:"left"}}>Team snapshot collapsed. Expand it when you want to review everyone else’s workload.</div>
          )}
        </div>
      )}
      <div className="card" style={{padding:22,marginBottom:20}}>
        <div className="section-header" style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <h3 style={sectionTitleStyle}>Notifications</h3>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"flex-end"}}>
            <button className="btn-outline" onClick={() => setNotificationsOpen((current) => !current)} style={{padding:"5px 12px",fontSize:12}}>
              {notificationsOpen ? "Collapse" : "Expand"}
            </button>
            {browserPermission !== "granted" && (
              <button className="btn-outline" onClick={enableBrowserNotifications} style={{padding:"5px 12px",fontSize:12}}>Enable Browser Alerts</button>
            )}
            <button className="btn-outline" onClick={markAllNotificationsRead} style={{padding:"5px 12px",fontSize:12}} disabled={unreadCount === 0}>Mark all read</button>
            <button className="btn-outline" onClick={()=>setActive("tasks")} style={{padding:"5px 12px",fontSize:12}}>Open tasks</button>
          </div>
        </div>
        {notificationsOpen ? (
          <>
            {notifications.length === 0 && <p style={{color:C.muted,fontSize:13}}>No new notifications right now.</p>}
            {notifications.map((item) => (
              <div className="dashboard-note-row" key={item.id} style={{display:"flex",gap:12,marginBottom:14,paddingBottom:14,borderBottom:`1px solid ${C.border}`,alignItems:"flex-start"}}>
                <div style={{width:10,height:10,borderRadius:"50%",background:item.tone,marginTop:5,flexShrink:0}} />
                <div style={{textAlign:"left"}}>
                  <div style={{fontSize:13,fontWeight:500,color:C.text}}>{item.title}</div>
                  <div style={{fontSize:12,color:C.muted,marginTop:3,lineHeight:1.5}}>{item.detail}</div>
                </div>
                <button className="btn-outline" onClick={()=>{markNotificationRead(item.id); setActive(item.target || "tasks");}} style={{padding:"5px 10px",fontSize:12,marginLeft:"auto"}}>
                  Open
                </button>
              </div>
            ))}
          </>
        ) : (
          <div style={{fontSize:13,color:C.muted,textAlign:"left"}}>Notifications collapsed. Expand this section to review and open them.</div>
        )}
      </div>
      <div>
        <div className="card" style={{padding:22}}>
          <div className="section-header" style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <h3 style={sectionTitleStyle}>
              {hasAdminOversight ? "Admin Watchlist" : "Pastoral Follow-ups"}
            </h3>
            <button className="btn-outline" onClick={()=>setActive("members")} style={{padding:"5px 12px",fontSize:12}}>View all</button>
          </div>
          {hasAdminOversight ? (
            <>
              {recentAdminWork.map((task) => (
                <div className="dashboard-followup-row" key={task.id} style={{display:"flex",gap:12,marginBottom:14,paddingBottom:14,borderBottom:`1px solid ${C.border}`}}>
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
                <div className="dashboard-followup-row" key={p.id} style={{display:"flex",gap:12,marginBottom:14,paddingBottom:14,borderBottom:`1px solid ${C.border}`}}>
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
function Tasks({ tasks, setTasks, churchId, church, profile, previewUsers, moveItemToTrash }) {
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
  const commentInputRef = useRef(null);
  const blank = {title:"",ministry:"Admin",assignee:profile?.full_name || "",due_date:"",status:"todo",notes:"",share_link:"",review_required:false,reviewers:[],review_approvals:[],comments:[]};
  const [form, setForm] = useState(blank);
  const [orderedCategories, setOrderedCategories] = useState(() => getStoredCategoryOrder());
  const teamNames = previewUsers?.map((user) => user.full_name) || [];
  const allowedAssignees = canAssignToAnyone ? teamNames : [profile?.full_name].filter(Boolean);
  const boardTasks = tasks;
  const mentionableNames = [...new Set(teamNames.filter(Boolean))];

  const getMentionContext = (value, cursor) => {
    const beforeCursor = value.slice(0, cursor);
    const match = beforeCursor.match(/(?:^|\s)@([a-zA-Z][a-zA-Z\s]*)$/);
    if (!match) return null;
    const query = match[1];
    const tokenStart = cursor - query.length - 1;
    return {
      query,
      start: tokenStart,
      end: cursor,
    };
  };

  const mentionContext = getMentionContext(commentDraft, commentCursor);
  const mentionSuggestions = mentionContext
    ? mentionableNames.filter((name) => name.toLowerCase().includes(mentionContext.query.trim().toLowerCase()) && !samePerson(name, profile?.full_name)).slice(0, 5)
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
    setForm({ ...blank, ministry: orderedCategories[0] || "Admin", assignee: profile?.full_name || blank.assignee });
    setShowModal(true);
  };
  const openEdit = (t) => { setEditing(t); setTaskFormError(""); setForm(normalizeTask(t)); setShowModal(true); setSelectedTask(null); };
  const openTask = (task) => {
    setSelectedTask(normalizeTask(task));
    setCommentDraft("");
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
      if (result.data) setTasks(tasks.map(t=>t.id===editing.id?normalizeTask(result.data):t));
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
      if (result.data) setTasks([...tasks,normalizeTask(result.data)]);
    }
    setShowModal(false);
  };

  const setTaskStatus = async (task, nextStatus) => {
    if (nextStatus === "done" && task.review_required && task.reviewers.some((name) => !listIncludesPerson(task.review_approvals, name))) {
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
    const { data } = result;
    setTasks(tasks.map(t=>t.id===task.id?normalizeTask(data):t));
    syncTaskInView(data);
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
    setTasks(tasks.map((entry) => entry.id === task.id ? normalizeTask(data) : entry));
    syncTaskInView(data);
  };

  const addComment = () => {
    if (!selectedTask || !commentDraft.trim()) return;
    const nextComment = {
      id: `comment-${Date.now()}`,
      author: profile?.full_name || "Staff",
      body: commentDraft.trim(),
      created_at: new Date().toISOString(),
    };
    const updated = normalizeTask({
      ...selectedTask,
      comments: [...(selectedTask.comments || []), nextComment],
    });
    setSelectedTask(updated);
    setCommentDraft("");
    setCommentCursor(0);
    setTasks((current) => current.map((task) => task.id === updated.id ? updated : task));
  };

  const insertMention = (name) => {
    const context = getMentionContext(commentDraft, commentCursor);
    if (!context) return;
    const nextValue = `${commentDraft.slice(0, context.start)}@${name} ${commentDraft.slice(context.end)}`;
    setCommentDraft(nextValue);
    setCommentCursor(context.start + name.length + 2);
    window.requestAnimationFrame(() => {
      const textarea = commentInputRef.current;
      if (!textarea) return;
      const nextCursor = context.start + name.length + 2;
      textarea.focus();
      textarea.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const del = async (id) => {
    const taskToDelete = tasks.find((task) => task.id === id);
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
    <div className="fadeIn mobile-pad" style={{padding:"32px 36px",maxWidth:1100}}>
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
                <button
                  key={task.id}
                  onClick={() => openTask(task)}
                  style={{padding:16,border:`1px solid ${C.border}`,borderRadius:12,background:C.surface,textAlign:"left",cursor:"pointer",display:"grid",gridTemplateColumns:"1fr auto",gap:16,alignItems:"start"}}
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
          </div>
        ))}
      </div>
      {showModal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowModal(false)} style={{alignItems:"flex-start",paddingTop:72,paddingBottom:24}}>
          <div className="modal fadeIn">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
              <h3 style={sectionTitleStyle}>{editing?"Edit Task":"New Task"}</h3>
              <button onClick={()=>setShowModal(false)} style={{background:"none",border:"none",cursor:"pointer",color:C.muted}}><Icons.x/></button>
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
            {taskFormError && <div style={{marginTop:14,fontSize:12,color:C.danger,textAlign:"left"}}>{taskFormError}</div>}
            <div style={{display:"flex",gap:10,marginTop:22,justifyContent:"flex-end"}}>
              <button className="btn-outline" onClick={()=>setShowModal(false)}>Cancel</button>
              <button className="btn-gold" onClick={save}>Save Task</button>
            </div>
          </div>
        </div>
      )}
      {selectedTask && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setSelectedTask(null)}>
          <div className="modal fadeIn" style={{maxWidth:760}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
              <h3 style={{...sectionTitleStyle,textAlign:"left"}}>{selectedTask.title}</h3>
              <button onClick={()=>setSelectedTask(null)} style={{background:"none",border:"none",cursor:"pointer",color:C.muted}}><Icons.x/></button>
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
                <div style={{fontSize:13,color:C.text,marginTop:4,lineHeight:1.6}}>{selectedTask.notes || "No additional notes yet."}</div>
              </div>
              <div>
                <div style={{fontSize:12,color:C.muted}}>Shared Link</div>
                {selectedTask.share_link ? (
                  <div style={{marginTop:6}}>
                    <a href={selectedTask.share_link} target="_blank" rel="noreferrer" style={{fontSize:13,color:C.gold,textDecoration:"none",wordBreak:"break-all"}}>
                      {selectedTask.share_link}
                    </a>
                  </div>
                ) : (
                  <div style={{fontSize:13,color:C.muted,marginTop:4}}>No digital link attached yet.</div>
                )}
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
              <div>
                <div style={{fontSize:12,color:C.muted}}>Comments</div>
                <div style={{display:"flex",flexDirection:"column",gap:10,marginTop:8}}>
                  {(selectedTask.comments || []).slice().sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)).length > 0 ? (selectedTask.comments || []).slice().sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)).map((comment) => (
                    <div key={comment.id} style={{padding:"10px 12px",border:`1px solid ${C.border}`,borderRadius:10,background:C.surface}}>
                      <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start"}}>
                        <div style={{fontSize:12,color:C.text,fontWeight:600}}>{comment.author}</div>
                        <div style={{fontSize:11,color:C.muted,textAlign:"right"}}>
                          {new Date(comment.created_at).toLocaleString("en-US", { month:"short", day:"numeric", hour:"numeric", minute:"2-digit" })}
                        </div>
                      </div>
                      <div style={{fontSize:13,color:C.text,marginTop:6,lineHeight:1.8}}>{renderCommentBody(comment.body)}</div>
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
                        {mentionSuggestions.map((name) => (
                          <button
                            key={name}
                            type="button"
                            onClick={() => insertMention(name)}
                            style={{display:"block",width:"100%",padding:"10px 12px",textAlign:"left",background:"transparent",border:"none",borderBottom:`1px solid ${C.border}`,cursor:"pointer",color:C.text,fontSize:13}}
                          >
                            @{name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{fontSize:11,color:C.muted,textAlign:"left"}}>Use `@FirstName` or `@Full Name` to notify someone in this task.</div>
                  <button className="btn-gold" onClick={addComment} style={{alignSelf:"flex-end"}}>Add Comment</button>
                </div>
              </div>
            </div>
            <div style={{display:"flex",gap:10,marginTop:22,justifyContent:"flex-end",flexWrap:"wrap"}}>
              {canEditTask(profile, church, selectedTask) && (
                <button className="btn-outline" onClick={()=>openEdit(selectedTask)}>Edit Task</button>
              )}
              {canEditTask(profile, church, selectedTask) ? (
                <select className="input-field" value={selectedTask.status} onChange={(e)=>setTaskStatus(selectedTask, e.target.value)} style={{width:150,background:C.card,padding:"8px 10px",fontSize:12}}>
                  <option value="todo">Not Started</option>
                  <option value="in-progress">In Progress</option>
                  <option value="in-review">In Review</option>
                  <option value="done" disabled={selectedTask.review_required && selectedTask.reviewers.some((name) => !listIncludesPerson(selectedTask.review_approvals, name))}>Done</option>
                </select>
              ) : null}
              {canEditTask(profile, church, selectedTask) && (
                <button className="btn-outline" onClick={()=>{del(selectedTask.id); setSelectedTask(null);}} style={{color:C.danger,borderColor:"rgba(224,82,82,.35)"}}>
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── People Care ────────────────────────────────────────────────────────────
function Members({ people, setPeople, churchId, church, profile }) {
  const isPreview = churchId === "preview";
  const canEditPeople = canManagePeople(profile, church);
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
    <div className="fadeIn mobile-pad" style={{padding:"32px 36px",maxWidth:1100}}>
      <div className="page-header" style={{display:"grid",gridTemplateColumns:"1fr auto",alignItems:"flex-start",gap:16,marginBottom:24}}>
        <div>
          <h2 style={pageTitleStyle}>People Care</h2>
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
              <h3 style={sectionTitleStyle}>{selected?"Edit Person":"Add Person"}</h3>
              <button onClick={()=>setShowModal(false)} style={{background:"none",border:"none",cursor:"pointer",color:C.muted}}><Icons.x/></button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <input className="input-field" placeholder="Full name" value={form.full_name||""} onChange={e=>setForm({...form,full_name:e.target.value})}/>
              <div className="member-form-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
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
function Budget({ transactions, setTransactions, purchaseOrders, setPurchaseOrders, churchId, profile, setProfile, ministries, setMinistries, previewUsers, setPreviewUsers }) {
  const isPreview = churchId === "preview";
  const financeView = isFinanceUser(profile);
  const visibleMinistries = getBudgetScopeMinistries(profile);
  const canEditBudget = canViewBudget(profile);
  const defaultMinistry = visibleMinistries[0] || "Admin";
  const [showModal, setShowModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showPurchaseOrderModal, setShowPurchaseOrderModal] = useState(false);
  const [purchaseOrderError, setPurchaseOrderError] = useState("");
  const [purchaseOrderSubmitting, setPurchaseOrderSubmitting] = useState(false);
  const [purchaseOrderCommentDrafts, setPurchaseOrderCommentDrafts] = useState({});
  const [purchaseOrderCommentCursor, setPurchaseOrderCommentCursor] = useState({});
  const purchaseOrderCommentInputRef = useRef(null);
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
  const ledgerMinistryNames = [...new Set([
    ...((ministries || []).map((entry) => entry.name).filter(Boolean)),
    ...(financeView ? [] : visibleMinistries),
  ])].sort((left, right) => left.localeCompare(right));
  const activeLedgerMinistry = selectedLedgerMinistry || defaultMinistry;
  const selectedMinistryRecord = (ministries || []).find((entry) => entry.name === activeLedgerMinistry);
  const selectedMinistryBudgetItems = normalizeBudgetItems(selectedMinistryRecord?.budget_items);
  const mentionableNames = [...new Set((previewUsers || []).map((user) => user.full_name).filter(Boolean))];
  const activePurchaseOrderCommentId = Object.keys(purchaseOrderCommentCursor).find((id) => typeof purchaseOrderCommentCursor[id] === "number") || "";
  const activePurchaseOrderCommentDraft = activePurchaseOrderCommentId ? (purchaseOrderCommentDrafts[activePurchaseOrderCommentId] || "") : "";
  const activePurchaseOrderCommentSelection = activePurchaseOrderCommentId ? (purchaseOrderCommentCursor[activePurchaseOrderCommentId] || 0) : 0;
  const purchaseOrderMentionContext = getMentionContext(activePurchaseOrderCommentDraft, activePurchaseOrderCommentSelection);
  const purchaseOrderMentionSuggestions = purchaseOrderMentionContext
    ? mentionableNames.filter((name) => name.toLowerCase().includes(purchaseOrderMentionContext.query.trim().toLowerCase()) && !samePerson(name, profile?.full_name)).slice(0, 5)
    : [];

  const canManageBudgetLinesForMinistry = (ministry) => financeView || visibleMinistries.includes(ministry);

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
    setForm(resetTransactionForm(ministry, type));
    setShowModal(true);
  };
  const openBudgetModal = (ministry = "") => {
    const existingMinistry = (ministries || []).find((entry) => entry.name === ministry) || null;
    const assignedUser = (previewUsers || []).find((user) => (user.ministries || []).includes(ministry));
    const normalizedItems = normalizeBudgetItems(existingMinistry?.budget_items);
    setBudgetForm({
      id: existingMinistry?.id || null,
      ministry: ministry || "",
      budget: existingMinistry?.budget !== undefined && existingMinistry?.budget !== null ? String(existingMinistry.budget) : "",
      assignedStaffId: assignedUser?.id || "",
      items: normalizedItems.length > 0 ? normalizedItems.map((item) => ({ label: item.label, amount: String(item.amount) })) : [{ label: "", amount: "" }],
    });
    setShowBudgetModal(true);
  };
  const openPurchaseOrderModal = (ministry = defaultMinistry) => {
    setSelectedLedgerMinistry(ministry);
    setPurchaseOrderError("");
    setPurchaseOrderForm({
      title: "",
      amount: "",
      ministry,
      budgetLineItem: "",
      neededBy: "",
      purchaseLink: "",
      includedInBudget: "yes",
      notes: "",
    });
    setShowPurchaseOrderModal(true);
  };

  if (!canViewBudget(profile)) {
    return (
      <div className="fadeIn mobile-pad" style={{padding:"32px 36px",maxWidth:1100}}>
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

  const save = async () => {
    if (!form.description||!form.amount||!form.category||!form.ministry) return;
    const parsedAmount = Number.parseFloat(form.amount || "0");
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) return;
    const amt = parsedAmount * (form.type==="expense"?-1:1);
    if (isPreview) {
      setTransactions([{ ...form, id: `txn-${Date.now()}`, amount: amt, church_id: churchId }, ...transactions]);
      setShowModal(false);
      setForm(resetTransactionForm(defaultMinistry));
      return;
    }
    const { data } = await supabase.from("transactions").insert({description:form.description,amount:amt,ministry:form.ministry,category:form.category,date:form.date,church_id:churchId}).select().single();
    setTransactions([data,...transactions]);
    setShowModal(false);
    setForm(resetTransactionForm(defaultMinistry));
  };

  const saveBudget = async () => {
    const trimmedMinistry = budgetForm.ministry.trim();
    if (!financeView || !trimmedMinistry) return;
    const normalizedItems = normalizeBudgetItems((budgetForm.items || []).map((item) => ({
      label: item.label,
      amount: item.amount,
    })));
    const nextBudget = normalizedItems.length > 0
      ? normalizedItems.reduce((sum, item) => sum + item.amount, 0)
      : (Number.parseFloat(budgetForm.budget || "0") || 0);
    if (Number.isNaN(nextBudget)) return;
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
      setShowBudgetModal(false);
      return;
    }
    const ministryQuery = budgetForm.id
      ? supabase.from("ministries").update(payload).eq("id", budgetForm.id)
      : supabase.from("ministries").upsert(payload, { onConflict: "church_id,name" });
    const { data, error } = await ministryQuery.select().single();
    if (error) return;
    if (previousName !== trimmedMinistry) {
      const matchingTransactions = transactions.filter((transaction) => transaction.ministry === previousName);
      if (matchingTransactions.length > 0) {
        await supabase.from("transactions").update({ ministry: trimmedMinistry }).eq("church_id", churchId).eq("ministry", previousName);
        setTransactions((current) => current.map((transaction) => transaction.ministry === previousName ? { ...transaction, ministry: trimmedMinistry } : transaction));
      }
    }
    const updatedStaff = await Promise.all((previewUsers || []).map(async (user) => {
      const existingMinistries = Array.isArray(user.ministries) ? user.ministries : [];
      const strippedMinistries = existingMinistries.filter((ministry) => ministry !== previousName && ministry !== trimmedMinistry);
      const nextMinistries = user.id === budgetForm.assignedStaffId ? [...strippedMinistries, trimmedMinistry] : strippedMinistries;
      if (JSON.stringify(existingMinistries) === JSON.stringify(nextMinistries)) return user;
      if (!isPreview) {
        await supabase.from("church_staff").update({ ministries: nextMinistries }).eq("id", user.id);
        await supabase.from("profiles").update({ ministries: nextMinistries }).eq("staff_id", user.id);
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
    setShowBudgetModal(false);
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
      setShowPurchaseOrderModal(false);
      return;
    }
    const { data, error } = await supabase.from("purchase_orders").insert(payload).select().single();
    if (error) {
      setPurchaseOrderSubmitting(false);
      setPurchaseOrderError(error.message || "This purchase order could not be submitted yet.");
      return;
    }
    setPurchaseOrders((current) => [normalizePurchaseOrder(data), ...(current || [])]);
    setPurchaseOrderSubmitting(false);
    setShowPurchaseOrderModal(false);
  };
  const updatePurchaseOrderStatus = async (order, status) => {
    if (!order?.id) return;
    const nowIso = new Date().toISOString();
    if (status === "approved" && !canApprovePurchaseOrder(profile, order)) return;
    if (status === "denied" && !canApprovePurchaseOrder(profile, order)) return;
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
    if (error) return;
    setPurchaseOrders((current) => (current || []).map((entry) => entry.id === order.id ? normalizePurchaseOrder({ ...entry, ...changes }) : entry));
  };
  const deletePurchaseOrder = async (order) => {
    if (!canDeletePurchaseOrder(profile, order) || !order?.id) return;
    if (isPreview) {
      setPurchaseOrders((current) => (current || []).filter((entry) => entry.id !== order.id));
      return;
    }
    const { error } = await supabase.from("purchase_orders").delete().eq("id", order.id);
    if (error) return;
    setPurchaseOrders((current) => (current || []).filter((entry) => entry.id !== order.id));
  };
  const addPurchaseOrderComment = async (order) => {
    const draft = (purchaseOrderCommentDrafts[order.id] || "").trim();
    if (!draft || !order?.id) return;
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
    if (error) return;
    setPurchaseOrders((current) => (current || []).map((entry) => entry.id === order.id ? normalizePurchaseOrder({ ...entry, ...changes }) : entry));
    setPurchaseOrderCommentDrafts((current) => ({ ...current, [order.id]: "" }));
    setPurchaseOrderCommentCursor((current) => ({ ...current, [order.id]: 0 }));
  };
  const insertPurchaseOrderMention = (orderId, name) => {
    if (!orderId || !purchaseOrderMentionContext) return;
    const draft = purchaseOrderCommentDrafts[orderId] || "";
    const nextValue = `${draft.slice(0, purchaseOrderMentionContext.start)}@${name} ${draft.slice(purchaseOrderMentionContext.end)}`;
    const nextCursor = purchaseOrderMentionContext.start + name.length + 2;
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
    setShowBudgetModal(false);
  };

  return (
    <div className="fadeIn mobile-pad" style={{padding:"32px 36px",maxWidth:1100}}>
      <div className="page-header" style={{display:"grid",gridTemplateColumns:"1fr auto",alignItems:"flex-start",gap:16,marginBottom:24}}>
        <div style={{textAlign:"left",justifySelf:"start"}}>
          <h2 style={{...pageTitleStyle,textAlign:"left"}}>{financeView ? "Budget Overview" : "Your Budgets"}</h2>
          <p style={{color:C.muted,fontSize:13,marginTop:4}}>
            {financeView
              ? "See every ministry's budget standing and manage the church's ministry budgets."
              : "These are the budgets currently assigned to you. If something is missing, reach out to the Finance Director so they can attach the right ministry budget to your profile in the ministry editor."}
          </p>
        </div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"flex-end"}}>
          {financeView && <button className="btn-outline" onClick={() => openBudgetModal()}><Icons.plus/>Create New Budget</button>}
          <button className="btn-outline" onClick={() => openPurchaseOrderModal(defaultMinistry)}><Icons.plus/>New Purchase Order</button>
        </div>
      </div>
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
              <div>
                <div style={{...sectionTitleStyle,fontSize:24}}>{summary.ministry}</div>
                <div style={{fontSize:12,color:C.muted,marginTop:4}}>{summary.transactions} transactions</div>
                <div style={{fontSize:12,color:C.muted,marginTop:2}}>{summary.purchaseOrders} purchase orders</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span className={`badge ${getTag(summary.ministry)}`}>{summary.ministry}</span>
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
      <div className="card" style={{overflow:"hidden"}}>
        <div style={{padding:"16px 18px",borderBottom:`1px solid ${C.border}`,background:C.surface}}>
          <h3 style={{...sectionTitleStyle,textAlign:"left"}}>{financeView ? "Purchase Orders" : "Your Purchase Orders"}</h3>
          <div style={{fontSize:12,color:C.muted,marginTop:4,textAlign:"left"}}>
            {financeView
              ? "Review and respond to ministry purchase requests from one place."
              : "Submit purchase requests tied to your ministry budgets so Finance can review them."}
          </div>
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
                      <button className="btn-outline" onClick={() => deletePurchaseOrder(order)} style={{padding:"7px 10px",color:C.muted,borderColor:C.border}}>Delete</button>
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
            <div style={{display:"flex",flexDirection:"column",gap:10,textAlign:"left"}}>
              <div style={{fontSize:12,color:C.muted}}>Comments</div>
              {(order.comments || []).slice().sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)).length > 0 ? (
                (order.comments || []).slice().sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)).map((comment) => (
                  <div key={comment.id} style={{padding:"10px 12px",border:`1px solid ${C.border}`,borderRadius:10,background:C.surface}}>
                    <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start"}}>
                      <div style={{fontSize:12,color:C.text,fontWeight:600}}>{comment.author}</div>
                      <div style={{fontSize:11,color:C.muted,textAlign:"right"}}>
                        {new Date(comment.created_at).toLocaleString("en-US", { month:"short", day:"numeric", hour:"numeric", minute:"2-digit" })}
                      </div>
                    </div>
                    <div style={{fontSize:13,color:C.text,marginTop:6,lineHeight:1.8}}>{renderCommentBody(comment.body)}</div>
                  </div>
                ))
              ) : (
                <div style={{fontSize:13,color:C.muted}}>No comments yet.</div>
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
                    {purchaseOrderMentionSuggestions.map((name) => (
                      <button
                        key={`${order.id}-${name}`}
                        type="button"
                        onClick={() => insertPurchaseOrderMention(order.id, name)}
                        style={{display:"block",width:"100%",padding:"10px 12px",textAlign:"left",background:"transparent",border:"none",borderBottom:`1px solid ${C.border}`,cursor:"pointer",color:C.text,fontSize:13}}
                      >
                        @{name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div style={{display:"flex",justifyContent:"flex-end"}}>
                <button className="btn-outline" onClick={() => addPurchaseOrderComment(order)} style={{padding:"7px 10px"}}>Add Comment</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {showModal&& canEditBudget &&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="modal fadeIn">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <h3 style={sectionTitleStyle}>Add Transaction</h3>
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
            <div style={{display:"flex",gap:10,marginTop:20,justifyContent:"flex-end"}}>
              <button className="btn-outline" onClick={()=>setShowModal(false)}>Cancel</button>
              <button className="btn-gold" onClick={save}>Save</button>
            </div>
          </div>
        </div>
      )}
      {showPurchaseOrderModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowPurchaseOrderModal(false)} style={{alignItems:"flex-start",paddingTop:24}}>
          <div className="modal fadeIn">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <h3 style={sectionTitleStyle}>New Purchase Order</h3>
              <button onClick={()=>setShowPurchaseOrderModal(false)} style={{background:"none",border:"none",cursor:"pointer",color:C.muted}}><Icons.x/></button>
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
                <input className="input-field" value={purchaseOrderForm.ministry} readOnly />
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <label style={{fontSize:12,color:C.muted,textAlign:"left"}}>What Is This For?</label>
                <input className="input-field" placeholder="Example: Student camp t-shirts" value={purchaseOrderForm.title} onChange={(e)=>setPurchaseOrderForm({...purchaseOrderForm,title:e.target.value})}/>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <label style={{fontSize:12,color:C.muted,textAlign:"left"}}>Was This Included In Your Yearly Budget Proposal?</label>
                <div style={{display:"flex",background:C.surface,borderRadius:10,padding:3,border:`1px solid ${C.border}`}}>
                  {[
                    { value: "yes", label: "Yes" },
                    { value: "no", label: "No" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setPurchaseOrderForm({ ...purchaseOrderForm, includedInBudget: option.value })}
                      style={{
                        flex: 1,
                        padding: "8px 0",
                        borderRadius: 8,
                        border: "none",
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 500,
                        background: purchaseOrderForm.includedInBudget === option.value ? C.card : "transparent",
                        color: purchaseOrderForm.includedInBudget === option.value ? C.text : C.muted,
                      }}
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
                  <input className="input-field" list="purchase-order-line-items" placeholder={selectedMinistryBudgetItems.length > 0 ? "Choose a line item" : "Add line items to this budget first"} value={purchaseOrderForm.budgetLineItem} onChange={(e)=>setPurchaseOrderForm({...purchaseOrderForm,budgetLineItem:e.target.value})}/>
                  <datalist id="purchase-order-line-items">
                    {ministryLineItemSuggestions.map((item) => <option key={item} value={item} />)}
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
            <div style={{fontSize:12,color:C.muted,marginTop:12,lineHeight:1.6,textAlign:"left"}}>
              Purchase orders help your team request spending against a real ministry budget before the transaction happens.
            </div>
            {purchaseOrderError && (
              <div style={{marginTop:12,fontSize:12,color:C.danger,textAlign:"left"}}>
                {purchaseOrderError}
              </div>
            )}
            <div style={{display:"flex",gap:10,marginTop:20,justifyContent:"flex-end"}}>
              <button className="btn-outline" onClick={()=>setShowPurchaseOrderModal(false)}>Cancel</button>
              <button className="btn-gold" onClick={savePurchaseOrder} disabled={purchaseOrderSubmitting} style={{opacity:purchaseOrderSubmitting ? 0.8 : 1}}>
                {purchaseOrderSubmitting ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}
      {showBudgetModal && canManageBudgetLinesForMinistry(budgetForm.ministry || defaultMinistry) && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowBudgetModal(false)} style={{alignItems:"flex-start",paddingTop:24}}>
          <div className="modal fadeIn">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <h3 style={sectionTitleStyle}>{financeView ? "Set Ministry Budget" : "Edit Budget Line Items"}</h3>
              <button onClick={()=>setShowBudgetModal(false)} style={{background:"none",border:"none",cursor:"pointer",color:C.muted}}><Icons.x/></button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <label style={{fontSize:12,color:C.muted,textAlign:"left"}}>Ministry</label>
                <input className="input-field" value={budgetForm.ministry} onChange={(e)=>setBudgetForm({...budgetForm,ministry:e.target.value})} placeholder="Ministry name" readOnly={!financeView} />
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <label style={{fontSize:12,color:C.muted,textAlign:"left"}}>Starting Budget</label>
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
            <div style={{fontSize:12,color:C.muted,marginTop:12,lineHeight:1.6,textAlign:"left"}}>
              {financeView
                ? "This sets the ministry’s working budget inside Shepherd. If you add line items, the total budget is calculated from them automatically."
                : "You can add and adjust line items for this ministry budget here. Finance still controls the main ministry budget and staff assignment."}
            </div>
            <div style={{display:"flex",gap:10,marginTop:20,justifyContent:"space-between",flexWrap:"wrap"}}>
              {financeView && budgetForm.id ? (
                <button className="btn-outline" onClick={removeBudgetMinistry} style={{color:C.danger,borderColor:"rgba(224,82,82,.35)"}}>
                  Remove Ministry
                </button>
              ) : <div />}
              <div style={{display:"flex",gap:10}}>
              <button className="btn-outline" onClick={()=>setShowBudgetModal(false)}>Cancel</button>
              <button className="btn-gold" onClick={saveBudget}>Save Budget</button>
              </div>
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
    <div className="fadeIn mobile-pad" style={{padding:"32px 36px",maxWidth:1100}}>
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
    <div className="fadeIn mobile-pad" style={{padding:"32px 36px",maxWidth:1100}}>
      <div style={{marginBottom:24}}>
        <h2 style={pageTitleStyle}>Calendar</h2>
        <p style={{color:C.muted,fontSize:13,marginTop:4}}>{months[today.getMonth()]} {today.getFullYear()}</p>
      </div>
      <div className="mobile-calendar-layout" style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:24}}>
        <div className="card" style={{padding:20}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:10}}>
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=>(
              <div key={d} style={{textAlign:"center",fontSize:11,color:C.muted,fontWeight:600,padding:"4px 0"}}>{d}</div>
            ))}
          </div>
          <div className="calendar-day-grid" style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
            {days.map((d,i)=>{
              const isToday = d.toDateString()===today.toDateString();
              const isMonth = d.getMonth()===today.getMonth();
              const dt = tasks.filter(t=>new Date(t.due_date).toDateString()===d.toDateString()&&t.status!=="done");
              return (
                <div className="calendar-day-cell" key={i} style={{minHeight:60,borderRadius:8,padding:"6px 8px",background:isToday?C.goldGlow:"transparent",border:`1px solid ${isToday?C.goldDim:"transparent"}`,opacity:isMonth?1:0.35}}>
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
          <h3 style={{...sectionTitleStyle,marginBottom:16}}>Upcoming</h3>
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
  const isPublicEventRequestRoute = typeof window !== "undefined" && window.location.pathname.replace(/\/+$/, "") === "/event-request";
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [church, setChurch] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [people, setPeople] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [ministries, setMinistries] = useState([]);
  const [eventRequests, setEventRequests] = useState(null);
  const [trashItems, setTrashItems] = useState([]);
  const [previewUsers, setPreviewUsers] = useState([]);
  const [active, setActive] = useState(getStoredActivePage);
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [readNotificationIds, setReadNotificationIds] = useState([]);
  const [browserPermission, setBrowserPermission] = useState(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  const shownNotificationIdsRef = useRef(new Set());
  const allowedPages = new Set([
    "dashboard",
    "account",
    "workspaces",
    "events-board",
    "content-media-board",
    "operations-board",
    "tasks",
    "trash",
    "members",
    "budget",
    "calendar",
    ...(shouldShowChurchTeam(profile, church) ? ["church-team"] : []),
  ]);
  const safeActive = allowedPages.has(active) ? active : "dashboard";

  const notifications = useMemo(
    () => buildNotifications(tasks, eventRequests, purchaseOrders, profile),
    [tasks, eventRequests, purchaseOrders, profile]
  );
  const unreadNotifications = useMemo(
    () => notifications.filter((item) => !readNotificationIds.includes(item.id)),
    [notifications, readNotificationIds]
  );

  const markNotificationRead = (id) => {
    if (!id) return;
    setReadNotificationIds((current) => current.includes(id) ? current : [...current, id]);
  };

  const markAllNotificationsRead = () => {
    setReadNotificationIds((current) => [...new Set([...current, ...notifications.map((item) => item.id)])]);
  };

  const enableBrowserNotifications = async () => {
    if (typeof Notification === "undefined") return;
    const permission = await Notification.requestPermission();
    setBrowserPermission(permission);
  };

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
    setTrashItems([]);
  };

  const loadData = async (uid) => {
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
    } else {
      setReadNotificationIds([]);
      setTrashItems([]);
    }
    if (prof?.church_id) {
      const [ch, t, er, p, tr, po, m, staff] = await Promise.all([
        supabase.from("churches").select("*").eq("id", prof.church_id).single(),
        supabase.from("tasks").select("*").eq("church_id", prof.church_id).order("created_at", { ascending: false }),
        supabase.from("event_requests").select("*").eq("church_id", prof.church_id).order("created_at", { ascending: false }),
        supabase.from("people").select("*").eq("church_id", prof.church_id).order("full_name"),
        supabase.from("transactions").select("*").eq("church_id", prof.church_id).order("date", { ascending: false }),
        supabase.from("purchase_orders").select("*").eq("church_id", prof.church_id).order("created_at", { ascending: false }),
        supabase.from("ministries").select("*").eq("church_id", prof.church_id),
        supabase.from("church_staff").select("*").eq("church_id", prof.church_id).order("full_name"),
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
      setEventRequests(er.data || []);
      setPeople(p.data || []);
      setTransactions(tr.data || []);
      setPurchaseOrders((po.data || []).map(normalizePurchaseOrder));
      setMinistries(m.data || []);
      setPreviewUsers((staff.data || []).map(normalizeAccessUser));
    } else {
      setProfile(normalizedProfile);
      setChurch(null);
      setTasks([]);
      setEventRequests(null);
      setPeople([]);
      setTransactions([]);
      setPurchaseOrders([]);
      setMinistries([]);
      setPreviewUsers([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!profile?.id) return;
    window.localStorage.setItem(getNotificationStorageKey(profile.id), JSON.stringify(readNotificationIds));
  }, [profile?.id, readNotificationIds]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ACTIVE_PAGE_STORAGE_KEY, safeActive);
  }, [safeActive]);

  useEffect(() => {
    if (typeof window === "undefined" || !church?.id) return;
    window.localStorage.setItem(getTrashStorageKey(church.id), JSON.stringify(trashItems));
  }, [church?.id, trashItems]);

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
        setPurchaseOrders([]);
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
        <PublicEventRequestPage/>
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
    dashboard:  <Dashboard tasks={tasks} people={people} setActive={setActive} profile={profile} church={church} previewUsers={previewUsers} notifications={unreadNotifications.slice(0, 5)} markNotificationRead={markNotificationRead} unreadCount={unreadNotifications.length} markAllNotificationsRead={markAllNotificationsRead} browserPermission={browserPermission} enableBrowserNotifications={enableBrowserNotifications}/>,
    account: <AccountPage profile={profile} setProfile={setProfile} church={church} />,
    "church-team": shouldShowChurchTeam(profile, church) ? <ChurchTeamPage church={church} profile={profile} previewUsers={previewUsers} setPreviewUsers={setPreviewUsers} /> : <Dashboard tasks={tasks} people={people} setActive={setActive} profile={profile} church={church} previewUsers={previewUsers} notifications={unreadNotifications.slice(0, 5)} markNotificationRead={markNotificationRead} unreadCount={unreadNotifications.length} markAllNotificationsRead={markAllNotificationsRead} browserPermission={browserPermission} enableBrowserNotifications={enableBrowserNotifications}/>,
    workspaces: <Workspaces setActive={setActive}/>,
    "events-board": <EventsBoard profile={profile} church={church} eventRequests={eventRequests} setEventRequests={setEventRequests} tasks={tasks} setTasks={setTasks} moveItemToTrash={moveItemToTrash} previewUsers={previewUsers}/>,
    "content-media-board": <ContentMediaBoard tasks={tasks} setActive={setActive} />,
    "operations-board": <PlaceholderBoard title="Operations Board" summary="This board will hold weekly church operations, facility prep, and recurring support frameworks in their own dedicated workspace." systems={["Service prep", "Facility workflows", "Volunteer coordination"]} />,
    tasks:      <Tasks tasks={tasks} setTasks={setTasks} churchId={church?.id} church={church} profile={profile} previewUsers={previewUsers} moveItemToTrash={moveItemToTrash}/>,
    trash: <TrashPage trashItems={trashItems} clearTrash={clearTrash} />,
    members:    <Members people={people} setPeople={setPeople} churchId={church?.id} church={church} profile={profile}/>,
    budget:     <Budget transactions={transactions} setTransactions={setTransactions} purchaseOrders={purchaseOrders} setPurchaseOrders={setPurchaseOrders} churchId={church?.id} profile={profile} setProfile={setProfile} ministries={ministries} setMinistries={setMinistries} previewUsers={previewUsers} setPreviewUsers={setPreviewUsers}/>,
    ministries: <Ministries ministries={ministries}/>,
    calendar:   <CalendarView tasks={tasks}/>,
  };

  return (
    <>
      <GS/>
      <div className="app-shell" style={{display:"flex",minHeight:"100vh"}}>
        <Sidebar active={safeActive} setActive={setActive} profile={profile} church={church} onLogout={logout} collapsed={collapsed} setCollapsed={setCollapsed} unreadCount={unreadNotifications.length}/>
        <main style={{flex:1,overflowY:"auto",background:C.bg}}>{pages[safeActive] || pages.dashboard}</main>
      </div>
    </>
  );
}
