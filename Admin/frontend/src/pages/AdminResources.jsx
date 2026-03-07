import { useEffect, useState, useCallback } from "react";
import {
  getResources, uploadResource, deleteResource, updateResource,
  getSubjects, getSubfolders, createSubject, createSubfolder,
  deleteSubject, deleteSubfolder,
} from "../services/resourceService";

const fmtSize = (bytes) => {
  if (!bytes) return "—";
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
const cleanTitle = (t = "") => t.replace(/_/g, " ");

const EXAM_TYPES = [
  {
    id: "UPSC",
    label: "UPSC",
    sub: "Union Public Service Commission",
    icon: "🏛️",
    color: "violet",
    gradient: "from-violet-900/40 to-violet-800/20",
    border: "border-violet-600",
    badge: "bg-violet-600",
    ring: "ring-violet-500",
  },
  {
    id: "MPSC",
    label: "MPSC",
    sub: "Maharashtra Public Service Commission",
    icon: "🎯",
    color: "blue",
    gradient: "from-blue-900/40 to-blue-800/20",
    border: "border-blue-600",
    badge: "bg-blue-600",
    ring: "ring-blue-500",
  },
];

// ── Toast ────────────────────────────────────────────────────
const Toast = ({ toasts }) => (
  <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
    {toasts.map((t) => (
      <div key={t.id} className={`px-4 py-3 rounded-lg text-sm font-medium shadow-lg text-white
        ${t.type === "success" ? "bg-green-600" : t.type === "error" ? "bg-red-600" : "bg-blue-600"}`}>
        {t.message}
      </div>
    ))}
  </div>
);

// ════════════════════════════════════════════════════════════
//  LANDING — pick exam type
// ════════════════════════════════════════════════════════════
const ExamLanding = ({ onSelect }) => (
  <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4">
    <div className="mb-10 text-center">
      <h1 className="text-4xl font-bold text-white mb-2">📚 Smart Prep Admin</h1>
      <p className="text-gray-500 text-sm">Select an exam section to manage its resources</p>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
      {EXAM_TYPES.map((exam) => (
        <button
          key={exam.id}
          onClick={() => onSelect(exam.id)}
          className={`group relative bg-gradient-to-br ${exam.gradient}
            border ${exam.border} rounded-2xl p-8 text-left
            hover:scale-105 hover:ring-2 ${exam.ring}
            transition-all duration-200 shadow-xl`}
        >
          <div className="text-5xl mb-4">{exam.icon}</div>
          <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold text-white mb-3 ${exam.badge}`}>
            {exam.label}
          </div>
          <h2 className="text-xl font-bold text-white mb-1">{exam.label} Resources</h2>
          <p className="text-sm text-gray-400">{exam.sub}</p>
          <div className="mt-6 text-xs text-gray-500 group-hover:text-gray-300 transition">
            Click to manage →
          </div>
        </button>
      ))}
    </div>
  </div>
);

// ════════════════════════════════════════════════════════════
//  MAIN ADMIN PANEL (scoped to one exam)
// ════════════════════════════════════════════════════════════
const AdminPanel = ({ examType, onBack, onSwitch }) => {
  const exam     = EXAM_TYPES.find((e) => e.id === examType);

  const [resources, setResources]   = useState([]);
  const [subjects, setSubjects]     = useState([]);
  const [loading, setLoading]       = useState(false);
  const [toasts, setToasts]         = useState([]);
  const [activeTab, setActiveTab]   = useState("resources");

  // filters
  const [search, setSearch]                     = useState("");
  const [filterSubject, setFilterSubject]       = useState("All");
  const [filterSubfolder, setFilterSubfolder]   = useState("All");
  const [filterSubfolders, setFilterSubfolders] = useState([]);
  const [sortBy, setSortBy]                     = useState("newest");

  // upload form
  const [upSubject, setUpSubject]       = useState("");
  const [upSubfolder, setUpSubfolder]   = useState("");
  const [upFiles, setUpFiles]           = useState([]);
  const [upProgress, setUpProgress]     = useState([]);
  const [upLoading, setUpLoading]       = useState(false);
  const [upSubfolders, setUpSubfolders] = useState([]);

  // create subject / subfolder
  const [newSubjectName, setNewSubjectName] = useState("");
  const [sfSubject, setSfSubject]           = useState("");
  const [sfName, setSfName]                 = useState("");
  const [sfSubfolders, setSfSubfolders]     = useState([]);

  // delete folder
  const [delFolderType, setDelFolderType]       = useState("subject");
  const [delFolderSubject, setDelFolderSubject] = useState("");
  const [delFolderSf, setDelFolderSf]           = useState("");
  const [delFolderSfList, setDelFolderSfList]   = useState([]);
  const [delFolderConfirm, setDelFolderConfirm] = useState(false);
  const [delFolderTarget, setDelFolderTarget]   = useState(null);

  // modals
  const [deleteTarget, setDeleteTarget]   = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [replaceTarget, setReplaceTarget] = useState(null);
  const [replaceFile, setReplaceFile]     = useState(null);
  const [previewRes, setPreviewRes]       = useState(null);

  const addToast = (message, type = "success") => {
    const id = Date.now();
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4000);
  };

  // ── loaders ─────────────────────────────────────────────────
  const loadSubjects = useCallback(async () => {
    const res = await getSubjects(examType);
    setSubjects(res.data);
  }, [examType]);

  const loadResources = useCallback(async () => {
    setLoading(true);
    try {
      const params = { examType };
      if (filterSubject   !== "All") params.subject   = filterSubject;
      if (filterSubfolder !== "All") params.subFolder = filterSubfolder;
      if (search.trim())             params.search    = search.trim();
      const res = await getResources(params);
      let data = [...res.data];
      if (sortBy === "newest") data.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      if (sortBy === "oldest") data.sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));
      if (sortBy === "az")     data.sort((a, b) => a.title.localeCompare(b.title));
      if (sortBy === "size")   data.sort((a, b) => b.fileSize - a.fileSize);
      setResources(data);
    } catch { addToast("Failed to load resources.", "error"); }
    finally { setLoading(false); }
  }, [examType, filterSubject, filterSubfolder, search, sortBy]);

  useEffect(() => { loadSubjects(); }, [loadSubjects]);
  useEffect(() => { loadResources(); }, [loadResources]);

  useEffect(() => {
    if (filterSubject === "All") { setFilterSubfolders([]); setFilterSubfolder("All"); return; }
    getSubfolders(examType, filterSubject).then((r) => { setFilterSubfolders(r.data); setFilterSubfolder("All"); });
  }, [examType, filterSubject]);

  useEffect(() => {
    if (!upSubject) { setUpSubfolders([]); return; }
    getSubfolders(examType, upSubject).then((r) => { setUpSubfolders(r.data); setUpSubfolder(""); });
  }, [examType, upSubject]);

  useEffect(() => {
    if (!sfSubject) { setSfSubfolders([]); return; }
    getSubfolders(examType, sfSubject).then((r) => setSfSubfolders(r.data));
  }, [examType, sfSubject]);

  useEffect(() => {
    if (!delFolderSubject) { setDelFolderSfList([]); setDelFolderSf(""); return; }
    getSubfolders(examType, delFolderSubject).then((r) => { setDelFolderSfList(r.data); setDelFolderSf(""); });
  }, [examType, delFolderSubject]);

  const totalSize = resources.reduce((s, r) => s + (r.fileSize || 0), 0);

  // ── handlers ─────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!upFiles.length || !upSubject || !upSubfolder) {
      addToast("Please fill subject, subfolder and select file(s).", "error"); return;
    }
    setUpLoading(true);
    setUpProgress(upFiles.map((f) => ({ name: f.name, status: "pending" })));
    for (let i = 0; i < upFiles.length; i++) {
      setUpProgress((p) => p.map((x, idx) => idx === i ? { ...x, status: "uploading" } : x));
      try {
        const fd = new FormData();
        fd.append("file", upFiles[i]);
        fd.append("subject", upSubject);
        fd.append("subFolder", upSubfolder);
        fd.append("examType", examType);
        const res = await uploadResource(fd);
        setUpProgress((p) => p.map((x, idx) =>
          idx === i ? { ...x, status: res.data.updated ? "updated" : "done" } : x));
      } catch {
        setUpProgress((p) => p.map((x, idx) => idx === i ? { ...x, status: "error" } : x));
      }
    }
    setUpLoading(false);
    addToast("Upload complete!");
    setUpFiles([]);
    loadResources();
    loadSubjects();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteResource(deleteTarget._id);
      addToast(`"${cleanTitle(deleteTarget.title)}" deleted.`);
      setDeleteTarget(null); setDeleteConfirm(false);
      loadResources(); loadSubjects();
    } catch { addToast("Delete failed.", "error"); }
  };

  const handleReplace = async () => {
    if (!replaceTarget || !replaceFile) return;
    try {
      const fd = new FormData();
      fd.append("file", replaceFile);
      await updateResource(replaceTarget._id, fd);
      addToast(`"${cleanTitle(replaceTarget.title)}" replaced.`);
      setReplaceTarget(null); setReplaceFile(null);
      loadResources();
    } catch { addToast("Replace failed.", "error"); }
  };

  const handleCreateSubject = async () => {
    if (!newSubjectName.trim()) { addToast("Subject name cannot be empty.", "error"); return; }
    try {
      await createSubject(examType, newSubjectName.trim());
      addToast(`Subject "${newSubjectName.trim()}" created!`);
      setNewSubjectName(""); loadSubjects();
    } catch (err) { addToast(err.response?.data?.message || "Failed.", "error"); }
  };

  const handleCreateSubfolder = async () => {
    if (!sfSubject || !sfName.trim()) { addToast("Select a subject and enter a subfolder name.", "error"); return; }
    try {
      await createSubfolder(examType, sfSubject, sfName.trim());
      addToast(`Subfolder "${sfSubject}/${sfName.trim()}" created!`);
      setSfName("");
      getSubfolders(examType, sfSubject).then((r) => setSfSubfolders(r.data));
    } catch (err) { addToast(err.response?.data?.message || "Failed.", "error"); }
  };

  const openDelFolderModal = () => {
    if (delFolderType === "subject" && !delFolderSubject) {
      addToast("Select a subject to delete.", "error"); return;
    }
    if (delFolderType === "subfolder" && (!delFolderSubject || !delFolderSf)) {
      addToast("Select a subject and subfolder to delete.", "error"); return;
    }
    setDelFolderTarget(
      delFolderType === "subject"
        ? { type: "subject",   subject: delFolderSubject }
        : { type: "subfolder", subject: delFolderSubject, subFolder: delFolderSf }
    );
    setDelFolderConfirm(false);
  };

  const handleDeleteFolder = async () => {
    if (!delFolderTarget) return;
    try {
      if (delFolderTarget.type === "subject") {
        await deleteSubject(examType, delFolderTarget.subject);
        addToast(`Subject "${delFolderTarget.subject}" deleted.`);
        setDelFolderSubject("");
      } else {
        await deleteSubfolder(examType, delFolderTarget.subject, delFolderTarget.subFolder);
        addToast(`Subfolder deleted.`);
        setDelFolderSf("");
        getSubfolders(examType, delFolderTarget.subject).then((r) => setDelFolderSfList(r.data));
      }
      setDelFolderTarget(null); setDelFolderConfirm(false);
      loadSubjects(); loadResources();
    } catch (err) {
      addToast(err.response?.data?.message || "Delete failed.", "error");
      setDelFolderTarget(null); setDelFolderConfirm(false);
    }
  };

  // ── styles ────────────────────────────────────────────────────
  const inputCls   = "w-full px-3 py-2 rounded-lg border border-gray-700 bg-gray-900 text-sm text-gray-200 focus:outline-none focus:border-violet-500 placeholder-gray-600";
  const selectCls  = inputCls;
  const btnPrimary = `px-4 py-2 rounded-lg ${exam.badge} hover:opacity-90 text-white text-sm font-medium transition disabled:opacity-50`;
  const btnDanger  = "px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition disabled:opacity-40";
  const btnGhost   = "px-4 py-2 rounded-lg border border-gray-700 hover:border-gray-500 text-gray-300 text-sm font-medium transition";
  const tabCls     = (tab) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition cursor-pointer text-left w-full
    ${activeTab === tab ? `${exam.badge} text-white` : "text-gray-400 hover:text-white hover:bg-gray-800"}`;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Toast toasts={toasts} />

      {/* Header */}
      <div className={`border-b border-gray-800 px-6 py-4 flex items-center justify-between bg-gradient-to-r ${exam.gradient}`}>
        <div className="flex items-center gap-3">
          {/* Back button */}
          <button onClick={onBack}
            className="text-gray-400 hover:text-white transition px-2 py-1 rounded-lg hover:bg-gray-800 text-sm">
            ← Back
          </button>
          <div className={`w-px h-6 bg-gray-700`} />
          <span className="text-2xl">{exam.icon}</span>
          <div>
            <h1 className="text-xl font-bold text-white">{exam.label} Resource Panel</h1>
            <p className="text-xs text-gray-400">{exam.sub}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
  {/* Direct exam switcher — no landing screen */}
  <div className="flex rounded-lg overflow-hidden border border-gray-700">
    {EXAM_TYPES.map((e) => (
      <button
        key={e.id}
        onClick={() => e.id !== examType && onSwitch(e.id)}
        className={`px-4 py-1.5 text-xs font-semibold transition
          ${e.id === examType
            ? `${exam.badge} text-white cursor-default`
            : "bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-800 cursor-pointer"
          }`}
      >
        {e.icon} {e.label}
      </button>
    ))}
  </div>

  {/* Back to landing — only if they want to */}
  <button onClick={onBack} className={btnGhost + " text-xs"}>
    ← Landing
  </button>

  <button
    onClick={() => { loadResources(); loadSubjects(); addToast("Refreshed!"); }}
    className={btnGhost}
  >
    🔄 Refresh
  </button>
</div>
      </div>

      <div className="flex h-[calc(100vh-65px)]">

        {/* Sidebar */}
        <aside className="w-60 border-r border-gray-800 p-4 flex flex-col gap-1 shrink-0 overflow-y-auto">
          {[
            { id: "resources",        label: "🗂️  Browse Resources" },
            { id: "upload",           label: "⬆️  Upload PDFs" },
            { id: "create-subject",   label: "➕  New Subject" },
            { id: "create-subfolder", label: "📁  New Subfolder" },
            { id: "delete-folder",    label: "🗑️  Delete Folder" },
          ].map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} className={tabCls(t.id)}>
              {t.label}
            </button>
          ))}

          <div className="mt-auto pt-4 border-t border-gray-800 space-y-3">
            {[
              { label: "Total PDFs", value: resources.length },
              { label: "Subjects",   value: subjects.length },
              { label: "Total Size", value: fmtSize(totalSize) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-900 rounded-lg px-3 py-2 flex justify-between items-center">
                <span className="text-xs text-gray-500">{label}</span>
                <span className={`text-sm font-bold text-${exam.color}-400`}>{value}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">

          {/* ── BROWSE ── */}
          {activeTab === "resources" && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Browse & Manage — {examType}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <input className={inputCls} placeholder="🔍 Search title..."
                  value={search} onChange={(e) => setSearch(e.target.value)} />
                <select className={selectCls} value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value)}>
                  <option value="All">All Subjects</option>
                  {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select className={selectCls} value={filterSubfolder}
                  onChange={(e) => setFilterSubfolder(e.target.value)}
                  disabled={filterSubject === "All"}>
                  <option value="All">All Subfolders</option>
                  {filterSubfolders.map((s) => (
                    <option key={s} value={s}>{s.replace(`${filterSubject}/`, "")}</option>
                  ))}
                </select>
                <select className={selectCls} value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}>
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="az">Title A–Z</option>
                  <option value="size">File Size ↓</option>
                </select>
              </div>

              <p className="text-sm text-gray-500 mb-4">
                {loading ? "Loading..." : `${resources.length} resource(s) found`}
              </p>

              {loading ? (
                <div className="text-center py-20 text-gray-600">Loading…</div>
              ) : resources.length === 0 ? (
                <div className="text-center py-20 text-gray-600">No resources found.</div>
              ) : (
                <div className="space-y-3">
                  {resources.map((res) => (
                    <div key={res._id}
                      className={`flex items-center gap-4 p-4 bg-gray-900 border border-gray-800 rounded-xl hover:border-${exam.color}-700 transition group`}>
                      <div className="w-10 h-12 bg-red-900/30 border border-red-800/40 rounded-lg flex items-center justify-center text-red-400 font-bold text-xs shrink-0">
                        PDF
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-100 truncate">{cleanTitle(res.title)}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          <span className={`text-${exam.color}-400`}>{res.subject}</span>
                          {res.subFolder && res.subFolder !== res.subject && (
                            <> / {res.subFolder.replace(`${res.subject}/`, "")}</>
                          )}
                          <span className="ml-2 text-gray-600">{fmtSize(res.fileSize)}</span>
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={() => setPreviewRes(res)}
                          className="px-3 py-1.5 text-xs rounded-lg bg-blue-900/40 border border-blue-700/40 text-blue-300 hover:bg-blue-800/60 transition">
                          👁 Preview
                        </button>
                        <a href={res.fileUrl} target="_blank" rel="noreferrer"
                          className="px-3 py-1.5 text-xs rounded-lg bg-green-900/40 border border-green-700/40 text-green-300 hover:bg-green-800/60 transition">
                          ⬇ Download
                        </a>
                        <button onClick={() => { setReplaceTarget(res); setReplaceFile(null); }}
                          className="px-3 py-1.5 text-xs rounded-lg bg-yellow-900/40 border border-yellow-700/40 text-yellow-300 hover:bg-yellow-800/60 transition">
                          🔄 Replace
                        </button>
                        <button onClick={() => { setDeleteTarget(res); setDeleteConfirm(false); }}
                          className="px-3 py-1.5 text-xs rounded-lg bg-red-900/40 border border-red-700/40 text-red-300 hover:bg-red-800/60 transition">
                          🗑 Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── UPLOAD ── */}
          {activeTab === "upload" && (
            <div className="max-w-xl">
              <h2 className="text-lg font-semibold mb-6">⬆️ Upload PDFs — {examType}</h2>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Subject</label>
                  <select className={selectCls} value={upSubject} onChange={(e) => setUpSubject(e.target.value)}>
                    <option value="">— Select Subject —</option>
                    {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Subfolder</label>
                  <select className={selectCls} value={upSubfolder}
                    onChange={(e) => setUpSubfolder(e.target.value)} disabled={!upSubject}>
                    <option value="">— Select Subfolder —</option>
                    {upSubfolders.map((s) => (
                      <option key={s} value={s}>{s.replace(`${upSubject}/`, "")}</option>
                    ))}
                  </select>
                  {upSubject && upSubfolders.length === 0 && (
                    <p className="text-xs text-yellow-500 mt-1">
                      No subfolders yet.{" "}
                      <button className="underline" onClick={() => setActiveTab("create-subfolder")}>
                        Create one →
                      </button>
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">PDF Files</label>
                  <input type="file" accept=".pdf" multiple
                    onChange={(e) => setUpFiles(Array.from(e.target.files))}
                    className="block w-full text-sm text-gray-400
                      file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0
                      file:bg-violet-700 file:text-white file:text-sm file:cursor-pointer hover:file:bg-violet-600" />
                </div>
                {upFiles.length > 0 && (
                  <div className="space-y-1">
                    {upFiles.map((f, i) => {
                      const prog = upProgress[i];
                      return (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className="text-gray-400 flex-1 truncate">{f.name}</span>
                          <span className="text-gray-600">{fmtSize(f.size)}</span>
                          {prog && (
                            <span className={
                              prog.status === "done"      ? "text-green-400" :
                              prog.status === "updated"   ? "text-blue-400"  :
                              prog.status === "uploading" ? "text-yellow-400 animate-pulse" :
                              prog.status === "error"     ? "text-red-400"   : "text-gray-600"}>
                              {prog.status === "done"      ? "✅ Uploaded"   :
                               prog.status === "updated"   ? "🔄 Updated"    :
                               prog.status === "uploading" ? "⏳ Uploading…" :
                               prog.status === "error"     ? "❌ Failed"     : ""}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                <button onClick={handleUpload} disabled={upLoading} className={btnPrimary + " w-full"}>
                  {upLoading ? "Uploading…" : `🚀 Upload ${upFiles.length || ""} File(s)`}
                </button>
              </div>
            </div>
          )}

          {/* ── CREATE SUBJECT ── */}
          {activeTab === "create-subject" && (
            <div className="max-w-xl">
              <h2 className="text-lg font-semibold mb-6">➕ New Subject — {examType}</h2>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Subject Name</label>
                  <input className={inputCls} placeholder="e.g. History"
                    value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateSubject()} />
                </div>
                <button onClick={handleCreateSubject} className={btnPrimary + " w-full"}>
                  ✅ Create Subject
                </button>
              </div>
              <div className="mt-6">
                <p className="text-xs text-gray-500 mb-3">Existing ({subjects.length})</p>
                <div className="flex flex-wrap gap-2">
                  {subjects.map((s) => (
                    <span key={s} className={`px-3 py-1 bg-${exam.color}-900/30 border border-${exam.color}-700/30 text-${exam.color}-300 text-xs rounded-full`}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── CREATE SUBFOLDER ── */}
          {activeTab === "create-subfolder" && (
            <div className="max-w-xl">
              <h2 className="text-lg font-semibold mb-6">📁 New Subfolder — {examType}</h2>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Subject</label>
                  <select className={selectCls} value={sfSubject} onChange={(e) => setSfSubject(e.target.value)}>
                    <option value="">— Select Subject —</option>
                    {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Subfolder Name</label>
                  <input className={inputCls} placeholder="e.g. Advanced Macroeconomics"
                    value={sfName} onChange={(e) => setSfName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateSubfolder()} />
                </div>
                <button onClick={handleCreateSubfolder} className={btnPrimary + " w-full"}>
                  ✅ Create Subfolder
                </button>
              </div>
              {sfSubject && sfSubfolders.length > 0 && (
                <div className="mt-6">
                  <p className="text-xs text-gray-500 mb-3">Existing in "{sfSubject}"</p>
                  <div className="flex flex-wrap gap-2">
                    {sfSubfolders.map((s) => (
                      <span key={s} className="px-3 py-1 bg-gray-800 border border-gray-700 text-gray-400 text-xs rounded-full">
                        📁 {s.replace(`${sfSubject}/`, "")}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── DELETE FOLDER ── */}
          {activeTab === "delete-folder" && (
            <div className="max-w-xl">
              <h2 className="text-lg font-semibold mb-2">🗑️ Delete Folder — {examType}</h2>
              <p className="text-sm text-gray-500 mb-6">Only empty folders can be deleted.</p>
              <div className="bg-gray-900 border border-red-900/30 rounded-xl p-6 space-y-5">
                <div className="flex rounded-lg overflow-hidden border border-gray-700 w-fit">
                  {["subject", "subfolder"].map((type) => (
                    <button key={type}
                      onClick={() => { setDelFolderType(type); setDelFolderTarget(null); setDelFolderConfirm(false); }}
                      className={`px-5 py-2 text-sm font-medium transition
                        ${delFolderType === type ? "bg-red-700 text-white" : "bg-gray-900 text-gray-400 hover:text-white"}`}>
                      {type === "subject" ? "📂 Subject" : "📁 Subfolder"}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Subject</label>
                  <select className={selectCls} value={delFolderSubject}
                    onChange={(e) => { setDelFolderSubject(e.target.value); setDelFolderTarget(null); }}>
                    <option value="">— Select Subject —</option>
                    {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                {delFolderType === "subfolder" && (
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Subfolder</label>
                    <select className={selectCls} value={delFolderSf}
                      onChange={(e) => { setDelFolderSf(e.target.value); setDelFolderTarget(null); }}
                      disabled={!delFolderSubject}>
                      <option value="">— Select Subfolder —</option>
                      {delFolderSfList.map((s) => (
                        <option key={s} value={s}>{s.replace(`${delFolderSubject}/`, "")}</option>
                      ))}
                    </select>
                  </div>
                )}
                {((delFolderType === "subject" && delFolderSubject) ||
                  (delFolderType === "subfolder" && delFolderSubject && delFolderSf)) && (
                  <div className="rounded-lg bg-red-950/30 border border-red-800/30 px-4 py-3 text-sm">
                    <p className="text-gray-400 mb-1">Target:</p>
                    <p className="text-red-300 font-medium">
                      {delFolderType === "subject"
                        ? `📂 "${delFolderSubject}" in ${examType}`
                        : `📁 "${delFolderSf.replace(`${delFolderSubject}/`, "")}" in ${delFolderSubject}`}
                    </p>
                  </div>
                )}
                <button onClick={openDelFolderModal} className={btnDanger + " w-full"}>
                  🗑️ Continue to Delete
                </button>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ── MODAL: DELETE FILE ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-red-800/40 rounded-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-red-400 mb-2">🗑️ Delete Resource</h3>
            <p className="text-sm text-gray-300 mb-1"><strong>{cleanTitle(deleteTarget.title)}</strong></p>
            <p className="text-xs text-gray-500 mb-4">📂 {deleteTarget.subFolder} · 💾 {fmtSize(deleteTarget.fileSize)}</p>
            <p className="text-sm text-red-400 mb-4">⚠️ Permanently removes from Cloudinary and MongoDB.</p>
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer mb-4">
              <input type="checkbox" checked={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.checked)} className="accent-red-500" />
              I understand this cannot be undone
            </label>
            <div className="flex gap-3">
              <button onClick={() => { setDeleteTarget(null); setDeleteConfirm(false); }}
                className={btnGhost + " flex-1"}>Cancel</button>
              <button onClick={handleDelete} disabled={!deleteConfirm} className={btnDanger + " flex-1"}>
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: REPLACE ── */}
      {replaceTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-yellow-800/40 rounded-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-yellow-400 mb-2">🔄 Replace File</h3>
            <p className="text-sm text-gray-400 mb-4">
              Replacing: <strong className="text-gray-200">{cleanTitle(replaceTarget.title)}</strong>
            </p>
            <input type="file" accept=".pdf" onChange={(e) => setReplaceFile(e.target.files[0])}
              className="block w-full text-sm text-gray-400 mb-4
                file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0
                file:bg-yellow-700 file:text-white file:cursor-pointer" />
            <div className="flex gap-3">
              <button onClick={() => { setReplaceTarget(null); setReplaceFile(null); }}
                className={btnGhost + " flex-1"}>Cancel</button>
              <button onClick={handleReplace} disabled={!replaceFile}
                className="flex-1 px-4 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium transition disabled:opacity-40">
                🔄 Replace File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: DELETE FOLDER CONFIRM ── */}
      {delFolderTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-red-800/40 rounded-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-red-400 mb-3">
              {delFolderTarget.type === "subject" ? "📂 Delete Subject" : "📁 Delete Subfolder"}
            </h3>
            <div className="bg-red-950/30 border border-red-800/30 rounded-lg px-4 py-3 mb-4">
              <p className="text-sm text-gray-300">
                {delFolderTarget.type === "subject"
                  ? <><strong className="text-white">{delFolderTarget.subject}</strong> in {examType}</>
                  : <><strong className="text-white">
                      {delFolderTarget.subFolder.replace(`${delFolderTarget.subject}/`, "")}
                    </strong> inside <strong className="text-white">{delFolderTarget.subject}</strong></>
                }
              </p>
            </div>
            <p className="text-sm text-red-400 mb-4">⚠️ Blocked if the folder contains any PDFs.</p>
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer mb-5">
              <input type="checkbox" checked={delFolderConfirm}
                onChange={(e) => setDelFolderConfirm(e.target.checked)} className="accent-red-500" />
              I understand this cannot be undone
            </label>
            <div className="flex gap-3">
              <button onClick={() => { setDelFolderTarget(null); setDelFolderConfirm(false); }}
                className={btnGhost + " flex-1"}>Cancel</button>
              <button onClick={handleDeleteFolder} disabled={!delFolderConfirm}
                className={btnDanger + " flex-1"}>🗑️ Delete Folder</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: PREVIEW ── */}
      {previewRes && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewRes(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800 shrink-0">
              <div>
                <p className="font-semibold text-sm">{cleanTitle(previewRes.title)}</p>
                <p className="text-xs text-gray-500">{previewRes.subFolder} · {fmtSize(previewRes.fileSize)}</p>
              </div>
              <div className="flex items-center gap-3">
                <a href={previewRes.fileUrl} target="_blank" rel="noreferrer"
                  className="text-xs text-violet-400 hover:underline">Open in tab ↗</a>
                <a href={previewRes.fileUrl} download
                  className="text-xs text-green-400 hover:underline">⬇ Download</a>
                <button onClick={() => setPreviewRes(null)}
                  className="text-gray-500 hover:text-red-400 text-lg transition">✕</button>
              </div>
            </div>
            <iframe className="flex-1 w-full"
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(previewRes.fileUrl)}&embedded=true`}
              title={previewRes.title} />
          </div>
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════
//  ROOT — orchestrates landing ↔ panel
// ════════════════════════════════════════════════════════════
export default function AdminResources() {
  const [selectedExam, setSelectedExam] = useState(null);

  if (!selectedExam) {
    return <ExamLanding onSelect={setSelectedExam} />;
  }

  return (
    <AdminPanel
      examType={selectedExam}
      onBack={() => setSelectedExam(null)}
      onSwitch={(exam) => setSelectedExam(exam)}  // ← direct switch
    />
  );
}