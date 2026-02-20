class HomelyCard extends HTMLElement {
  setConfig(config) {
    if (!config.alarm_entity) throw new Error("Du må sette alarm_entity");
    if (!config.temperature_entities || !Array.isArray(config.temperature_entities)) throw new Error("Du må sette temperature_entities som liste");

    this.config = config;
  }

  // --- Hjelpefunksjoner for å holde set hass ryddig ---
  _getAlarmInfo(hass) {
    const alarm = hass.states[this.config.alarm_entity];
    let alarmIcon = "mdi:shield-off"; // default
    let color = "gray";
    let alarmState = alarm ? alarm.state : "unknown";
    let alarmStatusText = "";
    switch(alarmState) {
      case "disarmed": alarmIcon="mdi:shield-off"; color="#2ecc40"; alarmStatusText="AV"; break;
      case "armed_home": alarmIcon="mdi:home-variant"; color="#ff4136"; alarmStatusText="HJEMME"; break;
      case "armed_away": alarmIcon="mdi:shield-lock"; color="#ff4136"; alarmStatusText="PÅ"; break;
      case "armed_night": alarmIcon="mdi:moon-waning-crescent"; color="#ff4136"; alarmStatusText="NATT"; break;
      case "arming": alarmIcon="mdi:shield"; color="#ff851b"; alarmStatusText="AKTIVERES"; break;
      case "triggered": alarmIcon="mdi:alert-circle"; color="#b10dc9"; alarmStatusText="UTLØST"; break;
      default: alarmStatusText = alarmState;
    }
    return { alarmIcon, color, alarmState, alarmStatusText };
  }

  _renderBatteryHtml(hass) {
    let batteryIconsHtml = "";
    if (!this.config.battery_sensor) return batteryIconsHtml;
    const batterySensors = Array.isArray(this.config.battery_sensor) ? this.config.battery_sensor : [this.config.battery_sensor];
    batterySensors.forEach((batId) => {
      const bat = hass.states[batId];
      if (!bat) return;
      const state = bat.state;
      const batColor = state === "defect" ? "#ff4136" : "#2ecc40";
      batteryIconsHtml += `<ha-icon icon="mdi:battery" style="color:${batColor}; --mdc-icon-size:30px; margin-left:6px; padding:4px;"></ha-icon>`;
    });
    return batteryIconsHtml;
  }

  _renderWebsocketHtml(hass) {
    if (!this.config.websocket_entity) return "";
    const wsId = this.config.websocket_entity;
    const ws = hass.states[wsId];
    if (!ws) return "";
    const raw = String(ws.state || "").toLowerCase().trim();

    // Use ordered regex checks to avoid substring pitfalls (e.g. 'disconnected' matching 'connect')
    const reError = /\b(error|fail|failed)\b/;
    const reDisconnect = /\b(disconnect|disconnected|disconnected\b)\b/;
    const reUnavailable = /\b(unavailable|unknown)\b/;
    const reNotInit = /\bnot\s+init(?:i|ialized)?\b/;
    const reInit = /\b(init|initialized|initializing)\b/;
    const reConnect = /\b(connect|connected)\b/;

    let wsIcon = "mdi:web";
    let wsColor = "#ff851b"; // amber default

    if (reError.test(raw)) {
      wsIcon = "mdi:alert-circle"; wsColor = "#b10dc9"; // purple/error
    } else if (reDisconnect.test(raw) || reUnavailable.test(raw)) {
      wsIcon = "mdi:web-off"; wsColor = "#ff4136"; // red/offline
    } else if (reConnect.test(raw)) {
      wsIcon = "mdi:web"; wsColor = "#2ecc40"; // green/online
    } else if (reNotInit.test(raw) || reInit.test(raw)) {
      wsIcon = "mdi:power-plug-off"; wsColor = "#ff851b"; // amber/init state
    }

    return `<ha-icon icon="${wsIcon}" title="${wsId}: ${ws.state}" style="color:${wsColor}; --mdc-icon-size:20px; margin-left:6px; padding:3px;"></ha-icon>`;
  }

  _renderMotionHtml(hass) {
    let motionIconsHtml = "";
    (this.config.motion_sensors || []).forEach(msId => {
      const ms = hass.states[msId];
      if (!ms) return;
      const msState = ms.state;
      const msColor = msState === "on" ? "#ff4136" : "#2ecc40";
      const msIcon = msState === "on" ? "mdi:run" : "mdi:walk";
      motionIconsHtml += `<ha-icon icon="${msIcon}" title="${ms.attributes?.friendly_name || msId}: ${msState}" style="color:${msColor}; --mdc-icon-size:28px; margin-left:6px; padding:4px;"></ha-icon>`;
    });
    return motionIconsHtml;
  }

  _renderDoorHtml(hass) {
    let doorIconsHtml = "";
    (this.config.door_sensors || []).forEach(dsId => {
      const ds = hass.states[dsId];
      if (!ds) return;
      const dsState = ds.state;
      const dsColor = dsState === "on" ? "#ff4136" : "#2ecc40";
      const dsIcon = dsState === "on" ? "mdi:door-open" : "mdi:door-closed";
      const name = ds.attributes?.friendly_name || dsId;
      doorIconsHtml += `<div title="${name}: ${dsState}" style="display:flex;align-items:center;gap:6px;padding-left:2px;padding-right:2px;"><ha-icon icon="${dsIcon}" style="color:${dsColor}; --mdc-icon-size:26px;"></ha-icon></div>`;
    });
    return doorIconsHtml;
  }

  _renderTempsHtml(hass) {
    let tempsHtml = "";
    tempsHtml += `<div style="border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:6px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;">`;
    this.config.temperature_entities.forEach(item => {
      const entity = hass.states[item.entity];
      if (!entity) return;
      const name = item.name || entity.attributes.friendly_name || item.entity;
      const rawState = entity.state;
      let temp = rawState;
      const parsed = parseFloat(rawState);
      if (!Number.isNaN(parsed)) temp = parsed.toFixed(1);
      const unit = entity.attributes.unit_of_measurement || "";
      const icon = item.icon;
      const iconColor = item.icon_color || item.color || "#2b2b2b";
      let badgeHtml = "";
      if (icon) {
        badgeHtml = `<div style="width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:${iconColor};flex-shrink:0;"><ha-icon icon="${icon}" style="color:#fff; --mdc-icon-size:20px;"></ha-icon></div>`;
      }
      const contentGap = icon ? 'gap:10px' : 'gap:0px';
      // add class and data-entity for attaching click handlers later
      tempsHtml += `<div class="homely-temp" data-entity="${item.entity}" title="Åpne graf for ${name}" style="padding:4px 0;border-radius:8px;display:flex;align-items:center;${contentGap};background:transparent;cursor:pointer;">${badgeHtml}<div style="display:flex;flex-direction:column;gap:2px;"><span style="color:#fff;font-weight:700;font-size:0.95rem;line-height:1;">${name}</span><span style="color:#ddd;font-weight:600;font-size:0.95rem;line-height:1;">${temp} ${unit}</span></div></div>`;
    });
    tempsHtml += `</div>`;
    return tempsHtml;
  }

  set hass(hass) {
    // samle og render ved å bruke hjelpefunksjoner
    const { alarmIcon, color, alarmStatusText } = this._getAlarmInfo(hass);
    const batteryIconsHtml = this._renderBatteryHtml(hass);
    const wsHtml = this._renderWebsocketHtml(hass);
    const motionIconsHtml = this._renderMotionHtml(hass);
    const doorIconsHtml = this._renderDoorHtml(hass);
    const tempsHtml = this._renderTempsHtml(hass);

    const iconRowHtml = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:4px;padding-top:0px;">
        <ha-icon icon="${alarmIcon}" style="color:${color}; --mdc-icon-size:44px;"></ha-icon>
        <div style="display:flex;flex-direction:column;">
          <div style="font-size:1.1rem;color:#ddd;margin-bottom:4px;">Alarm</div>
          <div style="font-size:1.8rem;font-weight:800;color:#fff;letter-spacing:1px;text-shadow:0 2px 6px #0008;">${alarmStatusText}</div>
        </div>
      </div>
    `;

    // --- Render kort ---
    this.innerHTML = `
      <ha-card>
        <div class="card-content" style="position:relative; overflow:visible; padding: 5px;">
          <div style="padding-top:10px;padding-left:25px;">${iconRowHtml}</div>
          <div style="position:absolute;top:12px;right:20px;display:flex;flex-direction:column;align-items:flex-end;gap:8px;">
            <div style="display:flex;align-items:center;justify-content:flex-end;gap:0px;">${motionIconsHtml}${batteryIconsHtml}${wsHtml}</div>
              <div style="display:flex;align-items:center;justify-content:flex-end;gap:12px;">${doorIconsHtml}</div>
            </div>
          <div style="padding-top:6px;">${tempsHtml}</div>
        </div>
      </ha-card>
    `;

    // Attach click handlers to temperature items to open the more-info (history/graph)
    try {
      const tempEls = this.querySelectorAll('.homely-temp');
      tempEls.forEach(el => {
        // assign onclick to avoid stacking multiple listeners on repeated hass updates
        el.onclick = (e) => {
          const entityId = el.getAttribute('data-entity');
          if (!entityId) return;
          this.dispatchEvent(new CustomEvent('hass-more-info', { bubbles: true, composed: true, detail: { entityId } }));
        };
      });
    } catch (err) {
      // defensive: do nothing if DOM isn't ready
      console.warn('homely-card: could not attach temp click handlers', err);
    }
  }

  getCardSize() {
    const temps = this.config.temperature_entities?.length || 0;
    const tempRows = Math.ceil(temps / 3); // 3 items per row in the grid
    let count = 1 + tempRows; // base row + temperature rows
    if (this.config.battery_sensor) count += 1;
    return count;
  }
}

try {
  console.log('homely-card: registering element');
  customElements.define("homely-card", HomelyCard);
  console.log('homely-card: successfully registered');
} catch (e) {
  console.error('homely-card: failed to register element', e);
}
