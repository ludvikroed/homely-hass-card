class HomelyCard extends HTMLElement {
  setConfig(config) {
    if (!config.alarm_entity) throw new Error("Du må sette alarm_entity");
    if (!Array.isArray(config.temperature_entities)) {
      throw new Error("Du må sette temperature_entities som liste");
    }

    this.config = {
      ...config,
      motion_sensors: this._toArray(config.motion_sensors),
      door_sensors: this._toArray(config.door_sensors),
      battery_sensor: this._toArray(config.battery_sensor),
      left_lock_door: this._singleEntity(config.left_lock_door),
      left_lock_motion: this._singleEntity(config.left_lock_motion),
    };
  }

  _toArray(value) {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }

  _singleEntity(value) {
    if (!value) return null;
    return Array.isArray(value) ? value[0] || null : value;
  }

  _escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  _emitMoreInfo(entityId) {
    if (!entityId) return;
    this.dispatchEvent(
      new CustomEvent("hass-more-info", {
        bubbles: true,
        composed: true,
        detail: { entityId },
      })
    );
  }

  _attachClickHandlers() {
    const clickable = this.querySelectorAll("[data-entity]");
    clickable.forEach((el) => {
      el.onclick = (e) => {
        e.preventDefault();
        const entityId = el.getAttribute("data-entity");
        this._emitMoreInfo(entityId);
      };
    });
  }

  _getAlarmInfo(hass) {
    const alarm = hass.states[this.config.alarm_entity];
    const alarmState = alarm ? alarm.state : "unknown";

    let alarmIcon = "mdi:shield-off";
    let color = "gray";
    let alarmStatusText = "UKJENT";

    switch (alarmState) {
      case "disarmed":
        alarmIcon = "mdi:shield-off";
        color = "#2ecc40";
        alarmStatusText = "AV";
        break;
      case "armed_home":
        alarmIcon = "mdi:home-variant";
        color = "#ff4136";
        alarmStatusText = "HJEMME";
        break;
      case "armed_away":
        alarmIcon = "mdi:shield-lock";
        color = "#ff4136";
        alarmStatusText = "PÅ";
        break;
      case "armed_night":
        alarmIcon = "mdi:moon-waning-crescent";
        color = "#ff4136";
        alarmStatusText = "NATT";
        break;
      case "arming":
        alarmIcon = "mdi:shield";
        color = "#ff851b";
        alarmStatusText = "AKTIVERES";
        break;
      case "triggered":
        alarmIcon = "mdi:alert-circle";
        color = "#b10dc9";
        alarmStatusText = "UTLØST";
        break;
      default:
        alarmStatusText = String(alarmState || "unknown").toUpperCase();
    }

    return { alarmIcon, color, alarmStatusText };
  }

  _getBatteryVisual(entity) {
    const raw = String(entity?.state ?? "").toLowerCase().trim();
    const attrStatus = String(entity?.attributes?.status ?? "").toLowerCase().trim();

    const problemValues = new Set(["on", "problem", "defect", "defective", "true"]);
    const healthyValues = new Set(["off", "ok", "healthy", "false"]);

    const isProblem = problemValues.has(raw) || attrStatus === "defective" || attrStatus === "problem";
    const isHealthy = healthyValues.has(raw) || attrStatus === "healthy";

    if (isProblem) {
      return { icon: "mdi:battery-alert", color: "#ff4136", label: "Defective" };
    }
    if (isHealthy) {
      return { icon: "mdi:battery-check", color: "#2ecc40", label: "Healthy" };
    }
    return { icon: "mdi:battery-unknown", color: "#ff851b", label: raw || "unknown" };
  }

  _renderBatteryHtml(hass) {
    let html = "";
    this.config.battery_sensor.forEach((entityId) => {
      const entity = hass.states[entityId];
      if (!entity) return;

      const name = entity.attributes?.friendly_name || entityId;
      const v = this._getBatteryVisual(entity);

      html += `
        <button
          class="homely-icon-btn"
          data-entity="${this._escapeHtml(entityId)}"
          title="${this._escapeHtml(name)}: ${this._escapeHtml(entity.state)}"
        >
          <ha-icon icon="${v.icon}" style="color:${v.color}; --mdc-icon-size:26px;"></ha-icon>
        </button>
      `;
    });
    return html;
  }

  _getWebsocketVisual(entity) {
    const raw = String(entity?.state ?? "").toLowerCase().trim();

    if (raw === "connected") return { icon: "mdi:web-check", color: "#2ecc40" };
    if (raw === "connecting") return { icon: "mdi:web-sync", color: "#ff851b" };
    if (raw === "disconnected") return { icon: "mdi:web-off", color: "#ff4136" };
    if (raw === "not initialized") return { icon: "mdi:power-plug-off", color: "#ff851b" };
    if (raw === "unavailable" || raw === "unknown") return { icon: "mdi:web-off", color: "#ff4136" };

    return { icon: "mdi:web", color: "#ff851b" };
  }

  _renderWebsocketHtml(hass) {
    const wsId = this.config.websocket_entity;
    if (!wsId) return "";

    const ws = hass.states[wsId];
    if (!ws) return "";

    const v = this._getWebsocketVisual(ws);
    const reason = ws.attributes?.reason ? ` | reason: ${ws.attributes.reason}` : "";
    const name = ws.attributes?.friendly_name || wsId;

    return `
      <button
        class="homely-icon-btn"
        data-entity="${this._escapeHtml(wsId)}"
        title="${this._escapeHtml(name)}: ${this._escapeHtml(ws.state)}${this._escapeHtml(reason)}"
      >
        <ha-icon icon="${v.icon}" style="color:${v.color}; --mdc-icon-size:22px;"></ha-icon>
      </button>
    `;
  }

  _getLockVisual(stateRaw) {
    const state = String(stateRaw ?? "").toLowerCase().trim();

    if (state === "locked") return { icon: "mdi:lock", color: "#2ecc40" };
    if (state === "unlocked") return { icon: "mdi:lock-open-variant", color: "#ff4136" };
    if (state === "locking") return { icon: "mdi:lock-outline", color: "#ff851b" };
    if (state === "unlocking") return { icon: "mdi:lock-open-outline", color: "#ff851b" };
    if (state === "jammed") return { icon: "mdi:lock-alert", color: "#ff4136" };
    if (state === "unavailable") return { icon: "mdi:lock-off", color: "#ff4136" };

    return { icon: "mdi:lock-question", color: "#ff851b" };
  }

  _renderLeftLockHtml(hass, entityId) {
    if (!entityId) return "";

    const entity = hass.states[entityId];
    if (!entity) return "";

    const state = String(entity.state || "");
    const name = entity.attributes?.friendly_name || entityId;
    const v = this._getLockVisual(state);

    return `
      <button
        class="homely-icon-btn"
        data-entity="${this._escapeHtml(entityId)}"
        title="${this._escapeHtml(name)}: ${this._escapeHtml(state)}"
      >
        <ha-icon icon="${v.icon}" style="color:${v.color}; --mdc-icon-size:24px;"></ha-icon>
      </button>
    `;
  }

  _renderMotionHtml(hass) {
    let html = "";
    this.config.motion_sensors.forEach((entityId) => {
      const entity = hass.states[entityId];
      if (!entity) return;

      const state = String(entity.state || "");
      const isOn = state === "on";
      const icon = isOn ? "mdi:run-fast" : "mdi:walk";
      const color = isOn ? "#ff4136" : "#2ecc40";
      const name = entity.attributes?.friendly_name || entityId;

      html += `
        <button
          class="homely-icon-btn"
          data-entity="${this._escapeHtml(entityId)}"
          title="${this._escapeHtml(name)}: ${this._escapeHtml(state)}"
        >
          <ha-icon icon="${icon}" style="color:${color}; --mdc-icon-size:24px;"></ha-icon>
        </button>
      `;
    });
    return html;
  }

  _renderDoorHtml(hass) {
    let html = "";
    this.config.door_sensors.forEach((entityId) => {
      const entity = hass.states[entityId];
      if (!entity) return;

      const state = String(entity.state || "");
      const isOn = state === "on";
      const icon = isOn ? "mdi:door-open" : "mdi:door-closed";
      const color = isOn ? "#ff4136" : "#2ecc40";
      const name = entity.attributes?.friendly_name || entityId;

      html += `
        <button
          class="homely-icon-btn"
          data-entity="${this._escapeHtml(entityId)}"
          title="${this._escapeHtml(name)}: ${this._escapeHtml(state)}"
        >
          <ha-icon icon="${icon}" style="color:${color}; --mdc-icon-size:24px;"></ha-icon>
        </button>
      `;
    });
    return html;
  }

  _renderTempsHtml(hass) {
    const items = this.config.temperature_entities || [];
    if (!items.length) return "";

    let html = `<div class="homely-temp-grid">`;

    items.forEach((item) => {
      const entityId = typeof item === "string" ? item : item.entity;
      if (!entityId) return;

      const entity = hass.states[entityId];
      if (!entity) return;

      const name = (typeof item === "object" && item.name) || entity.attributes?.friendly_name || entityId;
      const icon = typeof item === "object" ? item.icon : null;
      const iconColor = (typeof item === "object" && (item.icon_color || item.color)) || "#2b2b2b";

      const rawState = entity.state;
      const parsed = parseFloat(rawState);
      const value = Number.isNaN(parsed) ? rawState : parsed.toFixed(1);
      const unit = entity.attributes?.unit_of_measurement || "";

      const badge = icon
        ? `<div class="homely-badge" style="background:${iconColor};"><ha-icon icon="${icon}" style="color:#fff; --mdc-icon-size:20px;"></ha-icon></div>`
        : "";

      html += `
        <div
          class="homely-temp-item"
          data-entity="${this._escapeHtml(entityId)}"
          title="Åpne historikk for ${this._escapeHtml(name)}"
        >
          ${badge}
          <div class="homely-temp-text">
            <span class="homely-temp-name">${this._escapeHtml(name)}</span>
            <span class="homely-temp-value">${this._escapeHtml(value)} ${this._escapeHtml(unit)}</span>
          </div>
        </div>
      `;
    });

    html += `</div>`;
    return html;
  }

  set hass(hass) {
    const { alarmIcon, color, alarmStatusText } = this._getAlarmInfo(hass);
    const motionHtml = this._renderMotionHtml(hass);
    const motionLockHtml = this._renderLeftLockHtml(hass, this.config.left_lock_motion);
    const batteryHtml = this._renderBatteryHtml(hass);
    const wsHtml = this._renderWebsocketHtml(hass);
    const doorHtml = this._renderDoorHtml(hass);
    const doorLockHtml = this._renderLeftLockHtml(hass, this.config.left_lock_door);
    const tempsHtml = this._renderTempsHtml(hass);

    this.innerHTML = `
      <ha-card>
        <style>
          .homely-wrap { position: relative; overflow: visible; padding: 8px; }
          .homely-top { display: flex; align-items: center; gap: 12px; padding: 10px 18px 4px 18px; }
          .homely-title { font-size: 1.05rem; color: #ddd; margin-bottom: 3px; }
          .homely-state { font-size: 1.8rem; font-weight: 800; color: #fff; letter-spacing: 1px; text-shadow: 0 2px 6px #0008; }

          .homely-right {
            position: absolute;
            top: 12px;
            right: 16px;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 6px;
          }
          .homely-row { display: flex; align-items: center; justify-content: flex-end; gap: 2px; }

          .homely-icon-btn {
            border: none;
            background: transparent;
            padding: 4px;
            margin: 0;
            border-radius: 8px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
          }
          .homely-icon-btn:hover { background: rgba(255,255,255,0.08); }

          .homely-temp-grid {
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 8px;
            padding: 8px;
            margin-top: 8px;
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 8px;
          }
          .homely-temp-item {
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 6px;
            cursor: pointer;
          }
          .homely-temp-item:hover { background: rgba(255,255,255,0.06); }
          .homely-badge {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .homely-temp-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
          .homely-temp-name {
            color: #fff;
            font-weight: 700;
            font-size: 0.95rem;
            line-height: 1.1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .homely-temp-value { color: #ddd; font-weight: 600; font-size: 0.95rem; line-height: 1.1; }

          @media (max-width: 700px) {
            .homely-temp-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          }
        </style>

        <div class="homely-wrap">
          <div class="homely-top">
            <ha-icon icon="${alarmIcon}" style="color:${color}; --mdc-icon-size:44px;"></ha-icon>
            <div>
              <div class="homely-title">Alarm</div>
              <div class="homely-state">${this._escapeHtml(alarmStatusText)}</div>
            </div>
          </div>

          <div class="homely-right">
            <div class="homely-row">${motionLockHtml}${motionHtml}${batteryHtml}${wsHtml}</div>
            <div class="homely-row">${doorLockHtml}${doorHtml}</div>
          </div>

          ${tempsHtml}
        </div>
      </ha-card>
    `;

    this._attachClickHandlers();
  }

  getCardSize() {
    const temps = this.config.temperature_entities?.length || 0;
    const tempRows = Math.ceil(temps / 3);
    return Math.max(3, 1 + tempRows);
  }
}

if (!customElements.get("homely-card")) {
  customElements.define("homely-card", HomelyCard);
}
