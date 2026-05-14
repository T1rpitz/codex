import type { Courseware, StageId } from "@/types";

const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export async function generateStageContent(
  courseware: Courseware,
  stageId: StageId
): Promise<string> {
  await delay(550);

  switch (stageId) {
    case "translation":
      return buildTranslationStage(courseware);
    case "deepening":
      return buildDeepeningStage(courseware);
    case "exam":
      return buildExamStage(courseware);
    case "exploration":
      return buildExplorationStage(courseware);
    default:
      return "";
  }
}

function preview(text: string, length = 220) {
  if (!text.trim()) return "该页未提取到可读文本，可能是扫描版 PDF。";
  return text.length > length ? `${text.slice(0, length)}...` : text;
}

function containsChinese(text: string) {
  return /\p{Script=Han}/u.test(text);
}

function normalizeMainContent(text: string) {
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^(page\s*)?\d+$/i.test(line))
    .filter((line) => !/^\d+\s*\/\s*\d+$/.test(line))
    .filter((line) => !/\b(university|college|school)\b/i.test(line) || line.length > 80)
    .filter((line) => !/\b\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\b/.test(line));

  return lines.join("\n").trim() || text.trim();
}

function translateMainContent(text: string) {
  const mainContent = normalizeMainContent(text);

  if (!mainContent) return "该页没有提取到可翻译的主要内容。";
  if (containsChinese(text)) {
    return mainContent
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .join("\n");
  }

  return splitIntoTranslationUnits(mainContent)
    .map((sentence) => translateEnglishSentenceToChinese(sentence))
    .join("\n");
}

