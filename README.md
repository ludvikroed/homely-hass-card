Made by GPT-codex

This project was created primarily for my own Home Assistant setup. It hasn’t been widely tested outside my environment, so things may not work perfectly for everyone. If you find it useful, feel free to use it.

![IMG_0030](https://github.com/user-attachments/assets/369821ab-19a1-481a-8b8c-8c3d63b54df2)

Dark mode is required for the card to show correctly
## My configuration

```yaml
type: custom:homely-card

alarm_entity: alarm_control_panel.jf23_alarm

lock_entities:
  - lock.las_hovedetasje
  - lock.las_treningsrom

battery_sensor: binary_sensor.status_of_batteries_2
websocket_entity: sensor.jf23_websocket_status

temperature_entities:
  - entity: sensor.utetemperatur_utetempratur
    name: Ute
    icon: mdi:home
    color: "#00BFFF"
  - entity: sensor.hytte_temperatur
    name: Hytta
    icon: mdi:snowflake
    color: "#FF8C00"
  - entity: sensor.garasjeport_temperature
    name: Garasje
    icon: mdi:garage
    color: "#7F8C8D"
  - entity: sensor.royk_ludvik_temperature_2
    name: Ludvik
    icon: mdi:bed
    color: "#FFA500"
  - entity: sensor.royk_foreldre_temperature_2
    name: Ingrid & OJ
    icon: mdi:bed
    color: "#4CAF50"
  - entity: sensor.royk_nora_temperature_2
    name: Nora
    icon: mdi:bed
    color: "#FF6B6B"
  - entity: sensor.royk_treningsrom_temperature_2
    name: Treningsrom
    icon: mdi:bicycle
    color: "#2196F3"
  - entity: sensor.royk_stue_temperature_2
    name: Stue
    icon: mdi:sofa
    color: "#FFD700"
  - entity: sensor.royk_hybel_temperature_2
    name: Hybel
    icon: mdi:cash-100
    color: "#8E44AD"

door_sensors:
  - binary_sensor.dor_hovedetasje_alarm
  - binary_sensor.dor_treningsrom_alarm
  - binary_sensor.dor_vaskerom_alarm
  - binary_sensor.dor_veranda_alarm

motion_sensors:
  - binary_sensor.bevegelse_stue_alarm
  - binary_sensor.bevegelse_treningsrom_alarm
```
