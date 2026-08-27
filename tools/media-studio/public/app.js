(() => {
  "use strict";

  const token = typeof window.__MEDIA_STUDIO_TOKEN__ === "string" ? window.__MEDIA_STUDIO_TOKEN__ : "";
  const sessionReloadKey = "liuker-media-studio-session-reload";
  let sessionReloadScheduled = false;
  const state = {
    queue: [],
    uploading: false,
    uploadIndex: -1,
    jobs: [],
    projects: [],
    portfolioGroups: [],
    replacementTargets: [],
    replacementType: "project",
    replacementTargetId: "",
    replacementFile: null,
    replacementUploading: false,
    replacementProgress: 0,
    replacementStatus: "idle",
    replacementMessage: "",
    replacementJobId: "",
    polling: false,
  };

  const els = {
    connectionPill: document.querySelector("#connection-pill"),
    connectionText: document.querySelector("#connection-text"),
    replacementTypes: [...document.querySelectorAll("[data-replacement-type]")],
    replacementTarget: document.querySelector("#replacement-target"),
    refreshReplacementTargets: document.querySelector("#refresh-replacement-targets"),
    replacementTargetCard: document.querySelector("#replacement-target-card"),
    replacementTargetKind: document.querySelector("#replacement-target-kind"),
    replacementTargetName: document.querySelector("#replacement-target-name"),
    replacementTargetId: document.querySelector("#replacement-target-id"),
    replacementTargetDescription: document.querySelector("#replacement-target-description"),
    replacementCurrentAssets: document.querySelector("#replacement-current-assets"),
    replacementImpactText: document.querySelector("#replacement-impact-text"),
    replacementFileInput: document.querySelector("#replacement-file-input"),
    replacementDropZone: document.querySelector("#replacement-drop-zone"),
    replacementFile: document.querySelector("#replacement-file"),
    replacementFileName: document.querySelector("#replacement-file-name"),
    replacementFileMeta: document.querySelector("#replacement-file-meta"),
    removeReplacementFile: document.querySelector("#remove-replacement-file"),
    replacementProgress: document.querySelector("#replacement-progress"),
    replacementProgressLabel: document.querySelector("#replacement-progress-label"),
    replacementProgressValue: document.querySelector("#replacement-progress-value"),
    replacementProgressBar: document.querySelector("#replacement-progress-bar"),
    replacementError: document.querySelector("#replacement-error"),
    replacementConfirm: document.querySelector("#replacement-confirm"),
    replacementConfirmCopy: document.querySelector("#replacement-confirm-copy"),
    startReplacement: document.querySelector("#start-replacement"),
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
    groupCount: document.querySelector("#group-count"),
    portfolioGroup: document.querySelector("#portfolio-group"),
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
      portfolio_group: String(data.get("portfolio_group") || "").trim(),
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
    if (mode === "online") {
      try {
        window.sessionStorage.removeItem(sessionReloadKey);
      } catch {
        // The page can still operate when session storage is unavailable.
      }
    }
  }

  function reloadForExpiredSession() {
    if (sessionReloadScheduled) return;
    sessionReloadScheduled = true;

    let recentlyReloaded = false;
    try {
      const previousReload = Number(window.sessionStorage.getItem(sessionReloadKey) || 0);
      recentlyReloaded = Date.now() - previousReload < 10_000;
      if (!recentlyReloaded) window.sessionStorage.setItem(sessionReloadKey, String(Date.now()));
    } catch {
      // A single in-memory reload guard still prevents duplicate reload requests.
    }

    if (recentlyReloaded) {
      sessionReloadScheduled = false;
      return;
    }
    setConnection("offline", "本地服务已重启，正在重新连接");
    window.setTimeout(() => window.location.reload(), 120);
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
      if (response.status === 403 && message.includes("工作台会话无效")) {
        reloadForExpiredSession();
      }
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

  const replacementTypeCopy = {
    project: {
      label: "作品项目",
      description: "替换对应二级作品页的卡片预览、播放弹窗和详情页使用的视频素材。",
      impact: "会重新生成 720P 预览、1080P 完整视频及 WebP/AVIF 封面；作品方向、项目标题、分类、年份和详情资料保持不变。",
    },
    hero: {
      label: "首屏交互",
      description: "替换首页滚轮控制时间轴的首屏交互视频。",
      impact: "会生成滚轮交互专用的 1080P/720P 视频与首屏封面；当前滚轮控制方式保持不变。",
    },
    showreel: {
      label: "Showreel",
      description: "替换点击 SHOWREEL 按钮后加载播放的独立视频。",
      impact: "只替换 Showreel 播放素材；首屏滚轮交互视频和作品项目不受影响。",
    },
  };

  const replacementAssetLabels = {
    video1080: "1080P 交互视频",
    video720: "720P 交互视频",
    posterWebp: "WebP 首屏封面",
    posterAvif: "AVIF 首屏封面",
    video: "当前视频",
    preview: "项目预览视频",
    full: "项目完整视频",
    cover: "WebP 项目封面",
    avif: "AVIF 项目封面",
  };

  function normalizePortfolioGroups(payload) {
    return normalizeList(payload, ["groups", "portfolioGroups", "items"]).map((group, index) => ({
      ...group,
      id: String(group.id || ""),
      index: String(group.index || index + 1).padStart(2, "0"),
      titleZh: group.titleZh || group.title_zh || group.title?.zh || group.label || group.id,
      titleEn: group.titleEn || group.title_en || group.title?.en || group.label || group.id,
      path: group.path || `/portfolio/${group.id}`,
    })).filter((group) => group.id);
  }

  function syncPortfolioGroupSelect() {
    if (!els.portfolioGroup || !state.portfolioGroups.length) return;
    const current = els.portfolioGroup.value;
    els.portfolioGroup.innerHTML = state.portfolioGroups.map((group) => (
      `<option value="${escapeHtml(group.id)}">${escapeHtml(`${group.index} · ${group.titleZh}`)}</option>`
    )).join("");
    if (state.portfolioGroups.some((group) => group.id === current)) els.portfolioGroup.value = current;
  }

  function normalizeReplacementTargets(payload) {
    const directTargets = normalizeList(payload, ["targets", "replacementTargets", "items", "results"]);
    const source = directTargets.length
      ? directTargets
      : [...(Array.isArray(payload?.special) ? payload.special : []), ...(Array.isArray(payload?.projects) ? payload.projects : [])];

    const seen = new Set();
    return source.map((target) => {
      const type = String(target.targetType || target.type || (target.slug ? "project" : "project")).toLowerCase();
      const id = String(target.targetId || target.id || target.slug || type);
      const key = `${type}:${id}`;
      if (seen.has(key)) return null;
      seen.add(key);
      return {
        ...target,
        type,
        id,
        label: target.label || target.titleZh || target.title_zh || target.titleEn || target.title_en || id,
        description: target.description || replacementTypeCopy[type]?.description || "替换网站中当前登记的视频素材。",
        impact: target.impact || replacementTypeCopy[type]?.impact || "替换前自动备份当前素材；失败时恢复备份，全部成功后覆盖网站素材。",
        currentAssets: target.currentAssets || target.current_assets || target.assets || {},
      };
    }).filter(Boolean);
  }

  function selectedReplacementTarget() {
    return state.replacementTargets.find((target) => target.type === state.replacementType && target.id === state.replacementTargetId) || null;
  }

  function replacementLocked() {
    return state.replacementUploading || state.replacementStatus === "queued";
  }

  function assetEntries(target) {
    const assets = target?.currentAssets;
    if (Array.isArray(assets)) {
      return assets.map((asset, index) => ({
        label: asset.label || asset.name || `素材 ${index + 1}`,
        path: asset.path || asset.src || asset.url || "",
      })).filter((asset) => asset.path);
    }
    if (!assets || typeof assets !== "object") return [];
    return Object.entries(assets).map(([key, value]) => ({
      label: replacementAssetLabels[key] || key,
      path: typeof value === "string" ? value : value?.path || value?.src || value?.url || "",
    })).filter((asset) => asset.path);
  }

  function resetReplacementConfirmation() {
    state.replacementStatus = "idle";
    state.replacementMessage = "";
    state.replacementProgress = 0;
    state.replacementJobId = "";
    els.replacementConfirm.checked = false;
    els.replacementError.hidden = true;
    els.replacementError.textContent = "";
  }

  function renderReplacementTargetSelect() {
    const targets = state.replacementTargets.filter((target) => target.type === state.replacementType);
    if (!targets.some((target) => target.id === state.replacementTargetId)) {
      state.replacementTargetId = targets[0]?.id || "";
    }

    els.replacementTypes.forEach((button) => {
      const active = button.dataset.replacementType === state.replacementType;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
      button.disabled = replacementLocked();
    });

    els.replacementTarget.disabled = replacementLocked() || !targets.length;
    els.replacementTarget.innerHTML = targets.length
      ? targets.map((target) => {
          const order = target.type === "project" && target.order ? `${String(target.order).padStart(2, "0")} · ` : "";
          const group = target.type === "project" && target.portfolioGroupTitle
            ? `${target.portfolioGroupIndex || "--"} ${target.portfolioGroupTitle} / `
            : "";
          return `<option value="${escapeHtml(target.id)}"${target.id === state.replacementTargetId ? " selected" : ""}>${escapeHtml(group + order + target.label)}</option>`;
        }).join("")
      : `<option value="">${state.replacementTargets.length ? "此类型暂时没有可替换位置" : "正在读取网站素材…"}</option>`;
  }

  function renderReplacementTargetDetails() {
    const target = selectedReplacementTarget();
    els.replacementTargetCard.hidden = !target;
    if (!target) return;

    const typeCopy = replacementTypeCopy[target.type] || replacementTypeCopy.project;
    els.replacementTargetKind.textContent = target.type === "project" && target.portfolioGroupTitle
      ? `${typeCopy.label} · ${target.portfolioGroupIndex || "--"} ${target.portfolioGroupTitle}`
      : typeCopy.label;
    els.replacementTargetName.textContent = target.label;
    els.replacementTargetId.textContent = target.type === "project" ? target.slug || target.id : target.id;
    els.replacementTargetDescription.textContent = target.description;
    els.replacementImpactText.textContent = Array.isArray(target.impact) ? target.impact.join("；") : target.impact;

    const assets = assetEntries(target);
    els.replacementCurrentAssets.innerHTML = assets.length
      ? assets.map((asset) => `
          <div class="replacement-asset">
            <span>${escapeHtml(asset.label)}</span>
            <code title="${escapeHtml(asset.path)}">${escapeHtml(asset.path)}</code>
          </div>`).join("")
      : '<p class="replacement-assets-empty">当前路径尚未登记；转换成功后将写入新素材。</p>';
  }

  function replacementReady() {
    return Boolean(
      token
      && selectedReplacementTarget()
      && state.replacementFile
      && els.replacementConfirm.checked
      && !state.replacementUploading
      && state.replacementStatus !== "queued"
    );
  }

  function renderReplacement() {
    renderReplacementTargetSelect();
    renderReplacementTargetDetails();

    const target = selectedReplacementTarget();
    const file = state.replacementFile;
    els.replacementFile.hidden = !file;
    els.replacementDropZone.hidden = Boolean(file);
    els.replacementFileInput.disabled = replacementLocked();
    els.removeReplacementFile.disabled = replacementLocked();

    if (file) {
      els.replacementFileName.textContent = file.name;
      els.replacementFileMeta.textContent = `${formatBytes(file.size)} · ${file.type || "video"}`;
    }

    els.replacementConfirm.disabled = !target || !file || state.replacementUploading || state.replacementStatus === "queued";
    els.replacementConfirmCopy.textContent = target && file
      ? `确认用“${file.name}”替换“${target.label}”。替换前会自动备份，失败时恢复，全部成功后覆盖当前素材。`
      : "请选择位置并添加新母版后确认。替换前会自动备份，失败时恢复，全部成功后覆盖当前素材。";

    const showProgress = state.replacementUploading || state.replacementStatus === "queued" || state.replacementStatus === "done";
    els.replacementProgress.hidden = !showProgress;
    els.replacementProgress.classList.toggle("is-complete", state.replacementStatus === "done");
    els.replacementProgressValue.textContent = `${Math.round(state.replacementProgress)}%`;
    els.replacementProgressBar.style.width = `${Math.min(100, state.replacementProgress)}%`;
    els.replacementProgressLabel.textContent = state.replacementMessage || (state.replacementUploading ? "正在上传新母版" : "已进入后台转换队列");

    els.startReplacement.disabled = !replacementReady();
    els.startReplacement.querySelector("span:first-child").textContent = state.replacementUploading
      ? "正在上传新母版…"
      : state.replacementStatus === "queued"
        ? "已提交，等待转换"
        : state.replacementStatus === "done"
          ? "替换已完成"
        : "确认生成并替换";
  }

  function setReplacementFile(file) {
    if (replacementLocked()) return;
    if (!file) {
      state.replacementFile = null;
      els.replacementFileInput.value = "";
      resetReplacementConfirmation();
      renderReplacement();
      return;
    }
    if (!isSupportedFile(file)) {
      showToast("请选择 MOV、MP4、MXF、MKV、AVI、M4V 或 WebM 视频母版。", "error");
      els.replacementFileInput.value = "";
      return;
    }
    state.replacementFile = file;
    resetReplacementConfirmation();
    renderReplacement();
  }

  async function refreshReplacementTargets({ quiet = false } = {}) {
    if (!token) return;
    els.refreshReplacementTargets.disabled = true;
    try {
      const response = await fetch("/api/replacement-targets", { headers: tokenHeaders(), cache: "no-store" });
      const payload = await parseResponse(response);
      state.replacementTargets = normalizeReplacementTargets(payload);
      const groups = normalizePortfolioGroups(payload);
      if (groups.length) {
        state.portfolioGroups = groups;
        syncPortfolioGroupSelect();
      }
      renderReplacement();
      setConnection("online", "本地服务已连接");
      if (!quiet) showToast("可替换视频位置已刷新", "success");
    } catch (error) {
      state.replacementTargets = [];
      renderReplacement();
      els.replacementTarget.innerHTML = '<option value="">读取失败，请重启或刷新工作台</option>';
      els.replacementTarget.disabled = true;
      if (!quiet) showToast(error instanceof Error ? error.message : String(error), "error", 6500);
    } finally {
      els.refreshReplacementTargets.disabled = false;
    }
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

  function uploadReplacement(file, target) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/upload");
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
      xhr.setRequestHeader("x-media-studio-token", token);
      xhr.setRequestHeader("x-media-meta", base64UrlJson({
        workflow: "replace",
        targetType: target.type,
        targetId: target.id,
        original_name: file.name,
        size: file.size,
        mime_type: file.type || "application/octet-stream",
      }));

      xhr.upload.addEventListener("progress", (event) => {
        if (!event.lengthComputable) return;
        state.replacementProgress = (event.loaded / event.total) * 100;
        state.replacementMessage = `正在上传“${file.name}”`;
        renderReplacement();
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
      xhr.send(file);
    });
  }

  async function startReplacement() {
    if (!replacementReady()) return;
    const target = selectedReplacementTarget();
    const file = state.replacementFile;
    if (!target || !file) return;

    state.replacementUploading = true;
    state.replacementStatus = "uploading";
    state.replacementProgress = 0;
    state.replacementMessage = `准备上传“${file.name}”`;
    els.replacementError.hidden = true;
    els.replacementError.textContent = "";
    renderReplacement();

    try {
      const payload = await uploadReplacement(file, target);
      state.replacementUploading = false;
      state.replacementStatus = "queued";
      state.replacementProgress = 100;
      state.replacementMessage = "上传完成，已进入后台转换队列";
      state.replacementJobId = String(payload?.job?.id || payload?.jobId || payload?.id || "");
      els.replacementConfirm.checked = false;
      showToast(`“${target.label}”的新母版已提交，转换成功后网站会自动更新。`, "success", 6500);
      await refreshJobs({ quiet: true });
    } catch (error) {
      state.replacementUploading = false;
      state.replacementStatus = "error";
      state.replacementMessage = "替换任务提交失败";
      state.replacementProgress = 0;
      els.replacementError.hidden = false;
      els.replacementError.textContent = error instanceof Error ? error.message : String(error);
      showToast(els.replacementError.textContent, "error", 6500);
    }
    renderReplacement();
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

  async function syncReplacementJobStatus() {
    if (state.replacementStatus !== "queued") return;
    const target = selectedReplacementTarget();
    const job = state.replacementJobId
      ? state.jobs.find((entry) => String(entry.id || entry.job_id || "") === state.replacementJobId)
      : state.jobs.find((entry) => {
          const workflow = String(entry.workflow || "").toLowerCase();
          const type = String(entry.targetType || entry.target_type || "").toLowerCase();
          const id = String(entry.targetId || entry.target_id || "");
          return workflow === "replace" && target && type === target.type && id === target.id;
        });
    if (!job) return;

    const status = jobStatus(job);
    const progress = Number(job.progress);
    if (Number.isFinite(progress)) state.replacementProgress = Math.min(100, Math.max(0, progress));
    state.replacementMessage = job.stage_label || job.stage || job.message || "正在转换替换素材";

    if (/fail|error|cancel/.test(status)) {
      state.replacementStatus = "error";
      state.replacementJobId = "";
      els.replacementError.hidden = false;
      els.replacementError.textContent = job.error || job.error_message || job.message || "替换任务失败，旧素材已自动恢复。";
      renderReplacement();
      showToast(`替换失败：${els.replacementError.textContent}`, "error", 7000);
      return;
    }

    if (/complete|completed|done/.test(status)) {
      const completedLabel = target?.label || job.targetId || "所选位置";
      state.replacementStatus = "done";
      state.replacementProgress = 100;
      state.replacementMessage = job.stage_label || job.stage || "替换完成，网站素材已更新";
      state.replacementJobId = "";
      state.replacementFile = null;
      els.replacementFileInput.value = "";
      els.replacementConfirm.checked = false;
      els.replacementError.hidden = true;
      els.replacementError.textContent = "";
      renderReplacement();
      await Promise.allSettled([
        refreshReplacementTargets({ quiet: true }),
        refreshProjects({ quiet: true }),
      ]);
      showToast(`“${completedLabel}”已替换完成，可以继续替换其他素材。`, "success", 6500);
      return;
    }

    renderReplacement();
  }

  async function refreshJobs({ quiet = false } = {}) {
    if (!token || state.polling) return;
    state.polling = true;
    try {
      const response = await fetch("/api/jobs", { headers: tokenHeaders(), cache: "no-store" });
      const payload = await parseResponse(response);
      state.jobs = normalizeList(payload, ["jobs", "items", "results"]);
      renderJobs();
      await syncReplacementJobStatus();
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
    els.groupCount.textContent = String(state.portfolioGroups.length);

    if (!projects.length) {
      els.projectsList.innerHTML = '<div class="empty-state"><p>还没有读取到项目</p><small>确认本地服务和 projects.csv 可用</small></div>';
      return;
    }

    const knownGroupIds = new Set(state.portfolioGroups.map((group) => group.id));
    const groups = [
      ...state.portfolioGroups,
      ...(projects.some((project) => !knownGroupIds.has(project.portfolioGroup))
        ? [{ id: "", index: "--", titleZh: "未分组", path: "", projectCount: 0 }]
        : []),
    ];
    els.projectsList.innerHTML = groups.map((group) => {
      const groupProjects = projects.filter((project) => (project.portfolioGroup || "") === group.id);
      if (!groupProjects.length && group.id === "") return "";
      const groupLink = group.path
        ? `<a class="project-group-link" href="http://localhost:3000${escapeHtml(group.path)}" target="_blank" rel="noreferrer" aria-label="打开 ${escapeHtml(group.titleZh)} 作品页">打开方向 ↗</a>`
        : '<span class="project-group-warning">需要分配方向</span>';
      return `
        <section class="project-group">
          <header class="project-group-head">
            <div><span>${escapeHtml(group.index)} / ${escapeHtml(group.titleZh)}</span><strong>${groupProjects.length} 个项目</strong></div>
            ${groupLink}
          </header>
          ${groupProjects.map((project, index) => {
            const order = String(project.order ?? index + 1).padStart(2, "0");
            const title = project.title_zh || project.titleZh || project.title_en || project.slug || "未命名项目";
            const subtitle = [project.category_zh || project.categoryZh || project.category_en, project.year].filter(Boolean).join(" · ");
            const slug = project.slug || "";
            return `
              <article class="project-item${project.enabled === false ? " is-disabled" : ""}">
                <span class="project-order">${escapeHtml(order)}</span>
                <div class="project-name"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(subtitle || slug)}</span></div>
                <a class="project-link" href="http://localhost:3000/work/${encodeURIComponent(slug)}" target="_blank" rel="noreferrer" aria-label="在网站打开 ${escapeHtml(title)}">↗</a>
              </article>`;
          }).join("")}
        </section>`;
    }).join("");
  }

  async function refreshProjects({ quiet = false } = {}) {
    if (!token) return;
    els.refreshProjects.disabled = true;
    try {
      const response = await fetch("/api/projects", { headers: tokenHeaders(), cache: "no-store" });
      const payload = await parseResponse(response);
      state.projects = normalizeList(payload, ["projects", "items", "results"]);
      const groups = normalizePortfolioGroups(payload);
      if (groups.length) state.portfolioGroups = groups;
      syncPortfolioGroupSelect();
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
    els.replacementTypes.forEach((button) => {
      button.addEventListener("click", () => {
        if (replacementLocked()) return;
        state.replacementType = button.dataset.replacementType || "project";
        state.replacementTargetId = "";
        resetReplacementConfirmation();
        renderReplacement();
      });
    });

    els.replacementTarget.addEventListener("change", () => {
      if (replacementLocked()) return;
      state.replacementTargetId = els.replacementTarget.value;
      resetReplacementConfirmation();
      renderReplacement();
    });

    els.replacementFileInput.addEventListener("change", () => setReplacementFile(els.replacementFileInput.files?.[0] || null));
    ["dragenter", "dragover"].forEach((eventName) => {
      els.replacementDropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        if (!replacementLocked()) els.replacementDropZone.classList.add("is-dragging");
      });
    });
    ["dragleave", "drop"].forEach((eventName) => {
      els.replacementDropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        els.replacementDropZone.classList.remove("is-dragging");
      });
    });
    els.replacementDropZone.addEventListener("drop", (event) => {
      const files = [...(event.dataTransfer?.files || [])];
      if (files.length > 1) showToast("替换现有位置时一次只能选择一个母版，已使用第一个文件。", "info");
      if (files[0]) setReplacementFile(files[0]);
    });
    els.removeReplacementFile.addEventListener("click", () => setReplacementFile(null));
    els.replacementConfirm.addEventListener("change", renderReplacement);
    els.startReplacement.addEventListener("click", startReplacement);
    els.refreshReplacementTargets.addEventListener("click", () => refreshReplacementTargets());

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
    renderReplacement();

    if (!token) {
      setConnection("offline", "本地访问令牌缺失");
      els.projectsList.innerHTML = '<div class="empty-state"><p>本地访问令牌缺失</p><small>请通过 Media Studio 启动命令打开此页面</small></div>';
      showToast("未检测到本地访问令牌。请从项目命令启动 Media Studio，不要直接打开 HTML 文件。", "error", 8000);
      return;
    }

    Promise.allSettled([
      refreshProjects({ quiet: true }),
      refreshJobs({ quiet: true }),
      refreshReplacementTargets({ quiet: true }),
    ]);
    window.setInterval(() => refreshJobs({ quiet: true }), 2500);
    window.setInterval(() => refreshProjects({ quiet: true }), 20000);
    window.setInterval(() => refreshReplacementTargets({ quiet: true }), 20000);
  }

  init();
})();