function splitIntoTranslationUnits(text: string) {
  return text
    .split(/(?<=[.!?。！？])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function translateEnglishSentenceToChinese(sentence: string) {
  const cleaned = sentence.replace(/\s+/g, " ").trim();
  const topics = inferChineseTopics(cleaned);
  const lowered = cleaned.toLowerCase();

  if (/^\d+(\.\d+)*\s+/.test(cleaned) || cleaned.length < 80) {
    return translateShortPhrase(cleaned);
  }

  if (/\b(define|definition|concept|terminology|meaning)\b/i.test(cleaned)) {
    return `${topics.join("、")}的定义或含义，以及这个概念的基本理解方式。`;
  }

  if (/\b(include|consist|contain|component|element|part)\b/i.test(cleaned)) {
    return `${topics.join("、")}包含的组成部分，以及这些要素共同构成的主要内容。`;
  }

  if (/\b(process|step|procedure|workflow|method|approach)\b/i.test(cleaned)) {
    return `${topics.join("、")}的操作过程或方法步骤，以及需要按顺序理解或执行的内容。`;
  }

  if (/\b(compare|difference|similar|versus|contrast)\b/i.test(cleaned)) {
    return `不同对象之间的相同点和差异，以及${topics.join("、")}在概念或应用上的边界。`;
  }

  if (/\b(result|effect|impact|outcome|lead to|cause)\b/i.test(cleaned)) {
    return `相关因素、方法或条件带来的结果、影响、变化或后果。`;
  }

  if (/\b(example|case|application|practice)\b/i.test(cleaned)) {
    return `案例或应用场景，以及本页知识点在具体情境中的使用方式。`;
  }

  if (/\b(problem|challenge|risk|limitation)\b/i.test(cleaned)) {
    return `问题、挑战或局限，以及这个知识点在使用时需要注意的条件。`;
  }

  if (lowered.includes("?")) {
    return `围绕${topics.join("、")}提出的问题。`;
  }

  return `${topics.join("、")}之间的关系、作用和应用方式。`;
}

function translateShortPhrase(phrase: string) {
  const dictionary: Array<[RegExp, string]> = [
    [/\bintroduction\b/i, "导论"],
    [/\boverview\b/i, "概述"],
    [/\bobjectives?\b/i, "学习目标"],
    [/\blearning outcomes?\b/i, "学习成果"],
    [/\bagenda\b/i, "课程安排"],
    [/\bcontents?\b/i, "内容"],
    [/\btable of contents?\b/i, "目录"],
    [/\bbackground\b/i, "背景"],
    [/\bkey terms?\b/i, "关键术语"],
    [/\bquestions?\b/i, "问题"],
    [/\bdefinition\b/i, "定义"],
    [/\bconcepts?\b/i, "概念"],
    [/\bmodels?\b/i, "模型"],
    [/\bframeworks?\b/i, "框架"],
    [/\bmethods?\b/i, "方法"],
    [/\bprocess(?:es)?\b/i, "过程"],
    [/\bsteps?\b/i, "步骤"],
    [/\bdata\b/i, "数据"],
    [/\banalysis\b/i, "分析"],
    [/\bresults?\b/i, "结果"],
    [/\bdiscussion\b/i, "讨论"],
    [/\bconclusion\b/i, "结论"],
    [/\bsummary\b/i, "总结"],
    [/\bexamples?\b/i, "例子"],
    [/\bcases?\b/i, "案例"],
    [/\bapplications?\b/i, "应用"],
    [/\badvantages?\b/i, "优点"],
    [/\blimitations?\b/i, "局限"],
    [/\bchallenges?\b/i, "挑战"],
    [/\bproblems?\b/i, "问题"]
  ];
  const matched = dictionary.find(([pattern]) => pattern.test(phrase));

  if (matched) return matched[1];

  return "主要标题、关键词或项目内容";
}

function explainAsLecturer(text: string, pageNumber: number) {
  const mainContent = normalizeMainContent(text);
  const topics = inferChineseTopics(mainContent);
  const theme = topics[0] ?? "本页主题";

  if (!mainContent) {
    return `1）这一页在讲什么：这一页没有提取到清晰文字，可能是图片型页面或扫描页。
2）核心概念解释：如果原页是图片、图表或扫描内容，需要先人工查看右侧 PDF 原文，确认标题、图表和正文。
3）背后的逻辑：文字提取依赖 PDF 内部是否有可复制文本；扫描图像本身没有文字层，所以不能直接提取。
4）简单例子：就像拍了一张书页照片，照片里“看得见字”，但电脑不一定知道那些字是什么。`;
  }

  return `1）这一页在讲什么：这一页的核心主题是${theme}，它在帮助你建立对本页主要内容的第一层理解。
2）核心概念解释：可以先把本页内容拆成“是什么、为什么重要、怎么使用”三类信息。标题通常告诉你主题，正文说明定义或机制，图表则用来展示关系、流程或对比。
3）背后的逻辑：课件页通常不是孤立的，它会把上一页的问题继续展开。本页如果出现定义，就是在搭基础；如果出现步骤，就是在说明操作方法；如果出现案例或图表，就是在帮助你把抽象概念落到具体情境。
4）简单例子：如果这一页讲的是一个分析方法，你可以把它想象成做菜的菜谱。标题是菜名，正文是步骤，图表是流程图，限制条件就是“哪些食材不能替换”。掌握这些，你就不只是背内容，而是知道什么时候该怎么用。`;
}

function inferChineseTopics(text: string) {
  const dictionary: Array<[RegExp, string]> = [
    [/definition|concept|terminology|meaning/i, "概念定义"],
    [/model|framework|theory|approach/i, "理论框架"],
    [/method|process|procedure|step|workflow/i, "方法步骤"],
    [/data|dataset|evidence|measurement/i, "数据与证据"],
    [/analysis|evaluate|assessment|compare/i, "分析与评价"],
    [/case|example|application|practice/i, "案例应用"],
    [/risk|limitation|challenge|problem/i, "限制与问题"],
    [/result|outcome|impact|effect/i, "结果与影响"],
    [/strategy|policy|decision|management/i, "策略与决策"],
    [/system|structure|component|architecture/i, "系统结构"]
  ];
  const matched = dictionary
    .filter(([pattern]) => pattern.test(text))
    .map(([, label]) => label);

  return matched.length > 0 ? Array.from(new Set(matched)).slice(0, 4) : ["课程主题", "关键术语", "知识点关系"];
}

function keywords(courseware: Courseware) {
  const words = courseware.fullText
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 4);

  return Array.from(new Set(words)).slice(0, 12);
}

function buildTranslationStage(courseware: Courseware) {
  const pageSections = courseware.pages
    .slice(0, 10)
    .map(
      (page) => `第${page.pageNumber}页：

【直译】
${translateMainContent(page.text)}

【讲解】
${explainAsLecturer(page.text, page.pageNumber)}`
    )
    .join("\n\n");

  return pageSections || "未能从 PDF 中提取到可讲解的页面内容。";
}


function buildDeepeningStage(courseware: Courseware) {
  const terms = keywords(courseware).slice(0, 6);

  return `# 第二阶段：深入与巩固

## 核心概念深入解释
${terms.map((term, index) => `${index + 1}. **${term}**：这是本节课需要重点理解的概念。学习时要追问它的定义、适用条件、反例和与其他概念的边界。`).join("\n")}

## 概念关系图
\`\`\`mermaid
graph TD
  A["课程主题：${courseware.name}"] --> B["核心定义"]
  A --> C["方法与步骤"]
  A --> D["应用场景"]
  B --> E["易错边界"]
  C --> F["练习题"]
  D --> G["现实案例"]
\`\`\`

## 现实案例
- 把课件中的理论应用到一个课堂讨论案例，观察概念如何影响决策。
- 选择一个行业新闻或产品案例，标注它对应的定义、机制和限制。
- 用自己的专业背景重写一个例子，检查是否能解释给同学听。

## 易错点
- 只背术语，不理解术语之间的条件关系。
- 把例子当定义，导致遇到新题目时无法迁移。
- 忽略图表、公式或流程中的前提假设。

## 主动回忆问题
1. 不看课件，你能用三句话说明本节课主题吗？
2. 哪个概念最容易和相邻概念混淆？区别是什么？
3. 如果用一个现实案例解释本节课，你会选择什么案例？
4. 本节课最可能考察哪种推理链条？`;
}

function buildExamStage(courseware: Courseware) {
  const terms = keywords(courseware).slice(0, 8);

  return `# 第三阶段：考试与复习

## 预测考试重点
- 基本定义与术语辨析
- 概念之间的关系和适用条件
- 结合案例进行解释或判断
- 用结构化语言回答简答题和论述题

## 选择题
1. 下列哪项最能代表「${terms[0] ?? courseware.name}」的学习重点？
   A. 只记忆名称
   B. 理解定义、条件和应用
   C. 跳过例子
   D. 只看最后一页
   **答案：B**

## 判断题
1. 只要记住术语，就一定能完成案例分析题。
   **答案：错。需要理解概念之间的关系与适用条件。**

## 简答题
1. 请概括本节课的核心知识框架。
   **参考答案：先定义核心概念，再说明概念关系，最后结合案例解释其应用。**

## 论述题
1. 结合现实场景，论述本节课主题的价值、局限和应用路径。
   **参考答案：围绕概念定义、现实问题、分析过程、限制条件和结论展开。**

## 案例题
某学生在复习「${courseware.name}」时只整理了名词表，没有整理概念关系。请分析这种复习方法的问题，并提出改进方案。

## Flashcards
${terms.map((term) => `- Q: ${term} 是什么？\n  A: 它是本节课中的关键概念，需要结合定义、条件和例子理解。`).join("\n")}

## 模拟考试
请在 45 分钟内完成：5 道选择题、5 道判断题、3 道简答题、1 道案例分析题。

## 复习 Checklist
- [ ] 能说出本节课的一句话总结
- [ ] 能解释 5 个核心术语
- [ ] 能画出概念关系图
- [ ] 能完成一套模拟题
- [ ] 能把知识点连接到现实案例`;
}

function buildExplorationStage(courseware: Courseware) {
  return `# 第四阶段：深入探索

## 研究方向
- 围绕「${courseware.name}」中的核心问题做文献综述。
- 比较不同理论框架或方法在现实场景中的效果。
- 探索课程概念在跨学科领域中的应用。

## 论文题目
1. 《${courseware.name} 中核心概念的应用边界研究》
2. 《从课堂理论到现实案例：${courseware.name} 的实践转化》
3. 《基于课程知识框架的案例分析与方法评估》

## 项目想法
- 做一个交互式知识图谱，把每页课件连接到术语、题目和案例。
- 设计一个自动 flashcard 生成器，按照遗忘曲线安排复习。
- 选取一个现实案例，产出一份课堂展示报告。

## 连接现实案例
选择一个与你专业或职业目标相关的场景，回答：这个知识点解释了什么问题？它不能解释什么？还需要哪些数据？

## 英文 CV Bullet Points
- Built a structured learning workflow that transforms PDF courseware into summaries, exam questions, flashcards, and research prompts.
- Synthesized academic concepts into practical case analyses and review materials for long-term study retention.
- Designed a self-directed study system connecting course content with projects, research topics, and career narratives.

## 进一步学习路线
1. 复盘课件并补全术语定义。
2. 阅读 2-3 篇相关论文或教材章节。
3. 做一份案例分析报告。
4. 把核心概念转成 Anki 卡片并持续复习。
5. 尝试用真实项目或论文题目深化理解。`;
}
