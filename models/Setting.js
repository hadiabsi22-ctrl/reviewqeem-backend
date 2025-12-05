// backend/models/Setting.js
import mongoose from "mongoose";

const settingSchema = new mongoose.Schema(
  {
    siteName: {
      type: String,
      default: "ريفيو قيم",
    },
    siteDescription: {
      type: String,
      default:
        "متجر ومراجعات الألعاب في العالم العربي – تقييمات احترافية وروابط شراء موثوقة.",
    },
    logoUrl: {
      type: String,
      default: "/images/logo-reviewqeem.svg",
    },
    contactEmail: {
      type: String,
      default: "info@reviewqeem.com",
    },
    supportEmail: {
      type: String,
      default: "support@reviewqeem.com",
    },
    social: {
      x: { type: String, default: "" },
      youtube: { type: String, default: "" },
      tiktok: { type: String, default: "" },
      discord: { type: String, default: "" },
    },
    // إعدادات بسيطة للأمان (نخزنها هنا لو احتجناها لاحقاً)
    security: {
      enableBruteforceProtection: { type: Boolean, default: true },
      maxLoginAttempts: { type: Number, default: 20 },
      banMinutes: { type: Number, default: 10 },
    },
  },
  { timestamps: true }
);

const Setting = mongoose.model("Setting", settingSchema);

export default Setting;
