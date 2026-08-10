(() => {
  "use strict";

  const token = typeof window.__MEDIA_STUDIO_TOKEN__ === "string" ? window.__MEDIA_STUDIO_TOKEN__ : "";
  const state = {
    queue: [],
    uploading: false,
    uploadIndex: -1,
    jobs: [],
    projects: [],
    polling: false,
  };

  const els = {
    connectionPill: document.querySelector("#connection-pill"),
    connectionText: document.querySelector("#connection-text"),
    fileInput: document.querySelector("#file-input"),
    dropZone: document.querySelector("#drop-zone"),
    clearQueue: document.querySelector("#clear-queue"),
    queueSummary: document.querySelector("#queue-summary"),
    queueCount: document.querySelector("#queue-count"),
    queueSize: document.querySelector("#queue-size"),
    queueList: document.querySelector("#queue-list"),
    summaryProgress: document.querySelector("#summary-progress"),
    summaryProgressLabel: document.querySelector("#summary-progress-label"),
    summaryProgressBar: document.querySelector("#summary-progress-bar"),
    defaultsForm: document.querySelector("#defaults-form"),
    startUpload: document.querySelector("#start-upload"),
    refreshJobs: document.querySelector("#refresh-jobs"),
    jobsList: document.querySelector("#jobs-list"),
    refreshProjects: document.querySelector("#refresh-projects"),
    projectsList: document.querySelector("#projects-list"),
    projectCount: document.querySelector("#project-count"),
    projectUpdated: document.querySelector("#project-updated"),
    runAudit: document.querySelector("#run-audit"),
    auditResult: document.querySelector("#audit-result"),
    auditResultTitle: document.querySelector("#audit-result-title"),
    auditResultTime: document.querySelector("#audit-result-time"),
    auditOutput: document.querySelector("#audit-output"),
    toastRegion: document.querySelector("#toast-region"),
  };

  const allowedExtensions = new Set(["mov", "mp4", "mxf", "mkv", "avi", "m4v", "webm"]);
  function setDefaultYear() {
    const yearField = els.defaultsForm.elements.namedItem("year");
    if (yearField && !yearField.value) yearField.value = String(new Date().getFullYear());
  }

  function uid() {
    return typeof window.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function fileStem(name) {
    return name.replace(/\.[^.]+$/, "").trim();
  }

  function slugify(value) {
    return value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 72);
  }

  function uniqueSlug(base, offset = 0) {
    const fallback = `project-${new Date().toISOString().slice(0, 10)}-${String(state.queue.length + offset + 1).padStart(2, "0")}`;
    const root = slugify(base) || fallback;
    let candidate = root;
    let index = 2;
    const used = new Set(state.queue.map((item) => item.slug));
    while (used.has(candidate)) candidate = `${root}-${index++}`;
    return candidate;
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / 1024 ** index;
    return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function base64UrlJson(value) {
    const bytes = new TextEncoder().encode(JSON.stringify(value));
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
  }

  function getDefaults() {
    const data = new FormData(els.defaultsForm);
    return {
      category_zh: String(data.get("category_zh") || "").trim(),
      category_en: String(data.get("category_en") || "").trim(),
      year: String(data.get("year") || "").trim(),
      role_zh: String(data.get("role_zh") || "").trim(),
      role_en: String(data.get("role_en") || "").trim(),
      template_slug: String(data.get("template_slug") || "afterglow"),
      preview_start: Number(data.get("preview_start") || 0),
      preview_duration: Number(data.get("preview_duration") || 8),
      featured: data.get("featured") === "on",
      update_existing_metadata: data.get("update_existing_metadata") === "on",
    };
  }

  function showToast(message, type = "info", timeout = 4200) {
    const toast = document.createElement("div");
    toast.className = `toast${type === "success" ? " is-success" : type === "error" ? " is-error" : ""}`;
    toast.textContent = message;
    els.toastRegion.append(toast);
    window.setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(8px)";
      window.setTimeout(() => toast.remove(), 220);
    }, timeout);
  }

  function setConnection(mode, message) {
    els.connectionPill.classList.toggle("is-online", mode === "online");
    els.connectionPill.classList.toggle("is-offline", mode === "offline");
    els.connectionText.textContent = message;
  }

  function tokenHeaders(extra = {}) {
    return {
      "x-media-studio-token": token,
      ...extra,
    };
  }

  async function parseResponse(response) {
    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json") ? await response.json() : await response.text();
    if (!response.ok) {
      const message = typeof payload === "string"
        ? payload
        : payload?.error || payload?.message || `请求失败（${response.status}）`;
      throw new Error(message);
    }
    return payload;
  }

  function normalizeList(payload, keys) {
    if (Array.isArray(payload)) return payload;
    for (const key of keys) {
      if (Array.isArray(payload?.[key])) return payload[key];
    }
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  }

  function isSupportedFile(file) {
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    return file.type.startsWith("video/") || allowedExtensions.has(extension);
  }

  function addFiles(files) {
    if (state.uploading) {
      showToast("上传进行中，请等待当前队列完成。", "error");
      return;
    }

    const incoming = [...files].filter(isSupportedFile);
    const rejected = files.length - incoming.length;
    let added = 0;

    incoming.forEach((file, index) => {
      const duplicate = state.queue.some((item) => item.file.name === file.name && item.file.size === file.size);
      if (duplicate) return;
      const stem = fileStem(file.name);
      state.queue.push({
        id: uid(),
        file,
        slug: uniqueSlug(stem, index),
        titleZh: stem,
        titleEn: stem,
        status: "ready",
        progress: 0,
        error: "",
      });
      added += 1;
    });

    els.fileInput.value = "";
    renderQueue();
    if (added) showToast(`已加入 ${added} 个视频母版`, "success");
    if (rejected) showToast(`${rejected} 个文件不是支持的视频格式`, "error");
  }

  function queueStatusText(item) {
    if (item.status === "uploading") return `正在上传 ${Math.round(item.progress)}%`;
    if (item.status === "complete") return "已上传，正在后台转换";
    if (item.status === "error") return item.error || "上传失败";
    return "等待上传";
  }

  function renderQueue() {
    const hasItems = state.queue.length > 0;
    const totalBytes = state.queue.reduce((sum, item) => sum + item.file.size, 0);
    els.queueSummary.hidden = !hasItems;
    els.queueCount.textContent = `${state.queue.length} 个文件`;
    els.queueSize.textContent = formatBytes(totalBytes);
    els.clearQueue.disabled = !hasItems || state.uploading;
    els.startUpload.disabled = !hasItems || state.uploading || !token || !queueIsValid();
    els.startUpload.querySelector("span:first-child").textContent = state.uploading ? "正在上传素材…" : "开始生成并更新网站";

    els.queueList.innerHTML = state.queue.map((item) => {
      const invalidSlug = !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug);
      return `
        <article class="queue-item is-${escapeHtml(item.status)}" data-id="${escapeHtml(item.id)}">
          <div class="queue-file" title="${escapeHtml(item.file.name)}">
            <strong>${escapeHtml(item.file.name)}</strong>
            <small>${escapeHtml(formatBytes(item.file.size))} · ${escapeHtml(item.file.type || "video")}</small>
            <span class="queue-status">${escapeHtml(queueStatusText(item))}</span>
          </div>
          <input class="queue-input${invalidSlug ? " is-invalid" : ""}" data-field="slug" value="${escapeHtml(item.slug)}" aria-label="${escapeHtml(item.file.name)} 的项目 slug" placeholder="project-slug" ${state.uploading ? "disabled" : ""} />
          <input class="queue-input" data-field="titleZh" value="${escapeHtml(item.titleZh)}" aria-label="${escapeHtml(item.file.name)} 的中文标题" placeholder="中文标题" ${state.uploading ? "disabled" : ""} />
          <input class="queue-input" data-field="titleEn" value="${escapeHtml(item.titleEn)}" aria-label="${escapeHtml(item.file.name)} 的英文标题" placeholder="English title" ${state.uploading ? "disabled" : ""} />
          <button class="remove-file" type="button" aria-label="移除 ${escapeHtml(item.file.name)}" ${state.uploading ? "disabled" : ""}>×</button>
        </article>
      `;
    }).join("");

    els.queueList.querySelectorAll(".queue-item").forEach((row) => {
      const item = state.queue.find((entry) => entry.id === row.dataset.id);
      if (!item) return;

      row.querySelectorAll(".queue-input").forEach((input) => {
        input.addEventListener("input", () => {
          item[input.dataset.field] = input.dataset.field === "slug" ? slugify(input.value) : input.value;
          if (input.dataset.field === "slug" && input.value !== item.slug) input.value = item.slug;
          input.classList.toggle("is-invalid", !item.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug));
          els.startUpload.disabled = state.uploading || !token || !queueIsValid();
        });
      });

      row.querySelector(".remove-file").addEventListener("click", () => {
        state.queue = state.queue.filter((entry) => entry.id !== item.id);
        renderQueue();
      });
    });
  }

  function queueIsValid() {
    const seen = new Set();
    return state.queue.every((item) => {
      const valid = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug)
        && item.titleZh.trim()
        && item.titleEn.trim()
        && !seen.has(item.slug);
      seen.add(item.slug);
      return valid;
    });
  }

  function updateSummaryProgress(itemIndex, itemProgress) {
    if (!state.queue.length) return;
    const total = ((itemIndex + itemProgress / 100) / state.queue.length) * 100;
    els.summaryProgress.hidden = false;
    els.summaryProgressLabel.textContent = `${itemIndex + 1} / ${state.queue.length}`;
    els.summaryProgressBar.style.width = `${Math.min(100, total)}%`;
  }

  function metadataFor(item) {
    return {
      original_name: item.file.name,
      size: item.file.size,
      mime_type: item.file.type || "application/octet-stream",
      slug: item.slug,
      title_zh: item.titleZh.trim(),
      title_en: item.titleEn.trim(),
      ...getDefaults(),
    };
  }

  function uploadFile(item, index) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/upload");
      xhr.setRequestHeader("Content-Type", item.file.type || "application/octet-stream");
      xhr.setRequestHeader("x-media-studio-token", token);
      xhr.setRequestHeader("x-media-meta", base64UrlJson(metadataFor(item)));

      xhr.upload.addEventListener("progress", (event) => {
        if (!event.lengthComputable) return;
        item.progress = (event.loaded / event.total) * 100;
        updateSummaryProgress(index, item.progress);
        renderQueue();
      });

      xhr.addEventListener("load", () => {
        let payload;
        try {
          payload = xhr.responseText ? JSON.parse(xhr.responseText) : {};
        } catch {
          payload = { message: xhr.responseText };
        }
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(payload);
        } else {
          reject(new Error(payload?.error || payload?.message || `上传失败（${xhr.status}）`));
        }
      });
      xhr.addEventListener("error", () => reject(new Error("无法连接本地上传服务")));
      xhr.addEventListener("abort", () => reject(new Error("上传已取消")));
      xhr.send(item.file);
    });
  }

  async function startUpload() {
    if (state.uploading || !state.queue.length) return;
    if (!token) {
      showToast("本地访问令牌缺失，请通过 Media Studio 启动命令打开此页面。", "error", 6500);
      return;
    }
    if (!queueIsValid()) {
      showToast("请检查 slug、中文标题和英文标题，slug 不能重复。", "error");
      return;
    }

    state.uploading = true;
    els.summaryProgress.hidden = false;
    els.summaryProgressBar.style.width = "0%";
    els.defaultsForm.querySelectorAll("input, select").forEach((field) => { field.disabled = true; });
    renderQueue();
    let completed = 0;

    for (let index = 0; index < state.queue.length; index += 1) {
      const item = state.queue[index];
      state.uploadIndex = index;
      item.status = "uploading";
      item.progress = 0;
      item.error = "";
      renderQueue();

      try {
        await uploadFile(item, index);
        item.status = "complete";
        item.progress = 100;
        completed += 1;
        updateSummaryProgress(index, 100);
      } catch (error) {
        item.status = "error";
        item.error = error instanceof Error ? error.message : String(error);
        showToast(`${item.file.name}：${item.error}`, "error", 6500);
      }
      renderQueue();
      await refreshJobs({ quiet: true });
    }

    state.uploading = false;
    state.uploadIndex = -1;
    els.defaultsForm.querySelectorAll("input, select").forEach((field) => { field.disabled = false; });
    els.summaryProgressLabel.textContent = `${completed} / ${state.queue.length} 已上传`;
    renderQueue();
    showToast(`上传完成：${completed} 个成功，${state.queue.length - completed} 个失败`, completed ? "success" : "error", 6000);
    refreshJobs({ quiet: true });
  }

  function stageIndex(job) {
    const value = `${job.stage || ""} ${job.status || job.state || ""}`.toLowerCase();
    if (/fail|error|cancel/.test(value)) return Math.max(0, Number(job.progress || 0) / 20);
    if (/complete|completed|done/.test(value)) return 5;
    if (/sync|csv|content|register|project|audit/.test(value)) return 4;
    if (/poster|avif|webp|thumbnail|cover/.test(value)) return 3;
    if (/full|1080|transcod/.test(value)) return 2;
    if (/preview|720|probe|prepar/.test(value)) return 1;
    if (Number.isFinite(Number(job.progress))) return Math.min(5, Math.max(0, Number(job.progress) / 20));
    return 0;
  }

  function jobStatus(job) {
    return String(job.status || job.state || job.stage || "queued").toLowerCase();
  }

  function renderJobs() {
    if (!state.jobs.length) {
      els.jobsList.innerHTML = `
        <div class="empty-state">
          <span class="empty-orbit" aria-hidden="true"></span>
          <p>还没有处理任务</p>
          <small>上传母版后，转换阶段会显示在这里</small>
        </div>`;
      return;
    }

    els.jobsList.innerHTML = state.jobs.map((job) => {
      const status = jobStatus(job);
      const isFailed = /fail|error|cancel/.test(status);
      const isComplete = /complete|completed|done/.test(status);
      const activeStage = stageIndex(job);
      const title = job.title_zh || job.titleZh || job.slug || job.original_name || job.filename || "未命名任务";
      const stage = job.stage_label || job.stage || job.message || status;
      const error = job.error || job.error_message || (isFailed ? job.message : "");
      return `
        <article class="job-card${isFailed ? " is-failed" : ""}${isComplete ? " is-complete" : ""}">
          <div class="job-head">
            <div class="job-title">
              <strong>${escapeHtml(title)}</strong>
              <span>${escapeHtml(job.slug || job.id || job.job_id || "LOCAL JOB")}</span>
            </div>
            <span class="job-state">${escapeHtml(isComplete ? "已完成" : isFailed ? "失败" : stage || "处理中")}</span>
          </div>
          <div class="job-stages" aria-label="转换进度 ${Math.min(5, Math.ceil(activeStage))} / 5">
            ${Array.from({ length: 5 }, (_, index) => `<i class="job-stage${index < activeStage ? " is-done" : ""}"></i>`).join("")}
          </div>
          ${!isFailed && !isComplete ? `<p class="job-message">当前阶段：${escapeHtml(stage)}</p>` : ""}
          ${error ? `<pre class="job-error">${escapeHtml(error)}</pre>` : ""}
        </article>`;
    }).join("");
  }

  async function refreshJobs({ quiet = false } = {}) {
    if (!token || state.polling) return;
    state.polling = true;
    try {
      const response = await fetch("/api/jobs", { headers: tokenHeaders(), cache: "no-store" });
      const payload = await parseResponse(response);
      state.jobs = normalizeList(payload, ["jobs", "items", "results"]);
      renderJobs();
      setConnection("online", "本地服务已连接");
    } catch (error) {
      setConnection("offline", "本地服务未连接");
      if (!quiet) showToast(error instanceof Error ? error.message : String(error), "error");
    } finally {
      state.polling = false;
    }
  }

  function renderProjects() {
    const projects = state.projects;
    els.projectCount.textContent = String(projects.filter((project) => {
      const enabled = String(project.enabled ?? "true").toLowerCase();
      return project.enabled !== false && enabled !== "false" && enabled !== "0";
    }).length);
    els.projectUpdated.textContent = new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit" }).format(new Date());

    if (!projects.length) {
      els.projectsList.innerHTML = '<div class="empty-state"><p>还没有读取到项目</p><small>确认本地服务和 projects.csv 可用</small></div>';
      return;
    }

    els.projectsList.innerHTML = projects.map((project, index) => {
      const order = String(project.order ?? index + 1).padStart(2, "0");
      const title = project.title_zh || project.titleZh || project.title_en || project.slug || "未命名项目";
      const subtitle = [project.category_zh || project.categoryZh || project.category_en, project.year].filter(Boolean).join(" · ");
      const slug = project.slug || "";
      return `
        <article class="project-item">
          <span class="project-order">${escapeHtml(order)}</span>
          <div class="project-name"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(subtitle || slug)}</span></div>
          <a class="project-link" href="http://localhost:3000/work/${encodeURIComponent(slug)}" target="_blank" rel="noreferrer" aria-label="在网站打开 ${escapeHtml(title)}">↗</a>
        </article>`;
    }).join("");
  }

  async function refreshProjects({ quiet = false } = {}) {
    if (!token) return;
    els.refreshProjects.disabled = true;
    try {
      const response = await fetch("/api/projects", { headers: tokenHeaders(), cache: "no-store" });
      const payload = await parseResponse(response);
      state.projects = normalizeList(payload, ["projects", "items", "results"]);
      renderProjects();
      setConnection("online", "本地服务已连接");
      if (!quiet) showToast("网站项目已刷新", "success");
    } catch (error) {
      setConnection("offline", "本地服务未连接");
      if (!quiet) showToast(error instanceof Error ? error.message : String(error), "error");
    } finally {
      els.refreshProjects.disabled = false;
    }
  }

  function auditText(payload) {
    if (typeof payload === "string") return payload;
    if (typeof payload?.report === "string") return payload.report;
    if (typeof payload?.output === "string") return payload.output;
    if (Array.isArray(payload?.lines)) return payload.lines.join("\n");
    return JSON.stringify(payload, null, 2);
  }

  async function runAudit() {
    if (!token) {
      showToast("本地访问令牌缺失，无法运行检查。", "error");
      return;
    }
    els.runAudit.disabled = true;
    els.runAudit.textContent = "正在检查全部媒体…";
    try {
      const response = await fetch("/api/audit", { method: "POST", headers: tokenHeaders() });
      const payload = await parseResponse(response);
      const output = auditText(payload);
      const hasWarnings = /warn|warning|\u8b66\u544a|failed|error/i.test(output);
      els.auditResult.hidden = false;
      els.auditResultTitle.textContent = hasWarnings ? "检查完成 · 请查看提醒" : "检查完成 · 素材规范";
      els.auditResultTime.textContent = new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit" }).format(new Date());
      els.auditOutput.textContent = output || "检查已完成，没有返回详细报告。";
      showToast(hasWarnings ? "检查完成，发现需要关注的素材" : "媒体检查通过", hasWarnings ? "info" : "success");
    } catch (error) {
      els.auditResult.hidden = false;
      els.auditResultTitle.textContent = "检查失败";
      els.auditResultTime.textContent = new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit" }).format(new Date());
      els.auditOutput.textContent = error instanceof Error ? error.message : String(error);
      showToast(els.auditOutput.textContent, "error");
    } finally {
      els.runAudit.disabled = false;
      els.runAudit.textContent = "重新运行媒体检查";
    }
  }

  function bindEvents() {
    els.fileInput.addEventListener("change", () => addFiles([...els.fileInput.files]));

    ["dragenter", "dragover"].forEach((eventName) => {
      els.dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        if (!state.uploading) els.dropZone.classList.add("is-dragging");
      });
    });

    ["dragleave", "drop"].forEach((eventName) => {
      els.dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        els.dropZone.classList.remove("is-dragging");
      });
    });

    els.dropZone.addEventListener("drop", (event) => {
      if (event.dataTransfer?.files?.length) addFiles([...event.dataTransfer.files]);
    });

    els.clearQueue.addEventListener("click", () => {
      if (state.uploading) return;
      state.queue = [];
      els.summaryProgress.hidden = true;
      els.summaryProgressBar.style.width = "0%";
      renderQueue();
    });

    els.startUpload.addEventListener("click", startUpload);
    els.refreshJobs.addEventListener("click", () => refreshJobs());
    els.refreshProjects.addEventListener("click", () => refreshProjects());
    els.runAudit.addEventListener("click", runAudit);
  }

  function init() {
    setDefaultYear();
    bindEvents();
    renderQueue();

    if (!token) {
      setConnection("offline", "本地访问令牌缺失");
      els.projectsList.innerHTML = '<div class="empty-state"><p>本地访问令牌缺失</p><small>请通过 Media Studio 启动命令打开此页面</small></div>';
      showToast("未检测到本地访问令牌。请从项目命令启动 Media Studio，不要直接打开 HTML 文件。", "error", 8000);
      return;
    }

    Promise.allSettled([refreshProjects({ quiet: true }), refreshJobs({ quiet: true })]);
    window.setInterval(() => refreshJobs({ quiet: true }), 2500);
    window.setInterval(() => refreshProjects({ quiet: true }), 20000);
  }

  init();
})();
