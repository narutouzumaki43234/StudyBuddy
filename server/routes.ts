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
Use this EXACT format with pipe symbols | to separate items:

TITLE: Subject Chapter Number Assignment|Q1 - Question text|Q2 - Question text|Q3 - Question text|Q4 - Question text|Q5 - Question text|Q6 - Question text|Q7 - Question text|Q8 - Question text|SECTION 2|Q9 - Question text|Q10 - Question text|Q11 - Question text|Q12 - Question text|Q13 - Question text|Q14 - Question text|Q15 - Question text|Q16 - Question text

RULES:
- Separate EVERYTHING with | symbol (pipe)
- Format: "Q1 - question text" (with hyphen and space)
- After Q8, put "SECTION 2" then continue numbering Q9, Q10, etc
- After Q16, put "SECTION 3" then continue with Q17, Q18, etc
- NO other text before TITLE or after questions (except JSON)

After the assignment, add:
$$TASK_JSON$$
{
  "title": "Assignment",
  "description": "Complete the assignment",
  "timeLimit": 60
}
$$END_TASK_JSON$$

Example format:
TITLE: Chemistry Chapter 1|Q1 - Define matter|Q2 - State three states|Q3 - Explain density|Q4 - Temperature effects|Q5 - Changes of state|Q6 - Physical vs chemical|Q7 - Chemical properties|Q8 - Elements and compounds|SECTION 2|Q9 - Conservation of mass|Q10 - Particle arrangement|...

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
