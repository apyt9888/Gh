const mongoose = require("mongoose");

// ================== USER SCHEMA ==================
const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },

  // المشاعر
  heart: { type: Number, default: 50 },

  // العلاقة مع الشخص
  relation: { type: String, default: "عادي" },

  // ذاكرة المحادثات
  memory: [
    {
      text: String,
      reply: String,
      time: { type: Date, default: Date.now }
    }
  ],

  // علاقات إضافية
  likes: [String],
  dislikes: [String],

  // تطور الشخصية مع الوقت
  personalityLevel: { type: Number, default: 1 },

  createdAt: { type: Date, default: Date.now }
});

// ================== MODEL ==================
const User = mongoose.model("GhazalUser", userSchema);

module.exports = User;
