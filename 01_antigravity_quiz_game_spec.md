# Anti Gravity — مواصفات تنفيذ موقع مسابقة العجلة

## 1) الهدف

أنشئ موقع مسابقة أسئلة يعمل بالكامل داخل المتصفح ويُعرض على Laptop / شاشة كبيرة / Projector.

المقدم هو الذي:
- يقرأ السؤال.
- يقرر هل الإجابة صحيحة أو خاطئة.
- يحسب النقاط يدويًا خارج الموقع.
- يتحكم في بدء وإيقاف واستكمال الوقت.

الموقع **لا** يدير فرقًا، ولا Scoreboard، ولا Correct/Wrong، ولا يحسب نقاطًا.

دور الموقع فقط:
1. عجلة لاختيار سؤال عشوائي غير مستخدم.
2. عرض الفئة وقيمة السؤال.
3. فتح السؤال يدويًا.
4. Timer يدوي Start / Pause / Resume.
5. أدوات المساعدة.
6. إنهاء السؤال يدويًا.
7. عند انتهاء الوقت: إجبار المقدم على إظهار الإجابة أو تخطي السؤال.
8. منع تكرار أي سؤال مكتمل أو متخطى.
9. حفظ تقدم المسابقة في `localStorage`.

---

## 2) التقنيات

استخدم فقط:
- HTML5
- CSS3 عادي
- Vanilla JavaScript

ممنوع:
- React
- Vue
- Angular
- Tailwind
- Bootstrap
- npm
- Backend
- Database
- أي Framework أو UI Library

هيكل المشروع:

```text
/index.html
/css/style.css
/js/questions.js
/js/app.js
```

يجب أن يعمل المشروع مباشرة من المتصفح.

---

## 3) ملفا المصدر

سيتم إعطاؤك ملفين:

```text
01_antigravity_quiz_game_spec.md
02_antigravity_quiz_questions_100.md
```

هذا الملف هو المواصفات.

ملف `02_antigravity_quiz_questions_100.md` يحتوي على:

```js
const QUESTIONS = [...]
```

بعدد **100 سؤال**.

انسخ هذا الـArray كما هو إلى:

```text
/js/questions.js
```

**ممنوع اختراع أو إضافة أسئلة من عندك.**
**ممنوع تعديل نص السؤال أو الإجابة أو التلميح أو الاختيارات إلا لإصلاح خطأ تقني واضح.**

---

## 4) اللغة والواجهة

- كل الموقع عربي.
- استخدم:

```html
<html lang="ar" dir="rtl">
```

- التصميم Game Screen وليس Dashboard.
- مناسب جدًا لـ16:9 والـProjector.
- Responsive.
- خط السؤال كبير وواضح من مسافة.
- High contrast.
- حركات Animation خفيفة وسلسة.
- لا تستخدم Browser `alert()` أو `confirm()` أو `prompt()`.
- استخدم Modals داخل التصميم.
- استخدم CSS Variables للألوان والمقاسات.

---

## 5) بيانات السؤال

كل سؤال بالشكل التالي:

```js
{
  id: 1,
  category: "كرة قدم",
  points: 5,
  time: 15,
  question: "...",
  answer: "...",
  hint: "...",
  choices: ["...", "...", "...", "..."],
  correctChoiceIndex: 2
}
```

### معنى `correctChoiceIndex`

هو مكان الإجابة الصحيحة **في البيانات الأصلية فقط** قبل أي Shuffle.

مثال:

```js
choices: ["A", "B", "France", "D"],
correctChoiceIndex: 2
```

لا تفترض أن الصحيحة في Index ثابت.

---

## 6) توزيع الأسئلة

البنك يحتوي على 100 سؤال:

```text
5 نقاط  = 40 سؤال = 15 ثانية
10 نقاط = 30 سؤال = 25 ثانية
15 نقطة = 20 سؤال = 35 ثانية
20 نقطة = 10 أسئلة = 50 ثانية
```

المستويات 15 و20 مقصود أن تكون أصعب فعلًا وأقل عددًا.

الفئات الموجودة:

