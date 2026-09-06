/* =========================================================
   VeriTrace — Investigation Workspace Controller
   Handles reference image upload, web-search execution,
   candidate ranking, evidence selection, and Sepolia registration.
   ========================================================= */
(function () {
  "use strict";

  // Dynamic API Base URL resolution (same origin if served on port 8000, otherwise target http://localhost:8000)
  const API_BASE = (window.location.protocol !== "file:" && window.location.port === "8000")
    ? ""
    : "http://localhost:8000";

  function resolveUrl(url) {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `${API_BASE}${url}`;
  }

  // DOM Elements
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("file-input");
  const previewCard = document.getElementById("preview-card");
  const previewImg = document.getElementById("preview-img");
  const previewName = document.getElementById("preview-name");
  const previewSpecs = document.getElementById("preview-specs");
  const btnRemove = document.getElementById("btn-remove");
  const uploadError = document.getElementById("upload-error");
  const actionArea = document.getElementById("action-area");
  const btnStartSearch = document.getElementById("btn-start-search");
  const btnCancelSearch = document.getElementById("btn-cancel-search");

  const progressCard = document.getElementById("progress-card");
  const progressTimer = document.getElementById("progress-timer");
  const progressBar = document.getElementById("pipeline-progress-bar");
  const telemetryStageLabel = document.getElementById("telemetry-stage-label");
  const telemetryDetailText = document.getElementById("telemetry-detail-text");
  const resultsSection = document.getElementById("results-section");
  const resultsCountBadge = document.getElementById("results-count-badge");
  const topMatchContainer = document.getElementById("top-match-container");
  const candidatesGrid = document.getElementById("candidates-grid");

  const selectedPanel = document.getElementById("selected-panel");
  const selTitle = document.getElementById("sel-title");
  const selSource = document.getElementById("sel-source");
  const selSimilarity = document.getElementById("sel-similarity");
  const selUrl = document.getElementById("sel-url");
  const selSha256 = document.getElementById("sel-sha256");
  const btnRegisterChain = document.getElementById("btn-register-chain");
  const regResultContainer = document.getElementById("registration-result-container");

  const filterBar = document.getElementById("filter-bar");
  const btnFilterVerified = document.getElementById("btn-filter-verified");
  const btnFilterRecommended = document.getElementById("btn-filter-recommended");
  const btnFilterAll = document.getElementById("btn-filter-all");
  const countVerified = document.getElementById("count-verified");
  const countRecommended = document.getElementById("count-recommended");
  const countAll = document.getElementById("count-all");
  const selAdvisory = document.getElementById("sel-advisory") || document.getElementById("sel-ai-advisory");

  const FORENSIC_THRESHOLD = 0.50; // 50% cosine similarity cutoff (suppress pure non-matches)
  const RECOMMEND_THRESHOLD = 0.60; // 60% threshold for Evidence Recommendation
  let activeFilter = "verified";

  let currentFile = null;
  let currentAbortController = null;
  let timerInterval = null;
  let timerSeconds = 0;
  let selectedCandidate = null;
  let searchResults = [];

  // Evidence Recommendation Helper based on biometric similarity score thresholds
  function getEvidenceRecommendation(similarity) {
    const score = Number(similarity) || 0;
    const percent = score * 100;
    const percentStr = percent.toFixed(1);

    if (score >= 0.75) {
      return {
        level: "recommended",
        badgeClass: "badge-recommended",
        boxClass: "box-recommended",
        icon: "🛡️",
        badgeText: "RECOMMENDED EVIDENCE",
        shortTag: `Strong Match (${percentStr}%)`,
        recommendation: `High biometric similarity (≥ 75%). Strong facial feature alignment with reference photo. Suitable for evidentiary anchoring.`,
        isRecommended: true,
      };
    } else if (score >= 0.60) {
      return {
        level: "review",
        badgeClass: "badge-review",
        boxClass: "box-review",
        icon: "⚠️",
        badgeText: "MANUAL REVIEW RECOMMENDED",
        shortTag: `Plausible Match (${percentStr}%)`,
        recommendation: `Moderate similarity (60% – 74%). Plausible candidate; visual review recommended before on-chain registration.`,
        isRecommended: true,
      };
    } else {
      return {
        level: "rejected",
        badgeClass: "badge-not-recommended",
        boxClass: "box-rejected",
        icon: "⛔",
        badgeText: "NOT RECOMMENDED",
        shortTag: `Less Likely Target (< 60%)`,
        recommendation: `Score is ${percentStr}% (< 60%). Less likely to be the photo guy (high false-positive risk). Not recommended as evidence.`,
        isRecommended: false,
      };
    }
  }

  // Allowed MIME types and extensions
  const ALLOWED_EXTS = [".jpg", ".jpeg", ".png", ".webp"];
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

  function formatBytes(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  function showError(msg) {
    if (uploadError) {
      uploadError.textContent = msg;
      uploadError.style.color = "var(--danger)";
      uploadError.style.background = "var(--danger-soft)";
      uploadError.style.borderColor = "rgba(239, 68, 68, 0.3)";
      uploadError.style.display = "block";
    }
  }

  function showInfoNotice(msg) {
    if (uploadError) {
      uploadError.textContent = msg;
      uploadError.style.color = "var(--accent)";
      uploadError.style.background = "var(--accent-soft)";
      uploadError.style.borderColor = "rgba(79, 209, 197, 0.35)";
      uploadError.style.display = "block";
    }
  }

  function clearError() {
    if (uploadError) {
      uploadError.textContent = "";
      uploadError.style.display = "none";
    }
  }

  function handleFileSelect(file) {
    clearError();
    if (!file) return;

    const ext = "." + file.name.split(".").pop().toLowerCase();
    const isValidType = ALLOWED_TYPES.includes(file.type) || ALLOWED_EXTS.includes(ext);

    if (!isValidType) {
      showError("Unsupported format. Please select a valid JPG, PNG, or WEBP image.");
      return;
    }

    currentFile = file;

    // Show image preview
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImg.src = e.target.result;
      previewName.textContent = file.name;
      previewSpecs.textContent = `${formatBytes(file.size)} | ${file.type || "image"}`;

      dropzone.style.display = "none";
      previewCard.style.display = "flex";
      actionArea.style.display = "flex";
    };
    reader.readAsDataURL(file);
  }

  function resetUpload() {
    currentFile = null;
    if (fileInput) fileInput.value = "";
    previewImg.src = "";
    dropzone.style.display = "block";
    previewCard.style.display = "none";
    actionArea.style.display = "none";
    clearError();
  }

  // Event Listeners for File Drag & Drop
  if (dropzone && fileInput) {
    dropzone.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFileSelect(e.target.files[0]);
      }
    });

    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("is-dragover");
    });

    dropzone.addEventListener("dragleave", () => {
      dropzone.classList.remove("is-dragover");
    });

    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("is-dragover");
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    });
  }

  if (btnRemove) {
    btnRemove.addEventListener("click", (e) => {
      e.stopPropagation();
      resetUpload();
    });
  }

  // Forensic Investigation Pipeline Stages (Total ~3-4 mins)
  const PIPELINE_STAGES = [
    {
      step: 1,
      minTime: 0,
      label: "STAGE 1/5: BIOMETRIC ENCODING",
      text: "Detecting facial keypoints and extracting 512-dimensional ArcFace identity vector from reference photo...",
      progressPct: 0,
    },
    {
      step: 2,
      minTime: 6,
      label: "STAGE 2/5: DUAL-PASS LENS SEARCH",
      text: "Querying surface web visual index (Pass 1: full image composition + Pass 2: isolated face crop)...",
      progressPct: 25,
    },
    {
      step: 3,
      minTime: 28,
      label: "STAGE 3/5: CANDIDATE INGESTION & DEDUP",
      text: "Crawling discovered web sources, deduplicating candidate URLs, and downloading candidate images...",
      progressPct: 50,
    },
    {
      step: 4,
      minTime: 110,
      label: "STAGE 4/5: COSINE BIOMETRIC VERIFICATION",
      text: "Running InsightFace buffalo_l face detection and calculating cosine similarity matrix against reference vector...",
      progressPct: 75,
    },
    {
      step: 5,
      minTime: 185,
      label: "STAGE 5/5: FORENSIC FINGERPRINTING & RANKING",
      text: "Generating cryptographic SHA-256 evidence checksums, bounding box overlays, and ranking candidate matches...",
      progressPct: 92,
    },
  ];

  function resetPipeline() {
    if (progressBar) progressBar.style.width = "0%";
    for (let i = 1; i <= 5; i++) {
      const el = document.getElementById(`p-step-${i}`);
      if (el) {
        el.classList.remove("is-active", "is-completed");
        if (i === 1) el.classList.add("is-active");
      }
    }
    if (telemetryStageLabel) telemetryStageLabel.textContent = PIPELINE_STAGES[0].label;
    if (telemetryDetailText) telemetryDetailText.textContent = PIPELINE_STAGES[0].text;
  }

  function updatePipeline(elapsedSeconds) {
    let activeStageIdx = 0;
    for (let i = 0; i < PIPELINE_STAGES.length; i++) {
      if (elapsedSeconds >= PIPELINE_STAGES[i].minTime) {
        activeStageIdx = i;
      }
    }

    const currentStage = PIPELINE_STAGES[activeStageIdx];
    const nextStage = PIPELINE_STAGES[activeStageIdx + 1];

    let linePercent = currentStage.progressPct;
    if (nextStage) {
      const stageDuration = nextStage.minTime - currentStage.minTime;
      const elapsedInStage = elapsedSeconds - currentStage.minTime;
      const stageFraction = Math.min(1, Math.max(0, elapsedInStage / stageDuration));
      linePercent = currentStage.progressPct + stageFraction * (nextStage.progressPct - currentStage.progressPct);
    } else {
      const stage5Elapsed = elapsedSeconds - currentStage.minTime;
      linePercent = Math.min(98, 92 + (stage5Elapsed / 60) * 6);
    }

    if (progressBar) {
      progressBar.style.width = `${linePercent.toFixed(1)}%`;
    }

    for (let i = 1; i <= 5; i++) {
      const el = document.getElementById(`p-step-${i}`);
      if (!el) continue;
      if (i < currentStage.step) {
        el.classList.add("is-completed");
        el.classList.remove("is-active");
      } else if (i === currentStage.step) {
        el.classList.add("is-active");
        el.classList.remove("is-completed");
      } else {
        el.classList.remove("is-active", "is-completed");
      }
    }

    if (telemetryStageLabel) telemetryStageLabel.textContent = currentStage.label;
    if (telemetryDetailText) telemetryDetailText.textContent = currentStage.text;
  }

  function completePipeline() {
    if (progressBar) progressBar.style.width = "100%";
    for (let i = 1; i <= 5; i++) {
      const el = document.getElementById(`p-step-${i}`);
      if (el) {
        el.classList.remove("is-active");
        el.classList.add("is-completed");
      }
    }
    if (telemetryStageLabel) telemetryStageLabel.textContent = "INVESTIGATION COMPLETE";
    if (telemetryDetailText) telemetryDetailText.textContent = "All 5 forensic pipeline stages finished. Rendering candidate evidence...";
  }

  function abortPipeline() {
    if (telemetryStageLabel) telemetryStageLabel.textContent = "INVESTIGATION HALTED";
    if (telemetryDetailText) telemetryDetailText.textContent = "Search stopped by user. Elapsed progress retained.";
  }

  // Search Timer
  function startTimer() {
    timerSeconds = 0;
    progressTimer.textContent = "Elapsed: 00:00s";
    resetPipeline();
    updatePipeline(0);
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      timerSeconds++;
      const mins = String(Math.floor(timerSeconds / 60)).padStart(2, "0");
      const secs = String(timerSeconds % 60).padStart(2, "0");
      progressTimer.textContent = `Elapsed: ${mins}:${secs}s`;
      updatePipeline(timerSeconds);
    }, 1000);
  }

  function stopTimer() {
    clearInterval(timerInterval);
  }

  // Cancel / Stop Web Investigation
  if (btnCancelSearch) {
    btnCancelSearch.addEventListener("click", () => {
      if (currentAbortController) {
        currentAbortController.abort();
      }
    });
  }

  // Start Web Investigation
  if (btnStartSearch) {
    btnStartSearch.addEventListener("click", async () => {
      if (!currentFile) {
        showError("Please upload a reference image first.");
        return;
      }

      clearError();
      resultsSection.style.display = "none";
      selectedPanel.style.display = "none";
      regResultContainer.innerHTML = "";
      btnStartSearch.disabled = true;
      progressCard.style.display = "block";
      startTimer();

      const formData = new FormData();
      formData.append("reference_image", currentFile);

      currentAbortController = new AbortController();

      try {
        const response = await fetch(`${API_BASE}/api/web-search`, {
          method: "POST",
          body: formData,
          signal: currentAbortController.signal,
        });

        if (!response.ok) {
          const errJson = await response.json().catch(() => ({}));
          throw new Error(errJson.detail || `Server error (${response.status})`);
        }

        const data = await response.json();
        stopTimer();
        completePipeline();

        setTimeout(() => {
          progressCard.style.display = "none";
          btnStartSearch.disabled = false;
          renderResults(data);
        }, 450);
      } catch (err) {
        stopTimer();
        if (err.name === "AbortError") {
          abortPipeline();
          setTimeout(() => {
            progressCard.style.display = "none";
            btnStartSearch.disabled = false;
            showInfoNotice("Investigation was stopped by user. You can modify your reference image or restart the search whenever ready.");
          }, 350);
        } else {
          progressCard.style.display = "none";
          btnStartSearch.disabled = false;
          showError(`Investigation request failed: ${err.message}`);
        }
      } finally {
        currentAbortController = null;
      }
    });
  }

  // Render Search Results
  function renderResults(data) {
    searchResults = data.results || [];
    const count = data.total_matches || searchResults.length;
    const verifiedMatches = searchResults.filter((c) => c.similarity >= FORENSIC_THRESHOLD);
    const recommendedMatches = searchResults.filter((c) => c.similarity >= RECOMMEND_THRESHOLD);

    resultsCountBadge.textContent = `${count} candidate${count === 1 ? "" : "s"} indexed`;
    resultsSection.style.display = "block";

    if (searchResults.length === 0) {
      topMatchContainer.innerHTML = `
        <div style="background: var(--surface); border: 1px solid var(--border); padding: 32px; border-radius: var(--radius); text-align: center; color: var(--text-dim);">
          No matching faces discovered on indexed web pages.
        </div>`;
      if (filterBar) filterBar.style.display = "none";
      candidatesGrid.innerHTML = "";
      return;
    }

    // 1. Top Match Spotlight OR Forensic No-Match Alert
    if (verifiedMatches.length > 0) {
      const topMatch = verifiedMatches[0];
      const topSimPercent = (topMatch.similarity * 100).toFixed(1);
      const topImageUrl = resolveUrl(topMatch.result_image_url);
      const topRec = getEvidenceRecommendation(topMatch.similarity);

      topMatchContainer.innerHTML = `
        <div class="top-match-card" id="top-match-card">
          <div class="top-match-header">
            <span class="top-match-badge">TOP CANDIDATE MATCH</span>
            <span class="hud-mono" style="font-size: 0.8rem; color: var(--text-dim);">Candidate #${topMatch.candidate_number}</span>
          </div>
          <div class="top-match-grid">
            <div class="match-image-wrap">
              <img src="${topImageUrl}" alt="Top candidate face detection" class="match-img" onerror="this.style.opacity='0.3'" />
            </div>
            <div class="match-details">
              <div class="similarity-row">
                <span class="similarity-val">${topSimPercent}%</span>
                <span class="similarity-lbl">Biometric Similarity Score</span>
              </div>
              <div class="top-match-assessment-box ${topRec.boxClass}">
                <div class="top-match-assessment-header">
                  <span class="recommendation-badge ${topRec.badgeClass}">
                    <span>${topRec.icon}</span>
                    <span>${topRec.badgeText}</span>
                  </span>
                  <span class="top-match-assessment-sub">${topRec.shortTag}</span>
                </div>
                <div class="top-match-assessment-desc">${topRec.recommendation}</div>
              </div>
              <div class="match-source">${escapeHtml(topMatch.source || "Web source")}</div>
              <h3 class="match-title">${escapeHtml(topMatch.title || "Discovered Web Page")}</h3>
              <a href="${escapeHtml(topMatch.page_url)}" target="_blank" rel="noopener noreferrer" class="match-url-link">
                ${escapeHtml(topMatch.page_url)} ↗
              </a>
              <div class="match-hash-box">
                <span style="color: var(--text-faint); margin-right: 6px;">IMAGE SHA-256:</span>
                <span>${escapeHtml(topMatch.image_sha256)}</span>
              </div>
              <div class="match-actions">
                <button type="button" class="btn btn-primary" id="btn-select-top">
                  <span>Select as Evidence</span>
                </button>
                <a href="${escapeHtml(topMatch.page_url)}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-small">
                  View Source Page ↗
                </a>
              </div>
            </div>
          </div>
          <div class="evidence-disclaimer">
            <strong>Forensic Notice:</strong>
            High biometric face similarity reflects facial embedding alignment discovered across the web. It indicates candidate correlation, not absolute truth of the host page claims.
          </div>
        </div>
      `;

      const btnSelectTop = document.getElementById("btn-select-top");
      if (btnSelectTop) {
        btnSelectTop.addEventListener("click", () => selectCandidate(topMatch, document.getElementById("top-match-card")));
      }
    } else {
      // Highest similarity is below 50% (e.g. 0.20, 0.22) - Suppress Top Match!
      const highestScore = (searchResults[0].similarity * 100).toFixed(1);
      topMatchContainer.innerHTML = `
        <div class="no-match-alert-box">
          <div class="no-match-icon-box" aria-hidden="true">ℹ</div>
          <div class="no-match-body">
            <h3 class="no-match-title">No High-Confidence Facial Matches Discovered</h3>
            <p class="no-match-desc">
              Visual search indexed ${searchResults.length} face candidate${searchResults.length === 1 ? "" : "s"} across the web, but none met the <strong>50.0% biometric identification threshold</strong>. The highest candidate scored only <strong>${highestScore}% similarity</strong> (non-match).
            </p>
            <div class="no-match-footer">
              In ArcFace biometrics, cosine scores below 40–50% denote completely different individuals. You can inspect the raw candidates below, but they are not recommended for forensic evidence registration.
            </div>
          </div>
        </div>
      `;
    }

    // 2. Setup Forensic Filter Bar
    if (filterBar) {
      filterBar.style.display = "flex";
      if (countVerified) countVerified.textContent = `(${verifiedMatches.length})`;
      if (countRecommended) countRecommended.textContent = `(${recommendedMatches.length})`;
      if (countAll) countAll.textContent = `(${searchResults.length})`;

      // Smart default: recommended if present, else verified if present, else all
      if (recommendedMatches.length > 0) {
        activeFilter = "recommended";
        if (btnFilterRecommended) btnFilterRecommended.classList.add("is-active");
        if (btnFilterVerified) btnFilterVerified.classList.remove("is-active");
        if (btnFilterAll) btnFilterAll.classList.remove("is-active");
      } else if (verifiedMatches.length > 0) {
        activeFilter = "verified";
        if (btnFilterVerified) btnFilterVerified.classList.add("is-active");
        if (btnFilterRecommended) btnFilterRecommended.classList.remove("is-active");
        if (btnFilterAll) btnFilterAll.classList.remove("is-active");
      } else {
        activeFilter = "all";
        if (btnFilterAll) btnFilterAll.classList.add("is-active");
        if (btnFilterVerified) btnFilterVerified.classList.remove("is-active");
        if (btnFilterRecommended) btnFilterRecommended.classList.remove("is-active");
      }
    }

    renderCandidateGrid();
    resultsSection.scrollIntoView({ behavior: "smooth" });
  }

  // Render Candidates Grid based on Active Filter
  function renderCandidateGrid() {
    let listToRender = searchResults;
    if (activeFilter === "recommended") {
      listToRender = searchResults.filter((c) => c.similarity >= RECOMMEND_THRESHOLD);
    } else if (activeFilter === "verified") {
      listToRender = searchResults.filter((c) => c.similarity >= FORENSIC_THRESHOLD);
    }

    const otherHeading = document.getElementById("other-matches-heading");

    if (listToRender.length === 0) {
      const filterLabel = activeFilter === "recommended" ? "Recommended (≥ 60%)" : "Verified Matches (≥ 50%)";
      if (otherHeading) otherHeading.textContent = `No Candidates Matching Filter (${filterLabel})`;
      candidatesGrid.innerHTML = `
        <div style="grid-column: 1 / -1; background: var(--surface); border: 1px solid var(--border); padding: 28px; border-radius: var(--radius); text-align: center; color: var(--text-faint); font-size: 0.9rem;">
          0 candidates meet the selected filter criteria. Click <strong>All Discovered Faces</strong> above to inspect all indexed candidates.
        </div>`;
      return;
    }

    if (otherHeading) {
      if (activeFilter === "recommended") {
        otherHeading.textContent = `Recommended Evidence Candidates (${listToRender.length})`;
      } else if (activeFilter === "verified") {
        otherHeading.textContent = `Verified Forensic Candidates (${listToRender.length})`;
      } else {
        otherHeading.textContent = `All Discovered Candidates (${listToRender.length})`;
      }
    }

    candidatesGrid.innerHTML = "";

    listToRender.forEach((candidate) => {
      const card = document.createElement("div");
      card.className = "candidate-card";
      card.dataset.candidateNumber = candidate.candidate_number;

      const simPercent = (candidate.similarity * 100).toFixed(1);
      const imgUrl = resolveUrl(candidate.result_image_url);
      const rec = getEvidenceRecommendation(candidate.similarity);

      let confBadgeClass = "badge-conf-low";
      let confLabel = "LOW / NON-MATCH";
      if (candidate.similarity >= 0.75) {
        confBadgeClass = "badge-conf-high";
        confLabel = "HIGH MATCH";
      } else if (candidate.similarity >= 0.50) {
        confBadgeClass = "badge-conf-med";
        confLabel = "MODERATE";
      } else {
        confBadgeClass = "badge-conf-low";
        confLabel = "LOW / NON-MATCH";
      }

      card.innerHTML = `
        <div class="candidate-header-row">
          <span class="candidate-num">Candidate #${candidate.candidate_number}</span>
          <span class="candidate-sim-badge ${confBadgeClass}">${simPercent}% (${confLabel})</span>
        </div>
        <div class="candidate-thumb-wrap">
          <img src="${imgUrl}" alt="Candidate #${candidate.candidate_number}" style="width: 100%; height: 100%; object-fit: contain;" onerror="this.style.opacity='0.3'" />
        </div>
        <div class="candidate-assessment-block">
          <span class="recommendation-badge ${rec.badgeClass}">
            <span>${rec.icon}</span>
            <span>${rec.badgeText}</span>
          </span>
          <div class="candidate-assessment-note">${rec.recommendation}</div>
        </div>
        <div class="candidate-title" title="${escapeHtml(candidate.title)}">${escapeHtml(candidate.title || "Untitled Candidate")}</div>
        <div class="candidate-meta-row">Source: <strong>${escapeHtml(candidate.source || "Unknown")}</strong></div>
        <a href="${escapeHtml(candidate.page_url)}" target="_blank" rel="noopener noreferrer" class="match-url-link" style="font-size: 0.76rem;">
          View Source Page ↗
        </a>
        <div class="candidate-hash-row" title="${escapeHtml(candidate.image_sha256)}">
          SHA-256: ${escapeHtml(candidate.image_sha256)}
        </div>
        <button type="button" class="btn-select-evidence">
          Select as Evidence
        </button>
      `;

      card.querySelector(".btn-select-evidence").addEventListener("click", () => {
        selectCandidate(candidate, card);
      });

      candidatesGrid.appendChild(card);
    });
  }

  // Filter Buttons Event Listeners
  if (btnFilterVerified && btnFilterAll) {
    btnFilterVerified.addEventListener("click", () => {
      activeFilter = "verified";
      btnFilterVerified.classList.add("is-active");
      if (btnFilterRecommended) btnFilterRecommended.classList.remove("is-active");
      btnFilterAll.classList.remove("is-active");
      renderCandidateGrid();
    });

    if (btnFilterRecommended) {
      btnFilterRecommended.addEventListener("click", () => {
        activeFilter = "recommended";
        btnFilterRecommended.classList.add("is-active");
        btnFilterVerified.classList.remove("is-active");
        btnFilterAll.classList.remove("is-active");
        renderCandidateGrid();
      });
    }

    btnFilterAll.addEventListener("click", () => {
      activeFilter = "all";
      btnFilterAll.classList.add("is-active");
      btnFilterVerified.classList.remove("is-active");
      if (btnFilterRecommended) btnFilterRecommended.classList.remove("is-active");
      renderCandidateGrid();
    });
  }

  // Handle Candidate Selection
  function selectCandidate(candidate, cardElement) {
    selectedCandidate = candidate;

    // Reset styles
    document.querySelectorAll(".candidate-card, .top-match-card").forEach((el) => {
      el.classList.remove("is-selected");
    });
    if (cardElement) cardElement.classList.add("is-selected");

    const rec = getEvidenceRecommendation(candidate.similarity);
    const simPercent = (candidate.similarity * 100).toFixed(1);

    if (selAdvisory) {
      let advisoryClass = "advisory-not-recommended";
      let advisoryHeading = "EVIDENTIARY ASSESSMENT: NOT RECOMMENDED (< 60%)";
      let advisoryMsg = `Candidate scored <strong>${simPercent}%</strong> similarity. Biometric analysis indicates this individual is <strong>less likely to be the photo guy</strong>. Anchoring weak visual hits on Ethereum Sepolia records them immutably on-chain with high false-positive risk.`;

      if (rec.level === "recommended") {
        advisoryClass = "advisory-recommended";
        advisoryHeading = "EVIDENTIARY ASSESSMENT: RECOMMENDED AS EVIDENCE (≥ 75%)";
        advisoryMsg = `Candidate scored <strong>${simPercent}%</strong> similarity (High Biometric Confidence). Facial vectors confirm strong identity alignment with the reference photo. Highly suitable for cryptographic evidence registration.`;
      } else if (rec.level === "review") {
        advisoryClass = "advisory-review";
        advisoryHeading = "EVIDENTIARY ASSESSMENT: MANUAL REVIEW RECOMMENDED (60% – 74%)";
        advisoryMsg = `Candidate scored <strong>${simPercent}%</strong> similarity (Plausible Match). Facial features correlate with the target individual; visual verification is recommended before permanent blockchain commitment.`;
      }

      selAdvisory.innerHTML = `
        <div class="evidence-advisory ${advisoryClass}">
          <div class="advisory-icon" aria-hidden="true">${rec.icon}</div>
          <div class="advisory-body">
            <div class="advisory-title">${advisoryHeading}</div>
            <div class="advisory-text">${advisoryMsg}</div>
          </div>
        </div>
      `;
    }

    // Populate Selected Evidence Panel
    selTitle.textContent = candidate.title || "Untitled";
    selSource.textContent = candidate.source || "Unknown";
    selSimilarity.textContent = `${simPercent}% Cosine Similarity`;
    selUrl.textContent = candidate.page_url;
    selUrl.href = candidate.page_url;
    selSha256.textContent = candidate.image_sha256;

    selectedPanel.style.display = "block";
    regResultContainer.innerHTML = "";
    selectedPanel.scrollIntoView({ behavior: "smooth" });
  }

  // Register Evidence on Ethereum Sepolia
  if (btnRegisterChain) {
    btnRegisterChain.addEventListener("click", async () => {
      if (!selectedCandidate) return;

      btnRegisterChain.disabled = true;
      btnRegisterChain.innerHTML = `
        <span class="radar-spinner" style="width: 16px; height: 16px; margin: 0; display: inline-block; vertical-align: middle;"></span>
        <span>Anchoring to Ethereum Sepolia...</span>
      `;

      const payload = {
        page_url: selectedCandidate.page_url,
        title: selectedCandidate.title || "",
        source: selectedCandidate.source || "",
        image_sha256: selectedCandidate.image_sha256,
        candidate_number: selectedCandidate.candidate_number,
        similarity: selectedCandidate.similarity,
        result_image_url: selectedCandidate.result_image_url,
      };

      try {
        const response = await fetch(`${API_BASE}/api/evidence/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || `Registration failed (${response.status})`);
        }

        renderRegistrationResult(data);
      } catch (err) {
        regResultContainer.innerHTML = `
          <div style="background: var(--danger-soft); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: var(--radius); padding: 24px; color: var(--danger); margin: 32px 0;">
            <strong>Registration Error:</strong> ${escapeHtml(err.message)}
          </div>
        `;
        regResultContainer.scrollIntoView({ behavior: "smooth" });
      } finally {
        btnRegisterChain.disabled = false;
        btnRegisterChain.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <span>Register Evidence on Ethereum</span>
        `;
      }
    });
  }

  // Render Registration Result
  function renderRegistrationResult(data) {
    const isNew = data.status === "registered";
    const fingerprint = data.fingerprint || "";
    const observedAt = data.observed_at || "Recorded on Registration";

    if (isNew) {
      regResultContainer.innerHTML = `
        <div class="reg-result-card reg-result-card--new">
          <div class="reg-header">
            <span class="reg-badge reg-badge--new">✓ EVIDENCE REGISTERED</span>
            <span class="hud-mono" style="font-size: 0.82rem; color: var(--success);">Anchored on Ethereum Sepolia</span>
          </div>

          <div class="reg-meta-grid">
            <div class="table-field reg-full">
              <span class="table-k">Cryptographic Evidence Fingerprint (SHA-256)</span>
              <span class="table-v hud-mono" style="font-weight: 600; color: var(--accent);">${escapeHtml(fingerprint)}</span>
            </div>
            <div class="table-field">
              <span class="table-k">Authoritative Observation Timestamp (UTC)</span>
              <span class="table-v hud-mono">${escapeHtml(observedAt)}</span>
            </div>
            <div class="table-field">
              <span class="table-k">Ethereum Sepolia Block Number</span>
              <span class="table-v hud-mono">${data.block_number || "Confirmed"}</span>
            </div>
            <div class="table-field reg-full">
              <span class="table-k">Transaction Hash</span>
              <span class="table-v hud-mono">${escapeHtml(data.transaction_hash || "Confirmed")}</span>
            </div>
          </div>

          <div class="reg-actions-row">
            ${data.explorer_url ? `<a href="${escapeHtml(data.explorer_url)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-small">View on Etherscan ↗</a>` : ""}
            <a href="../verify/index.html?fingerprint=${encodeURIComponent(fingerprint)}" class="btn btn-ghost btn-small">
              Verify in Verification Workspace →
            </a>
          </div>
        </div>
      `;
    } else {
      // Duplicate registration handled gracefully
      const blockTimestampHuman = data.blockchain_timestamp
        ? new Date(data.blockchain_timestamp * 1000).toUTCString()
        : "Prior Consensus";

      regResultContainer.innerHTML = `
        <div class="reg-result-card reg-result-card--duplicate">
          <div class="reg-header">
            <span class="reg-badge reg-badge--duplicate">EVIDENCE ALREADY REGISTERED</span>
            <span class="hud-mono" style="font-size: 0.82rem; color: var(--warn);">Existing On-Chain Record Found</span>
          </div>

          <p style="font-size: 0.92rem; color: var(--text-dim); margin-bottom: 20px;">
            This exact canonical evidence representation was already registered on Ethereum Sepolia.
            Its fingerprint cannot be duplicated or overwritten.
          </p>

          <div class="reg-meta-grid">
            <div class="table-field reg-full">
              <span class="table-k">Existing Fingerprint</span>
              <span class="table-v hud-mono" style="color: var(--accent);">${escapeHtml(fingerprint)}</span>
            </div>
            <div class="table-field">
              <span class="table-k">Recorded Blockchain Timestamp</span>
              <span class="table-v hud-mono">${escapeHtml(blockTimestampHuman)}</span>
            </div>
            <div class="table-field">
              <span class="table-k">Submitter Address</span>
              <span class="table-v hud-mono">${escapeHtml(data.submitter || "Unknown")}</span>
            </div>
          </div>

          <div class="reg-actions-row">
            <a href="../verify/index.html?fingerprint=${encodeURIComponent(fingerprint)}" class="btn btn-primary btn-small">
              Verify this Existing Record →
            </a>
          </div>
        </div>
      `;
    }

    regResultContainer.scrollIntoView({ behavior: "smooth" });
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();
