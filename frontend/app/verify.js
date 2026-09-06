/* =========================================================
   VeriTrace — Verification Workspace Controller
   Handles Mode A (Fingerprint) & Mode B (Evidence Fields)
   verification against Ethereum Sepolia smart contract.
   ========================================================= */
(function () {
  "use strict";

  const API_BASE = (window.location.protocol !== "file:" && window.location.port === "8000")
    ? ""
    : "http://localhost:8000";

  // Elements
  const tabFingerprint = document.getElementById("tab-fingerprint");
  const tabFields = document.getElementById("tab-fields");
  const formModeA = document.getElementById("form-mode-a");
  const formModeB = document.getElementById("form-mode-b");

  const inputFingerprint = document.getElementById("input-fingerprint");
  const btnVerifyFingerprint = document.getElementById("btn-verify-fingerprint");

  const fieldPageUrl = document.getElementById("field-page-url");
  const fieldTitle = document.getElementById("field-title");
  const fieldSource = document.getElementById("field-source");
  const fieldImageSha256 = document.getElementById("field-image-sha256");
  const fieldObservedAt = document.getElementById("field-observed-at");
  const btnVerifyFields = document.getElementById("btn-verify-fields");

  const verifyLoading = document.getElementById("verify-loading");
  const verificationOutcome = document.getElementById("verification-outcome");

  // Tab Switching
  if (tabFingerprint && tabFields) {
    tabFingerprint.addEventListener("click", () => {
      tabFingerprint.classList.add("is-active");
      tabFingerprint.setAttribute("aria-selected", "true");
      tabFields.classList.remove("is-active");
      tabFields.setAttribute("aria-selected", "false");
      formModeA.style.display = "block";
      formModeB.style.display = "none";
      verificationOutcome.innerHTML = "";
    });

    tabFields.addEventListener("click", () => {
      tabFields.classList.add("is-active");
      tabFields.setAttribute("aria-selected", "true");
      tabFingerprint.classList.remove("is-active");
      tabFingerprint.setAttribute("aria-selected", "false");
      formModeA.style.display = "none";
      formModeB.style.display = "block";
      verificationOutcome.innerHTML = "";
    });
  }

  // Verification Execution
  async function executeVerification(payload, triggerButton) {
    verificationOutcome.innerHTML = "";
    verifyLoading.style.display = "block";
    if (triggerButton) triggerButton.disabled = true;

    try {
      const response = await fetch(`${API_BASE}/api/evidence/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || `Verification request failed (${response.status})`);
      }

      renderVerificationOutcome(data);
    } catch (err) {
      verificationOutcome.innerHTML = `
        <div style="background: var(--danger-soft); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: var(--radius); padding: 24px; color: var(--danger); margin-top: 24px;">
          <strong>Verification Error:</strong> ${escapeHtml(err.message)}
        </div>
      `;
      verificationOutcome.scrollIntoView({ behavior: "smooth" });
    } finally {
      verifyLoading.style.display = "none";
      if (triggerButton) triggerButton.disabled = false;
    }
  }

  // Mode A: Fingerprint Button Click
  if (btnVerifyFingerprint) {
    btnVerifyFingerprint.addEventListener("click", () => {
      const fp = inputFingerprint.value.trim().toLowerCase();
      if (!fp || fp.length !== 64 || !/^[a-f0-9]{64}$/.test(fp)) {
        verificationOutcome.innerHTML = `
          <div style="background: var(--danger-soft); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: var(--radius); padding: 18px; color: var(--danger); margin-top: 20px;">
            Please enter a valid 64-character hexadecimal SHA-256 fingerprint.
          </div>
        `;
        return;
      }

      executeVerification({ fingerprint: fp }, btnVerifyFingerprint);
    });
  }

  // Mode B: Fields Button Click
  if (btnVerifyFields) {
    btnVerifyFields.addEventListener("click", () => {
      const page_url = fieldPageUrl.value.trim();
      const image_sha256 = fieldImageSha256.value.trim().toLowerCase();
      const observed_at = fieldObservedAt.value.trim();
      const title = fieldTitle.value.trim();
      const source = fieldSource.value.trim();

      if (!page_url.startsWith("http://") && !page_url.startsWith("https://")) {
        verificationOutcome.innerHTML = `
          <div style="background: var(--danger-soft); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: var(--radius); padding: 18px; color: var(--danger); margin-top: 20px;">
            Page URL must start with http:// or https://
          </div>
        `;
        return;
      }

      if (!image_sha256 || image_sha256.length !== 64 || !/^[a-f0-9]{64}$/.test(image_sha256)) {
        verificationOutcome.innerHTML = `
          <div style="background: var(--danger-soft); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: var(--radius); padding: 18px; color: var(--danger); margin-top: 20px;">
            Please enter a valid 64-character hexadecimal image SHA-256 hash.
          </div>
        `;
        return;
      }

      if (!observed_at) {
        verificationOutcome.innerHTML = `
          <div style="background: var(--danger-soft); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: var(--radius); padding: 18px; color: var(--danger); margin-top: 20px;">
            Observed At UTC timestamp is required for canonical reconstruction.
          </div>
        `;
        return;
      }

      const payload = {
        page_url,
        title,
        source,
        image_sha256,
        observed_at,
      };

      executeVerification(payload, btnVerifyFields);
    });
  }

  // Render Outcome
  function renderVerificationOutcome(data) {
    const isVerified = data.exists === true;

    if (isVerified) {
      const blockTime = data.blockchain_timestamp
        ? new Date(data.blockchain_timestamp * 1000).toUTCString()
        : "Confirmed";

      verificationOutcome.innerHTML = `
        <div class="verify-result verify-result--valid">
          <div class="verify-status-banner">
            <div class="verify-icon-box" aria-hidden="true">✓</div>
            <div>
              <h2 class="verify-heading">VERIFIED ON ETHEREUM SEPOLIA</h2>
              <div class="hud-mono" style="font-size: 0.8rem; color: var(--text-dim);">Immutable Consensus Confirmation</div>
            </div>
          </div>

          <p class="verify-message">
            The supplied evidence representation matches the fingerprint registered on Ethereum Sepolia.
            The cryptographic hash and timestamp boundaries have been mathematically confirmed on-chain.
          </p>

          <div class="reg-meta-grid">
            <div class="table-field reg-full">
              <span class="table-k">Registered SHA-256 Fingerprint</span>
              <span class="table-v hud-mono" style="color: var(--accent); font-weight: 600;">${escapeHtml(data.fingerprint)}</span>
            </div>
            ${data.observed_at ? `
            <div class="table-field">
              <span class="table-k">Recorded Observation Timestamp (observed_at)</span>
              <span class="table-v hud-mono">${escapeHtml(data.observed_at)}</span>
            </div>` : ""}
            <div class="table-field">
              <span class="table-k">Blockchain Consensus Timestamp (block.timestamp)</span>
              <span class="table-v hud-mono">${escapeHtml(blockTime)}</span>
            </div>
            <div class="table-field reg-full">
              <span class="table-k">Submitter Address</span>
              <span class="table-v hud-mono">
                <a href="https://sepolia.etherscan.io/address/${encodeURIComponent(data.submitter || '')}" target="_blank" rel="noopener noreferrer" style="color: var(--accent-2); text-decoration: underline;">
                  ${escapeHtml(data.submitter || "Unknown")} ↗
                </a>
              </span>
            </div>
            ${data.canonical_evidence ? `
            <div class="table-field reg-full">
              <span class="table-k">Canonical Sorted JSON Payload</span>
              <pre style="background: #090b0e; border: 1px solid var(--border-soft); padding: 12px; border-radius: 4px; font-size: 0.78rem; color: #b8c0cc; overflow-x: auto; margin: 4px 0 0;"><code>${escapeHtml(data.canonical_evidence)}</code></pre>
            </div>` : ""}
          </div>
        </div>
      `;
    } else {
      verificationOutcome.innerHTML = `
        <div class="verify-result verify-result--invalid">
          <div class="verify-status-banner">
            <div class="verify-icon-box" aria-hidden="true">✕</div>
            <div>
              <h2 class="verify-heading">TAMPERED / UNREGISTERED</h2>
              <div class="hud-mono" style="font-size: 0.8rem; color: var(--danger);">No Matching On-Chain Record Found</div>
            </div>
          </div>

          <p class="verify-message">
            The supplied evidence does not match a registered fingerprint on Ethereum Sepolia.
            One or more evidence fields (URL, title, source, image hash, or observation timestamp) may have changed, or this evidence was never registered.
          </p>

          <div class="reg-meta-grid">
            <div class="table-field reg-full">
              <span class="table-k">Evaluated Fingerprint</span>
              <span class="table-v hud-mono" style="color: var(--warn);">${escapeHtml(data.fingerprint || "None")}</span>
            </div>
            <div class="table-field reg-full">
              <span class="table-k">VeriTraceRegistry Status</span>
              <span class="table-v hud-mono" style="color: var(--text-dim);">Unregistered (bytes32 key does not exist on contract)</span>
            </div>
          </div>

          <div style="font-size: 0.8rem; color: var(--text-faint); margin-top: 14px; border-top: 1px solid var(--border-soft); padding-top: 12px; line-height: 1.5;">
            <strong>Evidentiary Notice:</strong>
            A verification mismatch indicates that this specific digital artifact representation is not anchored to Ethereum Sepolia. It does not imply that the original hosting website or real-world source is false.
          </div>
        </div>
      `;
    }

    verificationOutcome.scrollIntoView({ behavior: "smooth" });
  }

  // Handle URL Query Parameters (e.g. ?fingerprint=... or ?page_url=...)
  const params = new URLSearchParams(window.location.search);
  const paramFp = params.get("fingerprint");
  const paramUrl = params.get("page_url");

  if (paramFp) {
    if (tabFingerprint) tabFingerprint.click();
    if (inputFingerprint) inputFingerprint.value = paramFp;
    executeVerification({ fingerprint: paramFp.trim().toLowerCase() }, btnVerifyFingerprint);
  } else if (paramUrl) {
    if (tabFields) tabFields.click();
    if (fieldPageUrl) fieldPageUrl.value = paramUrl;
    if (fieldTitle) fieldTitle.value = params.get("title") || "";
    if (fieldSource) fieldSource.value = params.get("source") || "";
    if (fieldImageSha256) fieldImageSha256.value = params.get("image_sha256") || "";
    if (fieldObservedAt) fieldObservedAt.value = params.get("observed_at") || "";
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
