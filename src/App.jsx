import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  ClipboardList,
  LayoutDashboard,
  Search,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Activity,
  Droplet,
  Save,
  X,
  RefreshCw,
  Filter,
  Bed,
  Trash2,
  Wifi,
  WifiOff,
  Stethoscope,
  User,
  Lock,
  Plus,
  Building2,
} from "lucide-react";

/* ----------------------------- Static config ----------------------------- */

const BOONSOM_ROOMS = [
  ...Array.from({ length: 18 }, (_, i) => `OR${i + 1}`),
  "GYN 1",
  "GYN 2",
  "GYN 3",
  "GYN 4",
  "OB",
];

const OTHER_ROOMS = [
  "CVT 1",
  "CVT 2",
  "Hybrid",
  "Robot",
  "Neuro 1",
  "Neuro 2",
  "Eye 1",
  "Eye 2",
  "DSA",
  "Xray",
  "Cath lab",
];

const BUILDINGS = [
  { name: "ตึกบุญสม", rooms: BOONSOM_ROOMS },
  { name: "อื่นๆ", rooms: OTHER_ROOMS },
];

const ROOMS = [...BOONSOM_ROOMS, ...OTHER_ROOMS];
const ROOM_ORDER = Object.fromEntries(ROOMS.map((r, i) => [r, i]));

const ASA_OPTIONS = ["1", "2", "3", "4", "5", "6"];
const TECHNIQUES = [
  "GA",
  "Regional (RA)",
  "Spinal (SAB)",
  "Epidural",
  "CSE",
  "MAC / Sedation",
  "Nerve block",
];
const MONITORS = ["A-line", "CVP", "TEE"];
const WARDS = ["Recovery Room (RR)", "ICU", "SICU", "Ward", "Day case / กลับบ้าน"];
const BLOOD_TYPES = ["PRC", "FFP", "Platelet", "Cryoprecipitate", "อื่นๆ"];
const BLOOD_LOCATIONS = ["ตู้เย็น OR", "Blood bank"];

const STORAGE_KEY = "cmu-anesthesia-cases-v2";
const POLL_MS = 8000;
const HANDOVER_PASSWORD = "9876";

const emptyForm = {
  // Part 1
  age: "",
  sex: "",
  bw: "",
  ht: "",
  // Part 2
  asa: "",
  highRiskManual: false,
  problemList: "",
  diagnosis: "",
  operation: "",
  // Part 3
  techniques: [],
  monitors: [],
  signInTime: "",
  startTime: "",
  estimatedDurationMin: "",
  // Part 4
  labHb: "",
  labHct: "",
  bloodItems: [],
  otherLab: "",
  // Part 5
  postOpPain: "",
  postOpWard: "",
  otherInfo: "",
  recorderName: "",
  recorderPhone: "",
};

/* ------------------------------- Utilities -------------------------------- */

function calcBmi(bw, ht) {
  const w = parseFloat(bw);
  const h = parseFloat(ht);
  if (!w || !h) return null;
  const m = h / 100;
  return (w / (m * m)).toFixed(1);
}