```text
كرة قدم
جغرافيا
علوم ومعلومات عامة
تاريخ
سياسة ومواطنة
كتاب مقدس
طقسية قبطية أرثوذكسية
```

لا تعمل Logic يعتمد على أسماء الفئات Hardcoded.
استخرج الفئات والقيم الموجودة من `QUESTIONS`.

---

# 7) الشاشة الرئيسية — Wheel

اعرض:

- عنوان المسابقة.
- عجلة كبيرة.
- Pointer ثابت.
- زر كبير:

```text
لف العجلة
```

- عدد الأسئلة المتبقية.
- عدد الأسئلة التي تم لعبها.
- زر Fullscreen.
- Settings صغير.

لا تعرض:
- أسماء فرق.
- Score.
- ترتيب فرق.
- Correct / Wrong.

---

# 8) العجلة لا تعرض 100 سؤال

لا تنشئ 100 Segment.

العجلة تعرض Segments حسب:

```text
Category + Points
```

مثل:

```text
كرة قدم — 5
كرة قدم — 15
جغرافيا — 10
كتاب مقدس — 20
```

إذا لم يعد هناك أي سؤال متاح لمجموعة معينة، احذف Segment الخاص بها.

مثال:
إذا انتهت كل أسئلة:

```text
جغرافيا — 20
```

فلا يظهر هذا Segment بعد ذلك.

---

# 9) اختيار السؤال والعجلة

عند الضغط على `لف العجلة`:

1. استخرج كل الأسئلة التي حالتها `available`.
2. اختر سؤالًا واحدًا Random منها.
3. خزّن السؤال المختار فورًا في State كـ`selected`.
4. اقرأ:
   - `category`
   - `points`
5. شغّل Animation العجلة 3–5 ثوانٍ.
6. اجعل العجلة تنتهي بصريًا عند Segment يطابق السؤال المختار.
7. أثناء الدوران:
   - Disable زر Spin.
   - امنع Double click.
8. بعد الوقوف:
   - لا تعرض نص السؤال.
   - اعرض فقط الفئة والنقاط وزر فتح السؤال.

الاختيار الحقيقي للسؤال يتم **قبل Animation**.

```text
Random Question
↓
Category + Points
↓
Animate Wheel
↓
Land on matching segment
```

---

# 10) بعد توقف العجلة

اعرض Card مثل:

```text
🌍 جغرافيا
15 نقطة

[ فتح السؤال ]

[ إلغاء وإعادة اللف ]
```

### إلغاء وإعادة اللف

مسموح فقط قبل فتح السؤال.

إذا ضغطه المقدم:
- ألغِ `selected`.
- السؤال يرجع `available`.
- لا يُحسب مستخدمًا.
- ارجع للعجلة.

---

# 11) فتح السؤال

عند الضغط على:

```text
فتح السؤال
```

انتقل لشاشة السؤال.

من هذه اللحظة:
- حالة السؤال `opened`.
- لا يمكن الرجوع للعجلة مباشرة.
- السؤال يجب أن ينتهي أولًا.

---

# 12) شاشة السؤال

اعرض بوضوح:

```text
الفئة
عدد النقاط
السؤال
Timer
أدوات المساعدة
أزرار الوقت
إنهاء السؤال
```

مثال:

```text
🌍 جغرافيا     15 نقطة

ما هي ............؟

00:35

[ ابدأ الوقت ]

[ 💡 تلميح ]
[ 🔤 اختيارات ]
[ ✂️ حذف إجابتين ]
[ 👨‍🏫 اسأل أستاذ ]

[ إنهاء السؤال ]
```

---

# 13) Timer لا يبدأ تلقائيًا

فتح السؤال لا يبدأ العداد.

الحالة الأولى:

```text
00:35
[ ▶ ابدأ الوقت ]
```

بعد الضغط:

```text
[ ⏸ إيقاف مؤقت ]
```

عند Pause:

```text
[ ▶ استكمال ]
```

Resume يكمل من نفس الثانية ولا يعيد الوقت.

---

# 14) دقة Timer

