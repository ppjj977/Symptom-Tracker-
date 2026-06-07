/* Daily Symptom Tracker — all data lives in this browser via localStorage. */
(function () {
  "use strict";

  const STORAGE_KEY = "symptom-tracker-entries-v1";
  const MOOD_LABELS = { 1: "Very poor", 2: "Poor", 3: "Okay", 4: "Good", 5: "Great" };
  const MOOD_EMOJI = { 1: "😣", 2: "🙁", 3: "😐", 4: "🙂", 5: "😀" };

  // ---- Storage helpers -------------------------------------------------
  function loadEntries() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error("Could not read saved entries:", e);
      return [];
    }
  }

  function saveEntries(entries) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }

  let entries = loadEntries();
  let editingId = null;

  // ---- Small utilities -------------------------------------------------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function todayISO() {
    const d = new Date();
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
  }

  function formatDate(iso) {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString(undefined, {
      weekday: "short", year: "numeric", month: "short", day: "numeric",
    });
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  let toastTimer;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
  }

  // ---- Tabs ------------------------------------------------------------
  $$(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      $$(".tab").forEach((t) => t.classList.remove("is-active"));
      $$(".panel").forEach((p) => p.classList.remove("is-active"));
      tab.classList.add("is-active");
      $("#tab-" + tab.dataset.tab).classList.add("is-active");
      if (tab.dataset.tab === "history") renderHistory();
      if (tab.dataset.tab === "report") renderReport();
    });
  });

  function goToTab(name) {
    const tab = $(`.tab[data-tab="${name}"]`);
    if (tab) tab.click();
  }

  // ---- Mood picker -----------------------------------------------------
  $("#mood-row").addEventListener("click", (e) => {
    const btn = e.target.closest(".mood");
    if (!btn) return;
    $$(".mood").forEach((m) => m.classList.remove("is-selected"));
    btn.classList.add("is-selected");
    $("#mood").value = btn.dataset.mood;
  });

  function setMood(value) {
    $$(".mood").forEach((m) => m.classList.remove("is-selected"));
    $("#mood").value = value || "";
    if (value) {
      const btn = $(`.mood[data-mood="${value}"]`);
      if (btn) btn.classList.add("is-selected");
    }
  }

  // ---- Symptom rows ----------------------------------------------------
  function addSymptomRow(name = "", severity = 5) {
    const row = document.createElement("div");
    row.className = "symptom-row";
    row.innerHTML = `
      <input type="text" class="symptom-name" placeholder="e.g. Headache, Nausea, Fatigue" value="${escapeHtml(name)}" />
      <div class="sev-wrap">
        <input type="range" class="symptom-sev" min="1" max="10" value="${severity}" aria-label="Severity 1 to 10" />
        <span class="sev-value">${severity}</span>
      </div>
      <button type="button" class="remove-symptom" title="Remove" aria-label="Remove symptom">×</button>
    `;
    const range = $(".symptom-sev", row);
    const out = $(".sev-value", row);
    range.addEventListener("input", () => { out.textContent = range.value; });
    $(".remove-symptom", row).addEventListener("click", () => row.remove());
    $("#symptom-list").appendChild(row);
  }

  $("#add-symptom").addEventListener("click", () => addSymptomRow());

  function collectSymptoms() {
    return $$(".symptom-row").map((row) => ({
      name: $(".symptom-name", row).value.trim(),
      severity: Number($(".symptom-sev", row).value),
    })).filter((s) => s.name);
  }

  // ---- Form reset / edit ----------------------------------------------
  function resetForm() {
    editingId = null;
    $("#entry-form").reset();
    $("#date").value = todayISO();
    setMood("");
    $("#symptom-list").innerHTML = "";
    addSymptomRow();
    $("#cancel-edit").hidden = true;
    $("#entry-form button[type=submit]").textContent = "Save entry";
  }

  $("#cancel-edit").addEventListener("click", resetForm);

  function editEntry(id) {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    editingId = id;
    $("#date").value = entry.date;
    setMood(entry.mood ? String(entry.mood) : "");
    $("#meds").value = entry.meds || "";
    $("#notes").value = entry.notes || "";
    $("#symptom-list").innerHTML = "";
    if (entry.symptoms.length) {
      entry.symptoms.forEach((s) => addSymptomRow(s.name, s.severity));
    } else {
      addSymptomRow();
    }
    $("#cancel-edit").hidden = false;
    $("#entry-form button[type=submit]").textContent = "Update entry";
    goToTab("log");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ---- Save ------------------------------------------------------------
  $("#entry-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const entry = {
      id: editingId || uid(),
      date: $("#date").value,
      mood: $("#mood").value ? Number($("#mood").value) : null,
      symptoms: collectSymptoms(),
      meds: $("#meds").value.trim(),
      notes: $("#notes").value.trim(),
      updatedAt: new Date().toISOString(),
    };

    if (!entry.date) { toast("Please choose a date."); return; }
    if (!entry.mood && entry.symptoms.length === 0 && !entry.notes) {
      toast("Add a mood, a symptom, or a note before saving.");
      return;
    }

    if (editingId) {
      entries = entries.map((e2) => (e2.id === editingId ? entry : e2));
      toast("Entry updated.");
    } else {
      entries.push(entry);
      toast("Entry saved.");
    }
    saveEntries(entries);
    resetForm();
    goToTab("history");
  });

  // ---- History ---------------------------------------------------------
  function sortedEntries() {
    return [...entries].sort((a, b) => b.date.localeCompare(a.date));
  }

  function renderHistory() {
    const list = $("#history-list");
    const empty = $("#history-empty");
    list.innerHTML = "";
    if (entries.length === 0) {
      empty.style.display = "";
      return;
    }
    empty.style.display = "none";

    sortedEntries().forEach((entry) => {
      const li = document.createElement("li");
      li.className = "history-card";
      const tags = entry.symptoms.map((s) =>
        `<span class="tag sev-${s.severity}">${escapeHtml(s.name)}<span class="sev">${s.severity}/10</span></span>`
      ).join("");
      li.innerHTML = `
        <div class="top">
          <span class="date">${formatDate(entry.date)}</span>
          <span class="mood-badge" title="${entry.mood ? MOOD_LABELS[entry.mood] : "No mood logged"}">${entry.mood ? MOOD_EMOJI[entry.mood] : "—"}</span>
        </div>
        ${tags ? `<div class="tags">${tags}</div>` : `<p class="card-notes">No symptoms logged.</p>`}
        ${entry.meds ? `<p class="card-notes"><strong>Meds:</strong> ${escapeHtml(entry.meds)}</p>` : ""}
        ${entry.notes ? `<p class="card-notes"><strong>Notes:</strong> ${escapeHtml(entry.notes)}</p>` : ""}
        <div class="card-actions">
          <button type="button" class="link-btn" data-edit="${entry.id}">Edit</button>
          <button type="button" class="link-btn danger" data-delete="${entry.id}">Delete</button>
        </div>
      `;
      list.appendChild(li);
    });
  }

  $("#history-list").addEventListener("click", (e) => {
    const editId = e.target.getAttribute("data-edit");
    const delId = e.target.getAttribute("data-delete");
    if (editId) editEntry(editId);
    if (delId) {
      if (confirm("Delete this entry? This cannot be undone.")) {
        entries = entries.filter((en) => en.id !== delId);
        saveEntries(entries);
        renderHistory();
        toast("Entry deleted.");
      }
    }
  });

  // ---- Report ----------------------------------------------------------
  function entriesInRange() {
    const from = $("#report-from").value;
    const to = $("#report-to").value;
    return sortedEntries().filter((e) => {
      if (from && e.date < from) return false;
      if (to && e.date > to) return false;
      return true;
    });
  }

  function renderReport() {
    // Default the range to the last 30 days the first time.
    if (!$("#report-to").value && !$("#report-from").value) {
      const to = todayISO();
      const fromD = new Date();
      fromD.setDate(fromD.getDate() - 29);
      $("#report-to").value = to;
      $("#report-from").value = fromD.toISOString().slice(0, 10);
    }

    const rows = entriesInRange();
    const out = $("#report-output");

    if (rows.length === 0) {
      out.innerHTML = `<p class="hint">No entries in this range.</p>`;
      return;
    }

    // Summary stats
    const moodVals = rows.map((r) => r.mood).filter(Boolean);
    const avgMood = moodVals.length
      ? (moodVals.reduce((a, b) => a + b, 0) / moodVals.length).toFixed(1)
      : "—";
    const symptomCount = {};
    rows.forEach((r) => r.symptoms.forEach((s) => {
      symptomCount[s.name] = (symptomCount[s.name] || 0) + 1;
    }));
    const topSymptom = Object.keys(symptomCount).sort(
      (a, b) => symptomCount[b] - symptomCount[a]
    )[0] || "—";

    const tableRows = rows.map((r) => {
      const sym = r.symptoms.length
        ? r.symptoms.map((s) => `${escapeHtml(s.name)} (${s.severity}/10)`).join(", ")
        : "—";
      return `<tr>
        <td>${formatDate(r.date)}</td>
        <td>${r.mood ? MOOD_EMOJI[r.mood] + " " + MOOD_LABELS[r.mood] : "—"}</td>
        <td>${sym}</td>
        <td>${escapeHtml(r.meds || "—")}</td>
        <td>${escapeHtml(r.notes || "—")}</td>
      </tr>`;
    }).join("");

    out.innerHTML = `
      <h3 style="margin-top:0">Symptom summary — ${formatDate($("#report-from").value)} to ${formatDate($("#report-to").value)}</h3>
      <div class="report-summary">
        <div class="stat"><div class="num">${rows.length}</div><div class="label">Days logged</div></div>
        <div class="stat"><div class="num">${avgMood}</div><div class="label">Avg. wellbeing (1–5)</div></div>
        <div class="stat"><div class="num">${escapeHtml(topSymptom)}</div><div class="label">Most frequent symptom</div></div>
      </div>
      <table>
        <thead><tr><th>Date</th><th>Wellbeing</th><th>Symptoms</th><th>Medications</th><th>Notes</th></tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    `;
  }

  $("#report-refresh").addEventListener("click", renderReport);
  $("#report-print").addEventListener("click", () => window.print());

  $("#report-csv").addEventListener("click", () => {
    const rows = entriesInRange();
    if (rows.length === 0) { toast("Nothing to export in this range."); return; }
    const header = ["Date", "Wellbeing (1-5)", "Symptom", "Severity (1-10)", "Medications", "Notes"];
    const lines = [header];
    rows.forEach((r) => {
      const mood = r.mood ? `${r.mood} (${MOOD_LABELS[r.mood]})` : "";
      if (r.symptoms.length === 0) {
        lines.push([r.date, mood, "", "", r.meds || "", r.notes || ""]);
      } else {
        r.symptoms.forEach((s) => {
          lines.push([r.date, mood, s.name, s.severity, r.meds || "", r.notes || ""]);
        });
      }
    });
    const csv = lines.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    downloadFile(csv, `symptom-report-${todayISO()}.csv`, "text/csv");
    toast("CSV downloaded.");
  });

  // ---- Backup / restore ------------------------------------------------
  function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  $("#export-data").addEventListener("click", () => {
    if (entries.length === 0) { toast("No data to back up yet."); return; }
    downloadFile(JSON.stringify(entries, null, 2), `symptom-backup-${todayISO()}.json`, "application/json");
    toast("Backup downloaded.");
  });

  $("#import-data").addEventListener("click", () => $("#import-file").click());

  $("#import-file").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data)) throw new Error("Unexpected format");
        if (!confirm(`Restore ${data.length} entries? This replaces your current data.`)) return;
        entries = data;
        saveEntries(entries);
        renderHistory();
        toast("Backup restored.");
        goToTab("history");
      } catch (err) {
        toast("Could not read that file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  // ---- Init ------------------------------------------------------------
  resetForm();
})();
