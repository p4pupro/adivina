(function () {
  "use strict";

  var LANG_KEY = "adivina-lang";
  var lang = "en";

  var UI = {
    en: {
      docTitle: "Guess the word",
      metaDescription: "A picture guessing game for young children.",
      h1: "What is it?",
      splashTitle: "Guess the word!",
      splashHint: "Tap the word that goes with the big picture.",
      playButton: "Play!",
      roundInstruction: "Pick the right word.",
      statusGood: "Nice!",
      statusTryAgain: "Try again!",
      scoreLabel: "points",
      scoreDisplayAria: "{n} correct answers",
      chooseAria: "Choose: {word}",
      pictureAria: "Picture to guess: {word}",
      symbolAria: "Symbol to guess: {word}",
      loadErrorBtn: "Unavailable",
      loadErrorHint: "Could not load the game. Check your connection and reload.",
      loadErrorStatus: "Error loading data.",
      langGroup: "Language",
    },
    es: {
      docTitle: "Adivina la palabra",
      metaDescription: "Un juego de imágenes para niños pequeños.",
      h1: "¿Qué es?",
      splashTitle: "¡Adivina la palabra!",
      splashHint: "Toca la palabra que va con la imagen grande.",
      playButton: "¡Jugar!",
      roundInstruction: "Elige la palabra correcta.",
      statusGood: "¡Muy bien!",
      statusTryAgain: "¡Otra vez!",
      scoreLabel: "puntos",
      scoreDisplayAria: "{n} respuestas correctas",
      chooseAria: "Elegir: {word}",
      pictureAria: "Imagen para adivinar la palabra: {word}",
      symbolAria: "Símbolo para adivinar la palabra: {word}",
      loadErrorBtn: "No disponible",
      loadErrorHint: "No se pudo cargar el juego. Comprueba la conexión y recarga.",
      loadErrorStatus: "Error al cargar datos.",
      langGroup: "Idioma",
    },
  };

  var words = [];
  var deck = [];
  var deckIndex = 0;
  var lastTargetId = null;
  var current = null;
  var distractor = null;
  var correctId = null;
  var score = 0;
  var audioCtx = null;
  var started = false;
  var busy = false;
  var loadFailed = false;
  var speechVoicesCached = [];

  var el = {
    splash: document.getElementById("splash"),
    game: document.getElementById("game"),
    btnStart: document.getElementById("btn-start"),
    picture: document.getElementById("picture"),
    pictureFallback: document.getElementById("picture-fallback"),
    pictureFrame: document.getElementById("picture-frame"),
    choiceA: document.getElementById("choice-a"),
    choiceB: document.getElementById("choice-b"),
    status: document.getElementById("status"),
    scoreDisplay: document.getElementById("score-display"),
    scoreValue: document.getElementById("score-value"),
    scoreLabel: document.getElementById("score-label"),
    confettiRoot: document.getElementById("confetti-root"),
    langSwitch: document.getElementById("lang-switch"),
    langEn: document.getElementById("lang-en"),
    langEs: document.getElementById("lang-es"),
    uiH1: document.getElementById("ui-h1"),
    splashTitle: document.getElementById("splash-title"),
    splashHint: document.getElementById("splash-hint"),
    roundInstruction: document.getElementById("round-instruction"),
    metaDesc: document.getElementById("meta-desc"),
  };

  function tr(template, map) {
    var s = template;
    if (map) {
      Object.keys(map).forEach(function (k) {
        s = s.split("{" + k + "}").join(String(map[k]));
      });
    }
    return s;
  }

  function t(key) {
    var pack = UI[lang] || UI.en;
    return pack[key] != null ? pack[key] : UI.en[key];
  }

  function labelFor(w) {
    if (!w) return "";
    if (lang === "es") return w.label_es || w.label_en || "";
    return w.label_en || w.label_es || "";
  }

  function wordById(id) {
    for (var i = 0; i < words.length; i++) {
      if (words[i].id === id) return words[i];
    }
    return null;
  }

  function applyLanguage() {
    document.documentElement.lang = lang === "es" ? "es" : "en";
    document.title = t("docTitle");
    if (el.metaDesc) el.metaDesc.setAttribute("content", t("metaDescription"));
    if (el.uiH1) el.uiH1.textContent = t("h1");
    if (el.splashTitle) el.splashTitle.textContent = t("splashTitle");
    if (el.splashHint) el.splashHint.textContent = t("splashHint");
    if (loadFailed) {
      if (el.btnStart) el.btnStart.textContent = t("loadErrorBtn");
      if (el.splashHint) el.splashHint.textContent = t("loadErrorHint");
      el.status.textContent = t("loadErrorStatus");
    } else if (el.btnStart && !el.btnStart.disabled) {
      el.btnStart.textContent = t("playButton");
    }
    if (el.roundInstruction) el.roundInstruction.textContent = t("roundInstruction");
    if (el.langSwitch) el.langSwitch.setAttribute("aria-label", t("langGroup"));

    if (el.langEn) {
      el.langEn.classList.toggle("lang-btn--active", lang === "en");
      el.langEn.setAttribute("aria-pressed", lang === "en" ? "true" : "false");
    }
    if (el.langEs) {
      el.langEs.classList.toggle("lang-btn--active", lang === "es");
      el.langEs.setAttribute("aria-pressed", lang === "es" ? "true" : "false");
    }

    if (el.scoreLabel) el.scoreLabel.textContent = t("scoreLabel");
    updateScoreDisplay();
    refreshRoundLabels();
    updatePictureFrameAria();
  }

  function refreshRoundLabels() {
    if (!started || !words.length) return;
    var idA = el.choiceA && el.choiceA.dataset.wordId;
    var idB = el.choiceB && el.choiceB.dataset.wordId;
    if (!idA || !idB) return;
    var wa = wordById(idA);
    var wb = wordById(idB);
    if (!wa || !wb) return;
    el.choiceA.textContent = labelFor(wa);
    el.choiceB.textContent = labelFor(wb);
    el.choiceA.setAttribute("aria-label", tr(t("chooseAria"), { word: labelFor(wa) }));
    el.choiceB.setAttribute("aria-label", tr(t("chooseAria"), { word: labelFor(wb) }));
  }

  function updatePictureFrameAria() {
    if (!current || !el.pictureFrame) return;
    var lbl = labelFor(current);
    if (el.pictureFallback && !el.pictureFallback.hidden) {
      el.pictureFrame.setAttribute("aria-label", tr(t("symbolAria"), { word: lbl }));
    } else {
      el.pictureFrame.setAttribute("aria-label", tr(t("pictureAria"), { word: lbl }));
    }
  }

  function setLang(next) {
    if (next !== "en" && next !== "es") return;
    lang = next;
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch (e) {
      /* ignore */
    }
    applyLanguage();
  }

  function initLangFromStorage() {
    try {
      var s = localStorage.getItem(LANG_KEY);
      if (s === "es" || s === "en") lang = s;
    } catch (e) {
      /* ignore */
    }
  }

  function refreshSpeechVoices() {
    if (!window.speechSynthesis) return;
    speechVoicesCached = speechSynthesis.getVoices() || [];
  }

  function normLang(l) {
    return (l || "").toLowerCase().replace(/_/g, "-");
  }

  function pickSpeechVoice() {
    var voices = speechVoicesCached;
    if (!voices.length) return null;
    var i;
    var v;
    var l;
    if (lang === "es") {
      for (i = 0; i < voices.length; i++) {
        v = voices[i];
        l = normLang(v.lang);
        if (l.indexOf("es-es") === 0) return v;
      }
      for (i = 0; i < voices.length; i++) {
        v = voices[i];
        if (normLang(v.lang).indexOf("es") === 0) return v;
      }
      return null;
    }
    for (i = 0; i < voices.length; i++) {
      v = voices[i];
      l = normLang(v.lang);
      if (l.indexOf("en-gb") === 0) return v;
    }
    for (i = 0; i < voices.length; i++) {
      v = voices[i];
      l = normLang(v.lang);
      if (l.indexOf("en-us") === 0) return v;
    }
    for (i = 0; i < voices.length; i++) {
      v = voices[i];
      if (normLang(v.lang).indexOf("en") === 0) return v;
    }
    return null;
  }

  function speakWord(text) {
    if (!text || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      var voice = pickSpeechVoice();
      if (voice) {
        u.voice = voice;
        u.lang = voice.lang || (lang === "es" ? "es-ES" : "en-GB");
      } else {
        u.lang = lang === "es" ? "es-ES" : "en-GB";
      }
      u.rate = 0.92;
      u.pitch = 1.02;
      window.speechSynthesis.speak(u);
    } catch (e) {
      console.warn(e);
    }
  }

  function shufflePair(a, b) {
    return Math.random() < 0.5 ? [a, b] : [b, a];
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function fisherYatesIndices(n) {
    var arr = [];
    var i;
    for (i = 0; i < n; i++) arr.push(i);
    for (i = n - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr;
  }

  function fixDeckFirstNotLast() {
    if (!lastTargetId || words.length < 2) return;
    if (words[deck[0]].id === lastTargetId) {
      var k;
      for (k = 1; k < deck.length; k++) {
        if (words[deck[k]].id !== lastTargetId) {
          var tmp = deck[0];
          deck[0] = deck[k];
          deck[k] = tmp;
          break;
        }
      }
    }
  }

  function buildDeckShuffle() {
    deck = fisherYatesIndices(words.length);
    deckIndex = 0;
    fixDeckFirstNotLast();
  }

  function pickNextWord() {
    if (!words.length) return null;
    if (deck.length !== words.length) {
      buildDeckShuffle();
    }
    if (deckIndex >= deck.length) {
      buildDeckShuffle();
    }
    var idx = deck[deckIndex];
    if (lastTargetId && words.length > 1 && words[idx].id === lastTargetId) {
      var swapped = false;
      var k;
      for (k = deckIndex + 1; k < deck.length; k++) {
        if (words[deck[k]].id !== lastTargetId) {
          var tmp = deck[deckIndex];
          deck[deckIndex] = deck[k];
          deck[k] = tmp;
          idx = deck[deckIndex];
          swapped = true;
          break;
        }
      }
      if (!swapped) {
        buildDeckShuffle();
        idx = deck[deckIndex];
      }
    }
    deckIndex += 1;
    return words[idx];
  }

  function pickDistractor(target, all) {
    var same = all.filter(function (w) {
      return w.category === target.category && w.id !== target.id;
    });
    var pool = same.length ? same : all.filter(function (w) {
      return w.id !== target.id;
    });
    if (!pool.length) return null;
    return pickRandom(pool);
  }

  function ensureAudio() {
    if (audioCtx) return audioCtx;
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
    return audioCtx;
  }

  function resumeAudio() {
    var ctx = ensureAudio();
    if (ctx && ctx.state === "suspended") {
      ctx.resume();
    }
    return ctx;
  }

  function beep(ctx, freq, duration, type, gainValue) {
    if (!ctx) return;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(gainValue || 0.2, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration + 0.05);
  }

  function playSuccess() {
    var ctx = resumeAudio();
    if (!ctx) return;
    beep(ctx, 523.25, 0.12, "sine", 0.22);
    setTimeout(function () {
      beep(ctx, 659.25, 0.12, "sine", 0.2);
    }, 100);
    setTimeout(function () {
      beep(ctx, 783.99, 0.2, "sine", 0.18);
    }, 200);
  }

  function playSoftWrong() {
    var ctx = resumeAudio();
    if (!ctx) return;
    beep(ctx, 220, 0.18, "triangle", 0.12);
  }

  var confettiColors = ["#ff8c42", "#3cb878", "#5b9bd5", "#ffd23f", "#e85d75", "#9b59b6"];

  function launchConfetti() {
    var root = el.confettiRoot;
    if (!root) return;
    root.innerHTML = "";
    var n = 18;
    for (var i = 0; i < n; i++) {
      var p = document.createElement("div");
      p.className = "confetti-piece";
      p.style.left = Math.random() * 100 + "%";
      p.style.backgroundColor = confettiColors[i % confettiColors.length];
      p.style.setProperty("--dur", 1.1 + Math.random() * 0.8 + "s");
      p.style.animationDelay = Math.random() * 0.25 + "s";
      p.style.transform = "rotate(" + Math.random() * 360 + "deg)";
      root.appendChild(p);
    }
    setTimeout(function () {
      root.innerHTML = "";
    }, 2200);
  }

  /** Fila de 5 estrellas: se encienden 1..5 en ciclo; el número total sigue en #score-value. */
  function litStarsInCycle() {
    if (score <= 0) return 0;
    return ((score - 1) % 5) + 1;
  }

  function updateScoreDisplay(triggerPop) {
    if (el.scoreValue) el.scoreValue.textContent = String(score);
    if (el.scoreDisplay) {
      el.scoreDisplay.setAttribute(
        "aria-label",
        tr(t("scoreDisplayAria"), { n: score })
      );
    }
    var filled = litStarsInCycle();
    var stars = document.querySelectorAll(".score-star");
    var i;
    for (i = 0; i < stars.length; i++) {
      stars[i].classList.toggle("score-star--lit", i < filled);
    }
    if (triggerPop && el.scoreValue) {
      el.scoreValue.classList.remove("score-display__value--pop");
      void el.scoreValue.offsetWidth;
      el.scoreValue.classList.add("score-display__value--pop");
      setTimeout(function () {
        if (el.scoreValue) el.scoreValue.classList.remove("score-display__value--pop");
      }, 450);
    }
  }

  function setPicture(item) {
    el.picture.alt = "";
    el.picture.hidden = false;
    el.pictureFallback.hidden = true;
    el.picture.src = item.image;
    updatePictureFrameAria();
  }

  function showEmojiFallback(item) {
    el.picture.hidden = true;
    el.picture.removeAttribute("src");
    el.picture.alt = "";
    el.pictureFallback.textContent = item.emoji || "❓";
    el.pictureFallback.hidden = false;
    updatePictureFrameAria();
  }

  function clearAnimations() {
    el.pictureFrame.classList.remove("picture-frame--celebrate", "picture-frame--shake");
    el.choiceA.classList.remove("choice--correct-flash");
    el.choiceB.classList.remove("choice--correct-flash");
  }

  function nextRound() {
    if (!words.length) return;
    clearAnimations();
    busy = false;
    current = pickNextWord();
    if (!current) return;
    distractor = pickDistractor(current, words);
    if (!distractor) {
      distractor = words[0].id === current.id ? words[1] : words[0];
    }
    correctId = current.id;

    var pair = shufflePair(current, distractor);
    el.choiceA.dataset.wordId = pair[0].id;
    el.choiceB.dataset.wordId = pair[1].id;
    el.choiceA.textContent = labelFor(pair[0]);
    el.choiceB.textContent = labelFor(pair[1]);
    el.choiceA.disabled = false;
    el.choiceB.disabled = false;
    el.choiceA.setAttribute("aria-label", tr(t("chooseAria"), { word: labelFor(pair[0]) }));
    el.choiceB.setAttribute("aria-label", tr(t("chooseAria"), { word: labelFor(pair[1]) }));

    setPicture(current);
    el.status.textContent = "";
    lastTargetId = current.id;
  }

  function onImageError() {
    if (current) showEmojiFallback(current);
  }

  function handleChoice(btn) {
    if (busy || !started) return;
    var id = btn.dataset.wordId;
    if (!id) return;

    resumeAudio();

    if (id === correctId) {
      busy = true;
      el.choiceA.disabled = true;
      el.choiceB.disabled = true;
      score += 1;
      updateScoreDisplay(true);
      el.status.textContent = t("statusGood");
      el.pictureFrame.classList.add("picture-frame--celebrate");
      if (btn.classList) btn.classList.add("choice--correct-flash");
      playSuccess();
      if (current) speakWord(labelFor(current));
      launchConfetti();
      setTimeout(function () {
        el.game.classList.add("game--fade");
        setTimeout(function () {
          el.game.classList.remove("game--fade");
          nextRound();
        }, 220);
      }, 900);
    } else {
      el.pictureFrame.classList.remove("picture-frame--shake");
      void el.pictureFrame.offsetWidth;
      el.pictureFrame.classList.add("picture-frame--shake");
      playSoftWrong();
      el.status.textContent = t("statusTryAgain");
    }
  }

  function start() {
    if (started) return;
    started = true;
    resumeAudio();
    document.body.classList.add("is-playing");
    el.splash.hidden = true;
    el.splash.setAttribute("aria-hidden", "true");
    el.game.hidden = false;
    el.game.removeAttribute("aria-hidden");
    nextRound();
  }

  function loadWords() {
    return fetch("data/words.json")
      .then(function (r) {
        if (!r.ok) throw new Error("load fail");
        return r.json();
      })
      .then(function (data) {
        words = data;
        if (!words.length) throw new Error("empty");
        deck = [];
        deckIndex = 0;
        lastTargetId = null;
      });
  }

  el.picture.addEventListener("error", onImageError);
  el.btnStart.addEventListener("click", start);
  el.choiceA.addEventListener("click", function () {
    handleChoice(el.choiceA);
  });
  el.choiceB.addEventListener("click", function () {
    handleChoice(el.choiceB);
  });

  if (el.langEn) {
    el.langEn.addEventListener("click", function () {
      setLang("en");
    });
  }
  if (el.langEs) {
    el.langEs.addEventListener("click", function () {
      setLang("es");
    });
  }

  initLangFromStorage();
  applyLanguage();

  if (window.speechSynthesis) {
    refreshSpeechVoices();
    window.speechSynthesis.onvoiceschanged = function () {
      refreshSpeechVoices();
    };
    setTimeout(refreshSpeechVoices, 500);
    setTimeout(refreshSpeechVoices, 1500);
  }

  loadWords().catch(function (err) {
    loadFailed = true;
    applyLanguage();
    if (el.btnStart) el.btnStart.disabled = true;
    console.error(err);
  });

})();