لا تعتمد فقط على:

```js
remainingTime--;
```

استخدم توقيت فعلي مبني على:

```js
Date.now()
```

حتى لا يحدث Drift.

يمكن تحديث الواجهة كل 100–250ms، لكن الوقت المتبقي يُحسب من الزمن الحقيقي المنقضي.

---

# 15) آخر 5 ثوانٍ

عند:

```text
00:05
00:04
00:03
00:02
00:01
```

- Pulse بسيط للـTimer.
- لون تحذيري مناسب.
- Beep خفيف لو الصوت Enabled.

لا تجعل Animation مزعجة.

---

# 16) أدوات المساعدة

كل سؤال يحتوي على:

```text
💡 تلميح
🔤 اختيارات
✂️ حذف إجابتين
👨‍🏫 اسأل أستاذ
```

كل أداة تُستخدم مرة واحدة فقط في السؤال.

لا:
- تخصم نقاطًا.
- تضيف وقتًا.
- توقف Timer تلقائيًا.

---

## 16.1 التلميح

عند الضغط على:

```text
💡 تلميح
```

اعرض:

```js
question.hint
```

في Box واضح.

ثم:
- يظل ظاهرًا.
- الزر يصبح Used/Disabled.

---

## 16.2 الاختيارات

عند الضغط على:

```text
🔤 اختيارات
```

اعرض 4 اختيارات:

```text
A
B
C
D
```

لكنها **ليست أزرار إجابة**.

لا يوجد اختيار من المتسابق داخل الموقع.
هي فقط وسيلة مساعدة للمقدم والجمهور.

---

# 17) Shuffle الاختيارات — إلزامي جدًا

**الإجابة الصحيحة ممنوع تظهر دائمًا في أول اختيار أو في مكان ثابت.**

يوجد مستويان للحماية:

### أولًا: البيانات نفسها

ملف الأسئلة يحتوي أصلًا على `correctChoiceIndex` متنوع من سؤال لآخر.

### ثانيًا: Runtime Shuffle

عند أول مرة يتم فتح الاختيارات في السؤال:

1. خذ:

```js
question.choices
```

2. حوّلها داخليًا إلى:

```js
[
  { text: "...", isCorrect: false },
  { text: "...", isCorrect: true },
  ...
]
```

باستخدام:

```js
question.correctChoiceIndex
```

3. نفّذ **Fisher-Yates Shuffle**.

4. اعرض الناتج.

5. احفظ الترتيب في State:

```js
currentChoiceOrder
```

6. احفظه أيضًا في `localStorage`.

### مهم

يتم الـShuffle **مرة واحدة فقط لكل سؤال**.

إذا حصل:
- Pause
- Resume
- Hide/Show UI
- Refresh

يجب أن تظهر نفس الاختيارات بنفس الترتيب.

لا تعمل Shuffle جديد إلا عند سؤال جديد.

بعد الـShuffle لا تعتمد على Index الأصلي لتحديد الصحيحة.
استخدم:

```js
isCorrect
```

---

# 18) حذف إجابتين

الزر في البداية:

```text
✂️ حذف إجابتين
```

يكون Disabled إلى أن يتم فتح الاختيارات.

بعد فتح الاختيارات يتفعل.

عند الضغط:

1. استخدم `currentChoiceOrder`.
2. استخرج العناصر التي:

```js
isCorrect === false
```

3. عددها 3.
4. اختر **اثنين فقط Random** منها.
5. أخفهما.
6. يجب أن يتبقى:
   - الإجابة الصحيحة.
   - إجابة خاطئة واحدة.

**ممنوع حذف الصحيحة تحت أي ظرف.**

احفظ الاختيارين المحذوفين في:

```js
eliminatedChoiceIds
```

أو أي State واضح.

واحفظهما في `localStorage` حتى لا يتغير الحذف بعد Refresh.

---

# 19) اسأل أستاذ

عند الضغط:

```text
👨‍🏫 اسأل أستاذ
```

اعرض Modal صغير:

```text
تم استخدام مساعدة: اسأل أستاذ

[ تم ]
```

