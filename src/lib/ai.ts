import { getGeminiConfig } from "@/lib/env";
import { getBodyRuleLabel } from "@/lib/dashboard";
import type { DashboardData } from "@/lib/types";

export async function generateWeeklyInsight(data: DashboardData) {
  const gemini = getGeminiConfig();

  if (!gemini || !data.partner) {
    return null;
  }

  const prompt = [
    "Bạn là một product coach cực kỳ cụ thể cho một cặp đôi, không nói sáo rỗng.",
    "Hãy viết bằng tiếng Việt, giọng ấm nhưng thẳng, tránh kiểu life coach mạng xã hội.",
    "Chỉ ra pattern thật từ dữ liệu. Mỗi gợi ý phải nhỏ, cụ thể, làm được ngay trong tuần tới.",
    "Trả về đúng 3 phần Markdown ngắn với tiêu đề:",
    "## Pattern",
    "## Điểm lệch",
    "## Tuần tới thử gì",
    "",
    `Người 1: ${data.viewer.name} (${data.viewer.focusMode === "gain" ? "tăng cân" : "giảm cân"})`,
    `- Study pass days: ${data.weeklyStats.viewer.studyPassDays}`,
    `- Total study minutes: ${data.weeklyStats.viewer.studyMinutes}`,
    `- Screen wins: ${data.weeklyStats.viewer.screenWins}`,
    `- Average screen time: ${data.weeklyStats.viewer.averageScreenTime} phút`,
    `- Body pass days: ${data.weeklyStats.viewer.bodyPassDays}/${data.weeklyStats.viewer.bodyScheduledDays}`,
    `- Body style: ${getBodyRuleLabel(data.viewer.goals.body)}`,
    "",
    `Người 2: ${data.partner.name} (${data.partner.focusMode === "gain" ? "tăng cân" : "giảm cân"})`,
    `- Study pass days: ${data.weeklyStats.partner?.studyPassDays ?? 0}`,
    `- Total study minutes: ${data.weeklyStats.partner?.studyMinutes ?? 0}`,
    `- Screen wins: ${data.weeklyStats.partner?.screenWins ?? 0}`,
    `- Average screen time: ${data.weeklyStats.partner?.averageScreenTime ?? 0} phút`,
    `- Body pass days: ${data.weeklyStats.partner?.bodyPassDays ?? 0}/${data.weeklyStats.partner?.bodyScheduledDays ?? 0}`,
    `- Body style: ${getBodyRuleLabel(data.partner.goals.body)}`,
    "",
    `Shared streak hiện tại: ${data.sharedStreak}`,
    `Tình trạng hôm nay: ${data.todayState}`,
    `Pact tuần: ${data.weeklyPact?.title ?? "Chưa chọn"}`,
    "",
    "Giữ câu ngắn, cụ thể, không viết những câu kiểu 'hãy tiếp tục cố gắng'.",
  ].join("\n");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${gemini.model}:generateContent?key=${gemini.apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          topP: 0.9,
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini request failed with status ${response.status}.`);
  }

  const json = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const text = json.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n").trim();

  return text || null;
}
