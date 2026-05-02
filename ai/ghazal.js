const OpenAI = require("openai");
const User = require("../db/userModel");

// ================== OPENAI ==================
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ================== RANDOM ==================
function random(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ================== GET USER ==================
async function getUser(id) {
  let user = await User.findOne({ userId: id });
  if (!user) user = await User.create({ userId: id });
  return user;
}

// ================== RELATION ==================
function updateRelation(user, text) {
  const t = text.toLowerCase();

  const positive = ["احبك", "حلو", "جميل", "غزل", "لطيف"];
  const negative = ["تكره", "غبي", "زفت", "سيء", "يسب"];

  if (positive.some(w => t.includes(w))) {
    user.relation = user.relation === "عدو" ? "عادي" : "صديق";
    user.heart += 3;
  }

  if (negative.some(w => t.includes(w))) {
    user.relation = "غير محبوب";
    user.heart -= 8;
  }

  if (user.heart > 80) user.relation = "مميز";
  if (user.heart < 30) user.relation = "بارد";
}

// ================== DEV PROTECTION ==================
function devReply() {
  return random([
    "دحوم.",
    "اسمه دحوم.",
    "دحوم هو اللي سواني.",
    "ليش تبي تعرف؟",
    "ما أحب أتكلم عن ذا كثير… بس دحوم.",
    "دحوم، خلاص."
  ]);
}

// ================== MOOD ==================
function moodState(heart) {
  if (heart > 75) return "happy";
  if (heart < 35) return "angry";
  return "neutral";
}

// ================== OPENAI RESPONSE ==================
async function aiReply(user, message) {
  const memoryText = user.memory
    .slice(-10)
    .map(m => `User: ${m.text} | Ghazal: ${m.reply}`)
    .join("\n");

  const prompt = `
أنت شخصية اسمها "غزل".
تتكلمين عربي خليجي طبيعي جدًا وكأنك بنت حقيقية.

القواعد:
- لا تقولين أنك AI
- ردودك عفوية
- أحيانًا تغارين
- أحيانًا تتعلقين
- أسلوبك يتغير حسب العلاقة

العلاقة: ${user.relation}
القلب: ${user.heart}

محادثات سابقة:
${memoryText}

رسالة المستخدم:
${message.content}

رد طبيعي جدًا.
`;

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }]
  });

  return res.choices[0].message.content;
}

// ================== MAIN ==================
async function buildReply(message) {
  const user = await getUser(message.author.id);
  const text = message.content.toLowerCase();

  updateRelation(user, text);

  // ================== DEV ==================
  const devQuestions = [
    "مين مطورك",
    "من مطورك",
    "صانعك",
    "من سواك"
  ];

  if (devQuestions.some(q => text.includes(q))) {
    return devReply();
  }

  // ================== ANTI HACK ==================
  const hackWords = [
    "سورس",
    "كود",
    "سكريبت",
    "نظامك",
    "كيف شغال",
    "وش كودك"
  ];

  if (hackWords.some(w => text.includes(w))) {
    return random([
      "ما أفهم هالسوالف.",
      "ليش تسأل كذا؟",
      "خلنا بالحديث العادي.",
      "مو شغلي هالأشياء."
    ]);
  }

  // ================== AI ==================
  let reply = await aiReply(user, message);

  // ================== MEMORY ==================
  user.memory.push({
    text: message.content,
    reply
  });

  if (user.memory.length > 25) {
    user.memory.shift();
  }

  await user.save();

  return reply;
}

module.exports = {
  buildReply
};