لا تعرض إجابة.
لا توقف الوقت تلقائيًا.

ثم يصبح زر المساعدة Used/Disabled.

---

# 20) إنهاء السؤال يدويًا قبل انتهاء الوقت

اعرض دائمًا أثناء السؤال:

```text
إنهاء السؤال
```

هذا **لا يعني صح ولا غلط**.

المقدم فقط يقول إن السؤال انتهى.

عند الضغط:
1. أوقف Timer.
2. اعرض Modal:

```text
هل تريد إنهاء السؤال والعودة للعجلة؟

[ نعم، إنهاء السؤال ]
[ إلغاء ]
```

إذا إلغاء:
- ارجع للسؤال.
- لا تعتبره منتهيًا.
- لا تشغل Timer تلقائيًا؛ يظل في الحالة السابقة المناسبة.

إذا تأكيد:
- Status = `completed`.
- أضف ID إلى Used Questions.
- Save.
- ارجع للعجلة.
- ممنوع يظهر السؤال مرة أخرى.

---

# 21) انتهاء الوقت

عند وصول Timer إلى:

```text
00:00
```

نفّذ فورًا:

- Status = `time_up`.
- أوقف Timer نهائيًا.
- Disable Start/Pause/Resume.
- Disable أي مساعدة لم تُستخدم.
- Disable زر إنهاء السؤال العادي.
- امنع الرجوع للعجلة.
- اعرض Modal إجباري.

---

# 22) Modal انتهاء الوقت إجباري

اعرض خيارين فقط:

```text
👁 إظهار الإجابة

⏭ تخطي السؤال
```

ممنوع:
- Close button.
- الضغط خارج Modal لإغلاقه.
- Escape.
- Back to wheel.
- تشغيل الوقت من جديد.

المقدم **لازم** يختار واحدًا.

---

# 23) إظهار الإجابة

عند:

```text
👁 إظهار الإجابة
```

اعرض:

```text
الإجابة الصحيحة:

{question.answer}
```

بخط كبير.

ثم زر واحد:

```text
العودة للعجلة
```

عند الضغط:
- Status = `completed`.
- Save.
- السؤال لا يظهر مرة أخرى.
- العودة للعجلة.

---

# 24) تخطي السؤال

عند:

```text
⏭ تخطي السؤال
```

- لا تعرض الإجابة.
- Status = `skipped`.
- Save.
- السؤال لا يعود للـPool.
- العودة للعجلة.

---

# 25) حالات السؤال

استخدم State واضح:

```text
available
selected
opened
running
paused
time_up
completed
skipped
```

المعاني:

```text
available = لم يُلعب
selected  = اختارته العجلة ولم يُفتح
opened    = مفتوح والوقت لم يبدأ
running   = الوقت يعمل
paused    = الوقت متوقف مؤقتًا
time_up   = انتهى الوقت
completed = انتهى السؤال
skipped   = تم تخطي السؤال
```

---

# 26) منع التكرار

السؤال إذا أصبح:

```text
completed
```

أو:

```text
skipped
```

ممنوع يظهر مرة أخرى.

قبل كل Spin:

```js
const availableQuestions = QUESTIONS.filter(
  q => !usedQuestionIds.includes(q.id)
);
```

أو State equivalent أكثر تنظيمًا.

---

# 27) LocalStorage

احفظ على الأقل:

```text
usedQuestionIds
skippedQuestionIds
currentQuestionId
questionStatus
remainingTime
usedHint
usedChoices
usedEliminateTwo
usedAskTeacher
currentChoiceOrder
eliminatedChoiceIds
history
soundEnabled
```

---

# 28) Refresh

إذا عمل المستخدم Refresh أثناء سؤال:

- افتح نفس السؤال.
- استرجع الوقت المتبقي.
- استرجع الأدوات المستخدمة.
- استرجع Hint لو كان ظاهرًا.
- استرجع الاختيارات بنفس ترتيبها.
- استرجع الإجابتين المحذوفتين نفسهما.
- لا تعمل Shuffle جديد.
- لا تبدأ Timer تلقائيًا.

