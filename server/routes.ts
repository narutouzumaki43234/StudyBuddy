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

🔴 CRITICAL - ASSIGNMENT FORMAT INSTRUCTIONS:
When user asks for ASSIGNMENT/HOMEWORK/PRACTICE QUESTIONS, respond EXACTLY like this:

START OUTPUT WITH THIS EXACT PATTERN - DO NOT DEVIATE:
---
TITLE: Chemistry Chapter 1 Assignment
(BLANK LINE)
Q1 - Define matter and explain its characteristics.
Q2 - Differentiate between pure substances and mixtures.
Q3 - What are the three states of matter?
Q4 - Explain the term 'density' and its significance.
Q5 - How does temperature affect the state of matter?
Q6 - What are some changes of state?
Q7 - Discuss the differences between physical and chemical changes.
Q8 - What is a chemical property?
(BLANK LINE)
SECTION 2
(BLANK LINE)
Q9 - Define and give examples of elements and compounds.
Q10 - What is the law of conservation of mass?
Q11 - Describe how the arrangement of particles differs in solids, liquids, and gases.
Q12 - Explain how a solution differs from a suspension and a colloid.
Q13 - What are the methods to separate mixtures?
Q14 - How can we classify matter based on its composition?
Q15 - Explain what is meant by 'homogeneous' and 'heterogeneous' mixtures.
Q16 - What is a pure substance?
---

MANDATORY RULES - BREAK ANY OF THESE AND YOU FAIL:
1. Each question on SEPARATE LINE (after pressing Enter)
2. Format exactly "Q1 - text" NOT "Q1. text" NOT "Q1 text"
3. BLANK LINE between groups (after Q8, after Q16, etc)
4. BLANK LINE after "TITLE:" before Q1
5. BLANK LINE after "SECTION 2" before Q9
6. SECTION HEADERS: "SECTION 2", "SECTION 3" (no punctuation, just the name)
7. Questions 1-8, then SECTION 2, then 9-16, then SECTION 3, then 17-24, etc.
8. DO NOT put multiple questions on one line
9. DO NOT combine text and questions - ONLY questions in this format
10. After last question, include the JSON task block

AFTER QUESTIONS, ADD:
$$TASK_JSON$$
{
  "title": "Assignment",
  "description": "Complete the assignment",
  "timeLimit": 60
}
$$END_TASK_JSON$$

For normal tutoring (not assignments), respond naturally without this format.`;

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
