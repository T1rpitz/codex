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

function mockTranslateToChinese(text: string) {
  if (!text.trim()) return "该页没有提取到可翻译文本，建议检查 PDF 是否为扫描图片。";
  if (containsChinese(text)) {
    return `本页已经包含中文内容。以下是整理后的中文表达：${preview(text, 520)}`;
  }

  return `【模拟中文直译】${preview(text, 520)}

这部分在真实 AI 接入后会逐句翻译为自然中文。当前 MVP 先保留原句结构，并把它作为中文学习笔记的依据。`;
}

function keywords(courseware: Courseware) {
  const words = courseware.fullText
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 4);

  return Array.from(new Set(words)).slice(0, 12);
}

function buildTranslationStage(courseware: Courseware) {
  const terms = keywords(courseware);
  const pageSections = courseware.pages
    .slice(0, 12)
    .map(
      (page) => `## 第 ${page.pageNumber} 页

### 直译
${mockTranslateToChinese(page.text)}

### 中文讲解
这一页可以先当成老师在黑板上写出的“主干信息”。阅读时先找三个东西：它在定义什么、它想解决什么问题、它给了什么条件或例子。

举个例子：如果这一页讲的是一个模型或方法，你可以把它想象成“做题工具”。定义告诉你工具叫什么，步骤告诉你怎么用，限制条件告诉你什么时候不要乱用。这样看课件会比逐字背诵更稳。

### 一句话总结
第 ${page.pageNumber} 页的核心是：把本页信息翻成自己能复述的中文，并抓住它和整节课主题的关系。`
    )
    .join("\n\n");

  return `# 第一阶段：直译与讲解

${pageSections}

## 术语表
${terms.map((term) => `- **${term}**：课件中的高频术语，后续可替换为真实 AI 生成的精确定义。`).join("\n")}

## 整节课总结
本节课围绕「${courseware.name}」展开。先建立术语和基本概念，再理解每页之间的逻辑关系，最后把知识点转化为可复述、可做题、可迁移的学习材料。`;
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