إذا كان Timer كان `running` قبل Refresh:
ارجعه بعد Refresh إلى:

```text
paused
```

والمقدم يضغط:

```text
استكمال
```

---

# 29) History

أضف History بسيط للمقدم.

اعرض فقط:

```text
الفئة — النقاط — الحالة
```

مثل:

```text
جغرافيا — 10 — مكتمل
كرة قدم — 15 — تخطي
```

لا تعرض:
- إجابة صح/غلط.
- نقاط فريق.
- Score.

---

# 30) Settings

Settings Modal يحتوي:

```text
الصوت On / Off
Fullscreen
اختصارات الكيبورد
إعادة ضبط المسابقة
```

---

# 31) Fullscreen

استخدم Fullscreen API.

زر:

```text
⛶ ملء الشاشة
```

في Fullscreen:
- السؤال أكبر.
- Timer أكبر.
- الأدوات واضحة.
- مناسب للـProjector.

---

# 32) الأصوات

استخدم Web Audio API أو Sounds بسيطة محلية.

أصوات:
- بداية Spin.
- توقف العجلة.
- آخر 5 ثوانٍ.
- انتهاء الوقت.

الصوت اختياري ويمكن إغلاقه.

---

# 33) Keyboard Shortcuts

```text
Space = Start / Pause / Resume
H     = Hint
C     = Choices
E     = Eliminate Two
T     = Ask Teacher
F     = Fullscreen
```

لا تنفذ Shortcut إذا كان Action غير متاح.

إذا Modal مفتوح:
- لا تعمل اختصارات الخلفية.

Modal انتهاء الوقت لا يغلق بـEscape.

---

# 34) Reset Competition

داخل Settings:

```text
إعادة ضبط المسابقة
```

Confirmation مخصص:

```text
هل أنت متأكد؟
سيتم حذف تقدم المسابقة وإعادة جميع الأسئلة.

[ إلغاء ]
[ نعم، إعادة الضبط ]
```

عند التأكيد:
- امسح Game State من LocalStorage.
- أعد كل الأسئلة Available.
- امسح History.
- ارجع للعجلة.

---

# 35) انتهاء جميع الأسئلة

إذا:

```js
availableQuestions.length === 0
```

اعرض:

```text
🎉 انتهت جميع أسئلة المسابقة

تم لعب جميع الأسئلة
```

مع:
- عرض History.
- Settings.

لا تسمح بـSpin جديد.

---

# 36) Validation للأسئلة

عند بداية التطبيق تحقق من:

```text
QUESTIONS.length === 100
```

وكل سؤال يحتوي على:

```text
id
category
points
time
question
answer
hint
choices
correctChoiceIndex
```

الشروط:

```text
id unique
category غير فارغة
points واحدة من 5 / 10 / 15 / 20
time بين 15 و50
question غير فارغ
answer غير فارغ
hint غير فارغ
choices Array وعددها 4
كل Choice غير فارغ
لا يوجد Choice مكرر داخل نفس السؤال
correctChoiceIndex من 0 إلى 3
choices[correctChoiceIndex] === answer
```

إذا سؤال غير صحيح:
- Console error تفصيلي.
- الواجهة تعرض:

```text
يوجد خطأ في بيانات الأسئلة.
```

ولا تجعل التطبيق Crash.

---

# 37) Double Action Protection

امنع:
- Spin مرتين.
- فتح سؤال مرتين.
- Finish مرتين.
- Skip مرتين.
- Reveal مرتين.
- استخدام Help مرتين.

استخدم Disabled state + flags مناسبة.

---

# 38) JavaScript Architecture

قسّم الكود، ولا تضع كل شيء في Function واحدة.

Functions مقترحة:

```js
initApp()
validateQuestions()
loadState()
saveState()
resetGame()

getAvailableQuestions()
buildWheelSegments()
selectRandomQuestion()
spinWheel()
renderWheel()

showSelectedQuestion()
cancelSelectedQuestion()
openQuestion()

startTimer()
pauseTimer()
resumeTimer()
updateTimerUI()
handleTimeUp()

useHint()
showChoices()
shuffleChoicesOnce()
eliminateTwoChoices()
useAskTeacher()

finishQuestion()
revealAnswer()
skipQuestion()
completeCurrentQuestion()

renderHistory()
openSettings()
toggleSound()
enterFullscreen()
```

