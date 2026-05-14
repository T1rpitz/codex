import { NextResponse } from "next/server";
import type { Courseware, StageId } from "@/types";

type StageRequest = {
  courseware: Courseware;
  stageId: StageId;
};

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "还没有配置 OPENAI_API_KEY。第一阶段需要真实翻译模型，不能继续用 mock 假直译。"
      },
      { status: 400 }
    );
  }

  const body = (await request.json()) as StageRequest;

  if (body.stageId !== "translation") {
    return NextResponse.json(
      { error: "当前 API 路由只处理第一阶段直译与讲解。" },
      { status: 400 }
    );
  }

  const pages = body.courseware.pages.slice(0, 10);
  const input = pages
    .map((page) => `第${page.pageNumber}页原文：\n${page.text || "（未提取到文字）"}`)
    .join("\n\n---\n\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-5.2",
      instructions: `你是一个大学讲师级别的教学助手。请严格按规则处理 PPT/PDF 课件文字。

任务：
每次只处理连续 10 页；如果不足 10 页，则处理剩余全部。
必须按页码顺序输出，不跳页、不合并页。

每一页只包含两个部分：
【直译】
【讲解】

【直译】规则：
只展示翻译成中文后的文字内容本身。
所有非中文内容必须翻译成中文。
如果原文是中文，改写为更清晰通顺的中文。
必须覆盖该页提取到的所有文字内容，包括 OCR 识别到的图片文字。
不要写“这一句的中文意思是”。
不要写编号解释。
不要保留英文原文。
不要总结、不要扩展、不要讲解。

【讲解】规则：
像老师上课一样，从 0 基础出发讲清楚这一页。
必须包含：
1）这一页在讲什么（一句话概括）
2）核心概念解释（用最简单的话讲清楚）
3）背后的逻辑（为什么是这样）
4）举一个生活或简单例子帮助理解

输出格式必须严格如下：
第X页：

【直译】
（中文翻译）

【讲解】
1）这一页在讲什么：...
2）核心概念解释：...
3）背后的逻辑：...
4）简单例子：...`,
      input
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { error: `OpenAI 翻译请求失败：${errorText}` },
      { status: response.status }
    );
  }

  const data = (await response.json()) as { output_text?: string };

  return NextResponse.json({ content: data.output_text ?? "" });
}