function addMinutesToTime(timeStr, minutes) {
  if (!timeStr || !minutes) return null;
  const mins = parseInt(minutes, 10);
  if (Number.isNaN(mins)) return null;
  const [h, m] = timeStr.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const total = ((h * 60 + m + mins) % 1440 + 1440) % 1440;
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function isHighRisk(entry) {
  if (!entry) return false;
  const asaNum = parseInt(entry.asa, 10);
  return !!entry.highRiskManual || (!Number.isNaN(asaNum) && asaNum >= 4);
}

function timeAgo(iso) {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "เมื่อสักครู่";
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ชม.ที่แล้ว`;
  return new Date(iso).toLocaleDateString("th-TH");
}

function toggleInArray(arr, val) {
  return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];
}

/* -------------------------------- Small UI -------------------------------- */

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "px-3 py-1.5 rounded-md text-sm border transition-colors " +
        (active
          ? "bg-teal-600 border-teal-600 text-white"
          : "bg-white border-slate-200 text-slate-600 hover:border-teal-400 hover:text-teal-700")
      }
    >
      {children}
    </button>
  );
}

function Field({ label, children, required, className = "" }) {
  return (
    <label className={"flex flex-col gap-1 " + className}>
      <span className="text-xs font-medium text-slate-500">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 placeholder:text-slate-300";

function SectionCard({ number, title, icon: Icon, children }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-teal-600 text-[11px] font-semibold text-white">
          {number}
        </span>
        <Icon size={16} className="text-teal-600" />
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function PasswordGate({ open, title, onCancel, onSuccess }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setCode("");
      setError("");
    }
  }, [open]);

  if (!open) return null;

  const submit = (e) => {
    e.preventDefault();
    if (code === HANDOVER_PASSWORD) {
      onSuccess();
    } else {
      setError("รหัสไม่ถูกต้อง กรุณาลองใหม่");
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-xs rounded-lg bg-white p-5 shadow-lg"
      >
        <div className="mb-3 flex items-center gap-2 text-slate-700">
          <Lock size={16} className="text-teal-600" />
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          className={inputCls}
          placeholder="กรอกรหัสผ่าน"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        {error && <p className="mt-1.5 text-xs text-rose-500">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-50"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            className="rounded-md bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700"
          >
            ยืนยัน
          </button>
        </div>
      </form>
    </div>
  );
}

/* --------------------------------- Header --------------------------------- */

function Header({ activeTab, setActiveTab, syncState, lastSynced, onRefresh }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-teal-600 text-white">
            <Stethoscope size={18} />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-slate-800">CMU Anesthesia Handover</p>
            <p className="text-[11px] text-slate-400">
              ระบบส่งเวรสำหรับวิสัญญีแพทย์ คณะแพทยศาสตร์ มหาวิทยาลัยเชียงใหม่
            </p>
          </div>
        </div>

        <nav className="flex rounded-lg bg-slate-100 p-1 text-sm">
          <button
            onClick={() => setActiveTab("form")}
            className={
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors " +
              (activeTab === "form"
                ? "bg-white text-teal-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700")
            }
          >
            <ClipboardList size={15} />
            <span className="hidden sm:inline">บันทึกข้อมูล</span>
          </button>
          <button
            onClick={() => setActiveTab("dashboard")}
            className={
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors " +
              (activeTab === "dashboard"
                ? "bg-white text-teal-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700")
            }
          >
            <LayoutDashboard size={15} />
            <span className="hidden sm:inline">Dashboard</span>
          </button>
        </nav>

        <button
          onClick={onRefresh}
          title="ข้อมูลถูกเก็บไว้ในเบราว์เซอร์นี้ (localStorage)"
          className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-teal-600"
        >
          {syncState === "error" ? (
            <WifiOff size={14} className="text-rose-500" />
          ) : (
            <Wifi size={14} className={syncState === "loading" ? "animate-pulse" : ""} />
          )}
          <span className="hidden md:inline">
            {syncState === "loading"
              ? "กำลังซิงค์..."
              : syncState === "error"
              ? "ซิงค์ไม่สำเร็จ"
              : lastSynced
              ? `อัปเดตล่าสุด ${timeAgo(lastSynced)}`
              : "ยังไม่ซิงค์"}
          </span>
          <RefreshCw size={13} />
        </button>
      </div>
    </header>
  );
}

/* --------------------------------- Form ------------------------------------ */

function PatientForm({ casesByRoom, onSave, onHandover, onClearRoom }) {
  const [room, setRoom] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [savedFlash, setSavedFlash] = useState(false);
  const [gate, setGate] = useState(null); // 'handover' | 'clear' | null

  const existing = room ? casesByRoom[room] : null;

  useEffect(() => {
    setForm(existing ? { ...emptyForm, ...existing } : emptyForm);
  }, [room]); // eslint-disable-line react-hooks/exhaustive-deps

  const bmi = calcBmi(form.bw, form.ht);
  const estimatedFinish = addMinutesToTime(form.startTime, form.estimatedDurationMin);

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));

  const doSave = () => {
    if (!room) return null;
    const data = { ...form, bmi, estimatedFinish };
    onSave(room, data);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
    return data;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    doSave();
  };

  const requestHandover = (e) => {
    e.preventDefault();
    if (!room) return;
    doSave();
    setGate("handover");
  };

  const requestClear = () => setGate("clear");

  // Blood item helpers
  const addBloodItem = () =>
    update({
      bloodItems: [...form.bloodItems, { type: "PRC", units: "", location: BLOOD_LOCATIONS[0] }],
    });
  const updateBloodItem = (idx, patch) =>
    update({
      bloodItems: form.bloodItems.map((b, i) => (i === idx ? { ...b, ...patch } : b)),
    });
  const removeBloodItem = (idx) =>
    update({ bloodItems: form.bloodItems.filter((_, i) => i !== idx) });

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">บันทึกข้อมูลผู้ป่วยประจำห้องผ่าตัด</h2>
          <p className="text-sm text-slate-400">เลือกห้องผ่าตัดเพื่อเริ่มกรอกหรือแก้ไขข้อมูล</p>
        </div>
        <div className="w-full sm:w-56">
          <select
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            className={inputCls + " font-medium"}
          >
            <option value="">— เลือกห้องผ่าตัด —</option>
            {ROOMS.map((r) => (
              <option key={r} value={r}>
                {r}
                {casesByRoom[r]?.status === "handover" ? " (ส่งเวรแล้ว)" : casesByRoom[r] ? " (มีข้อมูล)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!room && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center text-sm text-slate-400">
          กรุณาเลือกห้องผ่าตัดด้านบนเพื่อเริ่มกรอกข้อมูล
        </div>
      )}

      {room && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {existing?.status === "handover" && (
            <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              <CheckCircle2 size={14} />
              ห้องนี้ส่งเวรแล้วเมื่อ {timeAgo(existing.handoverAt)} — แก้ไขแล้วกดบันทึกได้ตามปกติ
            </div>
          )}

          <SectionCard number={1} title="Patient Information" icon={User}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label="อายุ (ปี)" required>
                <input
                  type="number"
                  min="0"
                  className={inputCls + " font-mono tabular-nums"}
                  value={form.age}
                  onChange={(e) => update({ age: e.target.value })}
                  required
                />
              </Field>
              <Field label="เพศ" required>
                <select
                  className={inputCls}
                  value={form.sex}
                  onChange={(e) => update({ sex: e.target.value })}
                  required
                >
                  <option value="">เลือก</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </Field>
              <Field label="Weight (kg)">
                <input
                  type="number"
                  step="0.1"
                  className={inputCls + " font-mono tabular-nums"}
                  value={form.bw}
                  onChange={(e) => update({ bw: e.target.value })}
                />
              </Field>
              <Field label="Height (cm)">
                <input
                  type="number"
                  step="0.1"
                  className={inputCls + " font-mono tabular-nums"}
                  value={form.ht}
                  onChange={(e) => update({ ht: e.target.value })}
                />
              </Field>
            </div>
            {bmi && (
              <p className="mt-3 text-xs text-slate-400">
                BMI = <span className="font-mono font-semibold text-slate-600">{bmi}</span> kg/m²
              </p>
            )}
          </SectionCard>

          <SectionCard number={2} title="Clinical Information" icon={Activity}>
            <div className="flex flex-col gap-3">
              <Field label="ASA classification" required>
                <div className="flex flex-wrap items-center gap-2">
                  {ASA_OPTIONS.map((a) => (
                    <Chip key={a} active={form.asa === a} onClick={() => update({ asa: a })}>
                      {a}
                    </Chip>
                  ))}
                  <span className="mx-1 h-5 w-px bg-slate-200" />
                  <label className="flex items-center gap-1.5 text-sm text-rose-600">
                    <input
                      type="checkbox"
                      checked={form.highRiskManual}
                      onChange={(e) => update({ highRiskManual: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-400"
                    />
                    ติ๊ก High risk เอง
                  </label>
                </div>
                <p className="mt-1.5 text-[11px] text-slate-400">
                  ASA class 4 ขึ้นไปจะถูกจัดเป็น High risk อัตโนมัติ (ไม่ต้องติ๊กก็ได้)
                </p>
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Problem list">
                  <textarea
                    rows={2}
                    className={inputCls}
                    value={form.problemList}
                    onChange={(e) => update({ problemList: e.target.value })}
                  />
                </Field>
                <Field label="Diagnosis">
                  <textarea
                    rows={2}
                    className={inputCls}
                    value={form.diagnosis}
                    onChange={(e) => update({ diagnosis: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Operation">
                <input
                  className={inputCls}
                  value={form.operation}
                  onChange={(e) => update({ operation: e.target.value })}
                />
              </Field>
            </div>
          </SectionCard>

          <SectionCard number={3} title="Anesthetic Technique" icon={Stethoscope}>
            <div className="flex flex-col gap-4">
              <Field label="Choice of anesthesia">
                <div className="flex flex-wrap gap-2">
                  {TECHNIQUES.map((t) => (
                    <Chip
                      key={t}
                      active={form.techniques.includes(t)}
                      onClick={() => update({ techniques: toggleInArray(form.techniques, t) })}
                    >
                      {t}
                    </Chip>
                  ))}
                </div>
              </Field>
              <Field label="Monitoring">
                <div className="flex flex-wrap gap-2">
                  {MONITORS.map((m) => (
                    <Chip
                      key={m}
                      active={form.monitors.includes(m)}
                      onClick={() => update({ monitors: toggleInArray(form.monitors, m) })}
                    >
                      {m}
                    </Chip>
                  ))}
                </div>
              </Field>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Field label="Sign-in time">
                  <input
                    type="time"
                    className={inputCls + " font-mono tabular-nums"}
                    value={form.signInTime}
                    onChange={(e) => update({ signInTime: e.target.value })}
                  />
                </Field>
                <Field label="Start time">
                  <input
                    type="time"
                    className={inputCls + " font-mono tabular-nums"}
                    value={form.startTime}
                    onChange={(e) => update({ startTime: e.target.value })}
                  />
                </Field>
                <Field label="ระยะเวลาผ่าตัด (นาที)" className="col-span-2 sm:col-span-1">
                  <input
                    type="number"
                    min="0"
                    placeholder="เช่น 150"
                    className={inputCls + " font-mono tabular-nums"}
                    value={form.estimatedDurationMin}
                    onChange={(e) => update({ estimatedDurationMin: e.target.value })}
                  />
                </Field>
                <Field label="เวลาคาดว่าจะเสร็จ">
                  <div
                    className={
                      inputCls +
                      " flex items-center font-mono tabular-nums font-semibold " +
                      (estimatedFinish ? "text-teal-700 bg-teal-50" : "text-slate-300")
                    }
                  >
                    {estimatedFinish || "รอกรอกเวลา"}
                  </div>
                </Field>
              </div>
            </div>
          </SectionCard>

          <SectionCard number={4} title="Laboratory & Blood Management" icon={Droplet}>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Field label="Hb (g/dL)">
                  <input
                    type="number"
                    step="0.1"
                    className={inputCls + " font-mono tabular-nums"}
                    value={form.labHb}
                    onChange={(e) => update({ labHb: e.target.value })}
                  />
                </Field>
                <Field label="Hct (%)">
                  <input
                    type="number"
                    step="0.1"
                    className={inputCls + " font-mono tabular-nums"}
                    value={form.labHct}
                    onChange={(e) => update({ labHct: e.target.value })}
                  />
                </Field>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Blood component</span>
                  <button
                    type="button"
                    onClick={addBloodItem}
                    className="flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700"
                  >
                    <Plus size={13} /> เพิ่มรายการเลือด
                  </button>
                </div>
                {form.bloodItems.length === 0 ? (
                  <p className="rounded-md border border-dashed border-slate-200 px-3 py-2.5 text-xs text-slate-300">
                    ยังไม่มีรายการเลือดที่เตรียมไว้
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {form.bloodItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2"
                      >
                        <select
                          className={inputCls + " w-28"}
                          value={item.type}
                          onChange={(e) => updateBloodItem(idx, { type: e.target.value })}
                        >
                          {BLOOD_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min="0"
                          placeholder="unit"
                          className={inputCls + " w-20 font-mono tabular-nums"}
                          value={item.units}
                          onChange={(e) => updateBloodItem(idx, { units: e.target.value })}
                        />
                        <span className="text-xs text-slate-400">unit</span>
                        <div className="flex gap-3 pl-1">
                          {BLOOD_LOCATIONS.map((loc) => (
                            <label key={loc} className="flex items-center gap-1 text-xs text-slate-600">
                              <input
                                type="radio"
                                name={`blood-loc-${idx}`}
                                checked={item.location === loc}
                                onChange={() => updateBloodItem(idx, { location: loc })}
                                className="h-3.5 w-3.5 text-teal-600 focus:ring-teal-400"
                              />
                              {loc}
                            </label>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeBloodItem(idx)}
                          className="ml-auto text-slate-300 hover:text-rose-500"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Field label="Other important lab">
                <textarea
                  rows={2}
                  className={inputCls}
                  value={form.otherLab}
                  onChange={(e) => update({ otherLab: e.target.value })}
                />
              </Field>
            </div>
          </SectionCard>

          <SectionCard number={5} title="Post-Operative Information" icon={Bed}>
            <div className="flex flex-col gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Post-op pain control">
                  <input
                    className={inputCls}
                    placeholder="เช่น IV PCA morphine, Local infiltration"
                    value={form.postOpPain}
                    onChange={(e) => update({ postOpPain: e.target.value })}
                  />
                </Field>
                <Field label="Post-op ward" required>
                  <select
                    className={inputCls}
                    value={form.postOpWard}
                    onChange={(e) => update({ postOpWard: e.target.value })}
                    required
                  >
                    <option value="">เลือก</option>
                    {WARDS.map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Other information (ข้อควรระวัง / หมายเหตุ)">
                <textarea
                  rows={2}
                  className={inputCls}
                  value={form.otherInfo}
                  onChange={(e) => update({ otherInfo: e.target.value })}
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="ผู้บันทึกข้อมูล">
                  <input
                    className={inputCls}
                    value={form.recorderName}
                    onChange={(e) => update({ recorderName: e.target.value })}
                  />
                </Field>
                <Field label="เบอร์โทรผู้บันทึก">
                  <input
                    type="tel"
                    className={inputCls + " font-mono"}
                    value={form.recorderPhone}
                    onChange={(e) => update({ recorderPhone: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          </SectionCard>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
            <div className="text-xs text-slate-400">
              {savedFlash ? (
                <span className="flex items-center gap-1.5 font-medium text-teal-600">
                  <CheckCircle2 size={14} /> บันทึกแล้ว
                </span>
              ) : existing ? (
                `แก้ไขล่าสุด ${timeAgo(existing.updatedAt)}`
              ) : (
                "ยังไม่มีข้อมูลบันทึกไว้สำหรับห้องนี้"
              )}
            </div>
            <div className="flex gap-2">
              {existing && (
                <button
                  type="button"
                  onClick={requestClear}
                  className="flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-500 hover:border-rose-300 hover:text-rose-600"
                >
                  <Trash2 size={14} /> เคลียร์ห้องนี้
                </button>
              )}
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-md bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                <Save size={14} /> บันทึกข้อมูล
              </button>
              <button
                type="button"
                onClick={requestHandover}
                className="flex items-center gap-1.5 rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
              >
                <Lock size={13} /> ส่งเวร
              </button>
            </div>
          </div>
        </form>
      )}

      <PasswordGate
        open={gate === "handover"}
        title="ใส่รหัสผ่านเพื่อยืนยันการส่งเวร"
        onCancel={() => setGate(null)}
        onSuccess={() => {
          onHandover(room);
          setGate(null);
        }}
      />
      <PasswordGate
        open={gate === "clear"}
        title="ใส่รหัสผ่านเพื่อลบข้อมูลห้องนี้"
        onCancel={() => setGate(null)}
        onSuccess={() => {
          onClearRoom(room);
          setGate(null);
          setRoom("");
        }}
      />
    </div>
  );
}

/* -------------------------------- Dashboard -------------------------------- */

function StatStrip({ stats }) {
  const items = [
    { label: "ห้องที่มีข้อมูล", value: stats.total, icon: Bed, tone: "text-slate-600" },
    { label: "ส่งเวรแล้ว", value: stats.handover, icon: CheckCircle2, tone: "text-emerald-600" },
    { label: "รอส่งเวร", value: stats.pending, icon: Clock, tone: "text-amber-600" },
    { label: "High-risk (ASA≥4)", value: stats.highRisk, icon: AlertTriangle, tone: "text-rose-600" },
  ];
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-4">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-3 bg-white px-4 py-3">
          <it.icon size={18} className={it.tone} />
          <div>
            <p className={"font-mono text-xl font-semibold tabular-nums " + it.tone}>{it.value}</p>
            <p className="text-[11px] text-slate-400">{it.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function RoomCard({ room, entry, onOpen }) {
  const risk = isHighRisk(entry);
  const handedOver = entry.status === "handover";

  return (
    <button
      onClick={() => onOpen(room)}
      className={
        "flex w-full flex-col gap-1.5 rounded-md border border-slate-200 border-l-4 bg-white px-3.5 py-3 text-left transition-shadow hover:shadow-md " +
        (risk ? "border-l-rose-500" : handedOver ? "border-l-emerald-500" : "border-l-amber-400")
      }
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-800">{room}</span>
        {risk && <AlertTriangle size={14} className="text-rose-500" />}
      </div>
      <p className="truncate text-xs text-slate-500">
        {entry.sex || "-"} · {entry.age || "-"} ปี
      </p>
      <p className="truncate text-xs text-slate-400">{entry.diagnosis || "ยังไม่ระบุ diagnosis"}</p>
      <p className="truncate text-xs text-slate-400">{entry.operation || "ยังไม่ระบุ operation"}</p>
      <p className="truncate text-xs text-slate-400">
        {entry.techniques?.join(", ") || "ยังไม่ระบุ technique"}
      </p>
      <div className="mt-1 flex items-center justify-between">
        <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
          <Clock size={11} /> {entry.estimatedFinish || "-"}
        </span>
        <span
          className={
            "rounded px-1.5 py-0.5 text-[10px] font-medium " +
            (handedOver ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")
          }
        >
          {handedOver ? "ส่งเวรแล้ว" : "รอส่งเวร"}
        </span>
      </div>
    </button>
  );
}

function DetailModal({ room, entry, onClose, onRequestDelete }) {
  if (!entry) return null;
  const rows = [
    ["เพศ / อายุ", `${entry.sex || "-"} / ${entry.age || "-"} ปี`],
    ["Weight / Height / BMI", `${entry.bw || "-"} kg / ${entry.ht || "-"} cm / ${entry.bmi || "-"} kg/m²`],
    ["ASA class", `${entry.asa || "-"}${entry.highRiskManual ? " (ติ๊ก High risk)" : ""}`],
    ["Problem list", entry.problemList || "-"],
    ["Diagnosis", entry.diagnosis || "-"],
    ["Operation", entry.operation || "-"],
    ["Choice of anesthesia", entry.techniques?.join(", ") || "-"],
    ["Monitoring", entry.monitors?.join(", ") || "-"],
    ["Sign-in / Start time", `${entry.signInTime || "-"} / ${entry.startTime || "-"}`],
    ["ระยะเวลาผ่าตัด (นาที) / คาดว่าเสร็จ", `${entry.estimatedDurationMin || "-"} / ${entry.estimatedFinish || "-"}`],
    ["Hb / Hct", `${entry.labHb || "-"} / ${entry.labHct || "-"}`],
    [
      "Blood component",
      entry.bloodItems?.length
        ? entry.bloodItems.map((b) => `${b.type} ${b.units || "-"} unit (${b.location})`).join(", ")
        : "-",
    ],
    ["Other important lab", entry.otherLab || "-"],
    ["Post-op pain control", entry.postOpPain || "-"],
    ["Post-op ward", entry.postOpWard || "-"],
    ["Other information", entry.otherInfo || "-"],
    ["ผู้บันทึก / เบอร์โทร", `${entry.recorderName || "-"} / ${entry.recorderPhone || "-"}`],
  ];
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-xl bg-white sm:rounded-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-3.5">
          <div>
            <h3 className="text-base font-semibold text-slate-800">{room}</h3>
            <p className="text-[11px] text-slate-400">
              {entry.status === "handover"
                ? `ส่งเวรแล้ว · ${timeAgo(entry.handoverAt)}`
                : `รอส่งเวร · แก้ไขล่าสุด ${timeAgo(entry.updatedAt)}`}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onRequestDelete(room)}
              title="ลบข้อมูลห้องนี้"
              className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
            >
              <Trash2 size={16} />
            </button>
            <button onClick={onClose} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100">
              <X size={18} />
            </button>
          </div>
        </div>
        <dl className="divide-y divide-slate-100 px-5 py-2">
          {rows.map(([label, value]) => (
            <div key={label} className="grid grid-cols-3 gap-2 py-2.5 text-sm">
              <dt className="col-span-1 text-xs text-slate-400">{label}</dt>
              <dd className="col-span-2 whitespace-pre-wrap text-slate-700">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

function Dashboard({ casesByRoom, onDeleteRoom }) {
  const [query, setQuery] = useState("");
  const [wardFilter, setWardFilter] = useState("");
  const [highRiskOnly, setHighRiskOnly] = useState(false);
  const [openRoom, setOpenRoom] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [deleteGateRoom, setDeleteGateRoom] = useState(null);

  const stats = useMemo(() => {
    const entries = Object.values(casesByRoom);
    return {
      total: entries.length,
      handover: entries.filter((e) => e.status === "handover").length,
      pending: entries.filter((e) => e.status !== "handover").length,
      highRisk: entries.filter(isHighRisk).length,
    };
  }, [casesByRoom]);

  const roomPasses = (room) => {
    const entry = casesByRoom[room];
    if (!entry) return false;
    if (query && !room.toLowerCase().includes(query.toLowerCase())) return false;
    if (wardFilter && entry.postOpWard !== wardFilter) return false;
    if (highRiskOnly && !isHighRisk(entry)) return false;
    return true;
  };

  const anyData = Object.keys(casesByRoom).length > 0;
  const anyVisible = ROOMS.some(roomPasses);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-5 flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-slate-800">ภาพรวมการส่งเวรวิสัญญี</h2>
        <p className="text-sm text-slate-400">ห้อง High-risk (ASA≥4 หรือติ๊กเอง) จะแสดงเป็นแถบสีแดงและเรียงขึ้นก่อนเสมอ</p>
      </div>

      <div className="mb-4">
        <StatStrip stats={stats} />
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
          <input
            className={inputCls + " pl-9"}
            placeholder="ค้นหาห้องผ่าตัด เช่น OR3, Cath lab"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowFilters((s) => !s)}
          className="flex items-center justify-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:border-teal-400 sm:w-auto"
        >
          <Filter size={14} /> ตัวกรอง
        </button>
      </div>

      {showFilters && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <Field label="Post-op ward" className="w-48">
            <select className={inputCls} value={wardFilter} onChange={(e) => setWardFilter(e.target.value)}>
              <option value="">ทั้งหมด</option>
              {WARDS.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </Field>
          <label className="mt-4 flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={highRiskOnly}
              onChange={(e) => setHighRiskOnly(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-400"
            />
            แสดงเฉพาะ High-risk
          </label>
          {(query || wardFilter || highRiskOnly) && (
            <button
              onClick={() => {
                setQuery("");
                setWardFilter("");
                setHighRiskOnly(false);
              }}
              className="mt-4 text-xs text-slate-400 underline hover:text-slate-600"
            >
              ล้างตัวกรอง
            </button>
          )}
        </div>
      )}

      {!anyData ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center text-sm text-slate-400">
          ยังไม่มีห้องผ่าตัดใดบันทึกข้อมูล
        </div>
      ) : !anyVisible ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center text-sm text-slate-400">
          ไม่พบห้องผ่าตัดที่ตรงกับตัวกรอง
        </div>
      ) : (
        BUILDINGS.map((b) => {
          const visibleRooms = b.rooms.filter(roomPasses);
          const sorted = [...visibleRooms].sort((a, c) => {
            const riskDiff = (isHighRisk(casesByRoom[c]) ? 1 : 0) - (isHighRisk(casesByRoom[a]) ? 1 : 0);
            if (riskDiff !== 0) return riskDiff;
            return ROOM_ORDER[a] - ROOM_ORDER[c];
          });
          if (sorted.length === 0) return null;
          return (
            <div key={b.name} className="mb-6">
              <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                <Building2 size={15} className="text-teal-600" />
                {b.name}
                <span className="font-mono text-xs font-normal text-slate-400">({sorted.length})</span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {sorted.map((room) => (
                  <RoomCard key={room} room={room} entry={casesByRoom[room]} onOpen={setOpenRoom} />
                ))}
              </div>
            </div>
          );
        })
      )}

      {openRoom && (
        <DetailModal
          room={openRoom}
          entry={casesByRoom[openRoom]}
          onClose={() => setOpenRoom(null)}
          onRequestDelete={(room) => setDeleteGateRoom(room)}
        />
      )}

      <PasswordGate
        open={!!deleteGateRoom}
        title={`ใส่รหัสผ่านเพื่อลบข้อมูล ${deleteGateRoom || ""}`}
        onCancel={() => setDeleteGateRoom(null)}
        onSuccess={() => {
          onDeleteRoom(deleteGateRoom);
          setDeleteGateRoom(null);
          setOpenRoom(null);
        }}
      />
    </div>
  );
}

/* ---------------------------------- App ------------------------------------ */

export default function App() {
  const [activeTab, setActiveTab] = useState("form");
  const [casesByRoom, setCasesByRoom] = useState({});
  const [syncState, setSyncState] = useState("loading");
  const [lastSynced, setLastSynced] = useState(null);
  const pollRef = useRef(null);

  const loadFromStorage = useCallback(async () => {
    setSyncState("loading");
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const data = raw ? JSON.parse(raw) : {};
      setCasesByRoom(data);
      setSyncState("idle");
      setLastSynced(new Date().toISOString());
    } catch (err) {
      console.error("Storage load failed:", err);
      setCasesByRoom({});
      setSyncState("error");
    }
  }, []);

  const persist = useCallback(async (nextData) => {
    setSyncState("loading");
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextData));
      setSyncState("idle");
      setLastSynced(new Date().toISOString());
    } catch (err) {
      console.error("Storage save failed:", err);
      setSyncState("error");
    }
  }, []);

  useEffect(() => {
    loadFromStorage();
    const onStorageEvent = (e) => {
      if (e.key === STORAGE_KEY) loadFromStorage();
    };
    window.addEventListener("storage", onStorageEvent);
    pollRef.current = setInterval(loadFromStorage, POLL_MS);
    return () => {
      window.removeEventListener("storage", onStorageEvent);
      clearInterval(pollRef.current);
    };
  }, [loadFromStorage]);

  const handleSave = (room, data) => {
    setCasesByRoom((prev) => {
      const next = {
        ...prev,
        [room]: {
          ...prev[room],
          ...data,
          status: prev[room]?.status === "handover" ? "handover" : "filled",
          updatedAt: new Date().toISOString(),
        },
      };
      persist(next);
      return next;
    });
  };

  const handleHandover = (room) => {
    setCasesByRoom((prev) => {
      if (!prev[room]) return prev;
      const next = {
        ...prev,
        [room]: {
          ...prev[room],
          status: "handover",
          handoverAt: new Date().toISOString(),
        },
      };
      persist(next);
      return next;
    });
  };

  const handleClearRoom = (room) => {
    setCasesByRoom((prev) => {
      const next = { ...prev };
      delete next[room];
      persist(next);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        syncState={syncState}
        lastSynced={lastSynced}
        onRefresh={loadFromStorage}
      />
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-center text-[11px] text-amber-700">
        เดโมนี้เก็บข้อมูลในเบราว์เซอร์เครื่องนี้เท่านั้น (localStorage) — สำหรับใช้งานจริงหลายห้อง/หลายเครื่องพร้อมกัน ต้องต่อฐานข้อมูลกลาง
      </div>
      {activeTab === "form" ? (
        <PatientForm
          casesByRoom={casesByRoom}
          onSave={handleSave}
          onHandover={handleHandover}
          onClearRoom={handleClearRoom}
        />
      ) : (
        <Dashboard casesByRoom={casesByRoom} onDeleteRoom={handleClearRoom} />
      )}
    </div>
  );
}
