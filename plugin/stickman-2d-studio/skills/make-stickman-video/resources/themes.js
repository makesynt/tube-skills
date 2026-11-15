/* Stickman 2D Studio — 5 Built-in Cinema Theme Presets */
(function () {
  "use strict";

  window.STICKMAN_THEMES = {
    dusk: {
      id: "dusk",
      label: "Dusk 微光暮色 (@IfHumans 暗调光影风)",
      skyStops: [[0.0, "#1d152d"], [0.48, "#523255"], [0.80, "#b86b58"], [1.0, "#f0b67f"]],
      rimPrimary: "#f6bc80",
      accent: "#f4c476",
      dataStageBg: "#070d19",
      hudStyle: "cinema-letterbox"
    },
    midnight: {
      id: "midnight",
      label: "Midnight 午夜深蓝 (硬核悬疑推理风)",
      skyStops: [[0.0, "#050914"], [0.55, "#0f1e3a"], [0.85, "#1d3557"], [1.0, "#3a5a78"]],
      rimPrimary: "#90caf9",
      accent: "#64b5f6",
      dataStageBg: "#040812",
      hudStyle: "cinema-letterbox"
    },
    golden: {
      id: "golden",
      label: "Golden 暖金琥珀 (@Otherwisetale 顶部黄字计数风)",
      skyStops: [[0.0, "#1c1610"], [0.52, "#4a351d"], [0.84, "#9c6b2e"], [1.0, "#f5be58"]],
      rimPrimary: "#ffd166",
      accent: "#ffbe0b",
      dataStageBg: "#120e08",
      hudStyle: "top-yellow-counter"
    },
    neon: {
      id: "neon",
      label: "Neon 赛博霓虹 (@JeremyBearimy 头顶状态框风)",
      skyStops: [[0.0, "#09061a"], [0.50, "#1b1140"], [0.85, "#3b1c63"], [1.0, "#6d28d9"]],
      rimPrimary: "#38bdf8",
      accent: "#22d3ee",
      dataStageBg: "#070514",
      hudStyle: "overhead-rpg-tag"
    },
    storybook: {
      id: "storybook",
      label: "Storybook 暖感绘本 (治愈寓言科普风)",
      skyStops: [[0.0, "#232938"], [0.52, "#3d4a5d"], [0.85, "#83766a"], [1.0, "#d8b48e"]],
      rimPrimary: "#ffe3b3",
      accent: "#f4a261",
      dataStageBg: "#111622",
      hudStyle: "soft-caption"
    }
  };
})();
