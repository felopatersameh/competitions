/**
 * Anti Gravity — Quiz Game Application
 * Pure Vanilla JavaScript (No frameworks, No Backend)
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. Constants & Category Styling
  // =========================================================================
  const STORAGE_KEY = 'antigravity_quiz_state_v2';

  const CATEGORY_META = {
    'كرة قدم': { icon: '⚽', color: '#10b981', dark: '#047857' },
    'جغرافيا': { icon: '🌍', color: '#0284c7', dark: '#0369a1' },
    'علوم ومعلومات عامة': { icon: '🔬', color: '#8b5cf6', dark: '#6d28d9' },
    'تاريخ': { icon: '🏛️', color: '#f59e0b', dark: '#b45309' },
    'سياسة ومواطنة': { icon: '⚖️', color: '#06b6d4', dark: '#0e7490' },
    'كتاب مقدس': { icon: '📜', color: '#eab308', dark: '#a16207' },
    'طقسية قبطية أرثوذكسية': { icon: '⛪', color: '#f43f5e', dark: '#be123c' }
  };

  const DEFAULT_CAT_META = { icon: '🎯', color: '#38bdf8', dark: '#0284c7' };

  // Choice letters for Arabic display
  const CHOICE_LETTERS = ['أ', 'ب', 'ج', 'د'];

  // =========================================================================
  // 2. Application State
  // =========================================================================
  const state = {
    usedQuestionIds: [],        // IDs of questions that are completed or skipped
    skippedQuestionIds: [],     // IDs of questions that were skipped
    currentQuestionId: null,    // Currently active question ID (number or null)
    questionStatus: 'available',// 'available' | 'selected' | 'opened' | 'running' | 'paused' | 'time_up' | 'completed' | 'skipped'
    remainingTime: 0,           // Seconds left
    initialTime: 0,             // Total seconds for current question
    usedHint: false,
    usedChoices: false,
    usedEliminateTwo: false,
    usedAskTeacher: false,
    currentChoiceOrder: [],     // Array of 4 objects: [{ id, text, isCorrect }]
    eliminatedChoiceIndices: [],// Array of indices in currentChoiceOrder that were eliminated
    history: [],                // Array of { id, category, points, status: 'completed'|'skipped', timestamp }
    soundEnabled: true,
    wheelAngle: 0               // Current wheel rotation angle in radians
  };

  // Runtime Timer & Animation handles (not persisted)
  let timerInterval = null;
  let timerEndTime = null;
  let isSpinning = false;
  let activeModal = null;
  let audioCtx = null;
  let wheelSegments = [];
  let lastTickSegment = -1;

  // DOM Elements cache
  const dom = {};

  // =========================================================================
  // 3. Audio Synthesizer (Web Audio API)
  // =========================================================================
  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtx = new AudioContext();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playTone(freq, duration, type = 'sine', gainVal = 0.15) {
    if (!state.soundEnabled) return;
    try {
      initAudio();
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(gainVal, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Audio not permitted yet
    }
  }

  function soundTick() {
    playTone(550, 0.05, 'triangle', 0.1);
  }

  function soundWheelStop() {
    if (!state.soundEnabled) return;
    setTimeout(() => playTone(523.25, 0.18, 'sine', 0.2), 0);
    setTimeout(() => playTone(659.25, 0.18, 'sine', 0.2), 120);
    setTimeout(() => playTone(783.99, 0.35, 'triangle', 0.25), 240);
  }

  function soundTimerWarning() {
    playTone(880, 0.09, 'square', 0.12);
  }

  function soundTimeUp() {
    if (!state.soundEnabled) return;
    setTimeout(() => playTone(440, 0.2, 'sawtooth', 0.25), 0);
    setTimeout(() => playTone(370, 0.2, 'sawtooth', 0.25), 180);
    setTimeout(() => playTone(293.66, 0.5, 'sawtooth', 0.3), 360);
  }

  function soundHelper() {
    if (!state.soundEnabled) return;
    setTimeout(() => playTone(600, 0.1, 'sine', 0.15), 0);
    setTimeout(() => playTone(900, 0.2, 'sine', 0.2), 100);
  }

  function soundEliminate() {
    if (!state.soundEnabled) return;
    playTone(320, 0.15, 'sawtooth', 0.15);
  }

  // =========================================================================
  // 4. Questions Validation (Mandatory check per spec)
  // =========================================================================
  function validateQuestions() {
    if (typeof QUESTIONS === 'undefined' || !Array.isArray(QUESTIONS)) {
      console.error('CRITICAL: QUESTIONS array is not defined or is not an array.');
      return false;
    }

    if (QUESTIONS.length !== 100) {
      console.error(`Validation Error: QUESTIONS length is ${QUESTIONS.length}, expected 100.`);
      return false;
    }

    const ids = new Set();
    const allowedPoints = [5, 10, 15, 20];
    let errors = [];

    QUESTIONS.forEach((q, idx) => {
      const qNum = idx + 1;
      if (!q.id || typeof q.id !== 'number' || ids.has(q.id)) {
        errors.push(`Question #${qNum}: invalid or duplicate id (${q.id})`);
      }
      ids.add(q.id);

      if (!q.category || typeof q.category !== 'string' || q.category.trim() === '') {
        errors.push(`Question #${qNum} (ID: ${q.id}): empty category`);
      }

      if (!allowedPoints.includes(q.points)) {
        errors.push(`Question #${qNum} (ID: ${q.id}): points ${q.points} not in [5, 10, 15, 20]`);
      }

      if (typeof q.time !== 'number' || q.time < 15 || q.time > 50) {
        errors.push(`Question #${qNum} (ID: ${q.id}): time ${q.time} out of bounds [15, 50]`);
      }

      if (!q.question || typeof q.question !== 'string' || q.question.trim() === '') {
        errors.push(`Question #${qNum} (ID: ${q.id}): empty question text`);
      }

      if (!q.answer || typeof q.answer !== 'string' || q.answer.trim() === '') {
        errors.push(`Question #${qNum} (ID: ${q.id}): empty answer text`);
      }

      if (!q.hint || typeof q.hint !== 'string' || q.hint.trim() === '') {
        errors.push(`Question #${qNum} (ID: ${q.id}): empty hint text`);
      }

      if (!Array.isArray(q.choices) || q.choices.length !== 4) {
        errors.push(`Question #${qNum} (ID: ${q.id}): choices must be an array of 4 items`);
      } else {
        const choiceSet = new Set(q.choices);
        if (choiceSet.size !== 4) {
          errors.push(`Question #${qNum} (ID: ${q.id}): duplicate choices detected: ${JSON.stringify(q.choices)}`);
        }
        q.choices.forEach((c, cIdx) => {
          if (!c || typeof c !== 'string' || c.trim() === '') {
            errors.push(`Question #${qNum} (ID: ${q.id}): choice #${cIdx} is empty`);
          }
        });
      }

      if (typeof q.correctChoiceIndex !== 'number' || q.correctChoiceIndex < 0 || q.correctChoiceIndex > 3) {
        errors.push(`Question #${qNum} (ID: ${q.id}): correctChoiceIndex ${q.correctChoiceIndex} is not in [0..3]`);
      } else if (q.choices && q.choices[q.correctChoiceIndex] !== q.answer) {
        errors.push(`Question #${qNum} (ID: ${q.id}): choices[${q.correctChoiceIndex}] ("${q.choices[q.correctChoiceIndex]}") does not match answer ("${q.answer}")`);
      }
    });

    if (errors.length > 0) {
      console.error(`Questions validation failed with ${errors.length} errors:`, errors);
      return false;
    }

    console.log('✅ All 100 questions validated successfully!');
    return true;
  }

  // =========================================================================
  // 5. State Management & LocalStorage
  // =========================================================================
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.usedQuestionIds)) state.usedQuestionIds = parsed.usedQuestionIds;
        if (Array.isArray(parsed.skippedQuestionIds)) state.skippedQuestionIds = parsed.skippedQuestionIds;
        if (typeof parsed.currentQuestionId === 'number' || parsed.currentQuestionId === null) {
          state.currentQuestionId = parsed.currentQuestionId;
        }
        if (typeof parsed.questionStatus === 'string') state.questionStatus = parsed.questionStatus;
        if (typeof parsed.remainingTime === 'number') state.remainingTime = parsed.remainingTime;
        if (typeof parsed.initialTime === 'number') state.initialTime = parsed.initialTime;
        if (typeof parsed.usedHint === 'boolean') state.usedHint = parsed.usedHint;
        if (typeof parsed.usedChoices === 'boolean') state.usedChoices = parsed.usedChoices;
        if (typeof parsed.usedEliminateTwo === 'boolean') state.usedEliminateTwo = parsed.usedEliminateTwo;
        if (typeof parsed.usedAskTeacher === 'boolean') state.usedAskTeacher = parsed.usedAskTeacher;
        if (Array.isArray(parsed.currentChoiceOrder)) state.currentChoiceOrder = parsed.currentChoiceOrder;
        if (Array.isArray(parsed.eliminatedChoiceIndices)) state.eliminatedChoiceIndices = parsed.eliminatedChoiceIndices;
        if (Array.isArray(parsed.history)) state.history = parsed.history;
        if (typeof parsed.soundEnabled === 'boolean') state.soundEnabled = parsed.soundEnabled;
        if (typeof parsed.wheelAngle === 'number') state.wheelAngle = parsed.wheelAngle;
      }
    } catch (e) {
      console.warn('Failed to load state from localStorage:', e);
    }
  }

  function saveState() {
    try {
      const payload = {
        usedQuestionIds: state.usedQuestionIds,
        skippedQuestionIds: state.skippedQuestionIds,
        currentQuestionId: state.currentQuestionId,
        questionStatus: state.questionStatus,
        remainingTime: state.remainingTime,
        initialTime: state.initialTime,
        usedHint: state.usedHint,
        usedChoices: state.usedChoices,
        usedEliminateTwo: state.usedEliminateTwo,
        usedAskTeacher: state.usedAskTeacher,
        currentChoiceOrder: state.currentChoiceOrder,
        eliminatedChoiceIndices: state.eliminatedChoiceIndices,
        history: state.history,
        soundEnabled: state.soundEnabled,
        wheelAngle: state.wheelAngle
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('Failed to save state to localStorage:', e);
    }
  }

  function resetGame() {
    stopTimer();
    state.usedQuestionIds = [];
    state.skippedQuestionIds = [];
    state.currentQuestionId = null;
    state.questionStatus = 'available';
    state.remainingTime = 0;
    state.initialTime = 0;
    state.usedHint = false;
    state.usedChoices = false;
    state.usedEliminateTwo = false;
    state.usedAskTeacher = false;
    state.currentChoiceOrder = [];
    state.eliminatedChoiceIndices = [];
    state.history = [];
    state.wheelAngle = 0;
    saveState();

    closeAllModals();
    showView('wheel');
    updateHeaderStats();
    buildWheelSegments();
    renderWheel();
  }

  // =========================================================================
  // 6. Helpers & Utilities
  // =========================================================================
  function getAvailableQuestions() {
    return QUESTIONS.filter(q => !state.usedQuestionIds.includes(q.id));
  }

  function getQuestionById(id) {
    return QUESTIONS.find(q => q.id === id) || null;
  }

  function formatTime(seconds) {
    const s = Math.max(0, Math.floor(seconds));
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function getCategoryMeta(catName) {
    return CATEGORY_META[catName] || DEFAULT_CAT_META;
  }

  // Fisher-Yates shuffle algorithm
  function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // =========================================================================
  // 7. Modals Management
  // =========================================================================
  function openModal(modalEl, isMandatory = false) {
    if (!modalEl) return;
    modalEl.classList.remove('hidden');
    activeModal = modalEl;
    if (isMandatory) {
      modalEl.dataset.mandatory = 'true';
    } else {
      delete modalEl.dataset.mandatory;
    }
  }

  function closeModal(modalEl) {
    if (!modalEl) return;
    modalEl.classList.add('hidden');
    if (activeModal === modalEl) {
      activeModal = null;
    }
  }

  function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
    activeModal = null;
  }

  // =========================================================================
  // 8. Navigation & View Switching
  // =========================================================================
  function showView(viewName) {
    if (viewName === 'wheel') {
      dom.questionView.classList.remove('active');
      dom.questionView.classList.add('hidden');
      dom.wheelView.classList.remove('hidden');
      dom.wheelView.classList.add('active');
      updateWheelView();
    } else if (viewName === 'question') {
      dom.wheelView.classList.remove('active');
      dom.wheelView.classList.add('hidden');
      dom.questionView.classList.remove('hidden');
      dom.questionView.classList.add('active');
      renderQuestionScreen();
    }
  }

  function updateHeaderStats() {
    const available = getAvailableQuestions().length;
    const played = state.usedQuestionIds.length;
    dom.remainingCount.textContent = available;
    dom.playedCount.textContent = played;

    // Update sound icon
    dom.soundIcon.textContent = state.soundEnabled ? '🔊' : '🔇';
    dom.settingsSoundState.textContent = state.soundEnabled ? 'مفعل 🔊' : 'مكتوم 🔇';
  }

  // =========================================================================
  // 9. Wheel Logic & Canvas Rendering
  // =========================================================================
  function buildWheelSegments() {
    const available = getAvailableQuestions();
    const groupMap = new Map();

    available.forEach(q => {
      const key = `${q.category}___${q.points}`;
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          category: q.category,
          points: q.points,
          count: 1
        });
      } else {
        groupMap.get(key).count++;
      }
    });

    wheelSegments = Array.from(groupMap.values());

    // If no questions left, handle empty wheel gracefully
    if (wheelSegments.length === 0) {
      wheelSegments = [
        { category: 'المسابقة', points: 0, count: 0 }
      ];
    }
  }

  function renderWheel() {
    const canvas = dom.wheelCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = width / 2 - 12;

    ctx.clearRect(0, 0, width, height);

    const numSegments = wheelSegments.length;
    const arcSize = (2 * Math.PI) / numSegments;

    // Save context for rotation
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(state.wheelAngle);

    // Draw Slices
    for (let i = 0; i < numSegments; i++) {
      const seg = wheelSegments[i];
      const startAngle = i * arcSize;
      const endAngle = startAngle + arcSize;
      const meta = getCategoryMeta(seg.category);

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startAngle, endAngle);
      ctx.closePath();

      // Alternate brightness / gradient for neighboring slices
      const isEven = i % 2 === 0;
      ctx.fillStyle = isEven ? meta.color : meta.dark;
      ctx.fill();

      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.stroke();

      // Text and Icon Rendering inside slice
      ctx.save();
      const midAngle = startAngle + arcSize / 2;
      ctx.rotate(midAngle);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';

      // Scale text if many segments
      let fontSize = numSegments > 16 ? 13 : numSegments > 10 ? 15 : 17;
      ctx.font = `bold ${fontSize}px Cairo, sans-serif`;

      // Category + points label
      const label = seg.points > 0 ? `${meta.icon} ${seg.category} (${seg.points})` : seg.category;
      ctx.fillText(label, radius - 24, 0);

      ctx.restore();
    }

    // Outer decorative ring
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, 2 * Math.PI);
    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.stroke();

    // Peripheral Golden Pins / Ticks
    for (let i = 0; i < numSegments * 2; i++) {
      const pinAngle = (i * Math.PI) / numSegments;
      const px = Math.cos(pinAngle) * (radius - 4);
      const py = Math.sin(pinAngle) * (radius - 4);

      ctx.beginPath();
      ctx.arc(px, py, 3.5, 0, 2 * Math.PI);
      ctx.fillStyle = '#fde047';
      ctx.shadowColor = 'rgba(251, 191, 36, 0.8)';
      ctx.shadowBlur = 4;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  function updateWheelView() {
    buildWheelSegments();
    renderWheel();
    updateHeaderStats();

    const available = getAvailableQuestions();

    if (available.length === 0 && !state.currentQuestionId) {
      dom.spinBtn.classList.add('hidden');
      dom.selectedCard.classList.add('hidden');
      dom.allFinishedCard.classList.remove('hidden');
      return;
    }

    dom.allFinishedCard.classList.add('hidden');

    if (state.questionStatus === 'selected' && state.currentQuestionId) {
      const q = getQuestionById(state.currentQuestionId);
      if (q) {
        showSelectedQuestionUI(q);
        dom.spinBtn.classList.add('hidden');
        dom.selectedCard.classList.remove('hidden');
        return;
      }
    }

    // Default: ready to spin
    dom.selectedCard.classList.add('hidden');
    dom.spinBtn.classList.remove('hidden');
    dom.spinBtn.disabled = isSpinning;
  }

  function spinWheel() {
    if (isSpinning) return;
    initAudio();

    const available = getAvailableQuestions();
    if (available.length === 0) {
      updateWheelView();
      return;
    }

    // 1. Pick a random available question FIRST (before animation)
    const randomIndex = Math.floor(Math.random() * available.length);
    const selectedQ = available[randomIndex];

    state.currentQuestionId = selectedQ.id;
    state.questionStatus = 'selected';
    saveState();

    // 2. Locate target segment
    buildWheelSegments();
    const targetSegmentIndex = wheelSegments.findIndex(
      seg => seg.category === selectedQ.category && seg.points === selectedQ.points
    );

    const safeSegmentIndex = targetSegmentIndex >= 0 ? targetSegmentIndex : 0;
    const numSegments = wheelSegments.length;
    const arcSize = (2 * Math.PI) / numSegments;

    // Top pointer is at -PI/2 (3*PI/2) in standard canvas coordinates
    // To land slice i at top: wheelAngle + (i * arcSize + arcSize/2) = 3*PI/2 mod 2*PI
    const pointerAngle = (3 * Math.PI) / 2;
    // Add slight random offset inside the segment (within 70% of slice center)
    const randomOffset = (Math.random() - 0.5) * (arcSize * 0.65);
    const targetSegmentCenter = safeSegmentIndex * arcSize + arcSize / 2 + randomOffset;

    // Current angle normalized
    const currentAngle = state.wheelAngle % (2 * Math.PI);
    let targetAngle = pointerAngle - targetSegmentCenter;

    // Ensure we do 4 to 6 full rotations for dramatic effect
    const fullRotations = (4 + Math.floor(Math.random() * 2)) * 2 * Math.PI;
    while (targetAngle < currentAngle) {
      targetAngle += 2 * Math.PI;
    }
    const finalAngle = targetAngle + fullRotations;

    // 3. Animate spinning with cubic easing
    isSpinning = true;
    dom.spinBtn.disabled = true;
    dom.selectedCard.classList.add('hidden');

    const startAngle = state.wheelAngle;
    const totalDistance = finalAngle - startAngle;
    const duration = 3800; // 3.8 seconds
    const startTime = performance.now();
    lastTickSegment = -1;

    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    function animate(now) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const easedProgress = easeOutCubic(progress);

      state.wheelAngle = startAngle + totalDistance * easedProgress;
      renderWheel();

      // Sound tick when passing segment boundaries
      const currentSegment = Math.floor(
        ((pointerAngle - (state.wheelAngle % (2 * Math.PI)) + 4 * Math.PI) % (2 * Math.PI)) / arcSize
      );
      if (currentSegment !== lastTickSegment) {
        soundTick();
        lastTickSegment = currentSegment;
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        state.wheelAngle = finalAngle % (2 * Math.PI);
        isSpinning = false;
        saveState();
        renderWheel();
        soundWheelStop();

        // 4. Reveal Selected Question Card
        showSelectedQuestionUI(selectedQ);
        dom.spinBtn.classList.add('hidden');
        dom.selectedCard.classList.remove('hidden');
      }
    }

    requestAnimationFrame(animate);
  }

  function showSelectedQuestionUI(q) {
    const meta = getCategoryMeta(q.category);
    dom.selectedCategoryIcon.textContent = meta.icon;
    dom.selectedCategoryText.textContent = q.category;
    dom.selectedPointsText.textContent = q.points;
  }

  function cancelSelectedQuestion() {
    if (isSpinning) return;
    // Cancel selected question: returns to available, does NOT count as used
    state.currentQuestionId = null;
    state.questionStatus = 'available';
    saveState();
    updateWheelView();
  }

  // =========================================================================
  // 10. Question Screen Logic & Rendering
  // =========================================================================
  function openQuestion() {
    if (!state.currentQuestionId) return;
    const q = getQuestionById(state.currentQuestionId);
    if (!q) return;

    state.questionStatus = 'opened';
    state.remainingTime = q.time;
    state.initialTime = q.time;
    state.usedHint = false;
    state.usedChoices = false;
    state.usedEliminateTwo = false;
    state.usedAskTeacher = false;
    state.currentChoiceOrder = [];
    state.eliminatedChoiceIndices = [];
    saveState();

    showView('question');
  }

  function renderQuestionScreen() {
    const q = getQuestionById(state.currentQuestionId);
    if (!q) {
      showView('wheel');
      return;
    }

    const meta = getCategoryMeta(q.category);
    dom.qCategoryIcon.textContent = meta.icon;
    dom.qCategoryName.textContent = q.category;
    dom.qPointsValue.textContent = q.points;
    dom.qText.textContent = q.question;

    // Reset / restore Timer UI
    updateTimerUI();

    // Reset / restore Hint Box
    if (state.usedHint) {
      dom.hintText.textContent = q.hint;
      dom.hintBox.classList.remove('hidden');
      dom.helpHintBtn.disabled = true;
      dom.helpHintBtn.classList.add('used');
    } else {
      dom.hintBox.classList.add('hidden');
      dom.helpHintBtn.disabled = false;
      dom.helpHintBtn.classList.remove('used');
    }

    // Reset / restore Choices
    if (state.usedChoices && state.currentChoiceOrder.length === 4) {
      renderChoicesUI();
      dom.choicesGrid.classList.remove('hidden');
      dom.helpChoicesBtn.disabled = true;
      dom.helpChoicesBtn.classList.add('used');
      dom.helpEliminateBtn.disabled = state.usedEliminateTwo;
    } else {
      dom.choicesGrid.classList.add('hidden');
      dom.helpChoicesBtn.disabled = false;
      dom.helpChoicesBtn.classList.remove('used');
      dom.helpEliminateBtn.disabled = true;
    }

    // Reset / restore Eliminate Two
    if (state.usedEliminateTwo) {
      dom.helpEliminateBtn.disabled = true;
      dom.helpEliminateBtn.classList.add('used');
    } else {
      dom.helpEliminateBtn.classList.remove('used');
    }

    // Reset / restore Ask Teacher
    if (state.usedAskTeacher) {
      dom.helpTeacherBtn.disabled = true;
      dom.helpTeacherBtn.classList.add('used');
    } else {
      dom.helpTeacherBtn.disabled = false;
      dom.helpTeacherBtn.classList.remove('used');
    }

    // Update Timer Button text based on status
    updateTimerButtonUI();

    // If restored in time_up state
    if (state.questionStatus === 'time_up') {
      handleTimeUp(false); // don't play alarm again on refresh
    }
  }

  // =========================================================================
  // 11. Timer System (Drift-Free with Date.now())
  // =========================================================================
  function updateTimerUI() {
    dom.timerDigits.textContent = formatTime(state.remainingTime);

    const total = state.initialTime > 0 ? state.initialTime : 15;
    const pct = Math.max(0, Math.min(100, (state.remainingTime / total) * 100));
    dom.timerProgressBar.style.width = `${pct}%`;

    // Warning styling for <= 5 seconds
    if (state.remainingTime <= 5 && state.remainingTime > 0 && state.questionStatus === 'running') {
      dom.timerSection.classList.add('timer-warning');
    } else {
      dom.timerSection.classList.remove('timer-warning');
    }
  }

  function updateTimerButtonUI() {
    if (state.questionStatus === 'running') {
      dom.timerControlBtn.classList.add('btn-pause');
      dom.timerControlIcon.textContent = '⏸';
      dom.timerControlText.textContent = 'إيقاف مؤقت';
      dom.timerControlBtn.disabled = false;
    } else if (state.questionStatus === 'paused') {
      dom.timerControlBtn.classList.remove('btn-pause');
      dom.timerControlIcon.textContent = '▶';
      dom.timerControlText.textContent = 'استكمال';
      dom.timerControlBtn.disabled = false;
    } else if (state.questionStatus === 'opened') {
      dom.timerControlBtn.classList.remove('btn-pause');
      dom.timerControlIcon.textContent = '▶';
      dom.timerControlText.textContent = 'ابدأ الوقت';
      dom.timerControlBtn.disabled = false;
    } else if (state.questionStatus === 'time_up') {
      dom.timerControlBtn.classList.remove('btn-pause');
      dom.timerControlIcon.textContent = '⏹';
      dom.timerControlText.textContent = 'انتهى الوقت';
      dom.timerControlBtn.disabled = true;
    }
  }

  function toggleTimer() {
    initAudio();
    if (state.questionStatus === 'opened' || state.questionStatus === 'paused') {
      startTimer();
    } else if (state.questionStatus === 'running') {
      pauseTimer();
    }
  }

  function startTimer() {
    if (state.remainingTime <= 0) return;
    initAudio();

    state.questionStatus = 'running';
    timerEndTime = Date.now() + state.remainingTime * 1000;
    saveState();

    updateTimerButtonUI();
    updateTimerUI();

    let lastBeepSec = state.remainingTime;

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      const now = Date.now();
      const msLeft = timerEndTime - now;
      const secondsLeft = Math.max(0, Math.ceil(msLeft / 1000));

      if (secondsLeft !== state.remainingTime) {
        state.remainingTime = secondsLeft;
        updateTimerUI();

        // Sound alert during last 5 seconds
        if (state.remainingTime <= 5 && state.remainingTime > 0 && state.remainingTime !== lastBeepSec) {
          soundTimerWarning();
          lastBeepSec = state.remainingTime;
        }

        saveState();
      }

      if (msLeft <= 0) {
        clearInterval(timerInterval);
        state.remainingTime = 0;
        updateTimerUI();
        handleTimeUp(true);
      }
    }, 100);
  }

  function pauseTimer() {
    if (state.questionStatus !== 'running') return;
    clearInterval(timerInterval);

    const now = Date.now();
    if (timerEndTime) {
      const msLeft = timerEndTime - now;
      state.remainingTime = Math.max(0, Math.ceil(msLeft / 1000));
    }

    state.questionStatus = 'paused';
    saveState();
    updateTimerButtonUI();
    updateTimerUI();
  }

  function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    timerEndTime = null;
  }

  function handleTimeUp(playSound = true) {
    stopTimer();
    state.questionStatus = 'time_up';
    state.remainingTime = 0;
    saveState();

    updateTimerButtonUI();
    updateTimerUI();

    // Disable all buttons in question view
    dom.helpHintBtn.disabled = true;
    dom.helpChoicesBtn.disabled = true;
    dom.helpEliminateBtn.disabled = true;
    dom.helpTeacherBtn.disabled = true;
    dom.finishQuestionBtn.disabled = true;

    if (playSound) {
      soundTimeUp();
    }

    // Show Mandatory Time Up Modal
    openModal(dom.timeUpModal, true);
  }

  // =========================================================================
  // 12. Helper Tools Implementation
  // =========================================================================
  function useHint() {
    if (state.usedHint || state.questionStatus === 'time_up') return;
    const q = getQuestionById(state.currentQuestionId);
    if (!q) return;

    soundHelper();
    state.usedHint = true;
    saveState();

    dom.hintText.textContent = q.hint;
    dom.hintBox.classList.remove('hidden');
    dom.helpHintBtn.disabled = true;
    dom.helpHintBtn.classList.add('used');
  }

  function showChoices() {
    if (state.usedChoices || state.questionStatus === 'time_up') return;
    const q = getQuestionById(state.currentQuestionId);
    if (!q) return;

    soundHelper();
    state.usedChoices = true;

    // Shuffle only once per question!
    if (state.currentChoiceOrder.length !== 4) {
      const mappedChoices = q.choices.map((text, idx) => ({
        originalIndex: idx,
        text: text,
        isCorrect: idx === q.correctChoiceIndex
      }));
      state.currentChoiceOrder = shuffleArray(mappedChoices);
    }

    saveState();
    renderChoicesUI();

    dom.choicesGrid.classList.remove('hidden');
    dom.helpChoicesBtn.disabled = true;
    dom.helpChoicesBtn.classList.add('used');

    // Unlock Eliminate Two button
    if (!state.usedEliminateTwo) {
      dom.helpEliminateBtn.disabled = false;
    }
  }

  function renderChoicesUI() {
    state.currentChoiceOrder.forEach((choice, index) => {
      const card = dom.choiceCards[index];
      const textEl = dom.choiceTexts[index];
      if (card && textEl) {
        textEl.textContent = choice.text;
        if (state.eliminatedChoiceIndices.includes(index)) {
          card.classList.add('eliminated');
        } else {
          card.classList.remove('eliminated');
        }
      }
    });
  }

  function eliminateTwoChoices() {
    if (!state.usedChoices || state.usedEliminateTwo || state.questionStatus === 'time_up') return;
    if (state.currentChoiceOrder.length !== 4) return;

    soundEliminate();
    state.usedEliminateTwo = true;

    if (state.eliminatedChoiceIndices.length === 0) {
      // Find all incorrect choices in currentChoiceOrder
      const wrongIndices = [];
      state.currentChoiceOrder.forEach((item, idx) => {
        if (!item.isCorrect) {
          wrongIndices.push(idx);
        }
      });

      // wrongIndices has length 3. Randomly pick 2 to eliminate.
      const shuffledWrong = shuffleArray(wrongIndices);
      state.eliminatedChoiceIndices = [shuffledWrong[0], shuffledWrong[1]];
    }

    saveState();
    renderChoicesUI();

    dom.helpEliminateBtn.disabled = true;
    dom.helpEliminateBtn.classList.add('used');
  }

  function useAskTeacher() {
    if (state.usedAskTeacher || state.questionStatus === 'time_up') return;
    soundHelper();
    state.usedAskTeacher = true;
    saveState();

    dom.helpTeacherBtn.disabled = true;
    dom.helpTeacherBtn.classList.add('used');

    openModal(dom.teacherModal);
  }

  // =========================================================================
  // 13. Question Completion Flows
  // =========================================================================
  function promptFinishQuestion() {
    if (state.questionStatus === 'time_up') return;
    // Pause timer if running
    if (state.questionStatus === 'running') {
      pauseTimer();
    }
    openModal(dom.finishConfirmModal);
  }

  function confirmFinishQuestion() {
    closeModal(dom.finishConfirmModal);
    completeCurrentQuestion('completed');
  }

  function cancelFinishQuestion() {
    closeModal(dom.finishConfirmModal);
    // Timer stays in its current paused state
  }

  function handleRevealAnswer() {
    closeModal(dom.timeUpModal);
    const q = getQuestionById(state.currentQuestionId);
    if (!q) return;

    dom.answerContentText.textContent = q.answer;
    openModal(dom.answerModal, true);
  }

  function handleReturnToWheelAfterAnswer() {
    closeModal(dom.answerModal);
    completeCurrentQuestion('completed');
  }

  function handleSkipQuestion() {
    closeModal(dom.timeUpModal);
    completeCurrentQuestion('skipped');
  }

  function completeCurrentQuestion(finalStatus) {
    stopTimer();
    const q = getQuestionById(state.currentQuestionId);

    if (q) {
      if (!state.usedQuestionIds.includes(q.id)) {
        state.usedQuestionIds.push(q.id);
      }
      if (finalStatus === 'skipped' && !state.skippedQuestionIds.includes(q.id)) {
        state.skippedQuestionIds.push(q.id);
      }

      // Add to history
      state.history.unshift({
        id: q.id,
        category: q.category,
        points: q.points,
        status: finalStatus,
        timestamp: Date.now()
      });
    }

    // Reset current active question
    state.currentQuestionId = null;
    state.questionStatus = 'available';
    state.remainingTime = 0;
    state.initialTime = 0;
    state.usedHint = false;
    state.usedChoices = false;
    state.usedEliminateTwo = false;
    state.usedAskTeacher = false;
    state.currentChoiceOrder = [];
    state.eliminatedChoiceIndices = [];
    saveState();

    dom.finishQuestionBtn.disabled = false;
    showView('wheel');
  }

  // =========================================================================
  // 14. History & Settings Views
  // =========================================================================
  function renderHistory() {
    dom.historyList.innerHTML = '';
    if (state.history.length === 0) {
      dom.historyEmpty.classList.remove('hidden');
    } else {
      dom.historyEmpty.classList.add('hidden');
      state.history.forEach(item => {
        const li = document.createElement('li');
        li.className = 'history-item';

        const catMeta = getCategoryMeta(item.category);
        const statusLabel = item.status === 'completed' ? 'مكتمل' : 'تخطي';
        const statusClass = item.status === 'completed' ? 'completed' : 'skipped';

        li.innerHTML = `
          <span class="history-item-category">${catMeta.icon} ${item.category}</span>
          <span class="history-item-points">${item.points} نقطة</span>
          <span class="history-status-badge ${statusClass}">${statusLabel}</span>
        `;
        dom.historyList.appendChild(li);
      });
    }
  }

  function toggleSound() {
    initAudio();
    state.soundEnabled = !state.soundEnabled;
    saveState();
    updateHeaderStats();
    if (state.soundEnabled) soundTick();
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn(`Error attempting to enable full-screen mode: ${err.message}`);
      });
      dom.fullscreenIcon.textContent = '🗗';
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      dom.fullscreenIcon.textContent = '⛶';
    }
  }

  // =========================================================================
  // 15. Keyboard Shortcuts
  // =========================================================================
  function handleKeyDown(e) {
    // If a modal is open, prevent shortcuts from triggering background game actions
    if (activeModal) {
      if (e.key === 'Escape' && !activeModal.dataset.mandatory) {
        closeModal(activeModal);
      }
      return;
    }

    const key = e.key.toUpperCase();

    // Space: Start / Pause / Resume timer in question view
    if (e.code === 'Space') {
      if (dom.questionView.classList.contains('active')) {
        e.preventDefault();
        toggleTimer();
      }
      return;
    }

    // F: Fullscreen
    if (key === 'F') {
      e.preventDefault();
      toggleFullscreen();
      return;
    }

    // Question screen helpers
    if (dom.questionView.classList.contains('active')) {
      if (key === 'H' || e.key === 'ا') { // Arabic keyboard fallback for H
        e.preventDefault();
        useHint();
      } else if (key === 'C' || e.key === 'ؤ') { // Arabic fallback for C
        e.preventDefault();
        showChoices();
      } else if (key === 'E' || e.key === 'ث') { // Arabic fallback for E
        e.preventDefault();
        eliminateTwoChoices();
      } else if (key === 'T' || e.key === 'ف') { // Arabic fallback for T
        e.preventDefault();
        useAskTeacher();
      }
    }
  }

  // =========================================================================
  // 16. Event Bindings
  // =========================================================================
  function bindEvents() {
    // Header controls
    dom.soundToggleBtn.addEventListener('click', toggleSound);
    dom.fullscreenBtn.addEventListener('click', toggleFullscreen);

    dom.historyBtn.addEventListener('click', () => {
      renderHistory();
      openModal(dom.historyModal);
    });

    dom.settingsBtn.addEventListener('click', () => {
      openModal(dom.settingsModal);
    });

    // Settings Modal controls
    dom.settingsSoundToggle.addEventListener('click', toggleSound);
    dom.settingsFullscreenBtn.addEventListener('click', toggleFullscreen);
    dom.closeSettingsBtn.addEventListener('click', () => closeModal(dom.settingsModal));
    dom.closeSettingsBottomBtn.addEventListener('click', () => closeModal(dom.settingsModal));

    dom.resetCompetitionBtn.addEventListener('click', () => {
      closeModal(dom.settingsModal);
      openModal(dom.resetConfirmModal);
    });

    dom.confirmResetBtn.addEventListener('click', () => {
      closeModal(dom.resetConfirmModal);
      resetGame();
    });

    dom.cancelResetBtn.addEventListener('click', () => closeModal(dom.resetConfirmModal));

    // History Modal close
    dom.closeHistoryBtn.addEventListener('click', () => closeModal(dom.historyModal));
    dom.closeHistoryBottomBtn.addEventListener('click', () => closeModal(dom.historyModal));

    // Wheel actions
    dom.spinBtn.addEventListener('click', spinWheel);
    dom.cancelRespinBtn.addEventListener('click', cancelSelectedQuestion);
    dom.openQuestionBtn.addEventListener('click', openQuestion);

    // Finished screen actions
    dom.finishedHistoryBtn.addEventListener('click', () => {
      renderHistory();
      openModal(dom.historyModal);
    });
    dom.finishedResetBtn.addEventListener('click', () => {
      openModal(dom.resetConfirmModal);
    });

    // Question actions
    dom.timerControlBtn.addEventListener('click', toggleTimer);
    dom.helpHintBtn.addEventListener('click', useHint);
    dom.helpChoicesBtn.addEventListener('click', showChoices);
    dom.helpEliminateBtn.addEventListener('click', eliminateTwoChoices);
    dom.helpTeacherBtn.addEventListener('click', useAskTeacher);
    dom.closeTeacherBtn.addEventListener('click', () => closeModal(dom.teacherModal));

    dom.finishQuestionBtn.addEventListener('click', promptFinishQuestion);
    dom.confirmFinishBtn.addEventListener('click', confirmFinishQuestion);
    dom.cancelFinishBtn.addEventListener('click', cancelFinishQuestion);

    // Time up actions
    dom.revealAnswerBtn.addEventListener('click', handleRevealAnswer);
    dom.skipQuestionBtn.addEventListener('click', handleSkipQuestion);
    dom.returnToWheelBtn.addEventListener('click', handleReturnToWheelAfterAnswer);

    // Keyboard shortcuts
    window.addEventListener('keydown', handleKeyDown);

    // Fullscreen change synchronization
    document.addEventListener('fullscreenchange', () => {
      dom.fullscreenIcon.textContent = document.fullscreenElement ? '🗗' : '⛶';
    });

    // Click outside non-mandatory modals to close
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal && !modal.dataset.mandatory) {
          closeModal(modal);
        }
      });
    });

    // Window resize handler for canvas rendering
    window.addEventListener('resize', () => {
      if (dom.wheelView.classList.contains('active')) {
        renderWheel();
      }
    });
  }

  // =========================================================================
  // 17. Initialization
  // =========================================================================
  function cacheDOM() {
    dom.app = document.getElementById('app');
    dom.remainingCount = document.getElementById('remainingCount');
    dom.playedCount = document.getElementById('playedCount');
    dom.soundToggleBtn = document.getElementById('soundToggleBtn');
    dom.soundIcon = document.getElementById('soundIcon');
    dom.historyBtn = document.getElementById('historyBtn');
    dom.settingsBtn = document.getElementById('settingsBtn');
    dom.fullscreenBtn = document.getElementById('fullscreenBtn');
    dom.fullscreenIcon = document.getElementById('fullscreenIcon');
    dom.errorBanner = document.getElementById('errorBanner');

    // Views
    dom.wheelView = document.getElementById('wheelView');
    dom.questionView = document.getElementById('questionView');

    // Wheel view elements
    dom.wheelCanvas = document.getElementById('wheelCanvas');
    dom.wheelPointer = document.getElementById('wheelPointer');
    dom.spinBtn = document.getElementById('spinBtn');
    dom.selectedCard = document.getElementById('selectedCard');
    dom.selectedCategoryIcon = document.getElementById('selectedCategoryIcon');
    dom.selectedCategoryText = document.getElementById('selectedCategoryText');
    dom.selectedPointsText = document.getElementById('selectedPointsText');
    dom.openQuestionBtn = document.getElementById('openQuestionBtn');
    dom.cancelRespinBtn = document.getElementById('cancelRespinBtn');
    dom.allFinishedCard = document.getElementById('allFinishedCard');
    dom.finishedHistoryBtn = document.getElementById('finishedHistoryBtn');
    dom.finishedResetBtn = document.getElementById('finishedResetBtn');

    // Question view elements
    dom.qCategoryIcon = document.getElementById('qCategoryIcon');
    dom.qCategoryName = document.getElementById('qCategoryName');
    dom.qPointsValue = document.getElementById('qPointsValue');
    dom.qText = document.getElementById('qText');

    dom.timerSection = document.querySelector('.timer-section');
    dom.timerDigits = document.getElementById('timerDigits');
    dom.timerProgressBar = document.getElementById('timerProgressBar');
    dom.timerControlBtn = document.getElementById('timerControlBtn');
    dom.timerControlIcon = document.getElementById('timerControlIcon');
    dom.timerControlText = document.getElementById('timerControlText');

    dom.hintBox = document.getElementById('hintBox');
    dom.hintText = document.getElementById('hintText');
    dom.choicesGrid = document.getElementById('choicesGrid');
    dom.choiceCards = [
      document.getElementById('choiceCard0'),
      document.getElementById('choiceCard1'),
      document.getElementById('choiceCard2'),
      document.getElementById('choiceCard3')
    ];
    dom.choiceTexts = [
      document.getElementById('choiceText0'),
      document.getElementById('choiceText1'),
      document.getElementById('choiceText2'),
      document.getElementById('choiceText3')
    ];

    dom.helpHintBtn = document.getElementById('helpHintBtn');
    dom.helpChoicesBtn = document.getElementById('helpChoicesBtn');
    dom.helpEliminateBtn = document.getElementById('helpEliminateBtn');
    dom.helpTeacherBtn = document.getElementById('helpTeacherBtn');
    dom.finishQuestionBtn = document.getElementById('finishQuestionBtn');

    // Modals
    dom.finishConfirmModal = document.getElementById('finishConfirmModal');
    dom.confirmFinishBtn = document.getElementById('confirmFinishBtn');
    dom.cancelFinishBtn = document.getElementById('cancelFinishBtn');

    dom.timeUpModal = document.getElementById('timeUpModal');
    dom.revealAnswerBtn = document.getElementById('revealAnswerBtn');
    dom.skipQuestionBtn = document.getElementById('skipQuestionBtn');

    dom.answerModal = document.getElementById('answerModal');
    dom.answerContentText = document.getElementById('answerContentText');
    dom.returnToWheelBtn = document.getElementById('returnToWheelBtn');

    dom.teacherModal = document.getElementById('teacherModal');
    dom.closeTeacherBtn = document.getElementById('closeTeacherBtn');

    dom.historyModal = document.getElementById('historyModal');
    dom.historyList = document.getElementById('historyList');
    dom.historyEmpty = document.getElementById('historyEmpty');
    dom.closeHistoryBtn = document.getElementById('closeHistoryBtn');
    dom.closeHistoryBottomBtn = document.getElementById('closeHistoryBottomBtn');

    dom.settingsModal = document.getElementById('settingsModal');
    dom.settingsSoundToggle = document.getElementById('settingsSoundToggle');
    dom.settingsSoundState = document.getElementById('settingsSoundState');
    dom.settingsFullscreenBtn = document.getElementById('settingsFullscreenBtn');
    dom.closeSettingsBtn = document.getElementById('closeSettingsBtn');
    dom.closeSettingsBottomBtn = document.getElementById('closeSettingsBottomBtn');
    dom.resetCompetitionBtn = document.getElementById('resetCompetitionBtn');

    dom.resetConfirmModal = document.getElementById('resetConfirmModal');
    dom.confirmResetBtn = document.getElementById('confirmResetBtn');
    dom.cancelResetBtn = document.getElementById('cancelResetBtn');
  }

  function initApp() {
    cacheDOM();

    // 1. Validate questions
    const isValid = validateQuestions();
    if (!isValid) {
      if (dom.errorBanner) dom.errorBanner.classList.remove('hidden');
    }

    // 2. Load stored state
    loadState();

    // 3. Bind UI Events
    bindEvents();

    // 4. Determine initial screen to display
    if (state.currentQuestionId && (state.questionStatus === 'opened' || state.questionStatus === 'running' || state.questionStatus === 'paused' || state.questionStatus === 'time_up')) {
      // If timer was running before refresh, downgrade to paused per spec
      if (state.questionStatus === 'running') {
        state.questionStatus = 'paused';
      }
      showView('question');
    } else {
      showView('wheel');
    }
  }

  // Launch when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})();
