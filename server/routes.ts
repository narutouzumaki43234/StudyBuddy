import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  // Tasks
  app.get(api.tasks.list.path, async (req, res) => {
    const tasks = await storage.getTasks();
    res.json(tasks);
  });

  app.post(api.tasks.create.path, async (req, res) => {
    try {
      const input = api.tasks.create.input.parse(req.body);
      const task = await storage.createTask(input);
      res.status(201).json(task);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input" });
        return;
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch(api.tasks.complete.path, async (req, res) => {
    const task = await storage.completeTask(Number(req.params.id));
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json(task);
  });

  app.delete(api.tasks.delete.path, async (req, res) => {
    await storage.deleteTask(Number(req.params.id));
    res.status(204).send();
  });

  // -----------------------
  // ✅ Chat (FINAL VERSION)
  // -----------------------
  app.post(api.chat.message.path, async (req, res) => {
    try {
      const { message, class: userClass } = api.chat.message.input.parse(
        req.body,
      );
      const classLevel = userClass || "9";

      const systemPrompt = `You are a helpful study assistant for Class ${classLevel} students.

Behave normally like a tutor:
- Answer questions
- Explain topics
- Be concise and helpful

CRITICAL - ASSIGNMENT FORMAT:
When the user asks for an ASSIGNMENT, HOMEWORK, or PRACTICE QUESTIONS, you MUST use EXACTLY this format:

TITLE: <Subject> Chapter <Number> Assignment

Q1 - <Question text>
Q2 - <Question text>
Q3 - <Question text>
Q4 - <Question text>
Q5 - <Question text>
Q6 - <Question text>
Q7 - <Question text>
Q8 - <Question text>

SECTION 2

Q9 - <Question text>
Q10 - <Question text>
Q11 - <Question text>
Q12 - <Question text>
Q13 - <Question text>
Q14 - <Question text>
Q15 - <Question text>
Q16 - <Question text>

SECTION 3

Q17 - <Question text>
[continue with more questions if needed]

Rules:
- Start with "TITLE:" on the first line
- Each question on a NEW LINE
- Format MUST be "Q[number] - [question text]"
- After every 8 questions, add a section break like "SECTION 2", "SECTION 3"
- Question numbers are CONTINUOUS across sections (Q1-Q8, then Q9-Q16, Q17-Q24, etc)
- NO other text between "TITLE:" and first question
- NO bullet points or dashes in the question list format
- Each question on its own separate line
- Only use this format when assignment/questions are requested
- Otherwise respond normally
- Do NOT ask unnecessary follow-up questions
- Match Class ${classLevel} level content

If you create a study task, append this JSON at the very end:
$$TASK_JSON$$
{
  "title": "Assignment",
  "description": "Complete the assignment questions",
  "timeLimit": 60
}
$$END_TASK_JSON$$
Only include this JSON if a task is actually created.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
      });

      const aiContent = completion.choices[0].message.content || "";
      let finalMessage = aiContent;
      let createdTask = undefined;

      const taskMatch = aiContent.match(
        /\$\$TASK_JSON\$\$([\s\S]*?)\$\$END_TASK_JSON\$\$/,
      );

      if (taskMatch && taskMatch[1]) {
        try {
          const taskData = JSON.parse(taskMatch[1].trim());
          createdTask = await storage.createTask({
            title: taskData.title,
            description: taskData.description,
            timeLimit: taskData.timeLimit,
            completed: false,
          });
          finalMessage = aiContent.replace(taskMatch[0], "").trim();
        } catch (e) {
          console.error("Failed to parse task JSON", e);
        }
      }

      res.json({
        message: finalMessage,
        task: createdTask
          ? {
              title: createdTask.title,
              description: createdTask.description || "",
              timeLimit: createdTask.timeLimit || 0,
            }
          : undefined,
      });
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ message: "Failed to process chat" });
    }
  });

  // Seeding
  if ((await storage.getTasks()).length === 0) {
    await storage.createTask({
      title: "Review Biology Chapter 5",
      description: "Focus on cell division and mitosis.",
      timeLimit: 45,
      completed: false,
    });
    await storage.createTask({
      title: "Math Problems: Quadratic Equations",
      description: "Solve exercise 4.2 questions 1-10.",
      timeLimit: 60,
      completed: false,
    });
  }

  return httpServer;
}
