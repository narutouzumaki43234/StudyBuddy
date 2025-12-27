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

When responding normally: Answer questions, explain topics, be helpful.

ASSIGNMENT FORMAT (When user asks for assignment/homework/practice questions):
Format assignments professionally with clear structure:

TITLE: Subject Chapter Number Assignment

Section Header (e.g., "A. Very Short Answer Questions" or "Section 1: Conceptual Questions")

1. First question
2. Second question
3. Third question
...
(Continue up to 8 questions)

SECTION 2
Section Header (e.g., "B. Short Answer Questions")

9. Question 9
10. Question 10
... (continue through Q16)

RULES:
- Start with TITLE: on first line with assignment name
- Use clear section headers with letters or numbers
- Number questions consecutively (Q1-Q8, then Q9-Q16)
- Each question on its own line
- Add proper spacing between sections
- Be descriptive and clear

After the assignment, add:
$$TASK_JSON$$
{
  "title": "Assignment Title",
  "description": "Complete the assignment",
  "timeLimit": 60
}
$$END_TASK_JSON$$

For normal tutoring, respond naturally without this format.`;

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

      // Format assignment: replace pipes with newlines if present
      if (finalMessage.includes("|")) {
        finalMessage = finalMessage.replace(/\|/g, "\n");
      }
      // Also format by splitting on Q patterns if no pipes were found
      else if (finalMessage.includes("TITLE:") && finalMessage.includes("Q1")) {
        // Split on pattern "Q[number] -" and rejoin with newlines
        const lines = finalMessage.split(/(?=Q\d+\s*-|SECTION\s+\d+|TITLE:)/);
        finalMessage = lines.map(line => line.trim()).filter(line => line).join("\n");
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