---

# 39) ممنوعات

لا تضف:

```text
Login
Register
Backend
Database
Admin Panel
Teams
Team Names
Scoreboard
Leaderboard
Correct Button
Wrong Button
Auto Scoring
Points Deduction
Question Editor
API
```

لا تغيّر فكرة أن مقدم المسابقة يحسب كل شيء يدويًا.

---

# 40) ترتيب التنفيذ

نفّذ بهذا الترتيب:

1. أنشئ ملفات HTML/CSS/JS.
2. انسخ بنك الـ100 سؤال إلى `questions.js`.
3. Validation.
4. State Management.
5. منع تكرار الأسئلة.
6. Question Screen.
7. Timer.
8. Pause / Resume.
9. Time Up Flow.
10. Helpers.
11. Shuffle Choices.
12. Eliminate Two.
13. LocalStorage / Refresh restore.
14. Wheel.
15. Fullscreen.
16. Keyboard shortcuts.
17. Sounds.
18. History.
19. UI/UX polish.

---

# 41) اختبارات إلزامية قبل اعتبار المشروع منتهيًا

اختبر الآتي:

### الأسئلة
- يوجد 100 سؤال بالضبط.
- كل ID فريد.
- 40 سؤال 5 نقاط.
- 30 سؤال 10 نقاط.
- 20 سؤال 15 نقطة.
- 10 أسئلة 20 نقطة.

### الاختيارات
اختبر أسئلة يكون `correctChoiceIndex` الأصلي فيها:
- 0
- 1
- 2
- 3

ثم تأكد أن Runtime Shuffle يجعل مكان الصحيحة غير ثابت.

### حذف إجابتين
كرر الاختبار عدة مرات:
- لا تختفي الصحيحة أبدًا.
- يختفي Wrong 2 فقط.
- يبقى Correct + Wrong 1.

### Refresh
افتح Choices.
احذف إجابتين.
اعمل Refresh.
يجب أن:
- يظل ترتيب الاختيارات نفسه.
- تظل نفس الإجابتين محذوفتين.
- لا يبدأ Timer تلقائيًا.

### Timer
- Start.
- Pause.
- Resume.
- وصول صفر.
- عند الصفر يظهر Mandatory Reveal/Skip.
- لا يمكن الرجوع للعجلة قبل اختيار أحدهما.

### عدم التكرار
بعد Completed أو Skipped:
- السؤال لا يظهر في أي Spin لاحق.

---

# 42) الـFlow النهائي

```text
فتح الموقع
↓
تحميل State
↓
Wheel
↓
لف العجلة
↓
اختيار Random Question غير مستخدم
↓
Animation
↓
Category + Points
↓
فتح السؤال
↓
السؤال ظاهر والوقت متوقف
↓
Start
↓
Running
↓
Pause / Resume عند الحاجة
↓
Helpers عند الحاجة
```

إذا انتهى السؤال قبل الوقت:

```text
إنهاء السؤال
↓
Confirmation
↓
Completed
↓
Save
↓
Wheel
```

إذا انتهى الوقت:

```text
00:00
↓
Lock
↓
Mandatory Modal
↓
إظهار الإجابة OR تخطي
↓
Completed / Skipped
↓
Save
↓
Wheel
```

---

# 43) المطلوب النهائي من Anti Gravity

لا ترجع لي شرحًا نظريًا فقط.

أنشئ المشروع كاملًا:

```text
index.html
css/style.css
js/questions.js
js/app.js
```

واستخدم الـ100 سؤال المرفقة مباشرة.

بعد التنفيذ:
- راجع Console.
- أصلح أي Errors.
- اختبر الـFlow كاملًا.
- تأكد أن المشروع جاهز للتشغيل والعرض على Projector مباشرة.
